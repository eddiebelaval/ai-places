/**
 * Territory Wars Strategy
 *
 * All agents work as an alliance to build one large connected territory
 * starting from a corner and expanding outward.
 */

const CANVAS_SIZE = 500;

// Start from bottom-left corner - less likely to be contested
const HOME_CORNER = { x: 0, y: 499 };

// Direction offsets for finding adjacent pixels
const DIRECTIONS = [
  { dx: 0, dy: -1 },  // up
  { dx: 1, dy: 0 },   // right
  { dx: 0, dy: 1 },   // down
  { dx: -1, dy: 0 },  // left
  { dx: 1, dy: -1 },  // up-right
  { dx: -1, dy: -1 }, // up-left
  { dx: 1, dy: 1 },   // down-right
  { dx: -1, dy: 1 },  // down-left
];

export class TerritoryStrategy {
  private placedPixels = new Set<string>();
  private frontier: Array<{ x: number; y: number }> = [];

  constructor() {
    // Initialize with home corner
    this.addPixel(HOME_CORNER.x, HOME_CORNER.y);
  }

  /**
   * Record a pixel we've placed
   */
  addPixel(x: number, y: number) {
    const key = `${x},${y}`;
    if (this.placedPixels.has(key)) return;

    this.placedPixels.add(key);

    // Add adjacent unoccupied positions to frontier
    for (const { dx, dy } of DIRECTIONS.slice(0, 4)) { // Only cardinal directions
      const nx = x + dx;
      const ny = y + dy;
      if (this.isValidPosition(nx, ny) && !this.placedPixels.has(`${nx},${ny}`)) {
        this.frontier.push({ x: nx, y: ny });
      }
    }
  }

  /**
   * Get the next position to paint - expands territory from the edge
   */
  getNextPosition(rng: () => number): { x: number; y: number } | null {
    // Remove positions we've already placed from frontier
    this.frontier = this.frontier.filter(
      pos => !this.placedPixels.has(`${pos.x},${pos.y}`)
    );

    if (this.frontier.length === 0) {
      // Start fresh from home corner if no frontier
      return { x: HOME_CORNER.x, y: HOME_CORNER.y };
    }

    // Prioritize expansion toward center/up-right (away from corner)
    // Score each frontier position by distance from home
    const scored = this.frontier.map(pos => ({
      ...pos,
      score: Math.sqrt(Math.pow(pos.x - HOME_CORNER.x, 2) + Math.pow(pos.y - HOME_CORNER.y, 2))
    }));

    // Sort by score (closer to edge of expansion = lower score, prioritize these)
    scored.sort((a, b) => a.score - b.score);

    // Pick from the top candidates with some randomness
    const topCandidates = scored.slice(0, Math.min(10, scored.length));
    const picked = topCandidates[Math.floor(rng() * topCandidates.length)];

    return { x: picked.x, y: picked.y };
  }

  /**
   * Get positions adjacent to our territory for expansion
   */
  getAdjacentPositions(count: number, rng: () => number): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < count; i++) {
      const pos = this.getNextPosition(rng);
      if (pos) positions.push(pos);
    }

    return positions;
  }

  /**
   * Check if we have a pixel at this position
   */
  hasPixel(x: number, y: number): boolean {
    return this.placedPixels.has(`${x},${y}`);
  }

  /**
   * Get territory size
   */
  getSize(): number {
    return this.placedPixels.size;
  }

  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE;
  }
}

// Shared instance for all agents (alliance)
export const territoryStrategy = new TerritoryStrategy();
