for (const control of document.querySelectorAll<HTMLElement>(
  '[data-tooltip]',
)) {
  const reset = () => control.removeAttribute('data-tooltip-dismissed');
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
