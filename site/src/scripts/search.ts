import { search, type SearchEntry, type SearchResult } from '../lib/search';
const dialog = document.querySelector<HTMLDialogElement>('#search-dialog')!;
const input = dialog.querySelector<HTMLInputElement>('input')!;
const results = dialog.querySelector<HTMLUListElement>('#search-results')!;
const status = dialog.querySelector<HTMLElement>('.search-status')!;
let entries: SearchEntry[] | null = null;
let loading: Promise<void> | null = null;
let selected = -1;
let matches: SearchResult[] = [];
let previous: HTMLElement | null = null;
function select(index: number) {
  selected = index;
  results
    .querySelectorAll('li')
    .forEach((li, n) => li.setAttribute('aria-selected', String(n === index)));
  if (index >= 0) {
    input.setAttribute('aria-activedescendant', `result-${index}`);
    results.children[index]?.scrollIntoView({ block: 'nearest' });
  } else input.removeAttribute('aria-activedescendant');
}
function render() {
  if (!entries) return;
  matches = search(entries, input.value);
  results.replaceChildren();
  status.textContent = !input.value.trim()
    ? 'Type a command, concept, or question.'
    : matches.length
      ? `${matches.length} results`
      : 'No results.';
  for (const [index, match] of matches.entries()) {
    const li = document.createElement('li');
    li.id = `result-${index}`;
    li.role = 'option';
    const anchor = document.createElement('a');
    anchor.href = match.url;
    anchor.tabIndex = -1;
    const context = document.createElement('span');
    context.className = 'result-context';
    context.textContent = `${match.group} / ${match.section}`;
    const title = document.createElement('strong');
    title.textContent = match.title;
    const excerpt = document.createElement('span');
    excerpt.className = 'result-excerpt';
    excerpt.textContent = match.excerpt;
    anchor.append(context, title, excerpt);
    li.append(anchor);
    results.append(li);
    anchor.addEventListener('click', () => dialog.close());
  }
  input.setAttribute('aria-expanded', String(matches.length > 0));
  select(matches.length ? 0 : -1);
}
async function open() {
  previous = document.activeElement as HTMLElement;
  dialog.showModal();
  input.focus();
  if (entries) {
    render();
    return;
  }
  status.textContent = 'Loading search…';
  if (!loading)
    loading = (async () => {
      try {
        const response = await fetch('/search.json');
        if (!response.ok) throw new Error('Search unavailable');
        entries = await response.json();
        render();
      } catch {
        status.textContent =
          'Search could not load. Close and reopen to retry, or use the section menu.';
      } finally {
        loading = null;
      }
    })();
  await loading;
}
document
  .querySelectorAll('[data-open-search]')
  .forEach((button) => button.addEventListener('click', open));
dialog
  .querySelector('[data-close-search]')!
  .addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  const mouse = event as MouseEvent;
  if (
    event.target === dialog &&
    (mouse.clientX < bounds.left ||
      mouse.clientX > bounds.right ||
      mouse.clientY < bounds.top ||
      mouse.clientY > bounds.bottom)
  )
    dialog.close();
});
dialog.addEventListener('close', () => {
  input.setAttribute('aria-expanded', 'false');
  previous?.focus();
});
input.addEventListener('input', render);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    dialog.close();
    return;
  }
  if (
    (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
    matches.length
  ) {
    event.preventDefault();
    select(
      (selected + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) %
        matches.length,
    );
  } else if (event.key === 'Enter' && selected >= 0) {
    event.preventDefault();
    results.querySelectorAll<HTMLAnchorElement>('a')[selected].click();
  }
});
document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (
    event.key === '/' &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !dialog.open &&
    !target.closest('input,textarea,select,[contenteditable="true"]')
  ) {
    event.preventDefault();
    void open();
  }
});
