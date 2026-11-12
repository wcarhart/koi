document.documentElement.classList.add('js');
const announce = (message: string) => {
  const node = document.getElementById('announcement');
  if (node) node.textContent = message;
};
function updateThemeButtons() {
  document
    .querySelectorAll<HTMLButtonElement>('.theme-toggle')
    .forEach((button) => {
      button.setAttribute(
        'aria-label',
        `Switch to ${document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'} mode`,
      );
    });
}
updateThemeButtons();
document.querySelectorAll('.theme-toggle').forEach((button) =>
  button.addEventListener('click', () => {
    const theme =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('koi-theme', theme);
    } catch {
      /* Private browsing can disable storage. */
    }
    updateThemeButtons();
  }),
);
matchMedia('(prefers-color-scheme: dark)').addEventListener(
  'change',
  (event) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('koi-theme');
    } catch {
      /* Use the system preference. */
    }
    if (!saved) {
      document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
      updateThemeButtons();
    }
  },
);
const timers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();
const check =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
document.addEventListener('click', async (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>(
    '[data-copy-code], [data-copy-markdown]',
  );
  if (!button || button.disabled) return;
  const original = button.dataset.originalHtml ?? button.innerHTML;
  button.dataset.originalHtml = original;
  button.disabled = true;
  try {
    let text: string;
    if (button.dataset.copyMarkdown) {
      const response = await fetch(button.dataset.copyMarkdown);
      if (!response.ok) throw new Error('Markdown unavailable');
      text = await response.text();
    } else {
      const code = button.closest('.code-block')?.querySelector('code');
      if (!code) throw new Error('Code unavailable');
      text = code.textContent || '';
    }
    await navigator.clipboard.writeText(text);
    clearTimeout(timers.get(button));
    button.innerHTML = button.hasAttribute('data-copy-markdown')
      ? `${check}<span>Copied</span>`
      : check;
    button.dataset.copyState = 'success';
    announce('Copied to clipboard.');
    timers.set(
      button,
      setTimeout(() => {
        button.innerHTML = original;
        delete button.dataset.copyState;
      }, 1500),
    );
  } catch {
    button.innerHTML = original;
    button.dataset.copyState = 'error';
    announce(
      'Copy failed. Select and copy the text manually, or open the raw text link.',
    );
    clearTimeout(timers.get(button));
    timers.set(
      button,
      setTimeout(() => {
        delete button.dataset.copyState;
      }, 3000),
    );
  } finally {
    button.disabled = false;
  }
});
