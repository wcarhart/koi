import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  build,
  publishAssets,
  sha256,
  updateFormula,
} from '../scripts/release.mjs';
import { exec, mkdir, releaseFixture, root } from './distribution-fixture.mjs';

async function result(command, args, options) {
  try {
    return { ...(await exec(command, args, options)), status: 0 };
  } catch (error) {
    if (typeof error.code !== 'number') throw error;
    return { stdout: error.stdout, stderr: error.stderr, status: error.code };
  }
}

async function which(command) {
  const { stdout } = await exec('/bin/sh', [
    '-c',
    'command -v "$1"',
    'sh',
    command,
  ]);
  return stdout.trim();
}

beforeEach(async (t) => {
  const directory = realpathSync(
    mkdtempSync(path.join(tmpdir(), 'koi-distribution-test-')),
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const fixture = await releaseFixture(directory);
  t.after(() => fixture.close());
  const home = mkdir(path.join(directory, 'home'));
  const tools = mkdir(path.join(directory, 'tools'));
  const curl = await which('curl');
  writeFileSync(
    path.join(tools, 'curl'),
    `#!${process.execPath}\nconst { spawnSync } = require('node:child_process');\nconst args = process.argv.slice(2).map(arg => arg.replace('https://github.com', ${JSON.stringify(fixture.url)}));\nconst run = spawnSync(${JSON.stringify(curl)}, args, { stdio: 'inherit' });\nif (run.error) throw run.error;\nprocess.exit(run.status ?? 1);\n`,
    { mode: 0o755 },
  );
  const env = {
    ...process.env,
    HOME: home,
    PATH: `${tools}:${process.env.PATH}`,
  };
  delete env.KOI_VERSION;
  delete env.KOI_INSTALL_PATH;
  t.fixture = Object.assign(fixture, { directory, home, tools, env });
});

function install(fixture, overrides = {}) {
  return result('/bin/sh', [path.join(root, 'scripts/install.sh')], {
    cwd: fixture.directory,
    env: { ...fixture.env, ...overrides },
  });
}

function assertInstalled(fixture, installed, destination) {
  assert.equal(installed.status, 0, installed.stderr);
  assert.deepEqual(
    readFileSync(destination),
    readFileSync(path.join(fixture.assets, 'koi')),
  );
  assert.equal(lstatSync(destination).mode & 0o777, 0o644);
  assert.ok(
    !readdirSync(path.dirname(destination)).some((name) =>
      name.startsWith('.koi-install.'),
    ),
  );
}

function pathCommand(output) {
  const command = output
    .split('\n')
    .find((line) => line.startsWith('export PATH='));
  assert.ok(command, output);
  return command;
}

test('default installation sources the library through PATH', async (t) => {
  const fixture = t.fixture;
  const installed = await install(fixture);
  assertInstalled(
    fixture,
    installed,
    path.join(fixture.home, '.local/bin/koi'),
  );
  const check = await result(
    'bash',
    [
      '--noprofile',
      '--norc',
      '-c',
      `${pathCommand(installed.stdout)}; source koi; declare -F koi::parse`,
    ],
    { cwd: fixture.directory, env: fixture.env },
  );
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /koi::parse/);
});

test('both overrides create the parent directory and safely quote its PATH command', async (t) => {
  const fixture = t.fixture;
  const parent = path.join(fixture.home, "bin 'quoted' $(touch oops)");
  const installed = await install(fixture, {
    KOI_INSTALL_PATH: parent,
    KOI_VERSION: 'v2.0.5',
  });
  assertInstalled(fixture, installed, path.join(parent, 'koi'));
  const check = await result(
    '/bin/sh',
    ['-c', `${pathCommand(installed.stdout)}; printf '%s' "$PATH"`],
    { cwd: fixture.directory, env: fixture.env },
  );
  assert.equal(check.status, 0, check.stderr);
  assert.ok(check.stdout.startsWith(parent + ':'));
  assert.ok(!existsSync(path.join(fixture.directory, 'oops')));
});

test('a relative parent supports updating an existing library and recognizing PATH', async (t) => {
  const fixture = t.fixture;
  const parent = mkdir(path.join(fixture.directory, 'custom'));
  const destination = path.join(parent, 'koi');
  writeFileSync(destination, 'old library');
  const installed = await install(fixture, {
    KOI_INSTALL_PATH: 'custom/',
    KOI_VERSION: 'v2.0.5',
    PATH: `${parent}:${fixture.env.PATH}`,
  });
  assertInstalled(fixture, installed, destination);
  assert.doesNotMatch(installed.stdout, /export PATH=/);
  assert.match(installed.stdout, /source koi/);
});

test('a parent directory named koi still gets a koi library file inside it', async (t) => {
  const fixture = t.fixture;
  const parent = path.join(fixture.home, 'bin/koi');
  assertInstalled(
    fixture,
    await install(fixture, { KOI_INSTALL_PATH: parent }),
    path.join(parent, 'koi'),
  );
});

test('empty overrides use the defaults', async (t) => {
  const fixture = t.fixture;
  assertInstalled(
    fixture,
    await install(fixture, { KOI_INSTALL_PATH: '', KOI_VERSION: '' }),
    path.join(fixture.home, '.local/bin/koi'),
  );
});

test('unknown versions and missing assets leave the installed file untouched', async (t) => {
  const fixture = t.fixture;
  const destination = path.join(fixture.home, 'koi');
  writeFileSync(destination, 'old library');
  for (const missing of ['koi', 'SHA256SUMS']) {
    fixture.missing.add(`/wcarhart/koi/releases/download/v2.0.5/${missing}`);
    const installed = await install(fixture, {
      KOI_INSTALL_PATH: fixture.home,
      KOI_VERSION: 'v2.0.5',
    });
    assert.notEqual(installed.status, 0);
    assert.equal(readFileSync(destination, 'utf8'), 'old library');
    assert.ok(
      !readdirSync(fixture.home).some((name) =>
        name.startsWith('.koi-install.'),
      ),
    );
    fixture.missing.clear();
  }
  assert.notEqual(
    (
      await install(fixture, {
        KOI_INSTALL_PATH: fixture.home,
        KOI_VERSION: 'v2.0.999',
      })
    ).status,
    0,
  );
  assert.equal(readFileSync(destination, 'utf8'), 'old library');
});

test('invalid checksums preserve the installed file and clean staging directories', async (t) => {
  const fixture = t.fixture;
  const destination = path.join(fixture.home, 'koi');
  writeFileSync(destination, 'old library');
  for (const checksum of [
    '0'.repeat(64) + '  koi\n',
    '',
    'bad  koi\n',
    '0'.repeat(64) + '  other\n',
  ]) {
    writeFileSync(path.join(fixture.assets, 'SHA256SUMS'), checksum);
    assert.notEqual(
      (
        await install(fixture, {
          KOI_INSTALL_PATH: fixture.home,
          KOI_VERSION: 'v2.0.5',
        })
      ).status,
      0,
    );
    assert.equal(readFileSync(destination, 'utf8'), 'old library');
    assert.ok(
      !readdirSync(fixture.home).some((name) =>
        name.startsWith('.koi-install.'),
      ),
    );
  }
});

test('invalid or legacy versions fail without installing a library', async (t) => {
  const fixture = t.fixture;
  for (const tag of [
    'v1.2.1',
    'v2.0.0-rc.1',
    '2.0.0',
    'v02.0.0',
    '../../main',
    'latest',
    'v2.0.5\nv2.0.6',
  ]) {
    assert.notEqual(
      (await install(fixture, { KOI_VERSION: tag })).status,
      0,
      tag,
    );
    assert.ok(!existsSync(path.join(fixture.home, '.local/bin/koi')));
  }
});

test('a legacy latest release is rejected', async (t) => {
  t.fixture.latest = 'v1.2.1';
  assert.notEqual((await install(t.fixture)).status, 0);
  assert.ok(!existsSync(path.join(t.fixture.home, '.local/bin/koi')));
});

test('destination directories and managed symlinks are not replaced', async (t) => {
  const fixture = t.fixture;
  const destination = mkdir(path.join(fixture.home, 'koi'));
  assert.notEqual(
    (await install(fixture, { KOI_INSTALL_PATH: fixture.home })).status,
    0,
  );
  rmSync(destination, { recursive: true });
  const target = path.join(fixture.home, 'managed');
  writeFileSync(target, 'managed library');
  symlinkSync(target, destination);
  assert.notEqual(
    (await install(fixture, { KOI_INSTALL_PATH: fixture.home })).status,
    0,
  );
  assert.equal(readFileSync(target, 'utf8'), 'managed library');
  assert.ok(lstatSync(destination).isSymbolicLink());
});

test('an install path that is a file fails without changing that file', async (t) => {
  const fixture = t.fixture;
  const parent = path.join(fixture.home, 'not-a-directory');
  writeFileSync(parent, 'keep this file');
  assert.notEqual(
    (await install(fixture, { KOI_INSTALL_PATH: parent })).status,
    0,
  );
  assert.equal(readFileSync(parent, 'utf8'), 'keep this file');
});

test(
  'an unwritable parent fails',
  { skip: process.getuid?.() === 0 },
  async (t) => {
    const parent = mkdir(path.join(t.fixture.home, 'readonly'));
    chmodSync(parent, 0o555);
    try {
      assert.notEqual(
        (await install(t.fixture, { KOI_INSTALL_PATH: parent })).status,
        0,
      );
      assert.ok(!existsSync(path.join(parent, 'koi')));
    } finally {
      chmodSync(parent, 0o755);
    }
  },
);

test('shasum works when sha256sum is unavailable', async (t) => {
  try {
    await which('shasum');
  } catch {
    t.skip('shasum is not installed');
    return;
  }
  const fixture = t.fixture;
  for (const command of [
    'cat',
    'sed',
    'grep',
    'awk',
    'mkdir',
    'mktemp',
    'rm',
    'chmod',
    'mv',
    'shasum',
  ]) {
    symlinkSync(await which(command), path.join(fixture.tools, command));
  }
  assertInstalled(
    fixture,
    await install(fixture, { PATH: fixture.tools }),
    path.join(fixture.home, '.local/bin/koi'),
  );
});

test('release bytes are deterministic and system tar extracts a sourceable archive', async (t) => {
  const fixture = t.fixture;
  const second = path.join(fixture.directory, 'second');
  build({ source: root, output: second, tag: 'v2.0.5', epoch: 1234567890 });
  for (const name of readdirSync(fixture.assets))
    assert.deepEqual(
      readFileSync(path.join(fixture.assets, name)),
      readFileSync(path.join(second, name)),
    );
  const library = readFileSync(path.join(second, 'koi'));
  assert.match(library.toString(), /# koi 2\.0\.5/);
  assert.match(library.toString(), /MIT License/);
  const archive = path.join(second, 'koi-2.0.5.tar.gz');
  const { stdout } = await exec('tar', ['-tzf', archive]);
  assert.deepEqual(stdout.trim().split('\n'), [
    'koi-2.0.5/koi',
    'koi-2.0.5/LICENSE',
    'koi-2.0.5/bin/koi',
  ]);
  const unpacked = mkdir(path.join(fixture.directory, 'unpacked'));
  await exec('tar', ['-xzf', archive, '-C', unpacked]);
  assert.deepEqual(
    readFileSync(path.join(unpacked, 'koi-2.0.5/bin/koi')),
    library,
  );
  assert.equal(
    (
      await result('bash', [
        '-c',
        'source "$1" && declare -F koi::parse',
        'bash',
        path.join(unpacked, 'koi-2.0.5/bin/koi'),
      ])
    ).status,
    0,
  );
  for (const line of readFileSync(path.join(second, 'SHA256SUMS'), 'utf8')
    .trim()
    .split('\n')) {
    const [digest, name] = line.split(/\s+/);
    assert.equal(sha256(readFileSync(path.join(second, name))), digest);
  }
});

test('formula updates handle the first release and retries without changing installation', (t) => {
  const formula = path.join(t.fixture.directory, 'koi.rb');
  writeFileSync(formula, readFileSync(path.join(root, 'Formula/koi.rb')));
  const installation = readFileSync(formula, 'utf8').split('  def install')[1];
  for (const tag of ['v2.0.0', 'v2.0.5', 'v2.0.5']) {
    updateFormula({ formula, tag, digest: 'a'.repeat(64) });
    const text = readFileSync(formula, 'utf8');
    assert.equal(text.match(/^  url "/gm).length, 1);
    assert.equal(text.match(/^  sha256 "/gm).length, 1);
    assert.ok(
      text.includes(`/releases/download/${tag}/koi-${tag.slice(1)}.tar.gz`),
    );
    assert.equal(text.split('  def install')[1], installation);
  }
  for (const tag of ['2.0.0', 'v1.2.1', 'v2.0.0-rc.1'])
    assert.throws(() =>
      updateFormula({ formula, tag, digest: 'a'.repeat(64) }),
    );
});

test('publication retries reuse identical assets and upload missing assets', async (t) => {
  const fixture = t.fixture;
  const calls = [];
  const metadata = fixture.metadata();
  const run = async (...args) => {
    calls.push(args);
    if (args[0] === 'api') return JSON.stringify(metadata);
    if (args[1] === 'download') {
      const name = args[args.indexOf('--pattern') + 1];
      writeFileSync(
        args[args.indexOf('--output') + 1],
        readFileSync(path.join(fixture.assets, name)),
      );
    }
    return '';
  };
  const options = {
    directory: fixture.assets,
    tag: 'v2.0.5',
    repository: 'wcarhart/koi',
    run,
  };
  await publishAssets(options);
  assert.ok(!calls.some((args) => args[1] === 'upload'));
  metadata.assets = [];
  await publishAssets(options);
  assert.equal(calls.filter((args) => args[1] === 'upload').length, 3);
  metadata.immutable = true;
  await assert.rejects(
    publishAssets(options),
    /mutable, published stable release/,
  );
});

test('publication rejects existing assets with different bytes', async (t) => {
  const fixture = t.fixture;
  const run = async (...args) => {
    if (args[0] === 'api') return JSON.stringify(fixture.metadata());
    assert.equal(args[1], 'download');
    writeFileSync(args[args.indexOf('--output') + 1], 'different asset');
    return '';
  };
  await assert.rejects(
    publishAssets({
      directory: fixture.assets,
      tag: 'v2.0.5',
      repository: 'wcarhart/koi',
      run,
    }),
    /refusing to overwrite/,
  );
});

test('release CLI builds assets and updates a formula using the workflow arguments', async (t) => {
  const fixture = t.fixture;
  const output = path.join(fixture.directory, 'cli-assets');
  const script = path.join(root, 'scripts/release.mjs');
  await exec(process.execPath, [
    script,
    'build',
    '--tag',
    'v2.0.5',
    '--epoch',
    '1234567890',
    '--source',
    root,
    '--output',
    output,
  ]);
  assert.deepEqual(
    readFileSync(path.join(output, 'SHA256SUMS')),
    readFileSync(path.join(fixture.assets, 'SHA256SUMS')),
  );
  const formula = path.join(fixture.directory, 'cli-formula.rb');
  writeFileSync(formula, readFileSync(path.join(root, 'Formula/koi.rb')));
  const digest = sha256(readFileSync(path.join(output, 'koi-2.0.5.tar.gz')));
  await exec(process.execPath, [
    script,
    'formula',
    '--tag',
    'v2.0.5',
    '--sha256',
    digest,
    '--repository',
    'wcarhart/koi',
    '--formula',
    formula,
  ]);
  assert.ok(readFileSync(formula, 'utf8').includes(`sha256 "${digest}"`));
  const invalid = await result(process.execPath, [
    script,
    'build',
    '--tag',
    'v1.2.1',
    '--epoch',
    '0',
    '--output',
    path.join(fixture.directory, 'invalid'),
  ]);
  assert.notEqual(invalid.status, 0);
  assert.ok(!existsSync(path.join(fixture.directory, 'invalid')));
});
