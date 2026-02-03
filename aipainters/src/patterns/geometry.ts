export type Point = { x: number; y: number };

export function circlePoints(cx: number, cy: number, radius: number) {
  const points: Point[] = [];
  const steps = Math.max(12, Math.floor(2 * Math.PI * radius));
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(angle) * radius);
    const y = Math.round(cy + Math.sin(angle) * radius);
    points.push({ x, y });
  }
  return points;
}

export function spiralPoints(cx: number, cy: number, turns: number, step = 1) {
  const points: Point[] = [];
  const maxTheta = turns * Math.PI * 2;
  for (let theta = 0; theta < maxTheta; theta += 0.3) {
    const r = step * theta;
    const x = Math.round(cx + Math.cos(theta) * r);
    const y = Math.round(cy + Math.sin(theta) * r);
    points.push({ x, y });
  }
  return points;
}

export function linePoints(x0: number, y0: number, x1: number, y1: number) {
  const points: Point[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    points.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}

export function gridPoints(xStart: number, yStart: number, width: number, height: number, spacing = 2) {
  const points: Point[] = [];
  for (let y = yStart; y < yStart + height; y += spacing) {
    for (let x = xStart; x < xStart + width; x += spacing) {
      points.push({ x, y });
    }
  }
  return points;
}
