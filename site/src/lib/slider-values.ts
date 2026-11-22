type SliderRange = { min: number; max: number; unit: string };

export function toSliderValue(value: number, range: SliderRange): number {
  return range.unit === '%'
    ? Number((((value - range.min) / (range.max - range.min)) * 100).toFixed(6))
    : value;
}

export function toSimulationValue(value: number, range: SliderRange): number {
  const actual =
    range.unit === '%'
      ? range.min +
        (Math.max(0, Math.min(100, value)) / 100) * (range.max - range.min)
      : value;
  return Number(Math.max(range.min, Math.min(range.max, actual)).toFixed(6));
}
