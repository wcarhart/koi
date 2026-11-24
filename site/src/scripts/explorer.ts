import { highlightScript } from './highlight';

export function explorerPreview(
  explorer: HTMLElement,
  sample: string,
  options: { previews?: HTMLElement[]; reserveSpace?: boolean } = {},
) {
  const section = explorer.closest<HTMLElement>('[data-doc-section]')!;
  const previews = options.previews ?? [
    section.querySelector<HTMLElement>(`.doc-example [data-${sample}-sample]`)!,
  ];
  const outputs = previews.map((preview) => ({
    script: preview.querySelector<HTMLElement>(
      '[data-explorer-output="script"] code',
    )!,
    help: preview.querySelector<HTMLElement>(
      '[data-explorer-output="help"] code',
    )!,
  }));
  if (options.reserveSpace !== false) {
    const prose = section.querySelector<HTMLElement>('.doc-prose')!;
    const demo = section.querySelector<HTMLElement>('.example-sticky')!;
    section.classList.add('has-explorer');
    const reserve = () =>
      prose.style.setProperty(
        '--argument-demo-space',
        `${Math.max(0, demo.offsetHeight - explorer.offsetHeight + (parseFloat(getComputedStyle(demo).top) || 0))}px`,
      );
    const observer = new ResizeObserver(reserve);
    observer.observe(demo);
    observer.observe(explorer);
    reserve();
  }
  return (script: string, help: string) => {
    for (const output of outputs) {
      void highlightScript(output.script, script);
      output.help.textContent = help.trimEnd();
    }
  };
}

export function clearFieldError(field: Element): void {
  field.removeAttribute('aria-invalid');
  field.removeAttribute('aria-description');
  field.classList.remove('argument-invalid-shake');
}
export function showFieldErrors(
  form: HTMLFormElement,
  errors: Record<string, string>,
): boolean {
  const entries = Object.entries(errors);
  for (const [name, message] of entries) {
    const field = form.elements.namedItem(name) as HTMLElement;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-description', message);
    field.classList.remove('argument-invalid-shake');
    void field.offsetWidth;
    field.classList.add('argument-invalid-shake');
  }
  if (entries.length) {
    const first = form.elements.namedItem(entries[0][0]) as HTMLElement;
    first.focus({ preventScroll: true });
    first.scrollIntoView({ block: 'nearest' });
  }
  return entries.length > 0;
}

// Dynamic rows use the same icon/button styling as ExplorerAction.
export function rowAction(
  label: string,
  icon: 'add' | 'edit' | 'remove',
  onClick: (button: HTMLButtonElement) => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'argument-action argument-remove';
  button.setAttribute('aria-label', label);
  button.title = label;
  const paths = {
    add: 'M12 5v14M5 12h14',
    edit: 'm4 16-1 5 5-1L20 8l-4-4Z',
    remove: 'm6 6 12 12M6 18 18 6',
  };
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="${paths[icon]}" /></svg>`;
  button.addEventListener('click', () => onClick(button));
  return button;
}
