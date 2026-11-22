import { swimmingControls, swimmingRoutes } from '../lib/swimming-surface';
import type { SwimmingSurface } from './swimming-surface';
import { createGlassLayout, defaultGlassTransparency } from '../lib/swim-glass';
import { toSimulationValue } from '../lib/slider-values';

async function initializeSwim() {
  await customElements.whenDefined('swimming-surface');
  const surface = document.querySelector<SwimmingSurface>('swimming-surface');
  const controller = surface?.controller;
  const form = document.querySelector<HTMLFormElement>(
    '[data-swimming-controls]',
  );
  if (!surface || !controller || !form) return;
  const preview = document.querySelector<HTMLElement>(
    '[data-swimming-preview]',
  )!;
  const overlay = document.querySelector<HTMLElement>('[data-glass-overlay]')!;
  const pause = form.querySelector<HTMLButtonElement>('[data-pause]')!;
  const status = document.querySelector<HTMLElement>('[data-playback-status]')!;
  const glass = form.querySelector<HTMLButtonElement>('[name="glass"]')!;
  const showRoute =
    form.querySelector<HTMLButtonElement>('[name="showRoute"]')!;
  const showSpine =
    form.querySelector<HTMLButtonElement>('[name="showSpine"]')!;
  const enabled = (toggle: HTMLButtonElement) =>
    toggle.getAttribute('aria-checked') === 'true';
  const transparency = form.querySelector<HTMLInputElement>(
    '[name="transparency"]',
  )!;
  const placeGlass = () => {
    const bounds = preview.getBoundingClientRect();
    const layout = createGlassLayout(preview.clientWidth, preview.clientHeight);
    if (!bounds.width || !bounds.height) return;
    overlay
      .querySelectorAll<HTMLElement>('.glass-squircle')
      .forEach((panel, i) => {
        const { x, y, size } = layout[i];
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        panel.style.width = `${size}px`;
        panel.style.height = `${size}px`;
      });
  };
  const updateTransparency = () => {
    const value = Number(transparency.value);
    preview.style.setProperty('--glass-opacity', String((100 - value) / 100));
  };
  const resizeObserver = new ResizeObserver(() => {
    if (enabled(glass)) placeGlass();
  });
  resizeObserver.observe(preview);
  updateTransparency();
  form.querySelector('fieldset')!.disabled = false;
  const updateStatus = () => {
    const paused = surface.dataset.state === 'paused';
    const label = paused ? 'Resume' : 'Pause';
    pause.setAttribute('aria-label', label);
    pause.title = label;
    pause.querySelector<HTMLElement>('[data-play-icon]')!.hidden = !paused;
    pause.querySelector<HTMLElement>('[data-pause-icon]')!.hidden = paused;
    status.textContent = paused ? 'paused' : 'swimming';
  };
  surface.addEventListener('swimming-state', updateStatus);
  updateStatus();
  form.addEventListener('submit', (event) => event.preventDefault());
  for (const toggle of [glass, showRoute, showSpine]) {
    toggle.addEventListener('click', () => {
      toggle.setAttribute('aria-checked', String(!enabled(toggle)));
      if (toggle === glass) {
        overlay.hidden = !enabled(glass);
        if (enabled(glass)) placeGlass();
      } else {
        controller.debug({
          route: enabled(showRoute),
          spine: enabled(showSpine),
        });
      }
    });
  }
  form.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    const control = swimmingControls.find(({ key }) => key === input.name);
    if (control) {
      const value = toSimulationValue(Number(input.value), control);
      controller.update({ [control.key]: value });
    }
    if (input === transparency) updateTransparency();
    if (input.name === 'route' && input.checked) {
      const route = swimmingRoutes.find(({ id }) => id === input.value);
      if (route) controller.selectRoute(route.id);
    }
  });
  pause.addEventListener('click', () => {
    if (surface.dataset.state === 'paused') controller.resume();
    else controller.pause();
  });
  form.addEventListener('reset', () => {
    controller.reset();
    for (const toggle of [glass, showRoute, showSpine])
      toggle.setAttribute('aria-checked', 'false');
    overlay.hidden = true;
    transparency.value = String(defaultGlassTransparency);
    updateTransparency();
  });
}

void initializeSwim();
