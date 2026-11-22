import './tooltips';

export function setupDocToolbars() {
  const sections = [
    ...document.querySelectorAll<HTMLElement>('[data-doc-section]'),
  ];
  const pane = document.querySelector<HTMLElement>('#ask-koi')!;
  const overlay = matchMedia('(max-width: 1199px)');
  const main = document.querySelector<HTMLElement>('.docs-main')!;
  const sidebar = document.querySelector<HTMLElement>('.docs-sidebar')!;
  const mobileBar = document.querySelector<HTMLElement>('.docs-mobile-bar')!;
  const closeButton =
    pane.querySelector<HTMLButtonElement>('[data-close-ask]')!;
  let open = false;
  let returnFocus: HTMLElement | null = null;
  let menu: HTMLElement | null = null;
  let menuTrigger: HTMLButtonElement | null = null;
  let active: HTMLElement | undefined;
  let frame = 0;
  const dismissTooltips = () => {
    document
      .querySelectorAll('.article-toolbar [data-tooltip]')
      .forEach((control) => {
        control.setAttribute('data-tooltip-dismissed', '');
      });
  };
  const inset = () => mobileBar.getBoundingClientRect().height;
  const naturalTop = (section: HTMLElement) => {
    const anchor = section.querySelector<HTMLElement>('.doc-toolbar-anchor');
    return (anchor || section).getBoundingClientRect().top + window.scrollY;
  };
  const closeMenu = (focus = false) => {
    if (menu) menu.hidden = true;
    menuTrigger?.setAttribute('aria-expanded', 'false');
    if (focus) {
      menuTrigger?.focus({ preventScroll: true });
      dismissTooltips();
    }
    menu = null;
    menuTrigger = null;
  };
  function syncPane() {
    dismissTooltips();
    document.body.classList.toggle('ask-koi-open', open);
    pane.inert = !open;
    if (open && overlay.matches) {
      pane.setAttribute('role', 'dialog');
      pane.setAttribute('aria-modal', 'true');
    } else {
      pane.removeAttribute('role');
      pane.removeAttribute('aria-modal');
    }
    main.inert = open && overlay.matches;
    mobileBar.inert = open && overlay.matches;
    sidebar.inert =
      (open && overlay.matches) || matchMedia('(max-width: 900px)').matches;
    document.querySelectorAll('[data-ask-koi]').forEach((button) => {
      const label = open ? 'Close chat' : 'Ask about this doc';
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', label);
      const tooltip = document.getElementById(
        button.getAttribute('aria-describedby')!,
      );
      if (tooltip) tooltip.textContent = label;
    });
    schedule();
  }
  function closePane() {
    open = false;
    syncPane();
    returnFocus?.focus({ preventScroll: true });
    dismissTooltips();
  }
  closeButton.addEventListener('click', closePane);
  overlay.addEventListener('change', syncPane);
  document.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (target.closest('.doc-action')) dismissTooltips();
    const ask = target.closest<HTMLElement>('[data-ask-koi]');
    if (ask) {
      closeMenu();
      if (open) closePane();
      else {
        returnFocus = ask;
        open = true;
        syncPane();
        closeButton.focus({ preventScroll: true });
      }
    }
    const more = target.closest<HTMLButtonElement>('[data-more-doc]');
    if (more) {
      const wasOpen = more === menuTrigger;
      closeMenu();
      if (!wasOpen) {
        menuTrigger = more;
        menu = document.getElementById(more.getAttribute('aria-controls')!)!;
        menu.hidden = false;
        more.setAttribute('aria-expanded', 'true');
        menu.querySelector<HTMLElement>('a')!.focus();
      }
    } else if (menu && (!menu.contains(target) || target.closest('a')))
      closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (menu) {
        event.preventDefault();
        closeMenu(true);
      } else if (open) closePane();
    }
    const trigger = (event.target as Element).closest<HTMLButtonElement>(
      '[data-more-doc]',
    );
    if (trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      if (!menu) trigger.click();
      if (event.key === 'ArrowUp')
        menu?.querySelector<HTMLElement>('a:last-child')?.focus();
    } else if (menu && menu.contains(event.target as Node)) {
      const items = [...menu.querySelectorAll<HTMLElement>('a')];
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const index = items.indexOf(document.activeElement as HTMLElement);
        items[
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
                items.length
        ].focus();
      } else if (event.key === 'Tab') {
        closeMenu(true);
      }
    }
    if (open && overlay.matches && event.key === 'Tab') {
      event.preventDefault();
      closeButton.focus();
    }
  });
  function update() {
    frame = 0;
    const top = inset();
    const current =
      [...sections]
        .reverse()
        .find((section) => naturalTop(section) <= window.scrollY + top + 1) ||
      sections[0];
    if (active !== current) {
      closeMenu();
      active = current;
    }
    sections.forEach((section, index) => {
      const toolbar = section.querySelector<HTMLElement>('[data-doc-toolbar]');
      if (!toolbar) return;
      const start = naturalTop(section) - top;
      const end = sections[index + 1]
        ? naturalTop(sections[index + 1]) - top - toolbar.offsetHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      const percentage = Math.round(
        Math.max(
          0,
          Math.min(1, (window.scrollY - start) / Math.max(1, end - start)),
        ) * 100,
      );
      const progress = toolbar.querySelector<HTMLElement>('.doc-progress')!;
      progress.style.setProperty('--progress', String(percentage));
      progress.setAttribute('aria-label', `Reading progress: ${percentage}%`);
      progress.setAttribute('aria-valuenow', String(percentage));
      toolbar.querySelector('[data-progress-tooltip]')!.textContent =
        `You are ${percentage}% through this doc.`;
    });
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  const observer = new ResizeObserver(schedule);
  sections.forEach((section) => observer.observe(section));
  schedule();
}
