import {
  activeWake,
  createRoute,
  createSpine,
  defaultSwimmingSettings,
  defaultSwimmingRoute,
  glyphAt,
  sampleSurface,
  swimmingControls,
  swimmingRoutes,
  type SwimmingRouteId,
  type SwimmingSettings,
  type Wake,
} from '../lib/swimming-surface';

export interface SwimmingController {
  update(settings: Partial<SwimmingSettings>): void;
  selectRoute(id: SwimmingRouteId): void;
  pause(): void;
  resume(): void;
  reset(): void;
  debug(overlays: { route: boolean; spine: boolean }): void;
  destroy(): void;
}

export class SwimmingSurface extends HTMLElement {
  controller?: SwimmingController;

  connectedCallback() {
    if (this.controller) return;
    const canvas = this.querySelector('canvas')!;
    let context: CanvasRenderingContext2D | null;
    try {
      context = canvas.getContext('2d');
    } catch {
      context = null;
    }
    if (!context) {
      this.dataset.state = 'unavailable';
      return;
    }
    const ctx = context;
    const initialSettings = { ...defaultSwimmingSettings };
    try {
      const configured = JSON.parse(
        this.dataset.settings || '{}',
      ) as Partial<SwimmingSettings> | null;
      for (const control of swimmingControls) {
        const value = configured?.[control.key];
        if (typeof value === 'number' && Number.isFinite(value)) {
          initialSettings[control.key] = Math.max(
            control.min,
            Math.min(control.max, value),
          );
        }
      }
    } catch {
      // Malformed configuration keeps the working defaults.
    }
    const initialRoute =
      swimmingRoutes.find(({ id }) => id === this.dataset.initialRoute)?.id ??
      defaultSwimmingRoute;
    let settings = { ...initialSettings };
    let width = 1;
    let height = 1;
    let routeId = initialRoute;
    let route = createRoute(width, height, routeId);
    let travelSpeed = route.length / 30;
    let time = 0;
    let distance = 0;
    let wake: Wake[] = [];
    let lastWake = -0.15;
    let frame = 0;
    let lastFrame = 0;
    let onscreen = true;
    let showRoute = false;
    let showSpine = false;
    let destroyed = false;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = motion.matches;
    let dark = document.documentElement.dataset.theme === 'dark';
    const abort = new AbortController();

    const setState = () => {
      this.dataset.state = paused ? 'paused' : 'playing';
      this.dispatchEvent(new Event('swimming-state'));
    };
    const render = () => {
      const densityScale = Math.max(1, 8 / settings.spacing);
      const spacing = Math.max(
        settings.spacing,
        width / (180 * densityScale),
        height / (100 * densityScale),
      );
      const rowSpacing = spacing * 1.35;
      const columns = Math.ceil(width / spacing);
      const rows = Math.ceil(height / rowSpacing);
      const spine = createSpine(
        route,
        distance,
        time,
        Math.min(width, height),
        settings,
      );
      const field = sampleSurface(
        columns,
        rows,
        spacing,
        rowSpacing,
        spine,
        wake,
        time,
        settings.wake,
      );
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${spacing * 1.08}px "Monaspace Neon", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const color = dark ? '255,255,255' : '24,20,28';
      // Quantize opacity to avoid changing canvas styles for every character.
      for (let band = 1; band <= 24; band++) {
        ctx.fillStyle = `rgba(${color},${band / 24})`;
        for (let i = 0; i < field.length; i++) {
          if (Math.round(field[i] * 24) !== band) continue;
          const col = i % columns;
          const row = Math.floor(i / columns);
          ctx.fillText(
            glyphAt(col, row, time, settings.glyphRate),
            (col + 0.5) * spacing,
            (row + 0.5) * rowSpacing,
          );
        }
      }
      if (showRoute || showSpine) {
        ctx.strokeStyle = dark ? '#c18ee1' : '#78449d';
        ctx.lineWidth = 1;
        if (showRoute) {
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          route.points.forEach((p, i) =>
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
          );
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (showSpine) {
          ctx.beginPath();
          spine.forEach((p, i) =>
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
          );
          ctx.stroke();
        }
      }
    };
    const canAnimate = () =>
      !paused && onscreen && !document.hidden && !destroyed;
    const tick = (now: number) => {
      frame = 0;
      if (!canAnimate()) return;
      if (!lastFrame || now - lastFrame >= 1000 / 30) {
        const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
        lastFrame = now;
        time += dt;
        distance += dt * travelSpeed * settings.speed;
        wake = activeWake(wake, time);
        if (time - lastWake >= 0.15) {
          const spine = createSpine(
            route,
            distance,
            time,
            Math.min(width, height),
            settings,
          );
          const crest = spine[Math.floor(spine.length * 0.4)];
          if (crest.height > 0.05)
            wake.push({
              x: crest.x,
              y: crest.y,
              born: time,
              strength: crest.height,
            });
          lastWake = time;
        }
        render();
      }
      frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      if (canAnimate()) frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      const bounds = this.getBoundingClientRect();
      const previousLength = route.length;
      const previousWidth = width;
      const previousHeight = height;
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      travelSpeed = createRoute(width, height).length / 30;
      route = createRoute(width, height, routeId);
      distance = (distance / previousLength) * route.length;
      wake = wake.map((p) => ({
        ...p,
        x: (p.x / previousWidth) * width,
        y: (p.y / previousHeight) * height,
      }));
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      render();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(this);
    const intersection = new IntersectionObserver(([entry]) => {
      onscreen = entry.isIntersecting;
      schedule();
    });
    intersection.observe(this);
    const themeObserver = new MutationObserver(() => {
      dark = document.documentElement.dataset.theme === 'dark';
      render();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    document.addEventListener('visibilitychange', schedule, {
      signal: abort.signal,
    });
    motion.addEventListener(
      'change',
      () => {
        paused = motion.matches;
        setState();
        schedule();
        render();
      },
      { signal: abort.signal },
    );
    this.controller = {
      update: (changes) => {
        for (const control of swimmingControls) {
          const value = changes[control.key];
          if (value !== undefined && Number.isFinite(value))
            settings[control.key] = Math.max(
              control.min,
              Math.min(control.max, value),
            );
        }
        render();
      },
      selectRoute: (id) => {
        if (
          !swimmingRoutes.some((candidate) => candidate.id === id) ||
          id === routeId
        )
          return;
        const progress = distance / route.length;
        routeId = id;
        route = createRoute(width, height, routeId);
        distance = progress * route.length;
        wake = [];
        lastWake = time;
        this.dataset.route = routeId;
        render();
      },
      pause: () => {
        paused = true;
        setState();
        schedule();
      },
      resume: () => {
        paused = false;
        setState();
        schedule();
      },
      reset: () => {
        settings = { ...initialSettings };
        routeId = initialRoute;
        route = createRoute(width, height, routeId);
        this.dataset.route = routeId;
        time = 0;
        distance = 0;
        wake = [];
        lastWake = -0.15;
        showRoute = false;
        showSpine = false;
        paused = motion.matches;
        setState();
        render();
        schedule();
      },
      debug: (overlays) => {
        showRoute = overlays.route;
        showSpine = overlays.spine;
        render();
      },
      destroy: () => {
        destroyed = true;
        schedule();
        abort.abort();
        resizeObserver.disconnect();
        intersection.disconnect();
        themeObserver.disconnect();
        this.controller = undefined;
      },
    };
    this.dataset.route = routeId;
    resize();
    setState();
    schedule();
    void document.fonts.ready.then(() => {
      if (!destroyed) render();
    });
  }

  disconnectedCallback() {
    this.controller?.destroy();
  }
}

if (!customElements.get('swimming-surface'))
  customElements.define('swimming-surface', SwimmingSurface);
