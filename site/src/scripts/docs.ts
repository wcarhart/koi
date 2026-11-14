import { setupHumanNote } from './human-note';

const sections = [
  ...document.querySelectorAll<HTMLElement>('[data-doc-section]'),
];
const main = document.querySelector<HTMLElement>('[data-initial-section]')!;
const links = [
  ...document.querySelectorAll<HTMLAnchorElement>('[data-doc-link]'),
];
const routeMap = new Map(
  sections.map((section) => [section.dataset.url!, section]),
);
let locked = false;
let frame = 0;
function currentSection(): HTMLElement {
  return (
    [...sections]
      .reverse()
      .find((section) => section.getBoundingClientRect().top <= 170) ||
    sections[0]
  );
}
function select(section: HTMLElement) {
  links.forEach((link) => {
    if (link.dataset.docLink === section.id)
      link.setAttribute(
        'aria-current',
        section.id.startsWith('index-') ? 'page' : 'location',
      );
    else link.removeAttribute('aria-current');
  });
  document.title = `${section.dataset.title} — Documentation · koi`;
}
function savePosition(
  section = routeMap.get(location.pathname) || currentSection(),
) {
  return {
    ...history.state,
    koiY: window.scrollY,
    koiSection: section.id,
    koiOffset: -section.getBoundingClientRect().top,
  };
}
function restoredPosition(url: URL): number | undefined {
  const section = routeMap.get(url.pathname);
  const state = history.state;
  if (
    section &&
    state?.koiSection === section.id &&
    typeof state.koiOffset === 'number'
  ) {
    return (
      section.getBoundingClientRect().top + window.scrollY + state.koiOffset
    );
  }
  return typeof state?.koiY === 'number' ? state.koiY : undefined;
}
function go(url: URL, push: boolean, savedY?: number) {
  const section = routeMap.get(url.pathname);
  if (!section) return;
  let target: HTMLElement = section;
  if (url.hash) {
    try {
      target =
        [...section.querySelectorAll<HTMLElement>('[data-fragment]')].find(
          (node) =>
            node.dataset.fragment === decodeURIComponent(url.hash.slice(1)),
        ) ||
        document.getElementById(decodeURIComponent(url.hash.slice(1))) ||
        section;
    } catch {
      /* Ignore malformed fragments. */
    }
  }
  if (!section.contains(target) && target !== section) target = section;
  const heading =
    target !== section ? `#${target.dataset.fragment || target.id}` : '';
  locked = true;
  if (push) {
    history.replaceState(savePosition(), '');
    history.pushState({ koiY: null }, '', section.dataset.url! + heading);
  } else {
    history.replaceState(
      { ...history.state },
      '',
      section.dataset.url! + heading,
    );
  }
  if (savedY !== undefined)
    window.scrollTo({ top: savedY, behavior: 'instant' });
  else {
    const header = document.querySelector<HTMLElement>('.docs-mobile-bar')!;
    const headerHeight = header.getBoundingClientRect().height;
    const inset = target === section ? headerHeight : headerHeight + 24;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - inset,
      behavior: 'instant',
    });
  }
  select(section);
  if (push) {
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      history.replaceState(savePosition(section), '');
      locked = false;
    }),
  );
}
history.scrollRestoration = 'manual';
const initial = new URL(location.href);
if (!initial.hash)
  initial.pathname = sections.find(
    (s) => s.id === main.dataset.initialSection,
  )!.dataset.url!;
locked = true;
void document.fonts.ready.then(() =>
  requestAnimationFrame(() => {
    go(initial, false, restoredPosition(initial));
    document.documentElement.classList.remove('docs-initializing');
  }),
);
window.addEventListener(
  'scroll',
  () => {
    if (locked || frame || document.body.classList.contains('menu-open'))
      return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (locked) return;
      const section = currentSection();
      select(section);
      const sameSection = location.pathname === section.dataset.url;
      history.replaceState(
        savePosition(section),
        '',
        section.dataset.url! + (sameSection ? location.hash : ''),
      );
    });
  },
  { passive: true },
);
window.addEventListener('popstate', () =>
  go(new URL(location.href), false, restoredPosition(new URL(location.href))),
);
window.addEventListener('pagehide', () =>
  history.replaceState(savePosition(), ''),
);
document.addEventListener('click', (event) => {
  const mouse = event as MouseEvent;
  if (
    mouse.button !== 0 ||
    mouse.metaKey ||
    mouse.ctrlKey ||
    mouse.shiftKey ||
    mouse.altKey
  )
    return;
  const anchor = (event.target as Element).closest<HTMLAnchorElement>(
    'a[href]',
  );
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return;
  if (!routeMap.has(url.pathname)) return;
  event.preventDefault();
  closeMenu();
  go(url, true);
});
const sidebar = document.getElementById('docs-sidebar')!;
const menuButton =
  document.querySelector<HTMLButtonElement>('[data-open-menu]')!;
const mobile = matchMedia('(max-width: 900px)');
const closeHumanNote = setupHumanNote(sidebar);
let previouslyFocused: HTMLElement | null = null;
let menuY = 0;
function closeMenu() {
  closeHumanNote();
  document.body.classList.remove('menu-open');
  main.inert = false;
  menuButton.setAttribute('aria-expanded', 'false');
  sidebar.inert = mobile.matches;
  if (previouslyFocused) {
    window.scrollTo({ top: menuY, behavior: 'instant' });
    previouslyFocused.focus({ preventScroll: true });
  }
  previouslyFocused = null;
}
menuButton.addEventListener('click', () => {
  previouslyFocused = document.activeElement as HTMLElement;
  menuY = window.scrollY;
  sidebar.inert = false;
  document.body.classList.add('menu-open');
  main.inert = true;
  menuButton.setAttribute('aria-expanded', 'true');
  sidebar.querySelector<HTMLAnchorElement>('a')!.focus({ preventScroll: true });
});
document
  .querySelectorAll('[data-close-menu]')
  .forEach((button) => button.addEventListener('click', closeMenu));
mobile.addEventListener('change', () => {
  closeMenu();
  sidebar.inert = mobile.matches;
});
sidebar.inert = mobile.matches;
document.addEventListener('keydown', (event) => {
  if (
    !document.body.classList.contains('menu-open') ||
    document.querySelector('dialog[open]')
  )
    return;
  if (event.key === 'Escape') {
    closeMenu();
    return;
  }
  if (event.key === 'Tab') {
    const focusable = [
      ...sidebar.querySelectorAll<HTMLElement>('a,button,input'),
    ].filter((el) => !el.hidden && el.getClientRects().length);
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
