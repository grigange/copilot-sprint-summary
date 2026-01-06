import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getCommitsForSelection } from '../src/gitRange';

const FIELD_SEPARATOR = '\x1f';
const RECORD_SEPARATOR = '\x1e';
const LOG_FORMAT = `%H${FIELD_SEPARATOR}%P${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%ad${FIELD_SEPARATOR}%s${RECORD_SEPARATOR}`;

function runGit(repoPath: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repoPath, encoding: 'utf8' }).trim();
}

function runGitRaw(repoPath: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repoPath, encoding: 'utf8' });
}

function parseCommits(output: string) {
  return output
    .split(RECORD_SEPARATOR)
    .filter(Boolean)
    .map(record => {
      const [hash, parents, authorName, authorDate, message] = record.split(FIELD_SEPARATOR);
      return {
        hash,
        parents: parents ? parents.split(' ').filter(Boolean) : [],
        authorName,
        authorDate,
        message
      };
    });
}

function createRepoApi(repoPath: string) {
  return {
    async log({ maxEntries, ref }: { maxEntries?: number; ref?: string }) {
      const args = [
        'log',
        `--max-count=${maxEntries || 10000}`,
        `--pretty=format:${LOG_FORMAT}`,
        '--date=iso-strict'
      ];
      if (ref) {
        args.push(ref);
      }
      const output = runGitRaw(repoPath, args);
      return parseCommits(output);
    },
    async getCommit(hash: string) {
      const output = runGitRaw(repoPath, [
        'show',
        '-s',
        `--pretty=format:${LOG_FORMAT}`,
        '--date=iso-strict',
        hash
      ]);
      const commits = parseCommits(output);
      if (!commits.length) {
        throw new Error(`Commit not found: ${hash}`);
      }
      return commits[0];
    }
  };
}

test('summarizes commits on a branch since the common ancestor', async () => {
  const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint-summary-test-'));

  try {
    runGit(repoPath, ['init', '-b', 'main']);
  } catch (error) {
    runGit(repoPath, ['init']);
    runGit(repoPath, ['checkout', '-b', 'main']);
  }
  runGit(repoPath, ['config', 'user.name', 'Test User']);
  runGit(repoPath, ['config', 'user.email', 'test@example.com']);

  const filePath = path.join(repoPath, 'app.txt');
  fs.writeFileSync(filePath, 'initial\n', 'utf8');
  runGit(repoPath, ['add', '.']);
  runGit(repoPath, ['commit', '-m', 'initial commit']);

  runGit(repoPath, ['checkout', '-b', 'general-ledger-2']);

  const featureCommits: string[] = [];
  for (let i = 1; i <= 3; i += 1) {
    fs.appendFileSync(filePath, `feature ${i}\n`, 'utf8');
    runGit(repoPath, ['add', '.']);
    runGit(repoPath, ['commit', '-m', `feature commit ${i}`]);
    featureCommits.push(runGit(repoPath, ['rev-parse', 'HEAD']));
  }

  runGit(repoPath, ['checkout', 'main']);
  fs.appendFileSync(filePath, 'main update\n', 'utf8');
  runGit(repoPath, ['add', '.']);
  runGit(repoPath, ['commit', '-m', 'main commit']);
  const targetHash = runGit(repoPath, ['rev-parse', 'HEAD']);
  runGit(repoPath, ['tag', 'target-tag']);

  runGit(repoPath, ['checkout', 'general-ledger-2']);
  fs.appendFileSync(filePath, 'feature final\n', 'utf8');
  runGit(repoPath, ['add', '.']);
  runGit(repoPath, ['commit', '-m', 'feature commit 4']);
  featureCommits.push(runGit(repoPath, ['rev-parse', 'HEAD']));

  const repoApi = createRepoApi(repoPath);
  const selection = {
    type: 'tag',
    tag: 'target-tag',
    commitHash: targetHash,
    sinceDate: new Date(0)
  } as const;

  const commits = await getCommitsForSelection(repoApi, selection);
  const commitHashes = new Set(commits.map(commit => commit.hash));

  assert.strictEqual(commitHashes.size, 4);
  const missing = featureCommits.filter(hash => !commitHashes.has(hash));
  const extra = [...commitHashes].filter(hash => !featureCommits.includes(hash));
  assert.strictEqual(missing.length, 0, `Missing: ${missing.join(', ')} Extra: ${extra.join(', ')}`);
});
