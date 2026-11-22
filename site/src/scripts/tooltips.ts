function positionDocTooltip(control: HTMLElement) {
  const tooltip = control.querySelector<HTMLElement>('.doc-tooltip');
  if (!tooltip) return;
  const rect = control.getBoundingClientRect();
  const left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
  const fits =
    left >= 0 &&
    left + tooltip.offsetWidth <= document.documentElement.clientWidth;
  control.dataset.tooltipAlign = fits ? 'center' : 'end';
}

for (const control of document.querySelectorAll<HTMLElement>(
  '[data-tooltip]',
)) {
  const reset = () => {
    positionDocTooltip(control);
    control.removeAttribute('data-tooltip-dismissed');
  };
  control.addEventListener('pointerenter', reset);
  control.addEventListener('focusin', reset);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const tooltip = control.querySelector<HTMLElement>('[role=tooltip]');
    if (tooltip && getComputedStyle(tooltip).visibility === 'visible') {
      control.setAttribute('data-tooltip-dismissed', '');
    }
  });
}

window.addEventListener('resize', () => {
  document
    .querySelectorAll<HTMLElement>('.doc-control')
    .forEach(positionDocTooltip);
});
