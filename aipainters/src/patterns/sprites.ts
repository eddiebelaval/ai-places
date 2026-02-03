import type { Point } from './geometry.js';

const SPRITES: Record<string, number[][]> = {
  heart: [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  smiley: [
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0],
  ],
  star: [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  invader: [
    [0, 1, 0, 0, 0, 1, 0],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 1, 0],
  ],
};

export function spriteNames() {
  return Object.keys(SPRITES);
}

export function spritePoints(name: string, xStart: number, yStart: number) {
  const grid = SPRITES[name] || SPRITES.heart;
  const points: Point[] = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (grid[y][x] === 1) {
        points.push({ x: xStart + x, y: yStart + y });
      }
    }
  }
  return points;
}
