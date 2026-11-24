import { getBuilderProfile } from '../lib/builder-profiles';
import type { CommandNode } from '../lib/interface-builders';
import {
  explorerPreview,
  clearFieldError,
  showFieldErrors,
  rowAction,
} from './explorer';
import { initDropdown } from './dropdown';

for (const explorer of document.querySelectorAll<HTMLElement>(
  '[data-explorer="command"]',
)) {
  const profile = getBuilderProfile(explorer.dataset.builderProfile);
  if (!profile) continue;
  const api = profile.interfaces;
  const section = explorer.closest<HTMLElement>('[data-doc-section]')!;
  const dialog = explorer.closest<HTMLDialogElement>('[data-try-dialog]');
  const previews = [
    ...section.querySelectorAll<HTMLElement>('[data-command-sample]'),
  ];
  const updatePreview = explorerPreview(
    explorer,
    'command',
    dialog ? { previews, reserveSpace: false } : undefined,
  );
  let nodes = structuredClone(api.defaultCommands);
  let helpId = 'root';
  let editing: { node: CommandNode; parent: string; isNew: boolean };
  let invoker: HTMLElement;
  let nextId = 0;
  const list = explorer.querySelector<HTMLElement>('[data-command-list]')!;
  const tree = explorer.querySelector<HTMLElement>('[data-command-tree]')!;
  const form = explorer.querySelector<HTMLFormElement>('form')!;
  const add = explorer.querySelector<HTMLButtonElement>('[data-add]')!;
  const parentRoot = form.querySelector<HTMLElement>('#command-parent')!;
  const parentError = form.querySelector<HTMLElement>('[data-parent-error]')!;
  const flagsToggle = form.querySelector<HTMLButtonElement>(
    '[data-switch="demoArguments"]',
  )!;
  const input = (key: string) =>
    form.elements.namedItem(key) as HTMLInputElement;
  const parentControl = initDropdown(parentRoot, {
    onChange(value) {
      editing.parent = value;
      parentError.textContent = '';
      clearFieldError(parentRoot.querySelector('button')!);
      clearFieldError(input('name'));
    },
  });
  const template = explorer.querySelector<HTMLTemplateElement>(
    '[data-command-help-template]',
  )!;
  const helpControls = previews.map((preview, index) => {
    let mount = preview.querySelector<HTMLElement>(
      '[data-command-help-selector]',
    );
    if (!mount) {
      mount = document.createElement('div');
      mount.dataset.commandHelpSelector = '';
      preview.querySelector('[data-explorer-output="help"]')!.before(mount);
    }
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const root = fragment.firstElementChild as HTMLElement;
    const prefix = `command-help-${index}`;
    for (const element of fragment.querySelectorAll<HTMLElement>(
      '[id], [aria-labelledby]',
    )) {
      if (element.id)
        element.id = element.id.replaceAll('command-help-template', prefix);
      const labelled = element.getAttribute('aria-labelledby');
      if (labelled)
        element.setAttribute(
          'aria-labelledby',
          labelled.replaceAll('command-help-template', prefix),
        );
    }
    mount.append(fragment);
    return initDropdown(root, {
      onChange(value) {
        helpId = value;
        update();
      },
    });
  });
  const update = () => {
    if (helpId !== 'root' && !api.commandPath(nodes, helpId)) helpId = 'root';
    for (const control of helpControls) control.setValue(helpId);
    updatePreview(api.commandScript(nodes), api.commandHelp(nodes, helpId));
  };
  const close = (restoreFocus = true) => {
    parentControl.close();
    form.hidden = true;
    list.hidden = false;
    if (restoreFocus) invoker?.focus({ preventScroll: true });
  };
  const open = (button: HTMLElement, id?: string) => {
    invoker = button;
    const path = id ? api.commandPath(nodes, id)! : undefined;
    editing = {
      parent: path && path.length > 1 ? path.at(-2)!.id : 'root',
      isNew: !path,
      node: path
        ? structuredClone(path.at(-1)!)
        : {
            id: `new-${nextId++}`,
            name: '',
            handler: '',
            description: '',
            children: [],
            demoFlags: [],
          },
    };
    form.querySelector('[data-editor-title]')!.textContent = path
      ? 'Edit command'
      : 'Register a command';
    for (const key of ['name', 'handler', 'description'] as const) {
      input(key).value = editing.node[key];
      clearFieldError(input(key));
    }
    parentError.textContent = '';
    clearFieldError(parentRoot.querySelector('button')!);
    parentControl.setOptions(
      api.commandParentRows(nodes, id).map((row) => ({
        value: row.id,
        label: row.name,
        prefix: row.prefix,
        displayLabel: row.path.join(' > '),
      })),
    );
    parentControl.setValue(editing.parent);
    flagsToggle.setAttribute(
      'aria-checked',
      String(!!editing.node.demoFlags?.length),
    );
    list.hidden = true;
    form.hidden = false;
    input('name').focus({ preventScroll: true });
  };
  const focusRow = (id: string) =>
    (
      tree.querySelector<HTMLButtonElement>(`[data-command-id="${id}"]`) || add
    ).focus({ preventScroll: true });
  const render = () => {
    tree.replaceChildren();
    const rows = document.createElement('ul');
    rows.className = 'command-tree-list';
    rows.setAttribute('aria-label', 'Command tree');
    for (const entry of api.commandTreeRows(nodes)) {
      const item = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'command-row';
      const label =
        entry.id === 'root'
          ? document.createElement('span')
          : document.createElement('button');
      label.className = entry.id === 'root' ? 'command-root' : 'command-select';
      const prefix = document.createElement('span');
      prefix.className = 'command-branch-prefix';
      prefix.setAttribute('aria-hidden', 'true');
      prefix.textContent = entry.prefix;
      label.append(prefix, document.createTextNode(entry.name));
      if (label instanceof HTMLButtonElement) {
        label.type = 'button';
        label.dataset.commandId = entry.id;
        label.setAttribute(
          'aria-label',
          `Edit ${entry.path.join(' > ')} command`,
        );
        label.addEventListener('click', () => open(label, entry.id));
      }
      row.append(label);
      if (entry.id !== 'root') {
        const node = api.commandPath(nodes, entry.id)!.at(-1)!;
        row.append(
          rowAction(
            `Delete ${entry.path.join(' > ')} command${node.children.length ? ' and its children' : ''}`,
            'remove',
            () => {
              nodes = api.removeCommand(nodes, entry.id);
              render();
              focusRow(entry.parent!);
            },
          ),
        );
      }
      item.append(row);
      rows.append(item);
    }
    tree.append(rows);
    const options = api
      .commandTreeRows(nodes)
      .map((row) => ({ value: row.id, label: `${row.path.join(' ')} -h` }));
    helpControls.forEach((control) => control.setOptions(options));
    update();
  };
  add.addEventListener('click', () => open(add));
  explorer.querySelector('[data-reset]')!.addEventListener('click', () => {
    nodes = structuredClone(api.defaultCommands);
    helpId = 'root';
    render();
  });
  form.querySelector('[data-cancel]')!.addEventListener('click', () => close());
  dialog?.addEventListener('try-it-close', () => {
    close(false);
    helpControls.forEach((control) => control.close());
  });
  flagsToggle.addEventListener('click', () => {
    editing.node.demoFlags = editing.node.demoFlags?.length
      ? []
      : api.chooseDemoFlags();
    flagsToggle.setAttribute(
      'aria-checked',
      String(!!editing.node.demoFlags.length),
    );
  });
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  form.addEventListener('input', (event) => {
    const field = event.target as HTMLInputElement;
    clearFieldError(field);
    if (field.name === 'handler' && field.value !== editing.node.handler) {
      const shared = api.commandHandler(nodes, field.value);
      if (shared) {
        editing.node.demoFlags = [...(shared.demoFlags ?? [])];
        flagsToggle.setAttribute(
          'aria-checked',
          String(!!editing.node.demoFlags.length),
        );
      }
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    for (const key of ['name', 'handler', 'description'] as const)
      editing.node[key] = input(key).value;
    if (
      showFieldErrors(
        form,
        api.commandFieldErrors(
          editing.node,
          api.commandChildren(nodes, editing.parent),
          nodes,
        ),
      )
    )
      return;
    try {
      nodes = api.placeCommand(
        nodes,
        editing.node,
        editing.parent,
        editing.isNew,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Choose a valid parent.';
      if (/handler/i.test(message)) {
        showFieldErrors(form, { handler: message });
        return;
      }
      parentError.textContent = message;
      const trigger = parentRoot.querySelector<HTMLButtonElement>('button')!;
      trigger.setAttribute('aria-invalid', 'true');
      trigger.focus();
      return;
    }
    close();
    render();
    focusRow(editing.node.id);
  });
  render();
}
