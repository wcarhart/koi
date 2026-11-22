import test from 'node:test';
import assert from 'node:assert/strict';
import { toSliderValue, toSimulationValue } from '../src/lib/slider-values';
import { swimmingControls } from '../src/lib/swimming-surface';

test('percentage controls map the displayed scale to the full simulation range without changing defaults', () => {
  for (const control of swimmingControls.filter(({ unit }) => unit === '%')) {
    assert.equal(toSimulationValue(0, control), control.min);
    assert.equal(toSimulationValue(100, control), control.max);
    assert.equal(
      toSimulationValue(50, control),
      (control.min + control.max) / 2,
    );
    assert.equal(
      toSimulationValue(toSliderValue(control.value, control), control),
      control.value,
    );
  }
  const length = swimmingControls.find(({ key }) => key === 'length')!;
  const width = swimmingControls.find(({ key }) => key === 'width')!;
  assert.equal(toSliderValue(41, length), 65);
  assert.equal(toSliderValue(5.9, width), 70);
  assert.equal(toSimulationValue(-10, length), 15);
  assert.equal(toSimulationValue(110, width), 8);
});

test('speed and spacing retain their actual units and values', () => {
  for (const control of swimmingControls.filter(({ unit }) => unit !== '%')) {
    assert.equal(toSliderValue(control.value, control), control.value);
    assert.equal(toSimulationValue(control.value, control), control.value);
  }
  const spacing = swimmingControls.find(({ key }) => key === 'spacing')!;
  assert.equal(spacing.min, 4);
  assert.equal(spacing.max, 20);
  assert.equal(spacing.value, 8);
});
