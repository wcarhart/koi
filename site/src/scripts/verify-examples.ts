import { spawnSync } from 'node:child_process';
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root, docsRoot } from '../lib/content';
import {
  argumentScript,
  defaultArgument,
  helpScript,
  defaultHelp,
} from '../lib/builders';

// Only these reviewed scripts and argument vectors may be executed by this check.
const fixtures = [
  { script: 'direct-calls', args: [], output: 'direct-calls' },
  {
    script: 'archive',
    args: ['src', '-o', 'backup.tar.gz', '-v'],
    output: 'archive',
  },
  { script: 'home-cli', args: ['status', '--all'], output: 'home-cli-status' },
  {
    script: 'home-cli',
    args: ['deploy', 'service', 'api', '-f', 'compose.prod.yaml'],
    output: 'home-cli-service',
  },
  {
    script: 'home-cli',
    args: ['deploy', 'stack', 'stacks/production'],
    output: 'home-cli-stack',
  },
  { script: 'home-help', args: ['help'], output: 'home-help' },
  { script: 'home-help', args: ['-h'], output: 'home-help' },
  {
    script: 'home-help',
    args: ['archive', '--help'],
    output: 'home-help-command',
  },
  { script: 'hero', args: [], output: 'hero-default' },
  { script: 'hero', args: ['--exclaim'], output: 'hero-loud' },
  { script: 'hero', args: ['--name', ''], output: 'hero-default' },
  { script: 'hero', args: ['--name', 'Will'], output: 'hero-named' },
  { script: 'hero', args: ['-h'], output: 'hero-help' },
  { script: 'hero', args: ['--name', 'Will', '-e'], output: 'hero' },
  { script: 'quickstart-greet', args: [], output: 'quickstart-greet' },
  {
    script: 'quickstart-greet',
    args: ['--name', 'Will'],
    output: 'quickstart-greet-named',
  },
  { script: 'quickstart-greet', args: ['--help'], output: 'greet-help' },
  { script: 'greet', args: [], output: 'greet' },
  { script: 'greet', args: ['--help'], output: 'greet-help' },
  { script: 'help', args: ['--help'], output: 'help' },
  { script: 'copy', args: ['source.txt', '-v', 'out'], output: 'copy' },
  {
    script: 'commands',
    args: ['deploy', 'app', '-e', 'production'],
    output: 'commands',
  },
];
const version = spawnSync('bash', [
  '-c',
  '(( BASH_VERSINFO[0] > 5 || (BASH_VERSINFO[0] == 5 && BASH_VERSINFO[1] >= 2) ))',
]);
assert.equal(
  version.status,
  0,
  'Documentation examples require Bash 5.2+ on PATH.',
);
assert.equal(
  argumentScript(defaultArgument),
  readFileSync(path.join(docsRoot, 'examples/greet.sh'), 'utf8'),
  'Argument builder default must match its documented source.',
);
assert.equal(
  helpScript(defaultHelp),
  readFileSync(path.join(docsRoot, 'examples/help.sh'), 'utf8'),
  'Help builder default must match its documented source.',
);
for (const fixture of fixtures) {
  const filename = path.join(docsRoot, 'examples', fixture.script + '.sh');
  const syntax = spawnSync('bash', ['-n', filename], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  const sandbox = ['archive', 'direct-calls'].includes(fixture.script)
    ? mkdtempSync(path.join(tmpdir(), 'koi-example-'))
    : undefined;
  try {
    if (sandbox) {
      mkdirSync(path.join(sandbox, 'src'));
      writeFileSync(
        path.join(sandbox, 'src', 'release.txt'),
        'release contents\n',
      );
    }
    const result = spawnSync(
      'bash',
      ['hero', 'quickstart-greet'].includes(fixture.script)
        ? ['-c', readFileSync(filename, 'utf8'), 'greet.sh', ...fixture.args]
        : fixture.script === 'home-cli'
          ? [
              '-c',
              'docker() { printf "docker"; printf " <%s>" "$@"; printf "\\n"; }; terraform() { printf "terraform"; printf " <%s>" "$@"; printf "\\n"; }; source "$@"',
              'cli',
              filename,
              ...fixture.args,
            ]
          : [filename, ...fixture.args],
      {
        env: { ...process.env, PATH: root + path.delimiter + process.env.PATH },
        cwd: sandbox ?? root,
        encoding: 'utf8',
        timeout: 5000,
      },
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.equal(result.stderr, '');
    assert.equal(
      result.stdout,
      readFileSync(
        path.join(docsRoot, 'examples', fixture.output + '.txt'),
        'utf8',
      ),
      `Captured output changed: ${fixture.output}.txt`,
    );
    if (sandbox) {
      const archive = path.join(
        sandbox,
        fixture.script === 'archive' ? 'backup.tar.gz' : 'release.tar.gz',
      );
      const extracted = spawnSync('tar', ['-xOzf', archive, './release.txt'], {
        encoding: 'utf8',
      });
      assert.equal(extracted.status, 0, extracted.stderr);
      assert.equal(extracted.stdout, 'release contents\n');
    }
  } finally {
    if (sandbox) rmSync(sandbox, { recursive: true, force: true });
  }
}
console.log(
  `Verified ${fixtures.length} documentation invocations and both builder defaults against real koi.`,
);
