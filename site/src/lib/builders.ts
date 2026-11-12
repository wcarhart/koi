export type ArgumentKind = 'option' | 'flag' | 'positional';
export interface ArgumentSettings {
  kind: ArgumentKind;
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
const reservedLongNames = new Set([
  'help',
  'koi-error-on-duplicates',
  'koi-error-on-duplicate',
  'koi-inspect',
]);
export function argumentErrors(s: ArgumentSettings): string[] {
  const errors: string[] = [];
  if (
    !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s.destination) ||
    s.destination.startsWith('__koi_') ||
    reservedDestinations.has(s.destination)
  ) {
    errors.push(
      'Choose an ordinary Bash variable name, outside the koi and shell reserved names.',
    );
  }
  if (!['flag', 'option', 'positional'].includes(s.kind))
    errors.push('Choose a supported argument kind.');
  if (!s.description || s.description.includes('\0'))
    errors.push('Provide a nonempty description without NUL characters.');
  if (s.kind !== 'positional') {
    if (!s.short && !s.long)
      errors.push('An option or flag needs a short or long spelling.');
    if (s.short && (!/^[a-zA-Z]$/.test(s.short) || s.short === 'h'))
      errors.push('Short spellings are one letter; h is reserved for help.');
    if (
      s.long &&
      (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s.long) ||
        reservedLongNames.has(s.long))
    )
      errors.push(
        'Use a long spelling starting with a letter; help and koi administrative spellings are reserved.',
      );
  }
  if (s.defaultValue.includes('\0') || s.displayName.includes('\0'))
    errors.push('Bash values cannot contain NUL characters.');
  return errors;
}
export function argumentScript(s: ArgumentSettings): string {
  const errors = argumentErrors(s);
  if (errors.length) throw new Error(errors.join(' '));
  const parts = [
    '__addarg',
    s.destination,
    { flag: '-f', option: '-o', positional: '-p' }[s.kind],
  ];
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
  return `#!/usr/bin/env bash\nsource ./koi\n\n# Print the parsed value\n# Usage: main "$@"\n#   $@  arguments forwarded to koi\nmain() {\n    local ${s.destination}\n    ${parts.join(' ')}\n    __parseargs "$@" || return "$koi_status"\n\n    printf '%s\\n' "$${s.destination}"\n}\n\nmain "$@"\n`;
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
  const flags: string[] = [];
  if (!s.helpCommand) flags.push('--koi-disable-help-subcommand');
  if (s.verbose) flags.push('--koi-enable-verbose-help');
  if (s.hints) flags.push('--koi-enable-help-hints');
  if (s.unknownHelp) flags.push('--koi-enable-help-on-unknown-commands');
  if (s.missingMessage)
    flags.push('--koi-zero-argument-message', shellQuote(s.missingMessage));
  return `#!/usr/bin/env bash\nsource ./koi\n\n__koiconfig name ${shellQuote(s.name)}\n__koiconfig description ${shellQuote(s.description)}\n__koiconfig help-width ${s.width}\n__addcommand status -f status -d 'Show application status'\n\n# Show application status\n# Usage: status "$@"\n#   $@  arguments forwarded to koi\nstatus() {\n    __parseargs "$@" || return "$koi_status"\n\n    printf 'Ready\\n'\n}\n\n__koirun${flags.length ? ' ' + flags.join(' ') : ''} "$@"\n`;
}
