export type RangeType = 'days' | 'tag' | 'commit';

interface RangeSelectionBase {
  type: RangeType;
  sinceDate: Date;
}

export interface DaysSelection extends RangeSelectionBase {
  type: 'days';
  days: number;
}

export interface TagSelection extends RangeSelectionBase {
  type: 'tag';
  tag: string;
  commitHash: string;
}

export interface CommitSelection extends RangeSelectionBase {
  type: 'commit';
  commitHash: string;
}

export type RangeSelection = DaysSelection | TagSelection | CommitSelection;

export const MAX_LOG_ENTRIES = 200;

export function getCommitDate(commit: any): Date {
  return new Date(commit.authorDate || commit.commitDate || 0);
}

function normalizeHash(hash?: string): string | undefined {
  if (!hash) {
    return undefined;
  }
  const trimmed = hash.trim();
  return trimmed || undefined;
}

function normalizeCommit(commit: any): any {
  if (!commit) {
    return commit;
  }
  const normalizedHash = normalizeHash(commit.hash);
  if (normalizedHash && normalizedHash !== commit.hash) {
    return { ...commit, hash: normalizedHash };
  }
  return commit;
}

function normalizeParentHash(parent: any): string | undefined {
  if (!parent) {
    return undefined;
  }
  if (typeof parent === 'string') {
    return parent;
  }
  if (typeof parent.hash === 'string') {
    return parent.hash;
  }
  if (typeof parent.sha === 'string') {
    return parent.sha;
  }
  if (typeof parent.commit === 'string') {
    return parent.commit;
  }
  return undefined;
}

export async function collectAncestorHashes(
  repo: any,
  startHash: string,
  maxCommits: number
): Promise<Set<string>> {
  const visited = new Set<string>();
  const normalizedStart = normalizeHash(startHash);
  const queue: string[] = normalizedStart ? [normalizedStart] : [];

  while (queue.length > 0 && visited.size < maxCommits) {
    const hash = queue.shift();
    if (!hash || visited.has(hash)) {
      continue;
    }

    visited.add(hash);

    let commit: any;
    try {
      commit = await repo.getCommit(hash);
    } catch (error) {
      continue;
    }

    const parents = Array.isArray(commit.parents) ? commit.parents : [];
    for (const parent of parents) {
      const parentHash = normalizeHash(normalizeParentHash(parent));
      if (parentHash && !visited.has(parentHash)) {
        queue.push(parentHash);
      }
    }
  }

  return visited;
}

export async function getCommitsForSelection(repo: any, selection: RangeSelection): Promise<any[]> {
  if (selection.type === 'days') {
    const allCommits = await repo.log({ maxEntries: MAX_LOG_ENTRIES });
    return allCommits
      .filter((commit: any) => getCommitDate(commit) >= selection.sinceDate)
      .map(normalizeCommit);
  }

  const headCommits = await repo.log({ maxEntries: MAX_LOG_ENTRIES });
  if (headCommits.length === 0) {
    return [];
  }

  const targetHashes = await collectAncestorHashes(repo, selection.commitHash, MAX_LOG_ENTRIES);
  const headHashes = headCommits
    .map((commit: any): string | undefined => normalizeHash(commit.hash))
    .filter((hash: string | undefined): hash is string => Boolean(hash));
  const hasCommonAncestor = headHashes.some((hash: string) => targetHashes.has(hash));
  if (!hasCommonAncestor) {
    return [];
  }

  const filteredCommits = headCommits.filter((commit: any) => {
    const hash = normalizeHash(commit.hash);
    return hash ? !targetHashes.has(hash) : false;
  });

  return filteredCommits.map(normalizeCommit);
}
