export type ArgumentKind = 'option' | 'flag' | 'positional';
export interface ArgumentSettings {
  kind: ArgumentKind;
  cardinality: 'scalar' | 'array';
  destination: string;
  short: string;
  long: string;
  description: string;
  required: boolean;
  useDefault: boolean;
  defaultValue: string;
  displayName: string;
}
export interface HelpSettings {
  name: string;
  description: string;
  width: string;
  helpCommand: boolean;
  verbose: boolean;
  hints: boolean;
  unknownHelp: boolean;
  missingMessage: string;
}
export const defaultArgument: ArgumentSettings = {
  kind: 'option',
  cardinality: 'scalar',
  destination: 'name',
  short: 'n',
  long: 'name',
  description: 'Who to greet',
  required: false,
  useDefault: true,
  defaultValue: 'world',
  displayName: '',
};
export const defaultHelp: HelpSettings = {
  name: 'app',
  description: 'Manage your application',
  width: '80',
  helpCommand: true,
  verbose: false,
  hints: false,
  unknownHelp: false,
  missingMessage: '',
};

// Single-quoted shell words preserve literal newlines and shell-looking text.
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const reservedDestinations = new Set(
  `BASH BASH_ENV BASH_SUBSHELL BASHPID BASH_VERSINFO BASH_VERSION CDPATH DIRSTACK EDITOR EUID FUNCNAME GLOBIGNORE GROUPS HOME HOSTNAME HOSTTYPE IFS IGNOREEOF LC_COLLATE LC_CTYPE LINENO MACHTYPE OLDPWD OSTYPE PATH PIPESTATUS PPID PROMPT_COMMAND PS1 PS2 PS3 PS4 PWD REPLY SECONDS SHELLOPTS SHLVL TMOUT UID koi_status`.split(
    ' ',
  ),
);
const reservedLongNames = new Set(['help']);
export function argumentFieldErrors(
  s: ArgumentSettings,
): Partial<Record<keyof ArgumentSettings, string>> {
  const errors: Partial<Record<keyof ArgumentSettings, string>> = {};
  if (
    !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s.destination) ||
    s.destination.startsWith('__koi_') ||
    reservedDestinations.has(s.destination)
  ) {
    errors.destination =
      'Choose an ordinary Bash variable name, outside the koi and shell reserved names.';
  }
  if (!['flag', 'option', 'positional'].includes(s.kind))
    errors.kind = 'Choose a supported argument kind.';
  if (!['scalar', 'array'].includes(s.cardinality))
    errors.cardinality = 'Choose Scalar or Array.';
  if (s.cardinality === 'array' && s.kind === 'flag')
    errors.cardinality = 'Flags cannot have cardinality modifiers.';
  if (s.cardinality === 'array' && s.useDefault)
    errors.cardinality = 'Arrays cannot have defaults.';
  if (!s.description || s.description.includes('\0'))
    errors.description =
      'Provide a nonempty description without NUL characters.';
  if (s.kind !== 'positional') {
    if (!s.short && !s.long)
      errors.short = errors.long =
        'An option or flag needs a short or long spelling.';
    if (s.short && (!/^[a-zA-Z]$/.test(s.short) || s.short === 'h'))
      errors.short = 'Short spellings are one letter; h is reserved for help.';
    if (
      s.long &&
      (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s.long) ||
        reservedLongNames.has(s.long))
    )
      errors.long =
        'Use a long spelling starting with a letter; help is reserved.';
  }
  for (const field of ['defaultValue', 'displayName'] as const) {
    if (s[field].includes('\0'))
      errors[field] = 'Bash values cannot contain NUL characters.';
  }
  return errors;
}
export function argumentErrors(s: ArgumentSettings): string[] {
  return [...new Set(Object.values(argumentFieldErrors(s)))];
}
export function argumentDeclaration(s: ArgumentSettings): string {
  const errors = argumentErrors(s);
  if (errors.length) throw new Error(errors.join(' '));
  const parts = [
    'koi::add_arg',
    s.destination,
    { flag: '-f', option: '-o', positional: '-p' }[s.kind],
  ];
  if (s.cardinality === 'array') parts.push('-a');
  if (s.kind !== 'positional') {
    if (s.short) parts.push('-s', s.short);
    if (s.long) parts.push('-l', s.long);
  }
  parts.push('-d', shellQuote(s.description));
  if (s.required) parts.push('-r');
  if (s.kind !== 'flag' && !s.required && s.useDefault)
    parts.push('-D', shellQuote(s.defaultValue));
  if (s.kind !== 'flag' && s.displayName)
    parts.push('-n', shellQuote(s.displayName));
  return parts.join(' ');
}

export function argumentCollectionErrors(args: ArgumentSettings[]): string[] {
  const errors = args.flatMap(argumentErrors);
  for (const key of ['destination', 'short', 'long'] as const) {
    const values = args
      .filter((arg) => key === 'destination' || arg.kind !== 'positional')
      .map((arg) => arg[key])
      .filter(Boolean);
    if (new Set(values).size !== values.length)
      errors.push(`Each ${key} must be unique.`);
  }
  const positionals = args.filter((arg) => arg.kind === 'positional');
  let optional = false;
  let array = false;
  for (const arg of positionals) {
    if (array) errors.push('A positional array must be the final positional.');
    if (arg.cardinality === 'array') {
      if (optional)
        errors.push(
          'A positional array requires all preceding scalars to be required.',
        );
      array = true;
    }
    if (optional && arg.required)
      errors.push('Required positionals must precede optional positionals.');
    if (!arg.required) optional = true;
  }
  return errors;
}

export function argumentScript(
  settings: ArgumentSettings | ArgumentSettings[],
  registrations: string[] = [],
  scriptName?: string,
): string {
  const args = Array.isArray(settings) ? settings : [settings];
  const errors = argumentCollectionErrors(args);
  if (errors.length) throw new Error(errors.join(' '));
  return `#!/usr/bin/env bash
source koi

${scriptName ? `koi::config name ${shellQuote(scriptName)}\n\n` : ''}# Print the parsed value
# Usage: main "$@"
#   $@  arguments forwarded to koi
main() {
${args.length ? (args.every((arg) => arg.cardinality !== 'array') ? '    local ' + args.map((arg) => arg.destination).join(' ') : args.map((arg) => '    local ' + (arg.cardinality === 'array' ? '-a ' : '') + arg.destination).join('\n')) + '\n' + args.map((arg) => '    ' + argumentDeclaration(arg)).join('\n') + '\n' : ''}${registrations.map((line) => '    ' + line + '\n').join('')}    koi::parse "$@" || return "$koi_status"
${
  args.length
    ? '\n' +
      (args.some((arg) => arg.cardinality === 'array')
        ? '    local __koi_example_value __koi_example_index\n'
        : '') +
      args
        .map((arg) =>
          arg.cardinality === 'array'
            ? `    __koi_example_index=0
    for __koi_example_value in "\${${arg.destination}[@]}"; do
        printf '%s\\n' "${arg.destination}[$__koi_example_index]: $__koi_example_value"
        __koi_example_index=$((__koi_example_index + 1))
    done`
            : `    printf '%s\\n' "${arg.destination}: $${arg.destination}"`,
        )
        .join('\n') +
      '\n'
    : ''
}}

main "$@"
`;
}

export function argumentHelp(
  args: ArgumentSettings[],
  presentation: { name?: string; usage?: string[] } = {},
): string {
  const ordered = [
    ...args.filter((arg) => arg.kind !== 'positional'),
    ...args.filter((arg) => arg.kind === 'positional'),
  ];
  const value = (arg: ArgumentSettings) =>
    (
      arg.displayName ||
      (arg.kind !== 'positional' && arg.long) ||
      arg.destination
    ).toUpperCase();
  const spelling = (arg: ArgumentSettings) =>
    [arg.short && `-${arg.short}`, arg.long && `--${arg.long}`]
      .filter(Boolean)
      .join(', ');
  const labels = ordered.map((arg) =>
    arg.kind === 'positional'
      ? value(arg) + (arg.cardinality === 'array' ? '...' : '')
      : spelling(arg) + (arg.kind === 'option' ? ` ${value(arg)}` : ''),
  );
  const width = Math.max(
    10,
    ...labels
      .filter((_, index) => ordered[index].kind !== 'positional')
      .map((label) => label.length),
  );
  const positionalWidth = Math.max(
    0,
    ...labels
      .filter((_, index) => ordered[index].kind === 'positional')
      .map((label) => label.length),
  );
  const usage = ordered.map((arg) => {
    const label =
      arg.kind === 'positional'
        ? value(arg) + (arg.cardinality === 'array' ? '...' : '')
        : (arg.short ? `-${arg.short}` : `--${arg.long}`) +
          (arg.kind === 'option' ? ` ${value(arg)}` : '');
    if (arg.cardinality === 'array' && arg.kind === 'option')
      return arg.required ? `${label} [${label}]...` : `[${label}]...`;
    return arg.required ? label : `[${label}]`;
  });
  const usageParts = presentation.usage ?? usage;
  let text = `Usage: ${presentation.name ?? 'greet.sh'} [-h]${usageParts.length ? ' ' + usageParts.join(' ') : ''}\n\nOptions:\n  ${'-h, --help'.padEnd(width)}  Show this help\n`;
  let positional = false;
  ordered.forEach((arg, index) => {
    if (arg.kind === 'positional' && !positional) {
      text += '\nPositionals:\n';
      positional = true;
    }
    const description =
      arg.description +
      (arg.required ? ' (required)' : '') +
      (arg.kind !== 'flag' && !arg.required && arg.useDefault
        ? ` (default: ${arg.defaultValue})`
        : '');
    const rowWidth = arg.kind === 'positional' ? positionalWidth : width;
    text += helpText(
      description,
      `  ${labels[index].padEnd(rowWidth)}  `,
      ' '.repeat(rowWidth + 4),
    );
  });
  return text;
}
// Match koi's word wrapping and explicit description line breaks.
export function helpText(
  description: string,
  prefix = '',
  indent = '',
): string {
  let text = '';
  for (const explicitLine of description.split('\n')) {
    let line = prefix;
    for (const word of explicitLine.split(/[ \t]+/).filter(Boolean)) {
      if (line !== prefix) {
        if ([...line].length + 1 + [...word].length > 100) {
          text += line + '\n';
          prefix = indent;
          line = prefix;
        } else line += ' ';
      }
      line += word;
    }
    text += line + '\n';
    prefix = indent;
  }
  return text;
}

export function helpErrors(s: HelpSettings): string[] {
  const errors: string[] = [];
  if (!s.name || !s.description)
    errors.push('Provide a script name and description.');
  if (!/^[0-9]{1,9}$/.test(s.width) || Number(s.width) < 1)
    errors.push('Width must be a positive integer of at most nine digits.');
  if (s.verbose && !s.helpCommand)
    errors.push('Verbose help requires the built-in help command.');
  if ([s.name, s.description, s.missingMessage].some((v) => v.includes('\0')))
    errors.push('Bash values cannot contain NUL characters.');
  return errors;
}
export function helpScript(s: HelpSettings): string {
  const errors = helpErrors(s);
  if (errors.length) throw new Error(errors.join(' '));
  const settings: string[] = [];
  if (!s.helpCommand) settings.push('koi::config help-subcommand false');
  if (s.verbose) settings.push('koi::config verbose-help true');
  if (s.hints) settings.push('koi::config help-hints true');
  if (s.unknownHelp) settings.push('koi::config help-on-unknown-commands true');
  if (s.missingMessage)
    settings.push(
      `koi::config missing-command-message ${shellQuote(s.missingMessage)}`,
    );
  return `#!/usr/bin/env bash\nsource ./koi\n\nkoi::config name ${shellQuote(s.name)}\nkoi::config description ${shellQuote(s.description)}\nkoi::config help-width ${s.width}\n${settings.length ? settings.join('\n') + '\n' : ''}koi::add_command status -f status -d 'Show application status'\n\n# Show application status\n# Usage: status "$@"\n#   $@  arguments forwarded to koi\nstatus() {\n    koi::parse "$@" || return "$koi_status"\n\n    printf 'Ready\\n'\n}\n\nkoi::run "$@"\n`;
}
