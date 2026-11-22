// Usage: pnpm test:distribution:smoke {mise,brew}
// Homebrew tests run on disposable CI runners. Mise uses temporary directories.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exec, mkdir, releaseFixture, root } from './fixtures/distribution.mjs';
import { sha256, updateFormula } from '../scripts/release.mjs';

async function run(command, args, env, cwd) {
  const { stdout, stderr } = await exec(command, args, { env, cwd });
  process.stdout.write(stdout);
  process.stderr.write(stderr);
}

async function miseSmoke(fixture, directory) {
  const config = mkdir(path.join(directory, 'config'));
  const home = mkdir(path.join(directory, 'home'));
  writeFileSync(
    path.join(config, 'config.toml'),
    `[tools."github:wcarhart/koi"]\nversion = "latest"\napi_url = "${fixture.url}"\n`,
  );
  const env = {
    ...process.env,
    HOME: home,
    MISE_CONFIG_DIR: config,
    MISE_DATA_DIR: path.join(directory, 'data'),
    MISE_CACHE_DIR: path.join(directory, 'cache'),
    MISE_STATE_DIR: path.join(directory, 'state'),
    MISE_USE_VERSIONS_HOST: 'false',
    MISE_YES: '1',
  };
  for (const name of [
    'MISE_CONFIG_FILE',
    'MISE_GLOBAL_CONFIG_FILE',
    'MISE_OVERRIDE_CONFIG_FILENAMES',
  ])
    delete env[name];
  await run(
    'mise',
    ['use', '-g', 'github:wcarhart/koi@latest'],
    env,
    directory,
  );
  await run(
    'mise',
    [
      'exec',
      '--',
      'bash',
      '--noprofile',
      '--norc',
      '-c',
      'source koi && declare -F koi::parse',
    ],
    env,
    directory,
  );
}

async function brewSmoke(fixture, directory) {
  if (process.env.GITHUB_ACTIONS !== 'true')
    throw new Error(
      'Homebrew smoke testing is restricted to disposable GitHub Actions runners',
    );
  const env = { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1' };
  const tap = path.join(directory, 'tap');
  mkdir(path.join(tap, 'Formula'));
  const formula = path.join(tap, 'Formula/koi.rb');
  writeFileSync(formula, readFileSync(path.join(root, 'Formula/koi.rb')));
  updateFormula({
    formula,
    tag: 'v2.0.5',
    digest: sha256(readFileSync(path.join(fixture.assets, 'koi-2.0.5.tar.gz'))),
  });
  writeFileSync(
    formula,
    readFileSync(formula, 'utf8').replace(
      'https://github.com/wcarhart/koi/releases/download/v2.0.5/',
      `${fixture.url}/wcarhart/koi/releases/download/v2.0.5/`,
    ),
  );
  await run('git', ['-c', 'init.defaultBranch=main', 'init', tap], env);
  await run('git', ['-C', tap, 'add', 'Formula/koi.rb'], env);
  await run(
    'git',
    [
      '-C',
      tap,
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-m',
      'Local formula fixture',
    ],
    env,
  );
  await run('brew', ['tap', 'koitest/fixture', tap], env);
  try {
    await run(
      'brew',
      ['install', '--build-from-source', 'koitest/fixture/koi'],
      env,
    );
    await run('brew', ['test', 'koitest/fixture/koi'], env);
  } finally {
    for (const args of [
      ['uninstall', 'koitest/fixture/koi'],
      ['untap', 'koitest/fixture'],
    ]) {
      try {
        await run('brew', args, env);
      } catch (error) {
        process.stderr.write(error.stderr || error.message);
      }
    }
  }
}

async function main() {
  const manager = process.argv[2];
  if (!['mise', 'brew'].includes(manager))
    throw new Error('usage: pnpm test:distribution:smoke {mise,brew}');
  const directory = mkdtempSync(path.join(tmpdir(), 'koi-distribution-'));
  try {
    const fixture = await releaseFixture(directory);
    try {
      if (manager === 'mise') await miseSmoke(fixture, directory);
      else await brewSmoke(fixture, directory);
    } finally {
      await fixture.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stderr || error.message);
  process.exitCode = 1;
});
