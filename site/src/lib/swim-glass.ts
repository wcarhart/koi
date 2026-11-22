export const defaultGlassTransparency = 65;
export type GlassPanel = { x: number; y: number; size: number };

// Reserve one band per panel so even unlucky random samples cannot overlap.
export function createGlassLayout(
  width: number,
  height: number,
  random = Math.random,
): GlassPanel[] {
  const horizontal = width >= height;
  const inset = Math.min(16, Math.min(width, height) * 0.04);
  const band = ((horizontal ? width : height) - inset * 2) / 3;
  const cross = (horizontal ? height : width) - inset * 2;
  return Array.from({ length: 3 }, (_, i) => {
    const size = Math.min(band * 0.78, cross * 0.5) * (0.65 + random() * 0.35);
    const along =
      inset + band * i + band * 0.08 + random() * (band * 0.84 - size);
    const across = inset + random() * (cross - size);
    return {
      x: horizontal ? along : across,
      y: horizontal ? across : along,
      size,
    };
  });
}
