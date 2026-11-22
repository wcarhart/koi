import test from 'node:test';
import assert from 'node:assert/strict';
import { createGlassLayout } from '../src/lib/swim-glass';

test('three glass panels fit without overlap on narrow, square, and wide surfaces', () => {
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
        const panels = createGlassLayout(width, height, source);
        assert.equal(panels.length, 3);
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
