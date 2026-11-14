import {
  argumentScript,
  argumentHelp,
  argumentFieldErrors,
  argumentCollectionErrors,
  defaultArgument,
  type ArgumentSettings,
} from '../lib/builders';
import { highlightScript } from './highlight';
import { initDropdown } from './dropdown';

for (const explorer of document.querySelectorAll<HTMLElement>(
  '[data-argument-explorer]',
)) {
  const section = explorer.closest('[data-doc-section]')!;
  const outputs = section.querySelectorAll<HTMLElement>(
    '.doc-example [data-argument-sample] .code-block code',
  );
  const prose = section.querySelector<HTMLElement>('.doc-prose')!;
  const demo = section.querySelector<HTMLElement>('.example-sticky')!;
  // Keep the demo pinned until the editor reaches the top, even when the demo is taller.
  const reserveDemoSpace = () => {
    const inset = parseFloat(getComputedStyle(demo).top) || 0;
    const space = Math.max(
      0,
      demo.offsetHeight - explorer.offsetHeight + inset,
    );
    prose.style.setProperty('--argument-demo-space', `${space}px`);
  };
  const demoResize = new ResizeObserver(reserveDemoSpace);
  demoResize.observe(demo);
  demoResize.observe(explorer);
  const list = explorer.querySelector<HTMLElement>('[data-argument-list]')!;
  const rows = explorer.querySelector<HTMLUListElement>('.argument-rows')!;
  const form = explorer.querySelector<HTMLFormElement>('form')!;
  const dropdowns = (['kind', 'cardinality'] as const).map((key) => ({
    key,
    control: initDropdown(
      form.querySelector<HTMLElement>(`#argument-${key}`)!,
      {
        onOpen: () => closeChoices(),
        onChange: (value) => {
          if (key === 'kind') draft.kind = value as ArgumentSettings['kind'];
          else draft.cardinality = value as ArgumentSettings['cardinality'];
          sync();
          closeChoices();
        },
      },
    ),
  }));
  let args = [{ ...defaultArgument }];
  let draft: ArgumentSettings;
  let editing = -1;
  let invoker: HTMLElement;
  const input = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement;
  const sync = () => {
    const positional = draft.kind === 'positional';
    const flag = draft.kind === 'flag';
    if (flag) draft.cardinality = 'scalar';
    const array = draft.cardinality === 'array';
    dropdowns
      .find((dropdown) => dropdown.key === 'cardinality')!
      .control.setDisabled(flag);
    form.querySelector<HTMLElement>('[data-cardinality]')!.hidden = flag;
    if (array) {
      draft.useDefault = false;
      draft.defaultValue = '';
      input('defaultValue').value = '';
    }
    form.querySelector<HTMLButtonElement>(
      '[data-switch="useDefault"]',
    )!.disabled = array;
    if (draft.required || flag || array) draft.useDefault = false;
    for (const [selector, hidden] of [
      ['[data-spellings]', positional],
      ['[data-default-control]', flag || draft.required || array],
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
    for (const dropdown of dropdowns) {
      dropdown.control.setValue(draft[dropdown.key]);
    }
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
    for (const { control } of dropdowns) control.close();
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
      const cardinality = document.createElement('span');
      cardinality.className = 'argument-cardinality';
      cardinality.textContent = arg.cardinality.toUpperCase();
      button.append(spelling, kind, cardinality);
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
    const layoutErrors = argumentCollectionErrors(next).filter((error) =>
      error.includes('positional'),
    );
    if (layoutErrors.length) errors.destination = layoutErrors.join(' ');
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
