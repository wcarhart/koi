import {
  argumentScript,
  argumentErrors,
  helpScript,
  helpErrors,
  type ArgumentSettings,
  type HelpSettings,
} from '../lib/builders';
for (const form of document.querySelectorAll<HTMLFormElement>(
  '[data-builder]',
)) {
  const output = form
    .closest('[data-doc-section]')
    ?.querySelector<HTMLElement>('.doc-example .code-block code');
  const message = form.querySelector<HTMLElement>('.builder-error')!;
  if (!output) continue;
  const initial = output.innerHTML;
  const string = (name: string) =>
    (form.elements.namedItem(name) as HTMLInputElement).value;
  const checked = (name: string) =>
    (form.elements.namedItem(name) as HTMLInputElement).checked;
  const hide = (selector: string, hidden: boolean) => {
    const node = form.querySelector<HTMLElement>(selector);
    if (!node) return;
    node.hidden = hidden;
    node
      .querySelectorAll<HTMLInputElement>('input')
      .forEach((input) => (input.disabled = hidden));
  };
  const update = () => {
    let errors: string[];
    let script: string | undefined;
    if (form.dataset.builder === 'addarg') {
      const settings: ArgumentSettings = {
        kind: string('kind') as ArgumentSettings['kind'],
        destination: string('destination'),
        short: string('short'),
        long: string('long'),
        description: string('description'),
        required: checked('required'),
        useDefault: checked('useDefault'),
        defaultValue: string('defaultValue'),
        displayName: string('displayName'),
      };
      hide('[data-spellings]', settings.kind === 'positional');
      hide(
        '[data-default-control]',
        settings.kind === 'flag' || settings.required,
      );
      hide(
        '[data-default-value]',
        settings.kind === 'flag' || settings.required || !settings.useDefault,
      );
      hide('[data-display-name]', settings.kind === 'flag');
      errors = argumentErrors(settings);
      if (!errors.length) script = argumentScript(settings);
    } else {
      const helpCommand = checked('helpCommand');
      const verbose = form.elements.namedItem('verbose') as HTMLInputElement;
      if (!helpCommand) verbose.checked = false;
      verbose.disabled = !helpCommand;
      const settings: HelpSettings = {
        name: string('name'),
        description: string('description'),
        width: string('width'),
        helpCommand,
        verbose: checked('verbose'),
        hints: checked('hints'),
        unknownHelp: checked('unknownHelp'),
        missingMessage: string('missingMessage'),
      };
      errors = helpErrors(settings);
      if (!errors.length) script = helpScript(settings);
    }
    message.textContent = errors.length
      ? errors.join(' ') + ' The code keeps the last valid configuration.'
      : '';
    if (script !== undefined) output.textContent = script.trimEnd();
  };
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('reset', () =>
    setTimeout(() => {
      update();
      output.innerHTML = initial;
    }, 0),
  );
  // Keep the highlighted server-rendered default until a setting is changed.
  update();
  output.innerHTML = initial;
}
