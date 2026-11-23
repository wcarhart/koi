import type { BuilderProfileId } from './builder-profiles';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep this module usable by both the build preparation command and Astro.
declare const __KOI_REPO_ROOT__: string;
export const repositoryRoot =
  typeof __KOI_REPO_ROOT__ !== 'undefined'
    ? __KOI_REPO_ROOT__
    : fileURLToPath(new URL('../../../', import.meta.url));
export const versionsCache =
  process.env.KOI_VERSIONS_CACHE ||
  path.join(repositoryRoot, 'tmp/docs-versions');
export interface ReleaseSnapshot {
  id: string;
  commit: string;
}
export interface KoiVersion {
  id: string;
  label: string;
  commit?: string;
  docsRoot: string;
  sourceFile: string;
  sourceUrl: string;
  base: string;
  builderProfile?: BuilderProfileId;
}
export function stableVersion(tag: string): number[] | undefined {
  const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);
  if (!match || Number(match[1]) < 2) return;
  return match.slice(1).map(Number);
}
export function compareVersions(a: string, b: string): number {
  const left = stableVersion(a)!;
  const right = stableVersion(b)!;
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return right[index] - left[index];
  }
  return 0;
}
export function builderProfile(id: string): BuilderProfileId | undefined {
  // New release lines must be reviewed before enabling their interactive builders.
  return id === 'unreleased' || /^v2\.0\.(0|[1-9]\d*)$/.test(id)
    ? 'v2-initial'
    : undefined;
}
export function getVersions(): KoiVersion[] {
  const manifest = path.join(versionsCache, 'catalog.json');
  if (!existsSync(manifest) && process.env.KOI_REQUIRE_VERSIONS === '1') {
    throw new Error(
      'Missing version catalog. Run pnpm docs:prepare before the production build.',
    );
  }
  const snapshots: ReleaseSnapshot[] = existsSync(manifest)
    ? JSON.parse(readFileSync(manifest, 'utf8'))
    : [];
  const seen = new Set<string>();
  for (const snapshot of snapshots) {
    if (
      !stableVersion(snapshot.id) ||
      !/^[a-f0-9]{40}$/.test(snapshot.commit) ||
      seen.has(snapshot.id)
    ) {
      throw new Error(
        'Invalid documentation version catalog. Run pnpm docs:prepare again.',
      );
    }
    seen.add(snapshot.id);
  }
  return [
    {
      id: 'unreleased',
      label: 'Unreleased',
      docsRoot: path.join(repositoryRoot, 'docs'),
      sourceFile: path.join(repositoryRoot, 'koi'),
      sourceUrl: '/versions/unreleased/koi',
      base: '/docs',
      builderProfile: builderProfile('unreleased'),
    },
    ...snapshots
      .sort((a, b) => compareVersions(a.id, b.id))
      .map(({ id, commit }) => {
        const directory = path.join(versionsCache, commit);
        if (
          !existsSync(path.join(directory, 'docs/navigation.json')) ||
          !existsSync(path.join(directory, 'koi'))
        ) {
          throw new Error(
            `Incomplete snapshot for ${id}. Run pnpm docs:prepare again.`,
          );
        }
        return {
          id,
          label: id,
          commit,
          docsRoot: path.join(directory, 'docs'),
          sourceFile: path.join(directory, 'koi'),
          sourceUrl: `/versions/${id}/koi`,
          base: `/docs/${id}`,
          builderProfile: builderProfile(id),
        };
      }),
  ];
}
export function getVersion(id = 'unreleased'): KoiVersion {
  const version = getVersions().find((entry) => entry.id === id);
  if (!version) throw new Error(`Unknown documentation version: ${id}`);
  return version;
}
export function getDefaultVersion(): KoiVersion {
  const versions = getVersions();
  return versions[1] || versions[0];
}
export function defaultDocsUrl(): string {
  return getDefaultVersion().base;
}
export function documentationResourceUrl(
  resource: 'llms.txt' | 'llms-full.txt' | 'search.json',
  version: KoiVersion = getVersion(),
): string {
  return (version.id === 'unreleased' ? '' : version.base) + '/' + resource;
}
export function versionForPath(pathname: string): KoiVersion {
  const match = /^\/docs\/(v\d+\.\d+\.\d+)(?:\/|$)/.exec(pathname);
  return getVersion(match?.[1]);
}
export function versionedDocUrl(url: string, version: KoiVersion): string {
  return url.replace(/^\/docs(?=\/|#|\?|$|\.md(?:$|[?#]))/, version.base);
}
