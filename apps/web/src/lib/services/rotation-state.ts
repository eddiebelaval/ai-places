import type { SupabaseClient } from '@supabase/supabase-js';
import type { RotationState, RollbackData, GameModeInfo } from '@/lib/types/rotation';

export async function getRotationState(supabase: SupabaseClient): Promise<RotationState> {
  const { data, error } = await supabase
    .from('rotation_state')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return {
      lastRotationAt: null,
      lastRotationStatus: null,
      lastRotationError: null,
      rollbackData: null,
    };
  }

  return {
    lastRotationAt: data.last_rotation_at,
    lastRotationStatus: data.last_rotation_status,
    lastRotationError: data.last_rotation_error,
    rollbackData: data.rollback_data,
  };
}

export async function updateRotationState(
  supabase: SupabaseClient,
  state: Partial<{
    lastRotationAt: string;
    lastRotationStatus: string;
    lastRotationError: string | null;
    rollbackData: RollbackData | null;
  }>
): Promise<void> {
  await supabase
    .from('rotation_state')
    .upsert({
      id: 1,
      last_rotation_at: state.lastRotationAt,
      last_rotation_status: state.lastRotationStatus,
      last_rotation_error: state.lastRotationError,
      rollback_data: state.rollbackData,
      updated_at: new Date().toISOString(),
    });
}

export async function getCurrentGameMode(supabase: SupabaseClient): Promise<GameModeInfo> {
  const { data, error } = await supabase
    .from('canvas_state')
    .select('game_mode_id, rotation_count')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return { id: 'classic', rotationCount: 0 };
  }

  return { id: data.game_mode_id, rotationCount: data.rotation_count };
}

export async function getNextGameMode(
  supabase: SupabaseClient,
  currentModeId: string
): Promise<string> {
  const { data: modes, error } = await supabase
    .from('game_modes')
    .select('id')
    .eq('is_active', true)
    .order('id');

  if (error || !modes || modes.length === 0) {
    return 'classic';
  }

  const currentIndex = modes.findIndex(m => m.id === currentModeId);
  const nextIndex = (currentIndex + 1) % modes.length;

  return modes[nextIndex].id;
}
