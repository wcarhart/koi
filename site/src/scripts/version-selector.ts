for (const root of document.querySelectorAll<HTMLElement>(
  '[data-version-selector]',
)) {
  const trigger = root.querySelector<HTMLButtonElement>('.version-trigger')!;
  const panel = root.querySelector<HTMLElement>('.version-options')!;
  const controls = () => [...panel.querySelectorAll<HTMLElement>('a,button')];
  const close = () => {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    root.dispatchEvent(new CustomEvent('koi:version-open', { bubbles: true }));
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    panel.querySelector<HTMLElement>('a[aria-current]')?.focus();
  };
  trigger.addEventListener('click', () => {
    if (panel.hidden) open();
    else close();
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger.focus();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (panel.hidden) {
        open();
        return;
      }
      const options = controls();
      const index = options.indexOf(document.activeElement as HTMLElement);
      options[
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
              options.length
      ].focus();
    }
  });
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget as Node | null)) close();
  });
  document.addEventListener('click', (event) => {
    if (!root.contains(event.target as Node)) close();
  });
  root.querySelectorAll<HTMLElement>('.version-info').forEach((info) => {
    const position = () => {
      const tip = info.querySelector<HTMLElement>('[role=tooltip]')!;
      const rect = info.getBoundingClientRect();
      tip.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - tip.offsetWidth - 12))}px`;
      tip.style.top = `${Math.min(rect.bottom + 6, innerHeight - tip.offsetHeight - 12)}px`;
    };
    info.addEventListener('mouseenter', position);
    info.addEventListener('focusin', position);
  });
}
