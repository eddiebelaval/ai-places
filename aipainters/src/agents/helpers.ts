export const CANVAS_SIZE = 500;

export function isWithinCanvas(x: number, y: number) {
  return x >= 0 && y >= 0 && x < CANVAS_SIZE && y < CANVAS_SIZE;
}

export function clampPoint(x: number, y: number) {
  const cx = Math.max(0, Math.min(CANVAS_SIZE - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(CANVAS_SIZE - 1, Math.round(y)));
  return { x: cx, y: cy };
}
