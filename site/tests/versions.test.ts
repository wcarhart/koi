import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  copyFileSync,
  cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { versionDestination } from '../src/lib/version-navigation';
import { getBuilderProfile } from '../src/lib/builder-profiles';

const cache = mkdtempSync(path.join(tmpdir(), 'koi-versions-'));
process.env.KOI_VERSIONS_CACHE = cache;
const {
  getVersions,
  getDefaultVersion,
  getVersion,
  defaultDocsUrl,
  stableVersion,
  builderProfile,
} = await import('../src/lib/versions');
const { getDocs, exportMarkdown, rewriteDocLinks } =
  await import('../src/lib/content');
const { searchEntries, docsUrl, getStandaloneInstallation } =
  await import('../src/lib/documentation');
const { discoverReleases, prepareVersions } =
  await import('../src/scripts/prepare-versions');
const { search } = await import('../src/lib/search');
const { GET: sourceEndpoint } =
  await import('../src/pages/versions/[version]/koi');
const { getStableAliases } = await import('../src/lib/stable-aliases');
const { getAgentGuidance, getFullDocumentation } =
  await import('../src/lib/agent-guidance');
const repository = path.resolve(import.meta.dirname, '../..');
const catalog = [
  { id: 'v2.0.4', commit: 'a'.repeat(40) },
  { id: 'v2.0.5', commit: 'b'.repeat(40) },
];
for (const { commit, id } of catalog) {
  const directory = path.join(cache, commit);
  mkdirSync(path.join(directory, 'docs/reference'), { recursive: true });
  writeFileSync(
    path.join(directory, 'docs/navigation.json'),
    JSON.stringify([
      { file: 'introduction.md', slug: '', group: 'Introduction' },
      { file: 'install.md', slug: 'install', group: 'Introduction' },
      { file: 'quickstart.md', slug: 'quickstart', group: 'Introduction' },
      {
        file: 'reference/widget.md',
        slug: 'reference/widget',
        group: 'Reference',
      },
    ]),
  );
  writeFileSync(
    path.join(directory, 'docs/introduction.md'),
    `---\ntitle: Introduction\ndescription: Introduction to ${id}\nlayout: article\n---\n${id === 'v2.0.4' ? 'olderonly' : 'neweronly'}\n[Widget](/docs/reference/widget#example)\n`,
  );
  writeFileSync(
    path.join(directory, 'docs/install.md'),
    `---\ntitle: Install\ndescription: Installation for ${id}\nlayout: article\n---\nInstall for ${id}.\n<!-- koi:install koi -->\n## Dependencies\n[Quickstart](/docs/quickstart)\n`,
  );
  writeFileSync(
    path.join(directory, 'docs/quickstart.md'),
    '---\ntitle: Quickstart\ndescription: A first script\nlayout: article\n---\nStart here.\n',
  );
  writeFileSync(
    path.join(directory, 'docs/reference/widget.md'),
    '---\ntitle: Widget\ndescription: A historical document\nlayout: article\n---\n## Example\n[Home](/docs)\n',
  );
  writeFileSync(
    path.join(directory, 'docs/llms.md'),
    '# Historical docs\n\n## Optional\n\n- [Complete documentation](https://koishell.com/llms-full.txt)\n- [Koi skill](https://koishell.com/skill.md)\n',
  );
  copyFileSync(path.join(repository, 'koi'), path.join(directory, 'koi'));
}
writeFileSync(path.join(cache, 'catalog.json'), JSON.stringify(catalog));
test.after(() => rmSync(cache, { recursive: true, force: true }));

test('catalog sorts releases, defaults to stable, and rejects missing or incomplete versions', () => {
  assert.deepEqual(
    getVersions().map((version) => version.id),
    ['unreleased', 'v2.0.5', 'v2.0.4'],
  );
  assert.equal(defaultDocsUrl(), '/docs/v2.0.5');
  assert.throws(() => getVersion('v1.2.1'), /Unknown/);
  assert.throws(() => getVersion('v2.0.6'), /Unknown/);
  assert.equal(stableVersion('v1.0.0'), undefined);
  assert.equal(stableVersion('v2.0.0-rc.1'), undefined);
  assert.equal(stableVersion('v2.00.0'), undefined);
  assert.deepEqual(stableVersion('v3.0.0'), [3, 0, 0]);
  const original = readFileSync(path.join(cache, 'catalog.json'), 'utf8');
  try {
    writeFileSync(path.join(cache, 'catalog.json'), '[]');
    assert.equal(defaultDocsUrl(), '/docs');
    writeFileSync(
      path.join(cache, 'catalog.json'),
      JSON.stringify([{ id: 'v2.1.0', commit: 'c'.repeat(40) }]),
    );
    assert.throws(() => getVersions(), /Incomplete snapshot/);
  } finally {
    writeFileSync(path.join(cache, 'catalog.json'), original);
  }
});

test('release discovery paginates, filters, sorts numerically, and fails on unavailable metadata', async () => {
  let calls = 0;
  const first = Array.from({ length: 100 }, (_, index) => ({
    tag_name: `v1.0.${index}`,
    draft: false,
    prerelease: false,
  }));
  const pages = [
    first,
    [
      { tag_name: 'v2.0.9', draft: false, prerelease: false },
      { tag_name: 'v2.0.10', draft: false, prerelease: false },
      { tag_name: 'v3.0.0', draft: false, prerelease: false },
      { tag_name: 'v2.1.0', draft: true, prerelease: false },
      { tag_name: 'v2.2.0', draft: false, prerelease: true },
    ],
  ];
  const request = (async (url: string | URL | Request) => {
    assert.match(String(url), new RegExp(`page=${calls + 1}$`));
    return Response.json(pages[calls++]);
  }) as typeof fetch;
  assert.deepEqual(await discoverReleases(request), [
    'v3.0.0',
    'v2.0.10',
    'v2.0.9',
  ]);
  assert.equal(calls, 2);
  assert.deepEqual(
    await discoverReleases((async () => Response.json([])) as typeof fetch),
    [],
  );
  await assert.rejects(
    discoverReleases(
      (async () => new Response('', { status: 503 })) as typeof fetch,
    ),
    /503/,
  );
});

test('historical content, links, Markdown, aggregates, and search stay in their selected version', async () => {
  const old = getVersion('v2.0.4');
  const recent = getVersion('v2.0.5');
  const docs = await getDocs(old);
  assert.match(docs[0].prose, /olderonly/);
  assert.doesNotMatch(docs[0].prose, /neweronly/);
  assert.match(
    docs[0].prose,
    /href="\/docs\/v2.0.4\/reference\/widget#example"/,
  );
  assert.match(
    exportMarkdown(docs[0]),
    /https:\/\/koishell.com\/docs\/v2.0.4\/reference\/widget/,
  );
  assert.match(
    await getFullDocumentation(old),
    /Source: https:\/\/koishell.com\/docs\/v2.0.4/,
  );
  assert.equal(search(await searchEntries(old), 'neweronly').length, 0);
  assert.ok(search(await searchEntries(recent), 'neweronly').length > 0);
  assert.ok(
    search(await searchEntries(old), 'olderonly').every((entry) =>
      entry.url.startsWith(old.base),
    ),
  );
  assert.equal(
    rewriteDocLinks('`[Home](/docs)` and [Home](/docs)', old),
    '`[Home](/docs)` and [Home](/docs/v2.0.4)',
  );
  assert.equal(rewriteDocLinks('[/docs](/docs)', old), '[/docs](/docs/v2.0.4)');
  assert.equal(
    rewriteDocLinks('[Home][home]\n\n[home]: /docs\n', old),
    '[Home][home]\n\n[home]: /docs/v2.0.4\n',
  );
  const literal = '```bash\n[Home](/docs)\n```\n\n[Home](/docs)\n';
  assert.equal(
    rewriteDocLinks(literal, old),
    '```bash\n[Home](/docs)\n```\n\n[Home](/docs/v2.0.4)\n',
  );
});

test('selector preserves supported headings, drops missing fragments, and chooses nearest surviving docs', () => {
  const doc = (slug: string, base: string) => ({
    slug,
    url: base + (slug ? '/' + slug : ''),
    id: `doc-${slug}`,
    headings: [{ id: 'doc-heading', fragment: 'heading' }],
  });
  const source = {
    id: 'a',
    base: '/docs',
    docs: ['', 'before', 'missing', 'after'].map((slug) => doc(slug, '/docs')),
    indexes: ['reference'],
  };
  const target = {
    id: 'b',
    base: '/docs/v2.0.4',
    docs: ['', 'before', 'after'].map((slug) => doc(slug, '/docs/v2.0.4')),
    indexes: ['reference'],
  };
  assert.equal(
    versionDestination(source, target, '/docs/before', '#heading'),
    '/docs/v2.0.4/before#heading',
  );
  assert.equal(
    versionDestination(source, target, '/docs/before', '#absent'),
    '/docs/v2.0.4/before',
  );
  assert.equal(
    versionDestination(source, target, '/docs/missing'),
    '/docs/v2.0.4/before',
  );
  assert.equal(
    versionDestination(source, target, '/docs/reference'),
    '/docs/v2.0.4/reference',
  );
  assert.equal(
    versionDestination(source, { ...target, docs: [] }, '/docs/missing'),
    '/docs/v2.0.4',
  );
});

test('source endpoint preserves bytes and compatible builder profiles execute against extracted source', async () => {
  const version = getVersion('v2.0.4');
  const response = sourceEndpoint({ props: { version } });
  assert.equal(await response.text(), readFileSync(version.sourceFile, 'utf8'));
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  const profile = getBuilderProfile(version.builderProfile)!;
  assert.equal(builderProfile('v2.1.0'), undefined);
  assert.equal(builderProfile('v3.0.0'), undefined);
  assert.equal(getBuilderProfile(undefined), undefined);
  const script = path.join(cache, 'builder.sh');
  writeFileSync(script, profile.argumentScript(profile.defaultArgument));
  const result = spawnSync('bash', [script, '--name', 'Historical'], {
    cwd: path.dirname(version.sourceFile),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Historical/);
  writeFileSync(script, profile.helpScript(profile.defaultHelp));
  execFileSync('bash', [script, '--help'], {
    cwd: path.dirname(version.sourceFile),
  });
});

test('preparation extracts the tagged tree without checking it out and preserves the catalog on failure', async () => {
  const isolated = path.join(cache, 'repository');
  mkdirSync(isolated);
  cpSync(
    path.join(cache, 'a'.repeat(40), 'docs'),
    path.join(isolated, 'docs'),
    { recursive: true },
  );
  writeFileSync(path.join(isolated, 'koi'), 'tagged source\n');
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: isolated,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
  git('init', '--initial-branch=main');
  git('add', 'docs', 'koi');
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.test',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
    'Fixture release',
  );
  git('tag', 'v2.0.4');
  git('remote', 'add', 'origin', isolated);
  const commit = git('rev-parse', 'HEAD');
  writeFileSync(path.join(isolated, 'koi'), 'working source\n');
  const output = path.join(cache, 'prepared');
  const request = (async () =>
    Response.json([
      { tag_name: 'v2.0.4', draft: false, prerelease: false },
    ])) as typeof fetch;
  await prepareVersions({ repositoryRoot: isolated, cache: output, request });
  const manifest = readFileSync(path.join(output, 'catalog.json'), 'utf8');
  assert.deepEqual(JSON.parse(manifest), [{ id: 'v2.0.4', commit }]);
  assert.equal(
    readFileSync(path.join(output, commit, 'koi'), 'utf8'),
    'tagged source\n',
  );
  assert.equal(
    readFileSync(path.join(isolated, 'koi'), 'utf8'),
    'working source\n',
  );
  assert.equal(git('branch', '--show-current'), 'main');
  await assert.rejects(
    prepareVersions({
      repositoryRoot: isolated,
      cache: output,
      request: (async () => new Response('', { status: 503 })) as typeof fetch,
    }),
  );
  assert.equal(
    readFileSync(path.join(output, 'catalog.json'), 'utf8'),
    manifest,
  );
});

test('default links and stable aliases move with the catalog without changing explicit versions', async () => {
  const manifestPath = path.join(cache, 'catalog.json');
  const original = readFileSync(manifestPath, 'utf8');
  try {
    for (const [snapshots, base, id] of [
      [catalog, '/docs/v2.0.5', 'v2.0.5'],
      [[catalog[0]], '/docs/v2.0.4', 'v2.0.4'],
      [[], '/docs', 'unreleased'],
    ] as const) {
      writeFileSync(manifestPath, JSON.stringify(snapshots));
      assert.equal(getDefaultVersion().id, id);
      assert.equal(await docsUrl(), base);
      assert.equal(await docsUrl('quickstart'), base + '/quickstart');
      const aliases = await getStableAliases();
      assert.equal(aliases['/docs/stable'], base);
      assert.equal(aliases['/docs/stable.md'], base + '.md');
      assert.equal(
        aliases['/docs/stable/quickstart.md'],
        base + '/quickstart.md',
      );
      assert.equal(aliases['/docs/stable/reference'], base + '/reference');
      assert.equal(
        aliases['/docs/stable/llms.txt'],
        (id === 'unreleased' ? '' : base) + '/llms.txt',
      );
      assert.equal(aliases['/docs/stable/no-such-document'], undefined);
      assert.equal(
        await docsUrl('quickstart', getVersion()),
        '/docs/quickstart',
      );
      if (snapshots.length)
        assert.equal(
          await docsUrl('quickstart', getVersion('v2.0.4')),
          '/docs/v2.0.4/quickstart',
        );
    }
  } finally {
    writeFileSync(manifestPath, original);
  }
});

test('site entry links fall back only for known Unreleased docs and reject unknown or explicit missing slugs', async () => {
  assert.equal(await docsUrl('reference/add_arg'), '/docs/v2.0.5/quickstart');
  await assert.rejects(
    docsUrl('typo-no-such-doc'),
    /Unknown documentation entry/,
  );
  await assert.rejects(
    docsUrl('reference/add_arg', getVersion('v2.0.4')),
    /Unknown documentation entry/,
  );
});

test('standalone installation uses stable prose and current methods, with stable internal links', async () => {
  const doc = await getStandaloneInstallation();
  assert.match(doc.prose, /Install for v2.0.5/);
  assert.match(doc.prose, /brew install/);
  assert.match(doc.markdown, /brew install/);
  assert.match(doc.prose, /href="\/docs\/v2.0.5\/quickstart"/);
  const historical = (await getDocs(getVersion('v2.0.4'))).find(
    (entry) => entry.slug === 'install',
  )!;
  assert.match(historical.prose, /KOI_VERSION=v2.0.4/);
  assert.doesNotMatch(historical.prose, /brew install/);
});

test('stable namespace is reserved for aliases', async () => {
  const { validateManifest } = await import('../src/lib/content');
  for (const slug of ['stable', 'stable/quickstart']) {
    assert.throws(
      () => validateManifest([{ slug, file: 'page.md', group: 'Guides' }]),
      /invalid documentation route/,
    );
  }
});

test('released agent indexes link to their own full documentation export', async () => {
  for (const id of ['v2.0.4', 'v2.0.5']) {
    const version = getVersion(id);
    const index = await getAgentGuidance(version);
    assert.ok(
      index.includes(
        `[Complete documentation](https://koishell.com/docs/${id}/llms-full.txt)`,
      ),
    );
    assert.ok(!index.includes('](https://koishell.com/llms-full.txt)'));
    assert.ok(index.includes('[Koi skill](https://koishell.com/skill.md)'));
    const full = await getFullDocumentation(version);
    assert.ok(full.includes(`Source: https://koishell.com/docs/${id}`));
  }
  const unreleased = await getAgentGuidance();
  assert.ok(
    unreleased.includes(
      '[Complete documentation](https://koishell.com/llms-full.txt)',
    ),
  );
});
