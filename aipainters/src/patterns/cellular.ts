import type { Point } from './geometry.js';

export function randomWalkPoints(
  xStart: number,
  yStart: number,
  steps: number,
  stepSize = 1
) {
  const points: Point[] = [];
  let x = xStart;
  let y = yStart;
  for (let i = 0; i < steps; i += 1) {
    points.push({ x, y });
    const dir = Math.floor(Math.random() * 4);
    if (dir === 0) x += stepSize;
    if (dir === 1) x -= stepSize;
    if (dir === 2) y += stepSize;
    if (dir === 3) y -= stepSize;
  }
  return points;
}

export function cellularBlobPoints(xStart: number, yStart: number, size: number) {
  const points: Point[] = [];
  for (let y = -size; y <= size; y += 1) {
    for (let x = -size; x <= size; x += 1) {
      const distance = Math.sqrt(x * x + y * y);
      if (distance <= size && Math.random() > distance / size) {
        points.push({ x: xStart + x, y: yStart + y });
      }
    }
  }
  return points;
}
