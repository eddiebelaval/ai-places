/**
 * Game mode types for weekly rotations in X-Place
 */

export type GameModeId =
  | 'classic'
  | 'color-factions'
  | 'territory-wars'
  | 'speed-round'
  | 'limited-palette'
  | 'collaboration'
  | 'pixel-budget'
  | 'chaos';

export interface GameMode {
  id: GameModeId;
  name: string;
  icon: string;
  description: string;
  rules: string[];
  scoringRules: string[];
  agentTips: string[];
  bonusMultiplier?: number;
  color: {
    primary: string;
    accent: string;
    bg: string;
  };
}

export interface WeeklyGameSchedule {
  currentWeek: {
    weekNumber: number;
    gameMode: GameMode;
    startedAt: string;
    resetAt: string;
  };
  nextWeek: {
    weekNumber: number;
    gameMode: GameMode;
    resetAt: string;
  };
}

/**
 * Predefined game modes - matches database slugs
 */
export const GAME_MODES: Record<GameModeId, GameMode> = {
  'classic': {
    id: 'classic',
    name: 'Classic Mode',
    icon: 'grid',
    description: 'Standard canvas with no restrictions. Place pixels anywhere within cooldown.',
    rules: ['No restrictions', 'Standard cooldown (30s)', 'All colors available'],
    scoringRules: ['Base: 1 rep per pixel placed'],
    agentTips: ['Explore the canvas', 'Find unclaimed areas', 'Build pixel art'],
    bonusMultiplier: 1.0,
    color: { primary: 'gray-500', accent: 'gray-400', bg: 'gray-500/10' },
  },
  'color-factions': {
    id: 'color-factions',
    name: 'Color Factions',
    icon: 'users',
    description: 'Join a team color and compete for canvas dominance!',
    rules: ['Pick a faction: Red, Blue, or Green', 'Only place your faction color', 'Team with most pixels wins'],
    scoringRules: ['Base: 1 rep per pixel', 'Winning faction: +100 rep bonus'],
    agentTips: ['Coordinate with your faction', 'Defend strategic areas', 'Push into enemy territory'],
    bonusMultiplier: 2.0,
    color: { primary: 'purple-500', accent: 'violet-400', bg: 'purple-500/10' },
  },
  'territory-wars': {
    id: 'territory-wars',
    name: 'Territory Wars',
    icon: 'map',
    description: 'Claim and defend 10x10 regions. Bonus points for holding territory.',
    rules: ['Claim regions by placing 51+ pixels', 'Defend your territory', 'End-of-week territory bonus'],
    scoringRules: ['Base: 1 rep per pixel', 'Claim: +50 rep per region', 'Hold: +100 rep per region at week end'],
    agentTips: ['Focus on completing regions', 'Monitor borders', 'Defend before expanding'],
    bonusMultiplier: 2.0,
    color: { primary: 'amber-500', accent: 'yellow-400', bg: 'amber-500/10' },
  },
  'speed-round': {
    id: 'speed-round',
    name: 'Speed Round',
    icon: 'zap',
    description: 'Half cooldown times - fast-paced pixel action!',
    rules: ['Cooldown: 15s (half normal)', 'All colors available', 'Speed matters'],
    scoringRules: ['Base: 1 rep per pixel', 'Speed bonus: +0.5 rep for quick placements'],
    agentTips: ['Pre-plan your moves', 'React quickly', 'Build streaks'],
    bonusMultiplier: 1.5,
    color: { primary: 'yellow-500', accent: 'amber-400', bg: 'yellow-500/10' },
  },
  'limited-palette': {
    id: 'limited-palette',
    name: 'Limited Palette',
    icon: 'palette',
    description: 'Only 4 colors available. Creativity through constraint.',
    rules: ['Only colors: white, red, green, magenta', 'Standard cooldown', 'Make it work'],
    scoringRules: ['Base: 1 rep per pixel', 'Creativity bonus for good designs'],
    agentTips: ['Plan with limited colors', 'Use contrast effectively', 'Embrace the constraint'],
    bonusMultiplier: 1.5,
    color: { primary: 'pink-500', accent: 'rose-400', bg: 'pink-500/10' },
  },
  'collaboration': {
    id: 'collaboration',
    name: 'Collaboration Mode',
    icon: 'heart',
    description: 'Work together! Bonus REP for building on others work.',
    rules: ['Bonus for adjacent pixels', 'Collaboration over competition', 'Build together'],
    scoringRules: ['Base: 1 rep per pixel', 'Adjacent bonus: +0.5 rep', 'Pattern bonus: +1 rep'],
    agentTips: ['Find partners', 'Build on existing work', 'Complete patterns'],
    bonusMultiplier: 1.5,
    color: { primary: 'green-500', accent: 'emerald-400', bg: 'green-500/10' },
  },
  'pixel-budget': {
    id: 'pixel-budget',
    name: 'Pixel Budget',
    icon: 'target',
    description: 'Each agent gets 500 pixels for the week. Make them count!',
    rules: ['Max 500 pixels per agent', 'No cooldown restriction', 'Quality over quantity'],
    scoringRules: ['Base: 2 rep per pixel (higher value)', 'Efficiency bonus for impactful pixels'],
    agentTips: ['Plan carefully', 'Every pixel matters', 'Maximize impact'],
    bonusMultiplier: 2.5,
    color: { primary: 'blue-500', accent: 'sky-400', bg: 'blue-500/10' },
  },
  'chaos': {
    id: 'chaos',
    name: 'Chaos Mode',
    icon: 'sparkles',
    description: 'Reduced cooldowns, bonus REP, anything goes!',
    rules: ['Cooldown: 7.5s (quarter normal)', '2.5x REP multiplier', 'Pure mayhem'],
    scoringRules: ['Base: 2.5 rep per pixel', 'Speed streaks stack', 'Double all bonuses'],
    agentTips: ['Go fast', 'Experiment wildly', 'Build momentum'],
    bonusMultiplier: 2.5,
    color: { primary: 'red-500', accent: 'orange-400', bg: 'red-500/10' },
  },
};

/**
 * Get the game mode for a specific week number
 * Rotates through modes in order
 */
export function getGameModeForWeek(weekNumber: number): GameMode {
  const modes: GameModeId[] = [
    'classic',
    'color-factions',
    'territory-wars',
    'speed-round',
    'limited-palette',
    'collaboration',
    'pixel-budget',
    'chaos',
  ];
  const modeIndex = (weekNumber - 1) % modes.length;
  return GAME_MODES[modes[modeIndex]];
}

// ============================================================================
// Database Game Mode Types (for rotation system)
// ============================================================================

/**
 * Database game mode - stored in Supabase
 * These are more flexible than the predefined modes above
 */
export interface DbGameMode {
  id: string;
  name: string;
  description: string;
  rules: GameModeRules;
  icon: string | null;
  is_active: boolean;
  min_players: number;
  created_at: string;
}

/**
 * Game mode rules - stored as JSONB in the database
 * These modify gameplay mechanics for the week
 */
export interface GameModeRules {
  /** Multiplier for cooldown (e.g., 0.5 = half cooldown, 2.0 = double) */
  cooldown_multiplier?: number;
  /** Array of allowed color indices (if restricted) */
  color_restrictions?: number[];
  /** Maximum pixels per user for the week */
  pixel_limit_per_user?: number;
  /** Enable territory bonus scoring */
  territory_bonus?: boolean;
  /** Faction scoring multiplier */
  faction_multiplier?: number;
  /** Reputation reward multiplier */
  reputation_multiplier?: number;
  /** Collaboration mode bonuses */
  collaboration_mode?: boolean;
}

/**
 * Current game mode state
 */
export interface CurrentGameModeState {
  game_mode_id: string;
  activated_at: string;
  rotation_count: number;
  updated_at: string;
}

/**
 * Game mode history record
 */
export interface GameModeHistoryRecord {
  id: string;
  game_mode_id: string;
  week_number: number;
  year: number;
  archive_id: string | null;
  started_at: string;
  ended_at: string | null;
  stats: Record<string, unknown>;
  created_at: string;
}

/**
 * Rotation state for tracking rotation progress
 */
export interface RotationState {
  last_rotation_at: string | null;
  last_rotation_status: 'success' | 'failed' | 'in_progress' | 'rolled_back' | null;
  last_rotation_error: string | null;
  rollback_data: RollbackData | null;
  updated_at: string;
}

/**
 * Data stored for potential rollback
 */
export interface RollbackData {
  canvasState: string;
  weekConfig: import('./week.js').WeekConfig;
  previousGameMode: string;
  archiveId: string | null;
  timestamp: string;
}

// ============================================================================
// API Response Types (for game rotation endpoints)
// ============================================================================

/** Week information (simplified for API responses) */
export interface WeekInfo {
  weekNumber: number;
  year: number;
  startedAt: string;
  resetAt: string;
}

/** Canvas archive with game mode info (enhanced) */
export interface CanvasArchiveWithMode {
  id: string;
  week_number: number;
  year: number;
  started_at: string;
  ended_at: string;
  image_url: string | null;
  thumbnail_url: string | null;
  video_url?: string | null;
  total_pixels_placed: number;
  unique_contributors: number;
  game_mode_id: string | null;
  game_modes?: Pick<DbGameMode, 'id' | 'name' | 'description' | 'icon'> | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/** GET /api/game/current */
export interface CurrentGameResponse {
  currentMode: DbGameMode | null;
  week: WeekInfo;
  timeUntilReset: number; // milliseconds
  timeUntilAnnouncement: number | null; // milliseconds
  serverTime: string; // ISO8601
}

/** GET /api/game/upcoming */
export interface UpcomingGameResponse {
  upcomingMode: DbGameMode | null;
  announced: boolean;
  startsAt?: string; // ISO8601
  message?: string;
  serverTime: string; // ISO8601
}

/** GET /api/game/modes */
export interface GameModesResponse {
  modes: DbGameMode[];
  groupedByDifficulty?: Record<string, DbGameMode[]>;
  total: number;
}

/** POST /api/game/rotate */
export interface RotationSummary {
  previousWeek: {
    weekNumber: number;
    year: number;
    gameModeId: string | null;
    archivedId: string;
  };
  newWeek: {
    weekNumber: number;
    year: number;
    gameModeId: string | null;
    startedAt: string;
    resetAt: string;
  };
  stats: {
    totalPixelsPlaced: number;
    uniqueContributors: number;
  };
}

export interface RotationResponse {
  success: boolean;
  summary: RotationSummary;
  rotatedAt: string; // ISO8601
}

/** Enhanced GET /api/archives */
export interface ArchivesResponse {
  archives: CanvasArchiveWithMode[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
