import {
  argumentScript,
  argumentDeclaration,
  argumentHelp,
  helpText,
  defaultArgument,
  shellQuote,
  type ArgumentSettings,
} from './builders';

export interface GroupSettings {
  type: 'xor' | 'or' | 'and';
  required: boolean;
  members: string[];
  singlePipeForOr?: boolean;
}
export interface DependencySettings {
  dependent: string;
  prerequisites: string[];
}
export type DemoFlag = 'force' | 'quiet' | 'debug';
export interface CommandNode {
  id: string;
  name: string;
  handler: string;
  description: string;
  children: CommandNode[];
  demoFlags?: DemoFlag[];
}
const sampleArgument = (
  destination: string,
  description: string,
  kind: 'flag' | 'option' = 'flag',
): ArgumentSettings => ({
  ...defaultArgument,
  destination,
  description,
  kind,
  short: '',
  long: destination,
  useDefault: false,
  defaultValue: '',
});
export const groupArguments = [
  sampleArgument('json', 'Output JSON'),
  sampleArgument('yaml', 'Output YAML'),
  sampleArgument('toml', 'Output TOML'),
];
export const dependencyArguments = [
  sampleArgument('upload', 'Upload files'),
  sampleArgument('token', 'Authentication token', 'option'),
  sampleArgument('account', 'Account name', 'option'),
];
export const defaultGroup: GroupSettings = {
  type: 'xor',
  required: false,
  members: ['json', 'yaml', 'toml'],
  singlePipeForOr: false,
};
export const defaultDependency: DependencySettings = {
  dependent: 'upload',
  prerequisites: ['token', 'account'],
};
export const defaultCommands: CommandNode[] = [
  {
    id: 'deploy',
    name: 'deploy',
    handler: 'deploy_service',
    description: 'Deploy services',
    children: [],
  },
  {
    id: 'config',
    name: 'config',
    handler: 'config',
    description: 'Manage configuration',
    children: [
      {
        id: 'get',
        name: 'get',
        handler: 'config_get',
        description: 'Read configuration',
        children: [],
      },
      {
        id: 'set',
        name: 'set',
        handler: 'config_set',
        description: 'Write configuration',
        children: [],
      },
    ],
  },
];
function memberErrors(
  members: string[],
  args: ArgumentSettings[],
  minimum: number,
): string[] {
  const errors: string[] = [];
  if (members.length < minimum)
    errors.push(
      `Select at least ${minimum} ${minimum === 1 ? 'argument' : 'arguments'}.`,
    );
  if (
    new Set(members).size !== members.length ||
    members.some((member) => !args.some((arg) => arg.destination === member))
  )
    errors.push('Select distinct arguments from this sample.');
  return errors;
}
export function groupErrors(s: GroupSettings): string[] {
  return [
    ...memberErrors(s.members, groupArguments, 2),
    ...(!['xor', 'or', 'and'].includes(s.type)
      ? ['Choose XOR, OR, or AND.']
      : []),
    ...(s.type === 'or' && !s.required ? ['OR groups must be required.'] : []),
  ];
}
export function dependencyErrors(s: DependencySettings): string[] {
  return [
    ...memberErrors(s.prerequisites, dependencyArguments, 1),
    ...(!dependencyArguments.some((arg) => arg.destination === s.dependent)
      ? ['Choose a dependent argument.']
      : []),
    ...(s.prerequisites.includes(s.dependent)
      ? ['An argument cannot depend on itself.']
      : []),
  ];
}
function assertValid(errors: string[]): void {
  if (errors.length) throw new Error(errors.join(' '));
}
export function groupAccepts(s: GroupSettings, present: string[]): boolean {
  assertValid(groupErrors(s));
  const count = s.members.filter((member) => present.includes(member)).length;
  if (s.required && count === 0) return false;
  return s.type === 'xor'
    ? count <= 1
    : s.type === 'or'
      ? count >= 1
      : count === 0 || count === s.members.length;
}
export function groupCombinations(
  s: GroupSettings,
): { present: string[]; valid: boolean }[] {
  assertValid(groupErrors(s));
  return Array.from({ length: 2 ** s.members.length }, (_, mask) => {
    const present = s.members.filter((_, index) => mask & (1 << index));
    return { present, valid: groupAccepts(s, present) };
  });
}
export function dependencyMissing(
  s: DependencySettings,
  present: string[],
): string[] {
  assertValid(dependencyErrors(s));
  return present.includes(s.dependent)
    ? s.prerequisites.filter((arg) => !present.includes(arg))
    : [];
}
export function groupScript(s: GroupSettings): string {
  assertValid(groupErrors(s));
  return argumentScript(groupArguments, [
    ...(s.singlePipeForOr
      ? ['koi::config use-single-pipe-for-or-groups true']
      : []),
    `koi::add_group --${s.type}${s.required ? ' --required' : ''} ${s.members.join(' ')}`,
  ]);
}
export function groupHelp(s: GroupSettings): string {
  assertValid(groupErrors(s));
  const separator = {
    xor: ' | ',
    or: s.singlePipeForOr ? ' | ' : ' || ',
    and: ' & ',
  }[s.type];
  const expression = `${s.required ? '(' : '['}${s.members.map((member) => '--' + member).join(separator)}${s.required ? ')' : ']'}`;
  let printed = false;
  const usage = groupArguments.flatMap((arg) => {
    if (!s.members.includes(arg.destination)) return [`[--${arg.long}]`];
    if (printed) return [];
    printed = true;
    return [expression];
  });
  return argumentHelp(groupArguments, { name: 'app.sh', usage });
}
export function dependencyScript(s: DependencySettings): string {
  assertValid(dependencyErrors(s));
  return argumentScript(
    dependencyArguments,
    [
      `koi::add_dependency ${s.dependent} --requires ${s.prerequisites.join(' ')}`,
    ],
    'app.sh',
  );
}
export function dependencyHelp(s: DependencySettings): string {
  assertValid(dependencyErrors(s));
  return (
    argumentHelp(dependencyArguments, { name: 'app.sh' }) +
    `\nDependencies:\n  --${s.dependent} requires ${s.prerequisites.map((arg) => '--' + arg).join(' and ')}\n`
  );
}
export function dependencyTokens(present: string[]): string[] {
  return dependencyArguments
    .filter((arg) => present.includes(arg.destination))
    .flatMap((arg) =>
      arg.kind === 'flag'
        ? ['--' + arg.long]
        : ['--' + arg.long, dependencyValues[arg.destination]],
    );
}
const dependencyValues: Record<string, string> = {
  token: 'demo-token',
  account: 'demo-account',
};
export function dependencyOutcome(
  settings: DependencySettings,
  present: string[],
): { status: 0 | 2; stdout: string; stderr: string } {
  const missing = dependencyMissing(settings, present);
  if (missing.length)
    return {
      status: 2,
      stdout: '',
      stderr: `app.sh: '${settings.dependent}' requires '${missing[0]}'\n`,
    };
  return {
    status: 0,
    stdout: dependencyArguments
      .map((arg) => {
        const supplied = present.includes(arg.destination);
        const value =
          arg.kind === 'flag'
            ? supplied
              ? '1'
              : '0'
            : supplied
              ? dependencyValues[arg.destination]
              : '';
        return `${arg.destination}: ${value}\n`;
      })
      .join(''),
    stderr: '',
  };
}
export const demoArguments: ArgumentSettings[] = [
  { ...sampleArgument('force', 'Force the operation'), short: 'f' },
  { ...sampleArgument('quiet', 'Suppress output'), short: 'q' },
  { ...sampleArgument('debug', 'Print debug information'), short: 'd' },
];
export function chooseDemoFlags(
  random: () => number = Math.random,
): DemoFlag[] {
  const count = 1 + Math.floor(random() * 3);
  const shuffled: DemoFlag[] = ['force', 'quiet', 'debug'];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return demoArguments
    .filter((arg) =>
      shuffled.slice(0, count).includes(arg.destination as DemoFlag),
    )
    .map((arg) => arg.destination as DemoFlag);
}
export interface CommandTreeRow {
  id: string;
  parent: string | null;
  name: string;
  prefix: string;
  path: string[];
}
export function commandTreeRows(nodes: CommandNode[]): CommandTreeRow[] {
  const rows: CommandTreeRow[] = [
    { id: 'root', parent: null, name: 'app', prefix: '', path: ['app'] },
  ];
  const visit = (
    items: CommandNode[],
    parent: string,
    path: string[],
    ancestors: boolean[],
  ) => {
    items.forEach((node, index) => {
      const last = index === items.length - 1;
      const nextPath = [...path, node.name];
      rows.push({
        id: node.id,
        parent,
        name: node.name,
        path: nextPath,
        prefix:
          ancestors.map((last) => (last ? '    ' : '│   ')).join('') +
          (last ? '└── ' : '├── '),
      });
      visit(node.children, node.id, nextPath, [...ancestors, last]);
    });
  };
  visit(nodes, 'root', ['app'], []);
  return rows;
}
export function commandParentRows(
  nodes: CommandNode[],
  editingId?: string,
): CommandTreeRow[] {
  const excluded = new Set<string>();
  const exclude = (node: CommandNode) => {
    excluded.add(node.id);
    node.children.forEach(exclude);
  };
  const editing = editingId ? commandPath(nodes, editingId)?.at(-1) : undefined;
  if (editing) exclude(editing);
  const prune = (items: CommandNode[]): CommandNode[] =>
    items
      .filter((node) => !excluded.has(node.id))
      .map((node) => ({ ...node, children: prune(node.children) }));
  return commandTreeRows(prune(nodes));
}
export function commandChildren(
  nodes: CommandNode[],
  parent: string,
): CommandNode[] {
  if (parent === 'root') return nodes;
  const node = commandPath(nodes, parent)?.at(-1);
  if (!node) throw new Error('Choose an existing parent command.');
  return node.children;
}
export function commandHandler(
  nodes: CommandNode[],
  handler: string,
): CommandNode | undefined {
  for (const node of nodes) {
    if (node.handler === handler) return node;
    const match = commandHandler(node.children, handler);
    if (match) return match;
  }
  return undefined;
}
// Materialize shared interfaces with unique registration IDs for each visible route.
function shareCommandInterfaces(
  nodes: CommandNode[],
  overrides = new Map<string, CommandNode>(),
): CommandNode[] {
  const definitions = new Map<string, CommandNode>();
  const collect = (items: CommandNode[]) =>
    items.forEach((node) => {
      if (!definitions.has(node.handler)) definitions.set(node.handler, node);
      collect(node.children);
    });
  collect(nodes);
  overrides.forEach((node, handler) => definitions.set(handler, node));
  const expand = (node: CommandNode, ancestry: string[]): CommandNode => {
    if (ancestry.includes(node.handler))
      throw new Error('Handler reuse would create a recursive command tree.');
    const definition = definitions.get(node.handler)!;
    return {
      ...node,
      demoFlags: [...(definition.demoFlags ?? [])],
      children: definition.children.map((child) => {
        const existing = node.children.find(
          (item) =>
            item.id.split('::').at(-1) === child.id.split('::').at(-1) ||
            (item.name === child.name && item.handler === child.handler),
        );
        const id =
          existing?.id ??
          (node.id === definition.id ? child.id : `${node.id}::${child.id}`);
        return expand(
          { ...child, id, children: existing?.children ?? child.children },
          [...ancestry, node.handler],
        );
      }),
    };
  };
  return nodes.map((node) => expand(node, []));
}
export function removeCommand(nodes: CommandNode[], id: string): CommandNode[] {
  const next = structuredClone(nodes);
  const path = commandPath(next, id);
  if (!path) throw new Error('Choose an existing command.');
  const parent = path.length > 1 ? path.at(-2)! : undefined;
  const siblings = parent ? parent.children : next;
  siblings.splice(
    siblings.findIndex((node) => node.id === id),
    1,
  );
  const result = shareCommandInterfaces(
    next,
    parent ? new Map([[parent.handler, parent]]) : undefined,
  );
  assertValid(commandErrors(result));
  return result;
}
function aliasChildren(items: CommandNode[], parentId: string): CommandNode[] {
  return items.map((node) => {
    const id = `${parentId}::${node.id.split('::').at(-1)}`;
    return {
      ...structuredClone(node),
      id,
      children: aliasChildren(node.children, id),
    };
  });
}
export function placeCommand(
  nodes: CommandNode[],
  draft: CommandNode,
  parent: string,
  isNew: boolean,
): CommandNode[] {
  if (
    !commandParentRows(nodes, isNew ? undefined : draft.id).some(
      (row) => row.id === parent,
    )
  )
    throw new Error(
      'Choose a parent outside this command and its descendants.',
    );
  const next = structuredClone(nodes);
  const previousPath = commandPath(next, draft.id);
  if (isNew && previousPath) throw new Error('Command IDs must be unique.');
  if (!isNew && !previousPath) throw new Error('Choose an existing command.');
  assertValid(
    Object.values(
      commandFieldErrors(draft, commandChildren(next, parent), next),
    ),
  );
  const oldParentId =
    previousPath && previousPath.length > 1 ? previousPath.at(-2)!.id : 'root';
  const existingHandler = commandHandler(next, draft.handler);
  if (
    existingHandler &&
    (isNew || previousPath!.at(-1)!.handler !== draft.handler)
  )
    draft = {
      ...draft,
      demoFlags: draft.demoFlags ?? existingHandler.demoFlags,
      children: aliasChildren(existingHandler.children, draft.id),
    };
  if (previousPath) {
    const oldParent =
      previousPath.length > 1 ? previousPath.at(-2)!.id : 'root';
    const siblings = commandChildren(next, oldParent);
    const index = siblings.findIndex((node) => node.id === draft.id);
    if (oldParent === parent) siblings[index] = structuredClone(draft);
    else {
      siblings.splice(index, 1);
      commandChildren(next, parent).push(structuredClone(draft));
    }
  } else commandChildren(next, parent).push(structuredClone(draft));
  const overrides = new Map<string, CommandNode>([[draft.handler, draft]]);
  for (const id of [oldParentId, parent]) {
    if (id === 'root') continue;
    const owner = commandPath(next, id)!.at(-1)!;
    overrides.set(owner.handler, owner);
  }
  const result = shareCommandInterfaces(next, overrides);
  assertValid(commandErrors(result));
  return result;
}
function commandArguments(node?: CommandNode): ArgumentSettings[] {
  return demoArguments.filter((arg) =>
    node?.demoFlags?.includes(arg.destination as DemoFlag),
  );
}
export function commandPath(
  nodes: CommandNode[],
  id: string,
): CommandNode[] | undefined {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const path = commandPath(node.children, id);
    if (path) return [node, ...path];
  }
  return undefined;
}
// Aliases share one Bash function, including its argument and child registrations.
function handlerInterface(node: CommandNode): string {
  return JSON.stringify({
    flags: [...(node.demoFlags ?? [])].sort(),
    children: node.children.map((child) => [
      child.name,
      child.handler,
      child.description,
    ]),
  });
}
export function commandFieldErrors(
  node: CommandNode,
  siblings: CommandNode[],
  _nodes: CommandNode[],
): Partial<Record<'name' | 'handler' | 'description', string>> {
  const errors: Partial<Record<'name' | 'handler' | 'description', string>> =
    {};
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(node.name) || node.name === 'help')
    errors.name =
      'Use a command name starting with a letter or digit; help is reserved.';
  if (
    siblings.some((other) => other.id !== node.id && other.name === node.name)
  )
    errors.name = 'Command names must be unique within their parent.';
  // Shell builtins and koi functions cannot be replaced by generated handlers.
  if (
    !/^[A-Za-z_][A-Za-z0-9_:]*$/.test(node.handler) ||
    node.handler.startsWith('koi:') ||
    node.handler.startsWith('__koi_') ||
    reservedHandlers.has(node.handler)
  )
    errors.handler =
      'Choose an ordinary Bash function name outside shell and koi names.';
  if (!node.description || node.description.includes('\0'))
    errors.description =
      'Provide a nonempty description without NUL characters.';
  return errors;
}
const reservedHandlers = new Set(
  'alias bg bind break builtin caller case cd command compgen complete compopt continue coproc declare dirs disown do done echo elif else enable esac eval exec exit export false fc fg fi for function getopts hash help history if in jobs kill let local logout mapfile popd printf pushd pwd read readarray readonly return select set shift shopt source test then time times trap true type typeset ulimit umask unalias unset until wait while'.split(
    ' ',
  ),
);
export function commandErrors(nodes: CommandNode[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const interfaces = new Map<string, string>();
  const visit = (items: CommandNode[]) => {
    for (const node of items) {
      if (!node.id || node.id === 'root' || ids.has(node.id))
        errors.push('Command IDs must be unique and nonempty.');
      ids.add(node.id);
      const body = handlerInterface(node);
      if (interfaces.has(node.handler) && interfaces.get(node.handler) !== body)
        errors.push(
          'A shared handler must use the same demo arguments and child commands.',
        );
      interfaces.set(node.handler, body);
      errors.push(...Object.values(commandFieldErrors(node, items, nodes)));
      if (
        node.demoFlags &&
        (new Set(node.demoFlags).size !== node.demoFlags.length ||
          node.demoFlags.some(
            (flag) => !demoArguments.some((arg) => arg.destination === flag),
          ))
      )
        errors.push('Choose distinct supported demo flags.');
      visit(node.children);
    }
  };
  visit(nodes);
  return [...new Set(errors)];
}
export function commandScript(nodes: CommandNode[]): string {
  assertValid(commandErrors(nodes));
  const register = (node: CommandNode) =>
    `koi::add_command ${node.name} -f ${node.handler} -d ${shellQuote(node.description)}`;
  const functions: string[] = [];
  const emitted = new Set<string>();
  const visit = (items: CommandNode[]) => {
    for (const node of items) {
      if (emitted.has(node.handler)) {
        visit(node.children);
        continue;
      }
      emitted.add(node.handler);
      const args = commandArguments(node);
      const declarations = args
        .map(argumentDeclaration)
        .concat(node.children.map(register));
      const locals = args.length
        ? '    local ' + args.map((arg) => arg.destination).join(' ') + '\n'
        : '';
      const output = args
        .map(
          (arg) =>
            `    printf '%s\\n' "${arg.destination}: $${arg.destination}"`,
        )
        .join('\n');
      functions.push(
        `# Handle the ${node.name} command\n# Usage: ${node.handler} "$@"\n#   $@  arguments forwarded to koi\n${node.handler}() {\n${locals}${declarations.map((line) => '    ' + line + '\n').join('')}    koi::parse "$@" || return "$koi_status"\n\n    printf '%s\\n' ${shellQuote('handler: ' + node.handler)}${output ? '\n' + output : ''}\n}`,
      );
      visit(node.children);
    }
  };
  visit(nodes);
  return (
    [
      '#!/usr/bin/env bash\nsource koi',
      ['koi::config name app', ...nodes.map(register)].join('\n'),
      ...functions,
      'koi::run "$@"',
    ].join('\n\n') + '\n'
  );
}
export function commandHelp(nodes: CommandNode[], selected = 'root'): string {
  assertValid(commandErrors(nodes));
  const path = selected === 'root' ? [] : commandPath(nodes, selected);
  if (!path) throw new Error('Select an existing command.');
  const node = path.at(-1);
  const children = node ? node.children : nodes;
  const args = commandArguments(node);
  const description = node ? helpText(node.description) + '\n' : '';
  const base = argumentHelp(args, {
    name: 'app' + path.map((node) => ' ' + node.name).join(''),
    usage: [
      ...args.map((arg) => `[-${arg.short}]`),
      ...(children.length
        ? [selected === 'root' ? 'COMMAND' : '[COMMAND]']
        : []),
    ],
  });
  if (!children.length) return description + base;
  const rows = [
    ...children.map((node) => [node.name, node.description]),
    ['help', 'Show this help'],
  ];
  const width = Math.max(...rows.map(([label]) => label.length));
  const commands = rows
    .map(([label, text]) =>
      helpText(text, `  ${label.padEnd(width)}  `, ' '.repeat(width + 4)),
    )
    .join('');
  return (
    description +
    base.replace(
      '\n\nOptions:\n',
      '\n\nCommands:\n' + commands + '\nOptions:\n',
    )
  );
}
export const interfaceBuilders = {
  groupArguments,
  dependencyArguments,
  defaultGroup,
  defaultDependency,
  defaultCommands,
  groupErrors,
  dependencyErrors,
  groupScript,
  groupHelp,
  groupCombinations,
  dependencyScript,
  dependencyHelp,
  dependencyMissing,
  dependencyTokens,
  dependencyOutcome,
  commandPath,
  commandHandler,
  removeCommand,
  commandTreeRows,
  commandParentRows,
  commandChildren,
  placeCommand,
  chooseDemoFlags,
  demoArguments,
  commandFieldErrors,
  commandErrors,
  commandScript,
  commandHelp,
};
