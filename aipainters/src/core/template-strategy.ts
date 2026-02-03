/**
 * Template Strategy
 *
 * All agents work together to paint a shared template.
 * Agents pick unfilled pixels from the template and paint them.
 */

const CANVAS_SIZE = 500;

// Galaga-style space invader centered at canvas center
// Scaled up pixel art pattern
function generateInvaderTemplate(): Set<string> {
  const template = new Set<string>();
  const centerX = 375; // Bottom-right quadrant
  const centerY = 375;
  const pixelSize = 12; // Size of each "pixel" block

  // Classic Galaga-style invader pattern (11x8 grid)
  // 1 = filled, 0 = empty
  const invaderPattern = [
    [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],  // Antennae
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],  // Antenna stems
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],  // Head top
    [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0],  // Eyes row
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  // Body full
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],  // Body with gaps
    [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],  // Legs top
    [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0],  // Feet
  ];

  const patternHeight = invaderPattern.length;
  const patternWidth = invaderPattern[0].length;

  // Calculate top-left corner to center the invader
  const startX = centerX - Math.floor((patternWidth * pixelSize) / 2);
  const startY = centerY - Math.floor((patternHeight * pixelSize) / 2);

  // Generate filled pixels for each "pixel" in the pattern
  for (let row = 0; row < patternHeight; row++) {
    for (let col = 0; col < patternWidth; col++) {
      if (invaderPattern[row][col] === 1) {
        // Fill a pixelSize x pixelSize block
        for (let dy = 0; dy < pixelSize; dy++) {
          for (let dx = 0; dx < pixelSize; dx++) {
            const x = startX + col * pixelSize + dx;
            const y = startY + row * pixelSize + dy;
            if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
              template.add(`${x},${y}`);
            }
          }
        }
      }
    }
  }

  return template;
}

export class TemplateStrategy {
  private template: Set<string>;
  private paintedPixels = new Set<string>();
  private templatePixels: Array<{ x: number; y: number }> = [];

  constructor() {
    this.template = generateInvaderTemplate();
    // Convert to array for random access
    for (const key of this.template) {
      const [x, y] = key.split(',').map(Number);
      this.templatePixels.push({ x, y });
    }
    console.log(`Invader template loaded with ${this.templatePixels.length} pixels`);
  }

  /**
   * Record a pixel we've painted
   */
  addPixel(x: number, y: number) {
    this.paintedPixels.add(`${x},${y}`);
  }

  /**
   * Get the next position to paint from the template
   */
  getNextPosition(rng: () => number): { x: number; y: number; color: number } | null {
    // Find unpainted template pixels
    const unpainted = this.templatePixels.filter(
      pos => !this.paintedPixels.has(`${pos.x},${pos.y}`)
    );

    if (unpainted.length === 0) {
      // Template complete! Restart from beginning
      this.paintedPixels.clear();
      return this.getNextPosition(rng);
    }

    // Pick a random unpainted pixel
    const picked = unpainted[Math.floor(rng() * unpainted.length)];

    // Galaga invader colors: greens, cyans, and white (arcade aesthetic)
    const invaderColors = [9, 10, 11, 1]; // Green, Lime, Cyan, White
    const color = invaderColors[Math.floor(rng() * invaderColors.length)];

    return { x: picked.x, y: picked.y, color };
  }

  /**
   * Check if position is part of template
   */
  isTemplatePosition(x: number, y: number): boolean {
    return this.template.has(`${x},${y}`);
  }

  /**
   * Get progress
   */
  getProgress(): { painted: number; total: number } {
    return {
      painted: this.paintedPixels.size,
      total: this.templatePixels.length,
    };
  }
}

// Shared instance for all agents
export const templateStrategy = new TemplateStrategy();
