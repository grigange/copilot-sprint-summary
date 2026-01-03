import * as vscode from 'vscode';
import {
  MAX_LOG_ENTRIES,
  RangeSelection,
  RangeType,
  getCommitDate,
  getCommitsForSelection
} from './gitRange';

interface TagInfo {
  name: string;
  commitHash: string;
  date: Date;
}

function shortHash(hash?: string): string {
  return hash ? hash.slice(0, 7) : '';
}

function calculateDaysSpan(sinceDate: Date): number {
  const msInDay = 24 * 60 * 60 * 1000;
  const diffMs = Date.now() - sinceDate.getTime();
  return Math.max(1, Math.ceil(diffMs / msInDay));
}

async function getTagsByRecency(repo: any): Promise<TagInfo[]> {
  if (!repo.getRefs) {
    return [];
  }

  const refs = await repo.getRefs({ type: 2 });
  const tags = await Promise.all(
    refs.map(async (ref: any) => {
      const name = ref.name || ref.ref || ref.label || '';
      const commitRef = ref.commit || ref.hash || ref.objectId || name;
      try {
        const commit = await repo.getCommit(commitRef);
        return {
          name,
          commitHash: commit.hash || commitRef,
          date: getCommitDate(commit)
        };
      } catch (error) {
        return {
          name,
          commitHash: commitRef,
          date: new Date(0)
        };
      }
    })
  );

  return tags
    .filter(tag => tag.name)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

function formatDate(date: Date, format: string): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());

  switch (format) {
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY_MM_DD':
      return `${year}_${month}_${day}`;
    case 'DD.MM.YYYY':
      return `${day}.${month}.${year}`;
    default:
      return `${day}-${month}-${year}`;
  }
}

async function generateSprintSummary(repo: any, commits: any[]): Promise<string> {
  if (commits.length === 0) {
    throw new Error('No commits found for the selected criteria');
  }

  const commitDetails = await Promise.all(
    commits.map(async (commit: any) => {
      try {
        const changes = commit.hash ? await repo.diffBetween(commit.parents[0], commit.hash) : [];
        const filesChanged = changes.map((change: any) => {
          const status = change.status === 0 ? 'M' : change.status === 1 ? 'A' : 'D';
          return `${status} ${change.uri.path.split('/').pop()}`;
        }).slice(0, 20);

        const filesSummary = filesChanged.length > 0
          ? `\n  Files: ${filesChanged.join(', ')}${changes.length > 20 ? ` +${changes.length - 20} more` : ''}`
          : '';

        return `- **${commit.message}**\n  Author: ${commit.authorName} | Date: ${new Date(commit.authorDate || 0).toLocaleDateString()}${filesSummary}`;
      } catch (error) {
        return `- **${commit.message}**\n  Author: ${commit.authorName} | Date: ${new Date(commit.authorDate || 0).toLocaleDateString()}`;
      }
    })
  );

  const commitsText = commitDetails.join('\n\n');

  // Get AI model and system prompt from configuration
  const config = vscode.workspace.getConfiguration('sprintSummary');
  const aiModel = config.get<string>('aiModel');
  const systemPrompt = config.get<string>('systemPrompt')

  // Select AI model - if specific model requested, use it; otherwise use first available
  let models;
  if (aiModel) {
    models = await vscode.lm.selectChatModels({ family: aiModel });
    if (models.length === 0) {
      throw new Error(`No language model available for family: ${aiModel}. Please check your configuration or leave the aiModel setting empty to use any available model.`);
    }
  } else {
    // Get all available models
    models = await vscode.lm.selectChatModels();
    if (models.length === 0) {
      throw new Error('No language models available. Please ensure GitHub Copilot is properly configured.');
    }
  }

  const model = models[0];

  const messages = [
    vscode.LanguageModelChatMessage.User(`${systemPrompt}\n\nCommits to summarize:\n${commitsText}`)
  ];

  const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
  let summary = '';
  for await (const fragment of response.text) {
    summary += fragment;
  }

  return summary;
}

export function activate(context: vscode.ExtensionContext) {
  // Command to show available AI models (informational)
  const showModelsCommand = vscode.commands.registerCommand('mcp.showAvailableModels', async () => {
    try {
      const models = await vscode.lm.selectChatModels();
      if (models.length === 0) {
        vscode.window.showInformationMessage('No AI models available. Please ensure GitHub Copilot is properly configured.');
        return;
      }

      const modelInfo = models.map(m => `• ${m.family} (${m.name})`).join('\n');
      const message = `**Available AI Models:**\n\n${modelInfo}\n\nYou can use any of these model families in your sprintSummary.aiModel setting.`;

      vscode.window.showInformationMessage(message, { modal: true });
    } catch (error) {
      vscode.window.showErrorMessage(`Error fetching models: ${error}`);
    }
  });

  // Command to select AI model with QuickPick
  const selectAiModelCommand = vscode.commands.registerCommand('mcp.selectAiModel', async () => {
    try {
      const models = await vscode.lm.selectChatModels();
      if (models.length === 0) {
        vscode.window.showInformationMessage('No AI models available. Please ensure GitHub Copilot is properly configured.');
        return;
      }

      const config = vscode.workspace.getConfiguration('sprintSummary');
      const currentModel = config.get<string>('aiModel') || '';

      // Create QuickPick items
      const items: vscode.QuickPickItem[] = [
        {
          label: '$(sparkle) Use Default',
          description: 'Let VS Code choose the best available model',
          detail: currentModel === '' ? '✓ Currently selected' : undefined
        },
        ...models.map(m => ({
          label: m.family,
          description: m.name,
          detail: currentModel === m.family ? '✓ Currently selected' : undefined
        }))
      ];

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an AI model for sprint summaries',
        title: 'Select AI Model'
      });

      if (selected) {
        const newModel = selected.label === '$(sparkle) Use Default' ? '' : selected.label;

        // Always save to workspace settings
        const hasWorkspace = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0;
        const target = hasWorkspace ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;

        await config.update('aiModel', newModel, target);
        vscode.window.showInformationMessage(`AI model saved to ${hasWorkspace ? 'workspace' : 'user'} settings`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error selecting AI model: ${error}`);
    }
  });

  // Command to set output folder with folder picker
  const setOutputFolderCommand = vscode.commands.registerCommand('mcp.setOutputFolder', async () => {
    try {
      const config = vscode.workspace.getConfiguration('sprintSummary');
      const currentFolder = config.get<string>('outputFolder');

      // Open folder picker dialog
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Output Folder',
        title: 'Select Sprint Summary Output Folder',
        defaultUri: currentFolder ? vscode.Uri.file(currentFolder) : undefined
      });

      if (folderUri && folderUri[0]) {
        const selectedPath = folderUri[0].fsPath;

        // Always save to workspace settings
        const hasWorkspace = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0;
        const target = hasWorkspace ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;

        await config.update('outputFolder', selectedPath, target);
        vscode.window.showInformationMessage(`Output folder saved to ${hasWorkspace ? 'workspace' : 'user'} settings: ${selectedPath}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error setting output folder: ${error}`);
    }
  });

  const disposable = vscode.commands.registerCommand('mcp.summarizeSprint', async () => {
    try {
      // 1. Fetch commits from git
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder open');
      }

      // Get git extension
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      const git = gitExtension?.getAPI(1);
      if (!git) {
        throw new Error('Git extension not available');
      }

      const repo = git.repositories[0];
      if (!repo) {
        throw new Error('No git repository found');
      }

      interface RangeOption extends vscode.QuickPickItem {
        rangeType: RangeType;
      }

      const rangeOptions: RangeOption[] = [
        {
          label: 'Date (last N days)',
          description: 'Use a number of days as the cutoff',
          rangeType: 'days'
        },
        {
          label: 'Git Tag',
          description: 'Select a tag to compare against (merge target)',
          rangeType: 'tag'
        },
        {
          label: 'Commit',
          description: 'Select a commit to compare against (merge target)',
          rangeType: 'commit'
        }
      ];

      const rangeChoice = await vscode.window.showQuickPick(rangeOptions, {
        placeHolder: 'Choose how far back the summary should go',
        canPickMany: false
      });

      if (!rangeChoice) {
        return;
      }

      let selection: RangeSelection;

      if (rangeChoice.rangeType === 'days') {
        // Ask for number of days
        const daysInput = await vscode.window.showInputBox({
          prompt: 'Number of days to include in summary',
          value: '14',
          validateInput: (value) => {
            const num = parseInt(value);
            return isNaN(num) || num <= 0 ? 'Please enter a valid positive number' : null;
          }
        });

        if (!daysInput) {
          return; // User cancelled
        }

        const daysAgo = parseInt(daysInput);
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - daysAgo);
        selection = { type: 'days', days: daysAgo, sinceDate };
      } else if (rangeChoice.rangeType === 'tag') {
        interface TagPickItem extends vscode.QuickPickItem {
          tag: TagInfo;
        }

        const tags = await getTagsByRecency(repo);
        if (tags.length === 0) {
          throw new Error('No git tags found in this repository');
        }

        const tagItems: TagPickItem[] = tags.map(tag => ({
          label: tag.name,
          description: tag.date.toLocaleDateString(),
          detail: shortHash(tag.commitHash),
          tag
        }));

        const selectedTag = await vscode.window.showQuickPick(tagItems, {
          placeHolder: 'Select a tag to compare against (merge target)',
          canPickMany: false
        });

        if (!selectedTag) {
          return;
        }

        selection = {
          type: 'tag',
          tag: selectedTag.tag.name,
          commitHash: selectedTag.tag.commitHash,
          sinceDate: selectedTag.tag.date
        };
      } else {
        interface CommitPickItem extends vscode.QuickPickItem {
          commit: any;
        }

        const allCommits = await repo.log({ maxEntries: MAX_LOG_ENTRIES });
        if (allCommits.length === 0) {
          throw new Error('No commits found on the current branch');
        }

        const commitItems: CommitPickItem[] = allCommits.map((commit: any) => {
          const date = getCommitDate(commit).toLocaleDateString();
          const hash = shortHash(commit.hash);
          const author = commit.authorName || 'Unknown';
          const label = commit.message ? commit.message.split('\n')[0] : (hash || 'Commit');
          const description = [hash, author, date].filter(Boolean).join(' | ');

          return {
            label,
            description,
            commit
          };
        });

        const selectedCommit = await vscode.window.showQuickPick(commitItems, {
          placeHolder: 'Select a commit to compare against (merge target)',
          canPickMany: false,
          matchOnDescription: true
        });

        if (!selectedCommit) {
          return;
        }

        selection = {
          type: 'commit',
          commitHash: selectedCommit.commit.hash,
          sinceDate: getCommitDate(selectedCommit.commit)
        };
      }

      const commitsInRange = await getCommitsForSelection(repo, selection);
      if (commitsInRange.length === 0) {
        throw new Error('No commits found for the selected range');
      }

      const uniqueAuthors = [...new Set(commitsInRange.map((c: any) => c.authorName))]
        .filter(Boolean)
        .sort();

      if (uniqueAuthors.length === 0) {
        throw new Error('No commits found for the selected range');
      }

      // Ask user to select author
      const authorOptions: string[] = ['All Authors', ...uniqueAuthors as string[]];
      const selectedAuthor = await vscode.window.showQuickPick(
        authorOptions,
        {
          placeHolder: 'Select author to filter commits',
          canPickMany: false
        }
      );

      if (!selectedAuthor) {
        return; // User cancelled
      }

      vscode.window.showInformationMessage('Generating sprint summary...');

      const commitsForSummary = selectedAuthor === 'All Authors'
        ? commitsInRange
        : commitsInRange.filter((commit: any) => commit.authorName === selectedAuthor);

      if (commitsForSummary.length === 0) {
        throw new Error('No commits found for the selected author');
      }

      // Generate the summary
      const summary = await generateSprintSummary(repo, commitsForSummary);

      // Get configuration settings
      const config = vscode.workspace.getConfiguration('sprintSummary');
      const outputFolder = config.get<string>('outputFolder') || require('path').join(require('os').homedir(), 'Documents', 'Sprint Summaries');
      const dateFormat = config.get<string>('dateFormat') || 'DD-MM-YYYY';
      const fileNamePattern = config.get<string>('fileNamePattern') || '{project}_Sprint_{date}';

      // Save to file using configured settings
      const path = require('path');
      const now = new Date();
      const formattedDate = formatDate(now, dateFormat);
      const daysAgo = selection.type === 'days' ? selection.days : calculateDaysSpan(selection.sinceDate);

      // Get project name from workspace folder
      const projectName = workspaceFolder.name || 'project';

      // Replace placeholders in file name pattern
      let fileName = fileNamePattern
        .replace('{project}', projectName)
        .replace('{date}', formattedDate)
        .replace('{author}', selectedAuthor === 'All Authors' ? 'all' : selectedAuthor)
        .replace('{days}', String(daysAgo));

      // Ensure .md extension
      if (!fileName.endsWith('.md')) {
        fileName += '.md';
      }

      const filePath = path.join(outputFolder, fileName);

      // Create directory if it doesn't exist
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(outputFolder));

      // Write the file
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(filePath),
        Buffer.from(summary || 'No summary generated', 'utf8')
      );

      // Store the file path for the open command
      context.workspaceState.update('lastSummaryPath', filePath);

      // Show success message with Open button
      vscode.window.showInformationMessage(`Sprint summary successfully created!`, 'Open', 'Open Folder').then(selection => {
        if (selection === 'Open') {
          vscode.commands.executeCommand('mcp.openSummary');
        } else if (selection === 'Open Folder') {
          vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error}`);
    }
  });

  // Command to open the summary
  const openSummaryCommand = vscode.commands.registerCommand('mcp.openSummary', async () => {
    const filePath = context.workspaceState.get<string>('lastSummaryPath');
    if (filePath) {
      const config = vscode.workspace.getConfiguration('sprintSummary');
      const customOpenCommand = config.get<string>('customOpenCommand');

      if (customOpenCommand && customOpenCommand.trim() !== '') {
        // Use custom command
        try {
          const path = require('path');
          const fileName = path.basename(filePath);
          const folderName = path.basename(path.dirname(filePath));

          // Replace placeholders in custom command
          let command = customOpenCommand
            .replace('{filePath}', filePath)
            .replace('{fileName}', fileName)
            .replace('{folderName}', folderName);

          // If it looks like a URI, open it externally
          if (command.includes('://')) {
            await vscode.env.openExternal(vscode.Uri.parse(command));
          } else {
            // Otherwise try to execute it as a shell command
            const terminal = vscode.window.createTerminal('Open Sprint Summary');
            terminal.sendText(command);
            terminal.show();
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Error executing custom open command: ${error}`);
        }
      } else {
        // Default behavior: open in VS Code
        try {
          const doc = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(doc);
        } catch (error) {
          vscode.window.showErrorMessage(`Error opening file: ${error}`);
        }
      }
    } else {
      vscode.window.showErrorMessage('No summary file found. Generate one first.');
    }
  });

  // Add a button in the status bar
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(note) Sprint Summary';
  statusBarItem.command = 'mcp.summarizeSprint';
  statusBarItem.show();
  context.subscriptions.push(disposable, openSummaryCommand, showModelsCommand, selectAiModelCommand, setOutputFolderCommand, statusBarItem);
}

export function deactivate() { }
