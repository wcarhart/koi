import {
  argumentScript,
  argumentHelp,
  argumentFieldErrors,
  defaultArgument,
  type ArgumentSettings,
} from '../lib/builders';
import { highlightScript } from './highlight';

for (const explorer of document.querySelectorAll<HTMLElement>(
  '[data-argument-explorer]',
)) {
  const section = explorer.closest('[data-doc-section]')!;
  const outputs = section.querySelectorAll<HTMLElement>(
    '.doc-example .code-block code',
  );
  const list = explorer.querySelector<HTMLElement>('[data-argument-list]')!;
  const rows = explorer.querySelector<HTMLUListElement>('.argument-rows')!;
  const form = explorer.querySelector<HTMLFormElement>('form')!;
  const trigger = form.querySelector<HTMLButtonElement>(
    '.argument-kind-trigger',
  )!;
  const choices = form.querySelector<HTMLElement>('[role=listbox]')!;
  const options = [
    ...choices.querySelectorAll<HTMLButtonElement>('[role=option]'),
  ];
  let args = [{ ...defaultArgument }];
  let draft: ArgumentSettings;
  let editing = -1;
  let invoker: HTMLElement;
  const input = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement;
  const sync = () => {
    const positional = draft.kind === 'positional';
    const flag = draft.kind === 'flag';
    if (draft.required || flag) draft.useDefault = false;
    for (const [selector, hidden] of [
      ['[data-spellings]', positional],
      ['[data-default-control]', flag || draft.required],
      ['[data-default-value]', flag || draft.required || !draft.useDefault],
      ['[data-display-name]', flag],
    ] as const) {
      const group = form.querySelector<HTMLElement>(selector)!;
      group.hidden = hidden;
      group
        .querySelectorAll<HTMLInputElement>('input')
        .forEach((field) => (field.disabled = hidden));
    }
    input('defaultValue').required = draft.useDefault;
    form.querySelector('#argument-kind-value')!.textContent =
      draft.kind[0].toUpperCase() + draft.kind.slice(1);
    options.forEach((option) =>
      option.setAttribute(
        'aria-selected',
        String(option.dataset.kind === draft.kind),
      ),
    );
    form
      .querySelectorAll<HTMLButtonElement>('[data-switch]')
      .forEach((button) => {
        button.setAttribute(
          'aria-checked',
          String(draft[button.dataset.switch as 'required' | 'useDefault']),
        );
      });
  };
  const closeChoices = () => {
    choices.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  const close = () => {
    form.hidden = true;
    list.hidden = false;
    closeChoices();
    invoker?.focus({ preventScroll: true });
  };
  const open = (index: number, button: HTMLElement) => {
    editing = index;
    invoker = button;
    draft =
      index < 0
        ? {
            ...defaultArgument,
            kind: 'flag',
            destination: '',
            short: '',
            long: '',
            description: '',
            useDefault: false,
            defaultValue: '',
          }
        : { ...args[index] };
    for (const name of [
      'destination',
      'short',
      'long',
      'description',
      'defaultValue',
      'displayName',
    ] as const)
      input(name).value = draft[name];
    form.querySelectorAll('[aria-invalid]').forEach((field) => {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-description');
      field.classList.remove('argument-invalid-shake');
    });
    form.querySelector('[data-editor-title]')!.textContent =
      index < 0 ? 'Register an argument' : 'Edit argument';
    list.hidden = true;
    form.hidden = false;
    sync();
    input('destination').focus({ preventScroll: true });
  };
  const render = () => {
    rows.replaceChildren();
    args.forEach((arg, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'argument-row';
      const kind = document.createElement('span');
      kind.className = 'argument-kind';
      kind.textContent = arg.kind.toUpperCase();
      const spelling = document.createElement('span');
      spelling.className = 'argument-spelling';
      spelling.textContent =
        arg.kind === 'positional'
          ? arg.destination
          : [arg.short && `-${arg.short}`, arg.long && `--${arg.long}`]
              .filter(Boolean)
              .join(', ');
      button.append(spelling, kind);
      button.setAttribute('aria-label', `Edit ${arg.destination} argument`);
      button.addEventListener('click', () => open(index, button));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'argument-action argument-remove';
      remove.setAttribute('aria-label', `Delete ${arg.destination} argument`);
      remove.title = `Delete ${arg.destination} argument`;
      remove.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>';
      remove.addEventListener('click', () => {
        args.splice(index, 1);
        render();
        const next =
          rows.querySelectorAll<HTMLButtonElement>('.argument-remove')[
            Math.min(index, args.length - 1)
          ];
        (
          next || explorer.querySelector<HTMLButtonElement>('[data-add]')!
        ).focus({ preventScroll: true });
      });
      item.append(button, remove);
      rows.append(item);
    });
    void highlightScript(outputs[0], argumentScript(args));
    outputs[1].textContent = argumentHelp(args).trimEnd();
  };
  explorer
    .querySelector<HTMLButtonElement>('[data-add]')!
    .addEventListener('click', (event) =>
      open(-1, event.currentTarget as HTMLElement),
    );
  explorer.querySelector('[data-reset]')!.addEventListener('click', () => {
    args = [{ ...defaultArgument }];
    render();
  });
  form.querySelector('[data-cancel]')!.addEventListener('click', close);
  form.querySelectorAll<HTMLButtonElement>('[data-switch]').forEach((button) =>
    button.addEventListener('click', () => {
      const key = button.dataset.switch as 'required' | 'useDefault';
      draft[key] = !draft[key];
      sync();
    }),
  );
  trigger.addEventListener('click', () => {
    if (!choices.hidden) {
      closeChoices();
      return;
    }
    choices.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    options.find((option) => option.dataset.kind === draft.kind)!.focus();
  });
  options.forEach((option) =>
    option.addEventListener('click', () => {
      draft.kind = option.dataset.kind as ArgumentSettings['kind'];
      sync();
      closeChoices();
      trigger.focus();
    }),
  );
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (choices.hidden) trigger.click();
    }
  });
  choices.addEventListener('keydown', (event) => {
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      options[
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
              options.length
      ].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeChoices();
      trigger.focus();
    } else if (event.key === 'Tab') closeChoices();
  });
  document.addEventListener('click', (event) => {
    if (!trigger.parentElement!.contains(event.target as Node)) closeChoices();
  });
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  form.addEventListener('input', (event) => {
    const field = event.target as HTMLInputElement;
    const pairedSpellings =
      ['short', 'long'].includes(field.name) &&
      input('short').getAttribute('aria-invalid') === 'true' &&
      input('long').getAttribute('aria-invalid') === 'true';
    const fields = pairedSpellings ? [input('short'), input('long')] : [field];
    for (const edited of fields) {
      edited.removeAttribute('aria-invalid');
      edited.removeAttribute('aria-description');
      edited.classList.remove('argument-invalid-shake');
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    for (const name of [
      'destination',
      'short',
      'long',
      'description',
      'defaultValue',
      'displayName',
    ] as const)
      draft[name] = input(name).value;
    if (draft.kind === 'positional') {
      draft.short = '';
      draft.long = '';
    }
    if (draft.kind === 'flag') {
      draft.useDefault = false;
      draft.displayName = '';
    }
    const next = args.map((arg) => ({ ...arg }));
    if (editing < 0) next.push({ ...draft });
    else next[editing] = { ...draft };
    const errors = argumentFieldErrors(draft);
    const others = args.filter((_, index) => index !== editing);
    for (const field of ['destination', 'short', 'long'] as const) {
      if (field !== 'destination' && draft.kind === 'positional') continue;
      if (
        draft[field] &&
        others.some(
          (arg) =>
            (field === 'destination' || arg.kind !== 'positional') &&
            arg[field] === draft[field],
        )
      ) {
        errors[field] = `Each ${field} must be unique.`;
      }
    }
    if (draft.useDefault && !draft.defaultValue)
      errors.defaultValue = 'Provide a default value.';
    const invalid = Object.entries(errors);
    for (const [name, message] of invalid) {
      const field = input(name);
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-description', message);
      field.classList.remove('argument-invalid-shake');
      // Restart feedback on every unsuccessful submission.
      void field.offsetWidth;
      field.classList.add('argument-invalid-shake');
    }
    if (invalid.length) {
      input(invalid[0][0]).focus({ preventScroll: true });
      input(invalid[0][0]).scrollIntoView({ block: 'nearest' });
      return;
    }
    args = next;
    close();
    render();
    // Edited rows are recreated, so restore focus to their replacement.
    if (editing >= 0)
      rows
        .querySelectorAll<HTMLButtonElement>('.argument-row')
        [editing].focus({ preventScroll: true });
  });
  render();
}
