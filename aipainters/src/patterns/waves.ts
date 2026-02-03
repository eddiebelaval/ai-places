import type { Point } from './geometry.js';

export function sineWavePoints(
  xStart: number,
  yCenter: number,
  length: number,
  amplitude: number,
  frequency: number
) {
  const points: Point[] = [];
  for (let x = 0; x <= length; x += 1) {
    const y = Math.round(yCenter + Math.sin((x / length) * Math.PI * 2 * frequency) * amplitude);
    points.push({ x: xStart + x, y });
  }
  return points;
}

export function flowFieldPoints(xStart: number, yStart: number, steps: number, angleStep = 0.3) {
  const points: Point[] = [];
  let x = xStart;
  let y = yStart;
  let angle = Math.random() * Math.PI * 2;

  for (let i = 0; i < steps; i += 1) {
    points.push({ x: Math.round(x), y: Math.round(y) });
    angle += (Math.random() - 0.5) * angleStep;
    x += Math.cos(angle) * 1.2;
    y += Math.sin(angle) * 1.2;
  }

  return points;
}
