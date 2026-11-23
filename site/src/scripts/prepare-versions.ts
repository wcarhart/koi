import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  compareVersions,
  repositoryRoot,
  stableVersion,
  versionsCache,
  type ReleaseSnapshot,
} from '../lib/versions';

interface Release {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
}
export async function discoverReleases(
  request: typeof fetch = fetch,
): Promise<string[]> {
  const tags = new Set<string>();
  for (let page = 1; ; page++) {
    const response = await request(
      `https://api.github.com/repos/wcarhart/koi/releases?per_page=100&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      },
    );
    if (!response.ok)
      throw new Error(`Release discovery failed (${response.status}).`);
    const releases: Release[] = await response.json();
    if (!Array.isArray(releases)) throw new Error('Invalid releases response.');
    for (const release of releases) {
      if (
        !release.draft &&
        !release.prerelease &&
        stableVersion(release.tag_name)
      )
        tags.add(release.tag_name);
    }
    if (releases.length < 100) break;
  }
  return [...tags].sort(compareVersions);
}
export async function prepareVersions(
  options: {
    repositoryRoot?: string;
    cache?: string;
    request?: typeof fetch;
  } = {},
): Promise<void> {
  const repository = options.repositoryRoot || repositoryRoot;
  const cache = options.cache || versionsCache;
  const tags = await discoverReleases(options.request);
  mkdirSync(cache, { recursive: true });
  const catalog: ReleaseSnapshot[] = [];
  for (const id of tags) {
    // Fetch exactly the published ref, including when the deployment checkout is shallow.
    execFileSync('git', ['fetch', '--no-tags', 'origin', `refs/tags/${id}`], {
      cwd: repository,
      stdio: 'pipe',
    });
    const commit = execFileSync('git', ['rev-parse', 'FETCH_HEAD^{commit}'], {
      cwd: repository,
      encoding: 'utf8',
    }).trim();
    const directory = path.join(cache, commit);
    if (!existsSync(directory)) {
      const staging = mkdtempSync(path.join(cache, '.snapshot-'));
      try {
        const archive = execFileSync(
          'git',
          ['archive', commit, 'docs', 'koi'],
          { cwd: repository, maxBuffer: 64 * 1024 * 1024 },
        );
        execFileSync('tar', ['-xf', '-', '-C', staging], { input: archive });
        if (
          !existsSync(path.join(staging, 'docs/navigation.json')) ||
          !existsSync(path.join(staging, 'koi'))
        )
          throw new Error(`Incomplete documentation in ${id}.`);
        renameSync(staging, directory);
      } finally {
        rmSync(staging, { recursive: true, force: true });
      }
    }
    catalog.push({ id, commit });
  }
  const temporary = path.join(cache, 'catalog.json.tmp');
  writeFileSync(temporary, JSON.stringify(catalog, null, 2) + '\n');
  renameSync(temporary, path.join(cache, 'catalog.json'));
  console.log(`Prepared ${catalog.length} released documentation versions.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await prepareVersions();
