import { ctaArrow } from '../lib/html';
import { enhanceApiCode, getApiReferences } from './api-code';

enhanceApiCode();
const references = new Map(
  getApiReferences().map((reference) => [reference.title, reference]),
);
const card = document.createElement('div');
card.id = 'api-reference-card';
card.className = 'api-reference-card';
card.setAttribute('role', 'dialog');
card.setAttribute('aria-labelledby', 'api-reference-title');
card.setAttribute('aria-describedby', 'api-reference-description');
card.hidden = true;
card.innerHTML =
  '<div class="api-reference-heading"><p id="api-reference-title" class="api-reference-title"></p><a class="button" href="" aria-label="Docs">' +
  ctaArrow +
  '</a></div><p id="api-reference-description"></p><div class="api-reference-usage-label">USAGE</div><div class="api-reference-usage"></div>';
document.body.append(card);
// Cover the pointer gap so crossing the next code line cannot switch APIs.
const bridge = document.createElement('div');
bridge.className = 'api-reference-bridge';
bridge.hidden = true;
bridge.setAttribute('aria-hidden', 'true');
document.body.append(bridge);
const title = card.querySelector<HTMLElement>('#api-reference-title')!;
const description = card.querySelector<HTMLElement>(
  '#api-reference-description',
)!;
const link = card.querySelector<HTMLAnchorElement>('a')!;
const usage = card.querySelector<HTMLElement>('.api-reference-usage')!;
let active: HTMLElement | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let visibilityFrame = 0;
let restoringFocus = false;

function close(restoreFocus = false) {
  clearTimeout(timer);
  cancelAnimationFrame(visibilityFrame);
  const trigger = active;
  active = undefined;
  trigger?.setAttribute('aria-expanded', 'false');
  trigger?.removeAttribute('aria-controls');
  // Focus first so the dialog never hides a focused descendant.
  if (restoreFocus) {
    restoringFocus = true;
    trigger?.focus({ preventScroll: true });
    restoringFocus = false;
  }
  card.hidden = true;
  bridge.hidden = true;
}

function watchVisibility() {
  if (!active) return;
  if (!active.isConnected || !active.getClientRects().length) {
    close();
    return;
  }
  visibilityFrame = requestAnimationFrame(watchVisibility);
}

function open(trigger: HTMLElement) {
  clearTimeout(timer);
  if (active === trigger) return;
  const reference = references.get(trigger.dataset.apiReference || '');
  if (!reference) return;
  close();
  active = trigger;
  const host = trigger.closest('dialog[open]') || document.body;
  if (card.parentElement !== host) host.append(card, bridge);
  title.textContent = reference.title;
  description.textContent = reference.description;
  usage.innerHTML = reference.usageHtml;
  const pre = usage.querySelector('pre')!;
  pre.tabIndex = 0;
  pre.setAttribute('role', 'region');
  pre.setAttribute('aria-label', `${reference.title} usage`);
  link.href = reference.url;
  trigger.setAttribute('aria-expanded', 'true');
  trigger.setAttribute('aria-controls', card.id);
  card.hidden = false;
  positionCard();
  watchVisibility();
}

function positionCard() {
  if (!active) return;
  const rect = active.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    close();
    return;
  }
  const bounds = card.getBoundingClientRect();
  const host = active.closest('dialog[open]')?.getBoundingClientRect();
  const area = host ?? {
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };
  const margin = 12;
  const below = rect.bottom + 8;
  const top =
    below + bounds.height <= area.bottom - margin
      ? below
      : rect.top - bounds.height - 8;
  const left = Math.max(
    area.left + margin,
    Math.min(rect.left, area.right - bounds.width - margin),
  );
  const cardTop = Math.max(
    area.top + margin,
    Math.min(top, area.bottom - bounds.height - margin),
  );
  card.style.left = `${left}px`;
  card.style.top = `${cardTop}px`;
  const above = cardTop + bounds.height <= rect.top;
  const gapTop = above ? cardTop + bounds.height : rect.bottom;
  const gapBottom = above ? rect.top : cardTop;
  bridge.hidden = gapBottom <= gapTop;
  bridge.style.left = `${left}px`;
  bridge.style.top = `${gapTop}px`;
  bridge.style.width = `${bounds.width}px`;
  bridge.style.height = `${Math.max(0, gapBottom - gapTop)}px`;
}

function scheduleClose() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (
      card.matches(':hover') ||
      bridge.matches(':hover') ||
      card.contains(document.activeElement) ||
      active === document.activeElement
    )
      return;
    close();
  }, 180);
}

function triggerFor(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest<HTMLElement>('[data-api-reference]')
    : null;
}

document.addEventListener('pointerover', (event) => {
  if (event.pointerType === 'touch') return;
  const trigger = triggerFor(event.target);
  if (
    trigger &&
    !(
      event.relatedTarget instanceof Node &&
      trigger.contains(event.relatedTarget)
    )
  )
    open(trigger);
});
document.addEventListener('pointerout', (event) => {
  const trigger = triggerFor(event.target);
  if (
    trigger &&
    !(
      event.relatedTarget instanceof Node &&
      trigger.contains(event.relatedTarget)
    )
  )
    scheduleClose();
});
card.addEventListener('pointerenter', () => clearTimeout(timer));
card.addEventListener('pointerleave', scheduleClose);
bridge.addEventListener('pointerenter', () => clearTimeout(timer));
bridge.addEventListener('pointerleave', scheduleClose);
document.addEventListener('focusin', (event) => {
  if (restoringFocus) return;
  const trigger = triggerFor(event.target);
  if (trigger) {
    // Focus can scroll a code panel; position the card after that scroll settles.
    requestAnimationFrame(() => {
      if (document.activeElement === trigger) open(trigger);
    });
  } else if (!card.contains(event.target as Node)) close();
});
document.addEventListener('focusout', scheduleClose);
document.addEventListener('click', (event) => {
  const trigger = triggerFor(event.target);
  if (trigger) close();
  else if (!card.contains(event.target as Node)) close();
});
document.addEventListener('keydown', (event) => {
  if (!active) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    close(card.contains(document.activeElement));
  } else if (
    event.key === 'Tab' &&
    !event.shiftKey &&
    document.activeElement === active
  ) {
    event.preventDefault();
    link.focus();
  } else if (
    event.key === 'Tab' &&
    event.shiftKey &&
    document.activeElement === link
  ) {
    event.preventDefault();
    active.focus();
  }
});
document.addEventListener(
  'scroll',
  (event) => {
    if (event.target === document && document.activeElement === active) {
      positionCard();
    } else if (!card.contains(event.target as Node)) close();
  },
  true,
);
window.addEventListener('resize', () => close());

// A tooltip belongs to its trigger's native modal while that modal is open.
document.addEventListener(
  'close',
  (event) => {
    if (
      event.target instanceof HTMLDialogElement &&
      card.parentElement === event.target
    ) {
      close();
      document.body.append(card, bridge);
    }
  },
  true,
);
