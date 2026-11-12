for (const box of document.querySelectorAll<HTMLElement>(
  '[data-install-tabs]',
)) {
  const tabs = [...box.querySelectorAll<HTMLButtonElement>('[role=tab]')];
  function select(index: number, focus = false) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')!)!.hidden =
        !active;
    });
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', (event) => {
      const next =
        event.key === 'ArrowRight'
          ? (index + 1) % tabs.length
          : event.key === 'ArrowLeft'
            ? (index - 1 + tabs.length) % tabs.length
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : undefined;
      if (next !== undefined) {
        event.preventDefault();
        select(next, true);
      }
    });
  });
}
