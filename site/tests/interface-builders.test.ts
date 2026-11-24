import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { root } from '../src/lib/content';
import * as b from '../src/lib/interface-builders';
const run = (script: string, args: string[] = []) =>
  spawnSync('bash', ['-c', script, 'app.sh', ...args], {
    cwd: root,
    env: { ...process.env, PATH: root + ':' + process.env.PATH },
    encoding: 'utf8',
  });

for (const type of ['xor', 'or', 'and'] as const) {
  for (const required of [false, true]) {
    if (type === 'or' && !required) continue;
    for (const members of [
      ['json', 'yaml', 'toml'],
      ['yaml', 'toml'],
      ['toml', 'json'],
    ]) {
      test(`${required ? 'required' : 'optional'} ${type}: runtime help and every presence subset`, () => {
        const settings = { type, required, members };
        const script = b.groupScript(settings);
        const help = run(script, ['--help']);
        assert.equal(help.status, 0, help.stderr);
        assert.equal(help.stdout, b.groupHelp(settings));
        for (const combination of b.groupCombinations(settings)) {
          // Ungrouped flags do not affect group enforcement.
          const args = [
            ...combination.present,
            ...b.groupArguments
              .map((arg) => arg.destination)
              .filter((arg) => !members.includes(arg)),
          ].map((arg) => '--' + arg);
          const result = run(script, args);
          assert.equal(
            result.status,
            combination.valid ? 0 : 2,
            `${args.join(' ')}: ${result.stderr}`,
          );
          if (!combination.valid) assert.equal(result.stdout, '');
        }
      });
    }
  }
}
test('single-pipe OR formatting matches koi without changing group acceptance', () => {
  for (const type of ['xor', 'or', 'and'] as const) {
    for (const required of [false, true]) {
      if (type === 'or' && !required) continue;
      const baseline = { type, required, members: ['json', 'yaml'] };
      for (const singlePipeForOr of [false, true]) {
        const settings = { ...baseline, singlePipeForOr };
        const script = b.groupScript(settings);
        if (singlePipeForOr)
          assert.match(
            script,
            /main\(\) \{[\s\S]*\n    koi::config use-single-pipe-for-or-groups true\n[\s\S]*koi::parse/,
          );
        else assert.doesNotMatch(script, /use-single-pipe-for-or-groups/);
        const help = run(script, ['--help']);
        assert.equal(help.status, 0, help.stderr);
        assert.equal(help.stdout, b.groupHelp(settings));
        assert.deepEqual(
          b.groupCombinations(settings),
          b.groupCombinations(baseline),
        );
        for (const combination of b.groupCombinations(settings)) {
          const result = run(
            script,
            combination.present.map((arg) => '--' + arg),
          );
          assert.equal(result.status, combination.valid ? 0 : 2, result.stderr);
        }
      }
    }
  }
});

test('dependency directions and prerequisites match koi for every declaration and presence subset', () => {
  const names = b.dependencyArguments.map((arg) => arg.destination);
  for (const dependent of names) {
    const others = names.filter((arg) => arg !== dependent);
    for (const prerequisites of [
      [others[0]],
      [others[1]],
      others,
      [...others].reverse(),
    ]) {
      const settings = { dependent, prerequisites };
      const script = b.dependencyScript(settings);
      const help = run(script, ['--help']);
      assert.equal(help.status, 0, help.stderr);
      assert.equal(help.stdout, b.dependencyHelp(settings));
      for (let mask = 0; mask < 8; mask++) {
        const present = names.filter((_, index) => mask & (1 << index));
        const result = run(script, b.dependencyTokens(present));
        assert.equal(
          result.status,
          b.dependencyMissing(settings, present).length ? 2 : 0,
          result.stderr,
        );
        if (result.status) assert.equal(result.stdout, '');
        assert.deepEqual(b.dependencyOutcome(settings, present), {
          status: result.status,
          stdout: result.stdout,
          stderr: result.stderr,
        });
      }
    }
  }
  // An explicitly empty option value is present.
  assert.equal(
    run(b.dependencyScript(b.defaultDependency), [
      '--upload',
      '--token',
      '',
      '--account',
      '',
    ]).status,
    0,
  );
});
test('relationship builders reject invalid declarations', () => {
  for (const settings of [
    { ...b.defaultGroup, members: ['json'] },
    { ...b.defaultGroup, members: ['json', 'json'] },
    { ...b.defaultGroup, members: ['json', 'unknown'] },
    { ...b.defaultGroup, type: 'or' as const },
  ]) {
    assert.throws(() => b.groupScript(settings));
    assert.throws(() => b.groupHelp(settings));
  }
  for (const settings of [
    { ...b.defaultDependency, prerequisites: [] },
    { ...b.defaultDependency, prerequisites: ['upload'] },
    { ...b.defaultDependency, prerequisites: ['unknown'] },
    { ...b.defaultDependency, prerequisites: ['token', 'token'] },
    { ...b.defaultDependency, dependent: 'unknown' },
  ])
    assert.throws(() => b.dependencyScript(settings));
});
test('commands generate matching routed help, preserve names and guards, and support empty trees', () => {
  for (const nodes of [b.defaultCommands, [], [b.defaultCommands[0]]]) {
    const script = b.commandScript(nodes);
    const visit = (items: b.CommandNode[], path: string[] = []) => {
      for (const node of items) {
        const invocation = [...path, node.name];
        const help = run(script, [...invocation, '--help']);
        assert.equal(help.status, 0, help.stderr);
        assert.equal(help.stdout, b.commandHelp(nodes, node.id));
        const dispatch = run(script, invocation);
        assert.equal(dispatch.status, 0, dispatch.stderr);
        assert.equal(dispatch.stdout, `handler: ${node.handler}\n`);
        visit(node.children, invocation);
      }
    };
    const help = run(script, ['--help']);
    assert.equal(help.status, 0, help.stderr);
    assert.equal(help.stdout, b.commandHelp(nodes));
    visit(nodes);
  }
});
test('command descriptions are safely quoted and wrapped; malformed drafts are rejected', () => {
  const nodes = structuredClone(b.defaultCommands);
  nodes[0].name = 'deploy-service';
  nodes[0].handler = 'app::deploy';
  nodes[0].description =
    "Literal '$HOME' $(false) `false`\n" + 'word '.repeat(40);
  const result = run(b.commandScript(nodes), ['--help']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, b.commandHelp(nodes));
  const node = nodes[0];
  for (const [key, value] of [
    ['name', 'bad name'],
    ['name', 'help'],
    ['name', 'config'],
    ['handler', 'bad-name'],
    ['handler', 'koi::parse'],
    ['handler', 'printf'],
    ['handler', 'case'],
    ['description', ''],
    ['description', 'bad\0text'],
  ] as const) {
    const draft = { ...node, [key]: value };
    assert.ok(
      b.commandFieldErrors(draft, nodes, nodes)[key],
      `${key}: ${value}`,
    );
    assert.throws(() => b.commandScript([draft, nodes[1]]));
  }
});
test('static explorer scripts and help match their defaults and pass bash syntax checks', () => {
  for (const [name, script, help] of [
    ['group', b.groupScript(b.defaultGroup), b.groupHelp(b.defaultGroup)],
    [
      'dependency',
      b.dependencyScript(b.defaultDependency),
      b.dependencyHelp(b.defaultDependency),
    ],
    [
      'command',
      b.commandScript(b.defaultCommands),
      b.commandHelp(b.defaultCommands),
    ],
  ]) {
    assert.equal(
      readFileSync(`${root}/docs/examples/builder-${name}.sh`, 'utf8'),
      script,
    );
    assert.equal(
      readFileSync(`${root}/docs/examples/builder-${name}-help.txt`, 'utf8'),
      help,
    );
    assert.equal(
      spawnSync('bash', ['-n'], { input: script, encoding: 'utf8' }).status,
      0,
    );
  }
});

test('command tree rows keep shell connectors and moves preserve subtrees without cycles', () => {
  const rows = b.commandTreeRows(b.defaultCommands);
  assert.deepEqual(
    rows.map((row) => row.prefix + row.name),
    ['app', '├── deploy', '└── config', '    ├── get', '    └── set'],
  );
  assert.deepEqual(
    b.commandParentRows(b.defaultCommands, 'config').map((row) => row.id),
    ['root', 'deploy'],
  );
  const config = structuredClone(b.defaultCommands[1]);
  const moved = b.placeCommand(b.defaultCommands, config, 'deploy', false);
  assert.deepEqual(
    b.commandPath(moved, 'get')!.map((node) => node.id),
    ['deploy', 'config', 'get'],
  );
  assert.deepEqual(
    b.defaultCommands[1].children.map((node) => node.id),
    ['get', 'set'],
  );
  assert.throws(() => b.placeCommand(b.defaultCommands, config, 'get', false));
  assert.throws(() =>
    b.placeCommand(b.defaultCommands, config, 'config', false),
  );
  assert.throws(() =>
    b.placeCommand(b.defaultCommands, config, 'missing', false),
  );
  assert.throws(() =>
    b.placeCommand(
      b.defaultCommands,
      { ...config, name: 'get' },
      'config',
      true,
    ),
  );
  const sibling = { ...structuredClone(config.children[1]), name: 'get' };
  assert.throws(() =>
    b.placeCommand(b.defaultCommands, sibling, 'config', false),
  );
  assert.equal(
    b.placeCommand(
      b.defaultCommands,
      { ...config, description: 'Edited' },
      'root',
      false,
    )[1].id,
    'config',
  );
});

test('demo flag sampling chooses one to three distinct supported flags in catalog order', () => {
  for (const value of [0, 0.4, 0.99]) {
    const flags = b.chooseDemoFlags(() => value);
    assert.equal(flags.length, 1 + Math.floor(value * 3));
    assert.equal(new Set(flags).size, flags.length);
    assert.deepEqual(
      flags,
      ['force', 'quiet', 'debug'].filter((flag) =>
        flags.includes(flag as b.DemoFlag),
      ),
    );
  }
});

test('demo arguments and routed help match koi for every flag combination at branches and leaves', () => {
  for (let mask = 1; mask < 8; mask++) {
    const nodes = structuredClone(b.defaultCommands);
    const flags = (['force', 'quiet', 'debug'] as const).filter(
      (_, index) => mask & (1 << index),
    );
    nodes[0].demoFlags = [...flags];
    nodes[1].demoFlags = [...flags];
    nodes[1].children[0].demoFlags = [...flags];
    const script = b.commandScript(nodes);
    for (const [id, invocation] of [
      ['root', []],
      ['deploy', ['deploy']],
      ['config', ['config']],
      ['get', ['config', 'get']],
      ['set', ['config', 'set']],
    ] as const) {
      const result = run(script, [...invocation, '-h']);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, b.commandHelp(nodes, id));
      if (id === 'root' || id === 'set')
        assert.doesNotMatch(result.stdout, /--force|--quiet|--debug/);
    }
    const args = flags.map((flag) => '--' + flag);
    const result = run(script, ['config', 'get', ...args]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.stdout,
      'handler: config_get\n' + flags.map((flag) => `${flag}: 1\n`).join(''),
    );
    for (const flag of flags) {
      const lines = script
        .split('\n')
        .filter((line) => line.includes(`koi::add_arg ${flag} `));
      assert.equal(new Set(lines).size, 1);
      assert.equal(lines.length, 3);
    }
  }
  assert.equal(
    b.commandScript([]),
    '#!/usr/bin/env bash\nsource koi\n\nkoi::config name app\n\nkoi::run "$@"\n',
  );
  assert.throws(() =>
    b.commandScript([
      { ...b.defaultCommands[0], demoFlags: ['force', 'force'] },
    ]),
  );
});

test('aliases reuse a single handler definition and retain routed descriptions', () => {
  const nodes = structuredClone(b.defaultCommands);
  const alias: b.CommandNode = {
    ...structuredClone(nodes[0]),
    id: 'alias',
    name: 'release',
    description: 'Release services',
  };
  nodes.push(alias);
  assert.deepEqual(b.commandFieldErrors(alias, nodes, nodes), {});
  const script = b.commandScript(nodes);
  assert.equal(script.split('deploy_service() {').length - 1, 1);
  for (const node of [nodes[0], alias]) {
    const help = run(script, [node.name, '-h']);
    assert.equal(help.status, 0, help.stderr);
    assert.equal(help.stdout, b.commandHelp(nodes, node.id));
    assert.equal(run(script, [node.name]).stdout, 'handler: deploy_service\n');
  }
  // A shared Bash function has one interface regardless of its CLI alias.
  alias.demoFlags = ['force'];
  assert.throws(() => b.commandScript(nodes), /shared handler/);
});

test('reusing a branch handler shares its children and demo flags across aliases', () => {
  let nodes = structuredClone(b.defaultCommands);
  const alias: b.CommandNode = {
    id: 'settings',
    name: 'settings',
    handler: 'config',
    description: 'Settings alias',
    children: [],
  };
  nodes = b.placeCommand(nodes, alias, 'root', true);
  const aliasNode = b.commandPath(nodes, 'settings')!.at(-1)!;
  assert.deepEqual(
    aliasNode.children.map((node) => node.name),
    ['get', 'set'],
  );
  assert.equal(
    new Set(b.commandTreeRows(nodes).map((row) => row.id)).size,
    b.commandTreeRows(nodes).length,
  );
  const child = {
    ...aliasNode.children[0],
    name: 'read',
    demoFlags: ['force'] as b.DemoFlag[],
  };
  nodes = b.placeCommand(nodes, child, 'settings', false);
  assert.equal(b.commandPath(nodes, 'get')!.at(-1)!.name, 'read');
  assert.deepEqual(b.commandPath(nodes, 'get')!.at(-1)!.demoFlags, ['force']);
  const script = b.commandScript(nodes);
  for (const row of b.commandTreeRows(nodes)) {
    const result = run(script, [...row.path.slice(1), '-h']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, b.commandHelp(nodes, row.id));
  }
  nodes = b.removeCommand(nodes, child.id);
  assert.deepEqual(
    nodes[1].children.map((node) => node.name),
    ['set'],
  );
  assert.deepEqual(
    nodes[2].children.map((node) => node.name),
    ['set'],
  );
  assert.throws(
    () =>
      b.placeCommand(
        b.defaultCommands,
        { ...b.defaultCommands[1].children[0], handler: 'config' },
        'config',
        false,
      ),
    /recursive/,
  );
});
