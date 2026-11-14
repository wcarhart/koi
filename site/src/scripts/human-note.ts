export function setupHumanNote(sidebar: HTMLElement) {
  const note = document.getElementById('human-note')!;
  const card = document.getElementById('human-card')!;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hovered = false;
  let pinned = false;
  let dismissed = false;
  let pointerType = '';

  const isOpen = () => card.matches(':popover-open');
  const hasFocus = () =>
    note.matches(':focus-visible') || card.contains(document.activeElement);
  const clearTimer = () => clearTimeout(timer);

  function close() {
    clearTimer();
    if (isOpen()) card.hidePopover();
    note.setAttribute('aria-expanded', 'false');
    pinned = false;
  }

  function position() {
    if (!isOpen()) return;
    const rect = note.getBoundingClientRect();
    const bounds = sidebar.getBoundingClientRect();
    if (
      sidebar.inert ||
      rect.bottom <= Math.max(0, bounds.top) ||
      rect.top >= Math.min(innerHeight, bounds.bottom)
    ) {
      close();
      return;
    }
    card.style.maxHeight = `${Math.max(0, Math.min(rect.top, innerHeight - 12) - 22)}px`;
    const width = card.getBoundingClientRect().width;
    card.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - width - 12))}px`;
    card.style.top = `${Math.max(12, rect.top - card.getBoundingClientRect().height - 10)}px`;
  }

  function open() {
    clearTimer();
    if (dismissed || sidebar.inert) return;
    if (!isOpen()) card.showPopover();
    note.setAttribute('aria-expanded', 'true');
    position();
  }

  function scheduleClose() {
    clearTimer();
    // Allow the pointer to cross the gap between the note and card.
    timer = setTimeout(() => {
      if (!hovered && !pinned && !hasFocus()) close();
    }, 140);
  }

  for (const surface of [note, card]) {
    surface.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      hovered = true;
      dismissed = false;
      open();
    });
    surface.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      hovered = false;
      scheduleClose();
    });
    surface.addEventListener('focusin', () => {
      if (hasFocus()) open();
    });
    surface.addEventListener('focusout', () => {
      queueMicrotask(() => {
        if (!hasFocus()) {
          pinned = false;
          dismissed = false;
          scheduleClose();
        }
      });
    });
  }

  note.addEventListener('pointerdown', (event) => {
    pointerType = event.pointerType;
  });
  note.addEventListener('click', (event) => {
    if (pointerType === 'touch' && event.detail !== 0) {
      if (pinned) {
        dismissed = true;
        close();
        return;
      }
      pinned = true;
    }
    dismissed = false;
    open();
  });
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Node;
    if (!note.contains(target) && !card.contains(target)) {
      dismissed = false;
      close();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (card.contains(document.activeElement))
      note.focus({ preventScroll: true });
    dismissed = true;
    close();
  });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, { capture: true, passive: true });
  return close;
}
