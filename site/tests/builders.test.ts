import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  shellQuote,
  argumentErrors,
  argumentFieldErrors,
  argumentScript,
  argumentHelp,
  defaultArgument,
  helpScript,
  defaultHelp,
  helpErrors,
} from '../src/lib/builders';
import { root } from '../src/lib/content';

test('shell quoting preserves arbitrary literal text', () => {
  for (const value of [
    '',
    "it's literal",
    '$(printf bad); $HOME `whoami`',
    'one\ntwo\\three',
    '"quoted"',
  ]) {
    const out = spawnSync('bash', ['-c', `printf '%s' ${shellQuote(value)}`], {
      encoding: 'utf8',
    });
    assert.equal(out.status, 0);
    assert.equal(out.stdout, value);
  }
});
test('builders reject malformed declarations before generating code', () => {
  for (const settings of [
    { ...defaultArgument, destination: 'bad-name' },
    { ...defaultArgument, destination: '__koi_x' },
    { ...defaultArgument, destination: 'PATH' },
    { ...defaultArgument, short: 'h' },
    { ...defaultArgument, long: 'help' },
    { ...defaultArgument, short: '', long: '' },
    { ...defaultArgument, description: '' },
  ]) {
    assert.ok(argumentErrors(settings).length);
    assert.throws(() => argumentScript(settings));
  }
  assert.ok(helpErrors({ ...defaultHelp, width: '0' }).length);
  assert.ok(helpErrors({ ...defaultHelp, width: '1e3' }).length);
  assert.ok(helpErrors({ ...defaultHelp, width: '1000000000' }).length);
  assert.throws(() =>
    helpScript({ ...defaultHelp, helpCommand: false, verbose: true }),
  );
});
test('generated flags and positionals omit incompatible options', () => {
  const flag = argumentScript({
    ...defaultArgument,
    kind: 'flag',
    displayName: 'NAME',
  });
  assert.doesNotMatch(flag, / -D | -n /);
  const positional = argumentScript({
    ...defaultArgument,
    kind: 'positional',
    required: true,
  });
  assert.doesNotMatch(positional, / -s | -l | -D /);
  assert.match(positional, / -p /);
});
test('generated scripts run against koi and preserve hostile-looking data', () => {
  const value =
    'two words\n\'quotes\' "double" $HOME $(touch /do-not-create) `literal` \\';
  for (const kind of ['option', 'positional'] as const) {
    const script = argumentScript({
      ...defaultArgument,
      kind,
      description: value,
      defaultValue: value,
    });
    const out = spawnSync('bash', ['-s'], {
      input: script,
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(out.status, 0, out.stderr);
    assert.equal(out.stderr, '');
    assert.equal(out.stdout, 'name: ' + value + '\n');
  }
});
test('generated help configurations are accepted by koi', () => {
  const variants = [
    defaultHelp,
    {
      ...defaultHelp,
      name: "app 'quoted'",
      description: 'literal $HOME\n$(nothing)',
      verbose: true,
      hints: true,
    },
    {
      ...defaultHelp,
      helpCommand: false,
      unknownHelp: true,
      missingMessage: "Choose 'one'",
    },
  ];
  for (const settings of variants) {
    const result = spawnSync('bash', ['-s', '--', '--help'], {
      cwd: root,
      input: helpScript(settings),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.ok(result.stdout.includes(settings.name));
  }
});

test('argument collections preserve order, detect collisions, and generate matching help', async () => {
  const { argumentCollectionErrors, argumentHelp } =
    await import('../src/lib/builders');
  const args = [
    { ...defaultArgument },
    {
      ...defaultArgument,
      kind: 'positional' as const,
      destination: 'file',
      short: '',
      long: '',
      required: true,
      useDefault: false,
      displayName: 'path',
      description: 'Input file',
    },
    {
      ...defaultArgument,
      kind: 'flag' as const,
      destination: 'verbose',
      short: 'v',
      long: 'verbose',
      useDefault: false,
      description: 'Print progress',
    },
  ];
  const script = argumentScript(args);
  assert.match(script, /local name file verbose/);
  assert.ok(
    script.indexOf('koi::add_arg file') <
      script.indexOf('koi::add_arg verbose'),
  );
  assert.ok(argumentCollectionErrors([...args, { ...defaultArgument }]).length);
  for (const collection of [
    args,
    [args[2]],
    [
      {
        ...defaultArgument,
        description: 'First line\nSecond line ' + 'word '.repeat(30),
      },
    ],
  ]) {
    const result = spawnSync(
      'bash',
      ['-c', argumentScript(collection), 'greet.sh', '--help'],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(argumentHelp(collection), result.stdout);
  }
});

test('field validation identifies independent errors and empty collections produce valid samples', () => {
  const errors = argumentFieldErrors({
    ...defaultArgument,
    destination: 'bad-name',
    description: '',
    short: 'h',
    long: 'help',
  });
  assert.deepEqual(Object.keys(errors).sort(), [
    'description',
    'destination',
    'long',
    'short',
  ]);
  const corrected = argumentFieldErrors({
    ...defaultArgument,
    destination: 'valid',
    description: '',
    short: 'h',
    long: 'help',
  });
  assert.equal(corrected.destination, undefined);
  assert.ok(corrected.description);
  const script = argumentScript([]);
  assert.doesNotMatch(script, /local /);
  assert.match(script, /# Usage: main "\$@"/);
  const result = spawnSync('bash', ['-n'], { input: script, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('array builders preserve elements, omit empty rows, and match runtime help', () => {
  for (const kind of ['option', 'positional'] as const) {
    for (const required of [false, true]) {
      const arg = {
        ...defaultArgument,
        kind,
        cardinality: 'array' as const,
        useDefault: false,
        required,
        displayName: 'FILE',
      };
      const script = argumentScript(arg);
      assert.match(script, /local -a name/);
      assert.match(script, / -a /);
      assert.match(script, /"\$\{name\[@\]\}"/);
      const values = ['', 'two words', 'a\nb', '$(false) * \\'];
      const tokens =
        kind === 'option' ? values.flatMap((value) => ['-n', value]) : values;
      const result = spawnSync('bash', ['-c', script, 'greet.sh', ...tokens], {
        cwd: root,
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        result.stdout,
        values.map((value, index) => `name[${index}]: ${value}\n`).join(''),
      );
      const help = spawnSync('bash', ['-c', script, 'greet.sh', '--help'], {
        cwd: root,
        encoding: 'utf8',
      });
      assert.equal(help.status, 0, help.stderr);
      assert.equal(help.stdout, argumentHelp([arg]));
      assert.doesNotMatch(help.stdout, /\(repeatable\)|\(repeated\)/);
      assert.equal(help.stdout.includes('(required)'), required);
      const omitted = spawnSync('bash', ['-c', script, 'greet.sh'], {
        cwd: root,
        encoding: 'utf8',
      });
      assert.equal(omitted.status, required ? 2 : 0);
      assert.equal(omitted.stdout, '');
    }
  }
});

test('builder validates positional array layout and array defaults', () => {
  const array = {
    ...defaultArgument,
    kind: 'positional' as const,
    cardinality: 'array' as const,
    useDefault: false,
  };
  const scalar = {
    ...defaultArgument,
    kind: 'positional' as const,
    destination: 'first',
    useDefault: false,
  };
  assert.throws(() => argumentScript([scalar, array]));
  assert.throws(() => argumentScript([array, { ...scalar, required: true }]));
  assert.throws(() => argumentScript({ ...array, useDefault: true }));
  assert.throws(() => argumentScript({ ...array, kind: 'flag' }));
  assert.doesNotThrow(() =>
    argumentScript([{ ...scalar, required: true }, array]),
  );
});

test('multiple array loops share locals, reset indices, and preserve destinations named i or value', () => {
  const args = ['i', 'value'].map((destination, index) => ({
    ...defaultArgument,
    destination,
    short: '',
    long: `items${index}`,
    cardinality: 'array' as const,
    useDefault: false,
  }));
  const script = argumentScript(args);
  assert.equal(script.match(/local __koi_example_value/g)?.length, 1);
  const result = spawnSync(
    'bash',
    [
      '-euc',
      script,
      'greet.sh',
      '--items0',
      'one',
      '--items0',
      '',
      '--items1',
      'two',
    ],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'i[0]: one\ni[1]: \nvalue[0]: two\n');
});

test('runtime and builder reserve the same administrative long names', () => {
  const out = spawnSync(
    'bash',
    ['-c', 'source ./koi; printf "%s\\n" "${__koi_reserved_longs[@]}"'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(out.status, 0, out.stderr);
  const names = out.stdout.trim().split('\n');
  assert.ok(names.includes('koi-ignore-unknown-positionals'));
  for (const long of names) {
    assert.ok(argumentErrors({ ...defaultArgument, long }).length, long);
  }
});
