import { sourceReviewPrompt } from '../lib/source-review';
import { newChatUrls } from '../lib/doc-actions';

const root = document.querySelector<HTMLElement>('.review-source')!;
const versions: {
  id: string;
  label: string;
  sourceUrl: string;
  href: string;
}[] = JSON.parse(document.getElementById('review-versions')!.textContent!);
const fallback = root.dataset.defaultVersion!;
// The intro also uses inline code; only the prompt is copied or replaced.
const promptCode = root.querySelector<HTMLElement>('.review-prompt code')!;
const pre = root.querySelector<HTMLElement>('.review-prompt pre')!;
const status = root.querySelector<HTMLElement>('[data-review-status]')!;
const retry = root.querySelector<HTMLButtonElement>('[data-review-retry]')!;
const selector = root.querySelector<HTMLElement>('[data-version-selector]')!;
const trigger = selector.querySelector<HTMLButtonElement>('.version-trigger')!;
const panel = selector.querySelector<HTMLElement>('.version-options')!;
const actions = [
  ...root.querySelectorAll<HTMLButtonElement>('.review-actions button'),
];
const cache = new Map([[fallback, promptCode.textContent!]]);
let request: AbortController | undefined;
let selected = fallback;
let ready = true;

function setActions(disabled: boolean) {
  for (const action of actions) action.disabled = disabled;
}

async function selectVersion(id: string) {
  const version =
    versions.find((entry) => entry.id === id) ||
    versions.find((entry) => entry.id === fallback)!;
  selected = version.id;
  request?.abort();
  const controller = new AbortController();
  request = controller;
  ready = false;
  setActions(true);
  retry.hidden = true;
  pre.hidden = true;
  root.querySelector('.review-prompt')!.setAttribute('aria-busy', 'true');
  selector.querySelector('.version-label')!.textContent = version.label;
  for (const option of selector.querySelectorAll<HTMLAnchorElement>(
    '[data-version-id]',
  )) {
    if (option.dataset.versionId === selected)
      option.setAttribute('aria-current', 'true');
    else option.removeAttribute('aria-current');
  }
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  status.textContent = `Loading ${version.label} source…`;
  try {
    let prompt = cache.get(selected);
    if (prompt === undefined) {
      const response = await fetch(version.sourceUrl, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Source unavailable');
      prompt = sourceReviewPrompt(await response.text());
      cache.set(version.id, prompt);
    }
    if (controller.signal.aborted) return;
    promptCode.textContent = prompt;
    pre.hidden = false;
    pre.scrollTop = 0;
    pre.scrollLeft = 0;
    ready = true;
    status.textContent = '';
    setActions(false);
  } catch {
    if (controller.signal.aborted) return;
    status.textContent = `Could not load ${version.label} source. Try again.`;
    retry.hidden = false;
  } finally {
    if (!controller.signal.aborted)
      root.querySelector('.review-prompt')!.setAttribute('aria-busy', 'false');
  }
}

function readLocation() {
  const url = new URL(location.href);
  const requested = url.searchParams.get('version');
  const id = versions.some((version) => version.id === requested)
    ? requested!
    : fallback;
  if (requested && requested !== id) {
    url.searchParams.set('version', id);
    history.replaceState(null, '', url);
  }
  void selectVersion(id);
}

selector.addEventListener('click', (event) => {
  const link = (event.target as Element).closest<HTMLAnchorElement>(
    '[data-version-id]',
  );
  if (
    !link ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  )
    return;
  event.preventDefault();
  history.pushState(null, '', link.href);
  void selectVersion(link.dataset.versionId!);
  trigger.focus();
});
window.addEventListener('popstate', readLocation);
retry.addEventListener('click', () => void selectVersion(selected));

for (const button of root.querySelectorAll<HTMLButtonElement>(
  '[data-review-provider]',
)) {
  button.addEventListener('click', () => {
    if (!ready) return;
    const provider = button.dataset.reviewProvider as keyof typeof newChatUrls;
    window.open(newChatUrls[provider], '_blank', 'noopener,noreferrer');
  });
}
readLocation();
