import { swimmingControls, swimmingRoutes } from '../lib/swimming-surface';
import type { SwimmingSurface } from './swimming-surface';
import {
  createGlassLayout,
  defaultGlassFrost,
  defaultPaneCount,
  glassInset,
  glassCornerPath,
  resizeGlass,
  type GlassCorner,
  type GlassRect,
} from '../lib/swim-glass';
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
  const frost = form.querySelector<HTMLInputElement>('[name="frost"]')!;
  const paneCount = form.querySelector<HTMLInputElement>('[name="paneCount"]')!;
  const paneTemplate =
    preview.querySelector<HTMLTemplateElement>('[data-glass-pane]')!;
  let panels: HTMLElement[] = [];
  const updateGlassControls = () => {
    frost.disabled = !enabled(glass);
    paneCount.disabled = !enabled(glass);
  };
  const squircle = CSS.supports('corner-shape', 'squircle');
  let topLayer = 0;
  const raisePanel = (panel: HTMLElement) => {
    panel.style.zIndex = String(++topLayer);
  };
  const readRect = (panel: HTMLElement): GlassRect => ({
    x: parseFloat(panel.style.left),
    y: parseFloat(panel.style.top),
    width: parseFloat(panel.style.width),
    height: parseFloat(panel.style.height),
  });
  const applyRect = (panel: HTMLElement, rect: GlassRect) => {
    panel.style.left = `${rect.x}px`;
    panel.style.top = `${rect.y}px`;
    panel.style.width = `${rect.width}px`;
    panel.style.height = `${rect.height}px`;
    for (const handle of panel.querySelectorAll<HTMLButtonElement>(
      '.glass-resize',
    )) {
      const svg = handle.querySelector('svg')!;
      svg.setAttribute(
        'viewBox',
        `0 0 ${rect.width + glassInset * 2} ${rect.height + glassInset * 2}`,
      );
      const path = glassCornerPath(
        rect.width,
        rect.height,
        handle.dataset.corner as GlassCorner,
        squircle,
      );
      for (const node of svg.querySelectorAll('path'))
        node.setAttribute('d', path);
    }
  };
  let drag:
    | {
        panel: HTMLElement;
        pointerId: number;
        startX: number;
        startY: number;
        rect: GlassRect;
        handle?: HTMLButtonElement;
      }
    | undefined;
  const stopDragging = () => {
    if (!drag) return;
    const { panel, pointerId, handle } = drag;
    drag = undefined;
    panel.classList.remove('dragging', 'resizing');
    handle?.classList.remove('active');
    delete document.documentElement.dataset.swimResize;
    document.documentElement.style.removeProperty('--swim-resize-cursor');
    if (panel.hasPointerCapture(pointerId))
      panel.releasePointerCapture(pointerId);
  };
  const clearSelection = () => {
    for (const panel of panels) panel.classList.remove('selected');
  };
  document.addEventListener('pointerdown', (event) => {
    if (!(event.target as Element).closest('.glass-squircle')) clearSelection();
  });
  overlay.addEventListener('focusin', (event) => {
    const panel = (event.target as Element).closest<HTMLElement>(
      '.glass-squircle',
    );
    if (panel) raisePanel(panel);
  });
  overlay.addEventListener('pointerdown', (event) => {
    const panel = (event.target as Element).closest<HTMLElement>(
      '.glass-squircle',
    );
    if (
      !panel ||
      !enabled(glass) ||
      !event.isPrimary ||
      event.button !== 0 ||
      drag
    )
      return;
    const handle =
      (event.target as Element).closest<HTMLButtonElement>('.glass-resize') ??
      undefined;
    if (event.pointerType === 'touch') {
      clearSelection();
      panel.classList.add('selected');
    }
    raisePanel(panel);
    drag = {
      panel,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect: readRect(panel),
      handle,
    };
    panel.setPointerCapture(event.pointerId);
    panel.classList.add(handle ? 'resizing' : 'dragging');
    handle?.classList.add('active');
    if (handle) {
      document.documentElement.style.setProperty(
        '--swim-resize-cursor',
        getComputedStyle(handle).cursor,
      );
      document.documentElement.dataset.swimResize = handle.dataset.corner;
    }
    event.preventDefault();
  });
  overlay.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { panel, rect, handle } = drag;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const { width, height } = overlay.getBoundingClientRect();
    if (handle) {
      applyRect(
        panel,
        resizeGlass(
          rect,
          handle.dataset.corner as GlassCorner,
          dx,
          dy,
          width,
          height,
        ),
      );
    } else {
      panel.style.left = `${Math.max(glassInset, Math.min(rect.x + dx, width - glassInset - rect.width))}px`;
      panel.style.top = `${Math.max(glassInset, Math.min(rect.y + dy, height - glassInset - rect.height))}px`;
    }
  });
  for (const type of [
    'pointerup',
    'pointercancel',
    'lostpointercapture',
  ] as const) {
    overlay.addEventListener(type, (event) => {
      if (event.pointerId === drag?.pointerId) stopDragging();
    });
  }
  overlay.addEventListener('keydown', (event) => {
    const handle = (event.target as Element).closest<HTMLButtonElement>(
      '.glass-resize',
    );
    if (
      !handle ||
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    )
      return;
    event.preventDefault();
    const step = event.shiftKey ? 16 : 4;
    const dx =
      event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy =
      event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    const panel = handle.closest<HTMLElement>('.glass-squircle')!;
    const { width, height } = overlay.getBoundingClientRect();
    applyRect(
      panel,
      resizeGlass(
        readRect(panel),
        handle.dataset.corner as GlassCorner,
        dx,
        dy,
        width,
        height,
      ),
    );
  });
  const placeGlass = () => {
    stopDragging();
    clearSelection();
    const bounds = preview.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const count = Number(paneCount.value);
    while (panels.length > count) panels.pop()!.remove();
    while (panels.length < count) {
      const panel = paneTemplate.content.firstElementChild!.cloneNode(
        true,
      ) as HTMLElement;
      const number = panels.length + 1;
      panel.setAttribute('aria-label', `Glass pane ${number}`);
      for (const handle of panel.querySelectorAll<HTMLButtonElement>(
        '.glass-resize',
      )) {
        const corner = handle.dataset.corner!;
        handle.setAttribute(
          'aria-label',
          `Resize glass pane ${number} from ${corner.includes('n') ? 'top' : 'bottom'} ${corner.includes('w') ? 'left' : 'right'}`,
        );
      }
      overlay.append(panel);
      panels.push(panel);
    }
    const layout = createGlassLayout(
      preview.clientWidth,
      preview.clientHeight,
      Math.random,
      count,
    );
    panels.forEach((panel, i) => {
      const { x, y, size } = layout[i];
      applyRect(panel, { x, y, width: size, height: size });
    });
  };
  const updateFrost = () => {
    const value = Number(frost.value);
    preview.style.setProperty('--glass-opacity', String(value / 100));
  };
  const resizeObserver = new ResizeObserver(() => {
    if (enabled(glass)) placeGlass();
  });
  resizeObserver.observe(preview);
  updateFrost();
  updateGlassControls();
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
        stopDragging();
        clearSelection();
        updateGlassControls();
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
    if (input === frost) updateFrost();
    if (input === paneCount && enabled(glass)) placeGlass();
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
    stopDragging();
    clearSelection();
    controller.reset();
    for (const toggle of [glass, showRoute, showSpine])
      toggle.setAttribute('aria-checked', 'false');
    overlay.hidden = true;
    frost.value = String(defaultGlassFrost);
    paneCount.value = String(defaultPaneCount);
    updateGlassControls();
    updateFrost();
  });
}

void initializeSwim();
