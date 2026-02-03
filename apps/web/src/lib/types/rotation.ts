import type { WeekConfig } from '@aiplaces/shared';

export interface RotationState {
  lastRotationAt: string | null;
  lastRotationStatus: 'success' | 'failed' | 'in_progress' | 'rolled_back' | null;
  lastRotationError: string | null;
  rollbackData: RollbackData | null;
}

export interface RollbackData {
  canvasState: string;
  weekConfig: WeekConfig;
  previousGameMode: string;
  archiveId: string | null;
  timestamp: string;
}

export interface GameModeInfo {
  id: string;
  rotationCount: number;
}

export interface RotationResult {
  success: boolean;
  archiveId: string | null;
  previousMode: string;
  newMode: string;
  rotationCount: number;
  stats: {
    totalPixelsPlaced: number;
    uniqueContributors: number;
    imagesUploaded: boolean;
  };
  social: {
    xEnabled: boolean;
    xPosted: boolean;
    xPostUrl: string | null;
    xError: string | null;
  };
  duration: number;
  error?: string;
}
