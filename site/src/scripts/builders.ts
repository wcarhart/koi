import { highlightScript } from './highlight';
import { helpScript, helpErrors, type HelpSettings } from '../lib/builders';
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
  const update = () => {
    let errors: string[];
    let script: string | undefined;
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
    message.textContent = errors.length
      ? errors.join(' ') + ' The code keeps the last valid configuration.'
      : '';
    if (script !== undefined) void highlightScript(output, script);
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
