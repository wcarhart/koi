export const glassInset = 16;
export const minimumGlassSize = 48;
export const glassCorners = ['nw', 'ne', 'se', 'sw'] as const;
export type GlassCorner = (typeof glassCorners)[number];
export type GlassRect = { x: number; y: number; width: number; height: number };

export const defaultGlassFrost = 35;
export const defaultPaneCount = 3;
export type GlassPanel = { x: number; y: number; size: number };

// Reserve one band per panel so even unlucky random samples cannot overlap.
export function createGlassLayout(
  width: number,
  height: number,
  random = Math.random,
  count = defaultPaneCount,
): GlassPanel[] {
  const horizontal = width >= height;
  const inset = Math.min(glassInset, Math.min(width, height) / 4);
  const band = ((horizontal ? width : height) - inset * 2) / count;
  const cross = (horizontal ? height : width) - inset * 2;
  return Array.from({ length: count }, (_, i) => {
    const limit = Math.min(band * 0.78, cross * 0.5);
    const size = Math.min(
      limit,
      Math.max(minimumGlassSize, limit * (0.65 + random() * 0.35)),
    );
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

// Keep the opposite corner fixed while constraining the dragged edges.
export function resizeGlass(
  rect: GlassRect,
  corner: GlassCorner,
  dx: number,
  dy: number,
  width: number,
  height: number,
): GlassRect {
  const west = corner.includes('w');
  const north = corner.includes('n');
  const anchorX = west ? rect.x + rect.width : rect.x;
  const anchorY = north ? rect.y + rect.height : rect.y;
  const maxWidth = west ? anchorX - glassInset : width - glassInset - anchorX;
  const maxHeight = north
    ? anchorY - glassInset
    : height - glassInset - anchorY;
  const nextWidth = Math.min(
    maxWidth,
    Math.max(
      Math.min(minimumGlassSize, maxWidth),
      rect.width + (west ? -dx : dx),
    ),
  );
  const nextHeight = Math.min(
    maxHeight,
    Math.max(
      Math.min(minimumGlassSize, maxHeight),
      rect.height + (north ? -dy : dy),
    ),
  );
  return {
    x: west ? anchorX - nextWidth : anchorX,
    y: north ? anchorY - nextHeight : anchorY,
    width: nextWidth,
    height: nextHeight,
  };
}

// Trace the pane's corner outside its edge; exponent 2 is the rounded fallback.
export function glassCornerPath(
  width: number,
  height: number,
  corner: GlassCorner,
  squircle = true,
): string {
  const gap = 6;
  const rx = width * 0.28 + gap;
  const ry = height * 0.28 + gap;
  const power = squircle ? 0.5 : 1;
  const west = corner.includes('w');
  const north = corner.includes('n');
  const cx = west ? width * 0.28 : width * 0.72;
  const cy = north ? height * 0.28 : height * 0.72;
  return Array.from({ length: 33 }, (_, i) => {
    const angle = ((0.12 + (i / 32) * 0.76) * Math.PI) / 2;
    const x = cx + (west ? -1 : 1) * rx * Math.cos(angle) ** power;
    const y = cy + (north ? -1 : 1) * ry * Math.sin(angle) ** power;
    // SVG coordinates include the external handle gutter.
    return `${i ? 'L' : 'M'}${(x + glassInset).toFixed(3)},${(y + glassInset).toFixed(3)}`;
  }).join(' ');
}
