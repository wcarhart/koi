import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Build a separate site from synthetic release inputs; never create repository tags.
const site = path.resolve(import.meta.dirname, '../..');
const repository = path.dirname(site);
const directory = mkdtempSync(path.join(tmpdir(), 'koi-version-site-'));
const cache = path.join(directory, 'cache');
mkdirSync(cache);
try {
  const catalog = [
    { id: 'v2.0.4', commit: 'a'.repeat(40) },
    { id: 'v2.0.5', commit: 'b'.repeat(40) },
    { id: 'v2.1.0', commit: 'c'.repeat(40) },
  ];
  for (const { id, commit } of catalog) {
    const snapshot = path.join(cache, commit);
    mkdirSync(snapshot);
    cpSync(path.join(repository, 'docs'), path.join(snapshot, 'docs'), {
      recursive: true,
    });
    cpSync(path.join(repository, 'koi'), path.join(snapshot, 'koi'));
    const library = path.join(snapshot, 'koi');
    writeFileSync(
      library,
      readFileSync(library, 'utf8') + `\n# Source fixture for ${id}\n`,
    );
    // Exercise the shared rendering overlay against docs published before it existed.
    const installation = path.join(snapshot, 'docs/getting-started/install.md');
    writeFileSync(
      installation,
      readFileSync(installation, 'utf8').replace(
        /^\*\*Nervous to source an unknown script\?\*\*.*\n\n/m,
        '',
      ),
    );
    if (id === 'v2.0.4') {
      const sections = readFileSync(installation, 'utf8').split(/(?=^## )/m);
      const dependencies = sections.findIndex((section) =>
        section.startsWith('## Dependencies\n'),
      );
      sections.splice(1, 0, ...sections.splice(dependencies, 1));
      writeFileSync(installation, sections.join(''));
    }
    const introduction = path.join(snapshot, 'docs/introduction.md');
    writeFileSync(
      introduction,
      readFileSync(introduction, 'utf8') +
        `\n${id === 'v2.0.4' ? 'olderonly' : 'neweronly'}\n`,
    );
    if (id === 'v2.1.0') {
      const install = path.join(snapshot, 'docs/getting-started/install.md');
      writeFileSync(
        install,
        readFileSync(install, 'utf8') +
          '\n## Installation notes\n\nstableinstallprose\n',
      );
    }
    if (id === 'v2.0.5') {
      const navigation = path.join(snapshot, 'docs/navigation.json');
      const entries = JSON.parse(readFileSync(navigation, 'utf8'));
      entries.push({
        file: 'release-only.md',
        slug: 'release-only',
        group: 'Examples',
      });
      writeFileSync(navigation, JSON.stringify(entries));
      writeFileSync(
        path.join(snapshot, 'docs/release-only.md'),
        '---\ntitle: Release exclusive\ndescription: Available in just one fixture\nlayout: article\n---\nA document introduced by this release.\n',
      );
    }
  }
  writeFileSync(path.join(cache, 'catalog.json'), JSON.stringify(catalog));
  const listener = createServer();
  await new Promise<void>((resolve) =>
    listener.listen(0, '127.0.0.1', resolve),
  );
  const address = listener.address();
  if (!address || typeof address === 'string')
    throw new Error('Could not allocate a browser test port.');
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  );
  const env = {
    ...process.env,
    KOI_VERSIONS_CACHE: cache,
    KOI_SITE_OUT_DIR: path.join(directory, 'dist'),
    KOI_TEST_VERSIONS: '1',
    KOI_BROWSER_ARTIFACTS: path.join(directory, 'browser-results'),
    KOI_SITE_TEST_PORT: String(port),
  };
  execFileSync('pnpm', ['build'], { cwd: site, env, stdio: 'inherit' });
  execFileSync(
    'pnpm',
    [
      'exec',
      'playwright',
      'test',
      'versions.spec.ts',
      'review-source.spec.ts',
      ...process.argv.slice(2),
    ],
    {
      cwd: site,
      env,
      stdio: 'inherit',
    },
  );
  // Development renders the 404 fallback at the requested URL, unlike static preview.
  execFileSync(
    'pnpm',
    [
      'exec',
      'playwright',
      'test',
      'versions.spec.ts',
      '--grep',
      'unknown documentation versions|stable documentation links',
    ],
    { cwd: site, env: { ...env, KOI_SITE_TEST_DEV: '1' }, stdio: 'inherit' },
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
