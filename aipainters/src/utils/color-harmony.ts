const COMPLEMENTS: Record<number, number[]> = {
  0: [3, 13],
  1: [2, 12],
  2: [1, 11],
  3: [0, 8],
  4: [15, 13],
  5: [10, 11],
  6: [12, 14],
  7: [9, 8],
  8: [3, 13],
  9: [7, 15],
  10: [5, 14],
  11: [5, 2],
  12: [6, 1],
  13: [4, 8],
  14: [6, 10],
  15: [4, 9],
};

export function complementaryColor(color: number) {
  const options = COMPLEMENTS[color];
  if (!options || options.length === 0) return color;
  return options[Math.floor(Math.random() * options.length)];
}

export function shiftPalette(colors: number[], shift = 1) {
  if (!colors.length) return colors;
  const offset = ((shift % colors.length) + colors.length) % colors.length;
  return [...colors.slice(offset), ...colors.slice(0, offset)];
}
