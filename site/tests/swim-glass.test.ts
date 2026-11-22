import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGlassLayout,
  glassCorners,
  glassInset,
  minimumGlassSize,
  resizeGlass,
  glassCornerPath,
} from '../src/lib/swim-glass';

test('one to five glass panels fit without overlap on narrow, square, and wide surfaces', () => {
  let seed = 314159;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (const [width, height] of [
    [320, 460],
    [1200, 620],
    [400, 400],
    [180, 1000],
  ]) {
    for (const source of [() => 0, () => 1, random]) {
      for (let trial = 0; trial < 30; trial++) {
        const count = 1 + (trial % 5);
        const panels = createGlassLayout(width, height, source, count);
        assert.equal(panels.length, count);
        for (const panel of panels) {
          assert.ok(panel.size > 0 && panel.x >= 0 && panel.y >= 0);
          assert.ok(
            panel.x + panel.size <= width && panel.y + panel.size <= height,
          );
        }
        for (let i = 0; i < panels.length; i++) {
          for (let j = i + 1; j < panels.length; j++) {
            const a = panels[i],
              b = panels[j];
            assert.ok(
              a.x + a.size < b.x ||
                b.x + b.size < a.x ||
                a.y + a.size < b.y ||
                b.y + b.size < a.y,
            );
          }
        }
      }
    }
  }
});

test('each corner resizes independently around the opposite anchor', () => {
  const rect = { x: 100, y: 100, width: 160, height: 120 };
  for (const corner of glassCorners) {
    const west = corner.includes('w');
    const north = corner.includes('n');
    const result = resizeGlass(
      rect,
      corner,
      west ? -25 : 25,
      north ? -40 : 40,
      600,
      500,
    );
    assert.equal(result.width, 185);
    assert.equal(result.height, 160);
    assert.equal(west ? result.x + result.width : result.x, west ? 260 : 100);
    assert.equal(
      north ? result.y + result.height : result.y,
      north ? 220 : 100,
    );
    const small = resizeGlass(
      rect,
      corner,
      west ? 1000 : -1000,
      north ? 1000 : -1000,
      600,
      500,
    );
    assert.equal(small.width, minimumGlassSize);
    assert.equal(small.height, minimumGlassSize);
    const large = resizeGlass(
      rect,
      corner,
      west ? -1000 : 1000,
      north ? -1000 : 1000,
      600,
      500,
    );
    assert.ok(large.x >= glassInset && large.y >= glassInset);
    assert.ok(large.x + large.width <= 600 - glassInset);
    assert.ok(large.y + large.height <= 500 - glassInset);
  }
});

test('corner bars follow non-square panes with squircle and rounded fallbacks', () => {
  for (const corner of glassCorners) {
    for (const [width, height] of [
      [48, 48],
      [300, 80],
      [80, 300],
    ]) {
      const path = glassCornerPath(width, height, corner);
      assert.ok(path.startsWith('M'));
      assert.ok(!/NaN|Infinity/.test(path));
      assert.notEqual(path, glassCornerPath(width, height, corner, false));
    }
  }
});
