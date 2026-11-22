import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeWake,
  createRoute,
  createSpine,
  defaultSwimmingSettings,
  glyphAt,
  heroSwimmingPreset,
  pointAtDistance,
  sampleSurface,
  swimmingRoutes,
  wakeLifetime,
} from '../src/lib/swimming-surface';

for (const { id } of swimmingRoutes) {
  test(`${id} closes smoothly and wraps in both directions`, () => {
    const route = createRoute(1200, 600, id);
    assert.deepEqual(route.points[0], route.points.at(-1));
    const start = pointAtDistance(route, 0);
    assert.deepEqual(start, pointAtDistance(route, route.length));
    assert.deepEqual(
      pointAtDistance(route, -10),
      pointAtDistance(route, route.length - 10),
    );
    const before = pointAtDistance(route, route.length - 1);
    const after = pointAtDistance(route, 1);
    const dot =
      (start.x - before.x) * (after.x - start.x) +
      (start.y - before.y) * (after.y - start.y);
    assert.ok(dot > 0.99, 'the loop should not kink at the join');
  });

  test(`${id} preserves distance-based movement on desktop and mobile`, () => {
    for (const [width, height] of [
      [1200, 600],
      [360, 460],
    ]) {
      const route = createRoute(width, height, id);
      for (let d = 0; d < route.length; d += route.length / 50) {
        const a = pointAtDistance(route, d);
        const b = pointAtDistance(route, d + 1);
        assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - 1) < 0.03);
      }
      assert.ok(
        route.points.every(
          (p) =>
            p.x > width * 0.1 &&
            p.x < width * 0.9 &&
            p.y > height * 0.1 &&
            p.y < height * 0.9,
        ),
      );
    }
  });
}

test('the hero preset retains the chosen tuning values', () => {
  assert.equal(heroSwimmingPreset.route, 'wander');
  assert.deepEqual(heroSwimmingPreset.settings, defaultSwimmingSettings);
  assert.deepEqual(defaultSwimmingSettings, {
    speed: 1.4,
    length: 41,
    width: 5.9,
    depth: 85,
    variation: 35,
    flex: 65,
    wake: 48,
    spacing: 8,
    glyphRate: 0.5,
  });
});

for (const id of [
  'wander',
  'weave',
  'serpentine',
  'twin-loops',
  'braid',
] as const) {
  test(`${id} keeps broad continuous turns throughout the loop`, () => {
    for (const [width, height] of [
      [1200, 600],
      [360, 460],
      [1440, 620],
    ]) {
      const route = createRoute(width, height, id);
      const step = Math.min(width, height) * 0.015;
      for (let distance = 0; distance < route.length; distance += step / 2) {
        const before = pointAtDistance(route, distance - step);
        const current = pointAtDistance(route, distance);
        const after = pointAtDistance(route, distance + step);
        const incoming = { x: current.x - before.x, y: current.y - before.y };
        const outgoing = { x: after.x - current.x, y: after.y - current.y };
        const cosine =
          (incoming.x * outgoing.x + incoming.y * outgoing.y) /
          (Math.hypot(incoming.x, incoming.y) *
            Math.hypot(outgoing.x, outgoing.y));
        assert.ok(
          cosine > Math.cos(0.3),
          `tight bend at distance ${distance} in ${width}×${height}`,
        );
      }
    }
  });
}

test('the route picker supplies eight distinct paths', () => {
  assert.equal(swimmingRoutes.length, 8);
  const paths = swimmingRoutes.map(({ id }) =>
    JSON.stringify(createRoute(1200, 600, id).points),
  );
  assert.equal(new Set(paths).size, 8);
});

test('the figure eight crosses in the center and wandering routes add multiple crossings', () => {
  const eight = createRoute(1200, 600, 'eight');
  assert.ok(
    Math.hypot(
      eight.points[0].x - eight.points[900].x,
      eight.points[0].y - eight.points[900].y,
    ) < 1e-9,
  );
  // Count crossings of non-neighboring line segments, excluding shared endpoints.
  function crossings(id: (typeof swimmingRoutes)[number]['id']) {
    const route = createRoute(1200, 600, id);
    const points = route.points.filter((_, i) => i % 10 === 0);
    const side = (a: (typeof points)[number], b: typeof a, p: typeof a) =>
      (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    let count = 0;
    for (let i = 0; i < points.length - 1; i++) {
      for (let j = i + 2; j < points.length - 1; j++) {
        const [a, b, c, d] = [
          points[i],
          points[i + 1],
          points[j],
          points[j + 1],
        ];
        if (
          side(a, b, c) * side(a, b, d) < 0 &&
          side(c, d, a) * side(c, d, b) < 0
        )
          count++;
      }
    }
    return count;
  }
  assert.ok(crossings('meander') >= 1);
  assert.ok(crossings('wander') >= 3);
  assert.ok(crossings('weave') >= 1);
  assert.ok(crossings('serpentine') >= 3);
  assert.ok(
    createRoute(1200, 600, 'wander').length >
      createRoute(1200, 600).length * 1.75,
  );
});

test('the fin has an asymmetric crest, a flexible tail, and an invisible submerged state', () => {
  const route = createRoute(1200, 600);
  const spine = createSpine(route, 300, 0, 600, defaultSwimmingSettings);
  assert.equal(spine[0].height, 0);
  assert.equal(spine.at(-1)!.height, 0);
  const peak = spine.findIndex(
    (p) => p.height === Math.max(...spine.map((p) => p.height)),
  );
  assert.ok(peak > 0 && peak < spine.length / 2);
  const later = createSpine(route, 300, 1, 600, defaultSwimmingSettings);
  assert.deepEqual(
    { x: spine[0].x, y: spine[0].y },
    { x: later[0].x, y: later[0].y },
  );
  assert.notEqual(spine.at(-1)!.x, later.at(-1)!.x);
  assert.ok(
    createSpine(route, 300, 0, 600, {
      ...defaultSwimmingSettings,
      depth: 0,
    }).every((p) => p.height === 0),
  );
});

test('glyphs are deterministic, stable when frozen, and stagger their changes', () => {
  const initial = Array.from({ length: 100 }, (_, col) =>
    glyphAt(col, 1, 0, 0.5),
  );
  assert.deepEqual(
    initial,
    Array.from({ length: 100 }, (_, col) => glyphAt(col, 1, 0, 0.5)),
  );
  assert.ok(new Set(initial).size > 8);
  assert.equal(glyphAt(4, 9, 0, 0), glyphAt(4, 9, 1000, 0));
  const changed = initial.filter(
    (glyph, col) => glyphAt(col, 1, 0.5, 0.5) !== glyph,
  ).length;
  assert.ok(changed > 0 && changed < initial.length / 2);
});

test('wake expires, excludes future samples, and retains at most 32 points', () => {
  const points = Array.from({ length: 40 }, (_, i) => ({
    x: i,
    y: 0,
    born: 1,
    strength: 1,
  }));
  assert.equal(activeWake(points, 2).length, 32);
  assert.equal(activeWake(points, 1 + wakeLifetime).length, 0);
  assert.equal(activeWake(points, 0).length, 0);
});

test('the sampled height field is bounded, localized, and blank without deformation', () => {
  const empty = sampleSurface(100, 50, 10, 10, [], [], 0, 100);
  assert.ok(empty.every((value) => value === 0));
  const spine = [{ x: 500, y: 250, radius: 20, height: 1 }];
  const wake = Array.from({ length: 32 }, () => ({
    x: 500,
    y: 250,
    born: 0,
    strength: 1,
  }));
  const field = sampleSurface(100, 50, 10, 10, spine, wake, 1, 100);
  assert.ok(
    field.every((value) => Number.isFinite(value) && value >= 0 && value <= 1),
  );
  assert.ok(field.some((value) => value > 0.7));
  assert.equal(field[0], 0);
  assert.ok(
    sampleSurface(100, 50, 10, 10, [], wake, 5, 100).every(
      (value) => value === 0,
    ),
  );
});
