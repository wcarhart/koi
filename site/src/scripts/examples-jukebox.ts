const jukebox = document.querySelector<HTMLElement>('[data-jukebox]');
if (jukebox) {
  const tablist = jukebox.querySelector<HTMLElement>('[data-album-tabs]')!;
  const tabs = [...jukebox.querySelectorAll<HTMLAnchorElement>('[data-album]')];
  const panels = [
    ...jukebox.querySelectorAll<HTMLElement>('[data-album-panel]'),
  ];
  tablist.setAttribute('role', 'tablist');
  panels.forEach((panel, index) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabs[index].id);
  });
  function select(index: number) {
    tabs.forEach((tab, position) => {
      const active = position === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[position].hidden = !active;
    });
  }
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    tab.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      select(index);
    });
    tab.addEventListener('keydown', (event) => {
      let next: number;
      switch (event.key) {
        case 'ArrowRight':
          next = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          next = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = tabs.length - 1;
          break;
        case ' ':
          event.preventDefault();
          select(index);
          return;
        default:
          return;
      }
      event.preventDefault();
      select(next);
      tabs[next].focus({ preventScroll: true });
      tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  });
  select(0);
}
