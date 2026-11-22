export const swimmingControls = [
  {
    key: 'speed',
    label: 'Koi speed',
    min: 0.25,
    max: 2,
    step: 0.05,
    value: 1.4,
    unit: '×',
  },
  {
    key: 'length',
    label: 'Koi length',
    min: 15,
    max: 55,
    step: 1,
    value: 41,
    unit: '%',
  },
  {
    key: 'width',
    label: 'Koi width',
    min: 1,
    max: 8,
    step: 0.1,
    value: 5.9,
    unit: '%',
  },
  {
    key: 'depth',
    label: 'Koi depth',
    min: 0,
    max: 100,
    step: 1,
    value: 85,
    unit: '%',
  },
  {
    key: 'variation',
    label: 'Depth variation',
    min: 0,
    max: 100,
    step: 1,
    value: 35,
    unit: '%',
  },
  {
    key: 'flex',
    label: 'Body flex',
    min: 0,
    max: 100,
    step: 1,
    value: 65,
    unit: '%',
  },
  {
    key: 'wake',
    label: 'Wake strength',
    min: 0,
    max: 100,
    step: 1,
    value: 48,
    unit: '%',
  },
  {
    key: 'spacing',
    label: 'Glyph spacing',
    min: 4,
    max: 20,
    step: 1,
    value: 8,
    unit: 'px',
  },
  {
    key: 'glyphRate',
    label: 'Glyph change rate',
    min: 0,
    max: 4,
    step: 0.1,
    value: 0.5,
    unit: '/s',
  },
] as const;

export type SwimmingSettings = Record<
  (typeof swimmingControls)[number]['key'],
  number
>;
export const defaultSwimmingSettings = Object.fromEntries(
  swimmingControls.map(({ key, value }) => [key, value]),
) as SwimmingSettings;

export const swimmingRoutes = [
  {
    id: 'loop',
    label: 'Pond loop',
    description: 'The original broad, gentle circuit.',
  },
  {
    id: 'eight',
    label: 'Figure eight',
    description: 'Two sweeping lobes with a central crossing.',
  },
  {
    id: 'meander',
    label: 'Meander',
    description: 'Uneven lobes and overlapping turns.',
  },
  {
    id: 'wander',
    label: 'Long wander',
    description: 'A longer circuit with several crossings and detours.',
  },
  {
    id: 'weave',
    label: 'River weave',
    description: 'An asymmetric crossing with wide overlapping sweeps.',
  },
  {
    id: 'serpentine',
    label: 'Serpentine',
    description: 'Several broad passes and crossings across the pond.',
  },
  {
    id: 'twin-loops',
    label: 'Twin loops',
    description: 'Two drifting loops with smooth crossings.',
  },
  {
    id: 'braid',
    label: 'Braided loops',
    description: 'Broad intertwined loops around a drifting center.',
  },
] as const;
export type SwimmingRouteId = (typeof swimmingRoutes)[number]['id'];
export const defaultSwimmingRoute: SwimmingRouteId = 'loop';

// Keep the approved homepage preset independent of future demo tuning.
export const heroSwimmingPreset = {
  route: 'wander',
  settings: {
    speed: 1.4,
    length: 41,
    width: 5.9,
    depth: 85,
    variation: 35,
    flex: 65,
    wake: 48,
    spacing: 8,
    glyphRate: 0.5,
  },
} as const satisfies { route: SwimmingRouteId; settings: SwimmingSettings };

export type Point = { x: number; y: number };
export type Route = { points: Point[]; distances: number[]; length: number };
const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
const wrap = (value: number, size: number) => ((value % size) + size) % size;

// Shared endpoints and tangent directions make the closed loop smooth at its seams.
const curves: Point[][] = [
  [
    { x: 0.77, y: 0.48 },
    { x: 0.86, y: 0.78 },
    { x: 0.52, y: 0.85 },
    { x: 0.36, y: 0.71 },
  ],
  [
    { x: 0.36, y: 0.71 },
    { x: 0.2, y: 0.57 },
    { x: 0.12, y: 0.29 },
    { x: 0.36, y: 0.25 },
  ],
  [
    { x: 0.36, y: 0.25 },
    { x: 0.6, y: 0.21 },
    { x: 0.68, y: 0.18 },
    { x: 0.77, y: 0.48 },
  ],
];

const weavingRoutes: Record<'weave' | 'serpentine', Point[]> = {
  weave: [
    { x: 0.16, y: 0.3 },
    { x: 0.28, y: 0.14 },
    { x: 0.6, y: 0.2 },
    { x: 0.84, y: 0.4 },
    { x: 0.72, y: 0.64 },
    { x: 0.36, y: 0.44 },
    { x: 0.16, y: 0.64 },
    { x: 0.36, y: 0.86 },
    { x: 0.74, y: 0.8 },
    { x: 0.84, y: 0.6 },
    { x: 0.6, y: 0.36 },
    { x: 0.24, y: 0.5 },
  ],
  serpentine: [
    { x: 0.2, y: 0.18 },
    { x: 0.75, y: 0.18 },
    { x: 0.9, y: 0.35 },
    { x: 0.75, y: 0.52 },
    { x: 0.25, y: 0.52 },
    { x: 0.1, y: 0.7 },
    { x: 0.3, y: 0.86 },
    { x: 0.78, y: 0.8 },
    { x: 0.9, y: 0.6 },
    { x: 0.65, y: 0.3 },
    { x: 0.35, y: 0.7 },
    { x: 0.1, y: 0.36 },
  ],
};

// Periodic cubic B-splines keep position, tangent, and curvature continuous at every join.
function pointOnSpline(controls: Point[], t: number): Point {
  const position = (t / (Math.PI * 2)) * controls.length;
  const index = Math.floor(position);
  const u = position - index;
  const weights = [
    (1 - u) ** 3 / 6,
    (3 * u ** 3 - 6 * u ** 2 + 4) / 6,
    (-3 * u ** 3 + 3 * u ** 2 + 3 * u + 1) / 6,
    u ** 3 / 6,
  ];
  const points = weights.map(
    (_, i) => controls[(index + i - 1 + controls.length) % controls.length],
  );
  return {
    x: points.reduce((sum, point, i) => sum + point.x * weights[i], 0),
    y: points.reduce((sum, point, i) => sum + point.y * weights[i], 0),
  };
}

export function createRoute(
  width: number,
  height: number,
  id: SwimmingRouteId = defaultSwimmingRoute,
): Route {
  const points: Point[] = [];
  const distances = [0];
  if (id === 'loop') {
    for (const curve of curves) {
      for (let i = 0; i < 200; i++) {
        const t = i / 200;
        const weights = [
          (1 - t) ** 3,
          3 * (1 - t) ** 2 * t,
          3 * (1 - t) * t * t,
          t ** 3,
        ];
        points.push({
          x: curve.reduce((sum, p, j) => sum + p.x * weights[j], 0) * width,
          y: curve.reduce((sum, p, j) => sum + p.y * weights[j], 0) * height,
        });
      }
    }
  } else {
    // Periodic harmonics keep every crossing and the loop seam smooth and deterministic.
    for (let i = 0; i < 1800; i++) {
      const t = (i / 1800) * Math.PI * 2;
      let x: number;
      let y: number;
      if (id === 'eight') {
        x = 0.5 + 0.32 * Math.sin(t);
        y = 0.5 + 0.28 * Math.sin(2 * t);
      } else if (id === 'meander') {
        x = 0.5 + 0.28 * Math.cos(t) + 0.07 * Math.sin(3 * t + 0.4);
        y = 0.5 + 0.22 * Math.sin(2 * t) + 0.07 * Math.sin(3 * t + 0.7);
      } else if (id === 'wander') {
        // A broad orbit around a slowly drifting center avoids near-stationary hairpins.
        x = 0.5 + 0.23 * Math.cos(3 * t) + 0.1 * Math.cos(t + 0.4);
        y = 0.5 + 0.23 * Math.sin(3 * t) + 0.1 * Math.sin(t + 0.4);
      } else if (id === 'weave' || id === 'serpentine') {
        const p = pointOnSpline(weavingRoutes[id], t);
        x = p.x;
        y = p.y;
      } else if (id === 'twin-loops') {
        x = 0.5 + 0.24 * Math.cos(2 * t) + 0.08 * Math.cos(-t + 0.5);
        y = 0.5 + 0.24 * Math.sin(2 * t) + 0.08 * Math.sin(-t + 0.5);
      } else {
        x = 0.5 + 0.23 * Math.cos(3 * t) + 0.1 * Math.cos(-t + 0.4);
        y = 0.5 + 0.23 * Math.sin(3 * t) + 0.1 * Math.sin(-t + 0.4);
      }
      points.push({
        // Avoid squeezing woven turns into hairpins on unusually wide or tall surfaces.
        x:
          id === 'weave' || id === 'serpentine'
            ? width / 2 + (x - 0.5) * Math.min(width, height * 1.5)
            : x * width,
        y:
          id === 'weave' || id === 'serpentine'
            ? height / 2 + (y - 0.5) * Math.min(height, width * 1.5)
            : y * height,
      });
    }
  }
  points.push({ ...points[0] });
  for (let i = 1; i < points.length; i++) {
    distances.push(
      distances[i - 1] +
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        ),
    );
  }
  return { points, distances, length: distances.at(-1)! };
}

export function pointAtDistance(route: Route, distance: number): Point {
  const target = wrap(distance, route.length);
  let low = 0;
  let high = route.distances.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (route.distances[mid] <= target) low = mid;
    else high = mid;
  }
  const fraction =
    (target - route.distances[low]) /
    (route.distances[high] - route.distances[low]);
  return {
    x:
      route.points[low].x +
      (route.points[high].x - route.points[low].x) * fraction,
    y:
      route.points[low].y +
      (route.points[high].y - route.points[low].y) * fraction,
  };
}

export type SpinePoint = Point & { height: number; radius: number };
export function createSpine(
  route: Route,
  distance: number,
  time: number,
  size: number,
  settings: SwimmingSettings,
): SpinePoint[] {
  const length = (size * settings.length) / 100;
  const samples = Math.max(24, Math.ceil(length / 4));
  return Array.from({ length: samples + 1 }, (_, i) => {
    const u = i / samples;
    const d = distance - u * length;
    const p = pointAtDistance(route, d);
    const a = pointAtDistance(route, d - 1);
    const b = pointAtDistance(route, d + 1);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const flex =
      (Math.sin(u * Math.PI * 2 - time * 3.2) *
        u ** 1.5 *
        length *
        0.16 *
        settings.flex) /
      100;
    const profile = Math.sin(Math.PI * u ** 0.65) ** 0.8;
    const immersion = (1 - settings.depth / 100) * 1.5;
    const dive =
      ((Math.sin((time * Math.PI) / 6) * settings.variation) / 100) * 0.65;
    return {
      x: p.x - Math.sin(angle) * flex,
      y: p.y + Math.cos(angle) * flex,
      height:
        settings.depth === 0 ? 0 : clamp(profile * 1.3 - immersion - dive),
      radius: ((size * settings.width) / 100) * (0.35 + 0.65 * profile),
    };
  });
}

const glyphs = '${}[]()/\\|;:.+-=*';
export function glyphAt(
  column: number,
  row: number,
  time: number,
  rate: number,
): string {
  const seed =
    (Math.imul(column + 1, 73856093) ^ Math.imul(row + 1, 19349663)) >>> 0;
  const epoch = Math.floor(time * rate + (seed % 1000) / 1000);
  let hash = (seed ^ Math.imul(epoch, 83492791)) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  return glyphs[hash % glyphs.length];
}

export const wakeLifetime = 3.5;
export type Wake = Point & { born: number; strength: number };
export function activeWake(wake: Wake[], time: number): Wake[] {
  return wake
    .filter((p) => time - p.born >= 0 && time - p.born < wakeLifetime)
    .slice(-32);
}

// Splat local kernels into the grid instead of comparing every cell with every segment.
export function sampleSurface(
  columns: number,
  rows: number,
  dx: number,
  dy: number,
  spine: SpinePoint[],
  wake: Wake[],
  time: number,
  wakeStrength: number,
): Float32Array {
  const field = new Float32Array(columns * rows);
  function splat(
    p: Point,
    radius: number,
    valueAt: (distance: number) => number,
    add: boolean,
  ) {
    const left = Math.max(0, Math.floor((p.x - radius) / dx));
    const right = Math.min(columns - 1, Math.ceil((p.x + radius) / dx));
    const top = Math.max(0, Math.floor((p.y - radius) / dy));
    const bottom = Math.min(rows - 1, Math.ceil((p.y + radius) / dy));
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const distance = Math.hypot(
          (col + 0.5) * dx - p.x,
          (row + 0.5) * dy - p.y,
        );
        const value = valueAt(distance);
        const index = row * columns + col;
        field[index] = clamp(
          add ? field[index] + value : Math.max(field[index], value),
        );
      }
    }
  }
  for (const p of activeWake(wake, time)) {
    const age = time - p.born;
    const ring = 8 + age * 19;
    splat(
      p,
      ring + 12,
      (d) =>
        ((Math.exp(-(((d - ring) / 6) ** 2)) *
          (1 - age / wakeLifetime) ** 2 *
          p.strength *
          wakeStrength) /
          100) *
        0.3,
      true,
    );
  }
  for (const p of spine) {
    if (p.height <= 0) continue;
    splat(
      p,
      p.radius * 2,
      (d) =>
        d > p.radius * 2 ? 0 : Math.exp(-2 * (d / p.radius) ** 2) * p.height,
      false,
    );
  }
  return field;
}
