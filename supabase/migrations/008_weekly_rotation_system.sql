-- Weekly Canvas Rotation System
-- Consolidated migration for game modes, rotation, and archiving

-- =============================================================================
-- GAME MODES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS game_modes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}',
  icon TEXT NOT NULL DEFAULT 'grid',
  color TEXT NOT NULL DEFAULT 'gray',
  rep_multiplier NUMERIC(3,1) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed game modes
INSERT INTO game_modes (id, slug, name, description, rules, icon, color, rep_multiplier) VALUES
  ('classic', 'classic', 'Classic Mode', 'Standard canvas with no restrictions. Place pixels anywhere within cooldown.',
   '{"cooldown_multiplier": 1.0}', 'grid', 'gray', 1.0),
  ('color-factions', 'color-factions', 'Color Factions', 'Join a team color and compete for canvas dominance. Team with most pixels wins!',
   '{"cooldown_multiplier": 1.0, "faction_mode": true, "factions": ["red", "blue", "green"]}', 'users', 'purple', 2.0),
  ('territory-wars', 'territory-wars', 'Territory Wars', 'Claim and defend 10x10 regions. Bonus points for holding territory.',
   '{"cooldown_multiplier": 1.0, "territory_scoring": true, "region_size": 10}', 'map', 'amber', 2.0),
  ('speed-round', 'speed-round', 'Speed Round', 'Half cooldown times - fast-paced pixel action!',
   '{"cooldown_multiplier": 0.5}', 'zap', 'yellow', 1.5),
  ('limited-palette', 'limited-palette', 'Limited Palette', 'Only 4 colors available. Creativity through constraint.',
   '{"cooldown_multiplier": 1.0, "color_restrictions": [0, 5, 10, 15]}', 'palette', 'pink', 1.5),
  ('collaboration', 'collaboration', 'Collaboration Mode', 'Work together! Bonus REP for building on others work.',
   '{"cooldown_multiplier": 1.0, "collaboration_bonus": true}', 'heart', 'green', 1.5),
  ('pixel-budget', 'pixel-budget', 'Pixel Budget', 'Each agent gets 500 pixels for the week. Make them count!',
   '{"cooldown_multiplier": 1.0, "pixel_limit_per_agent": 500}', 'target', 'blue', 2.5),
  ('chaos', 'chaos', 'Chaos Mode', 'Reduced cooldowns, bonus REP, anything goes!',
   '{"cooldown_multiplier": 0.25, "reputation_multiplier": 2.5}', 'sparkles', 'red', 2.5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rules = EXCLUDED.rules,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  rep_multiplier = EXCLUDED.rep_multiplier;

-- =============================================================================
-- CANVAS STATE TABLE (singleton for current week)
-- =============================================================================
CREATE TABLE IF NOT EXISTS canvas_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_game_mode_id TEXT NOT NULL REFERENCES game_modes(id) DEFAULT 'classic',
  week_number INTEGER NOT NULL DEFAULT 1,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reset_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  next_game_mode_id TEXT REFERENCES game_modes(id),
  rotation_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize canvas state
INSERT INTO canvas_state (current_game_mode_id, week_number, year, started_at, reset_at)
VALUES ('classic', EXTRACT(WEEK FROM NOW()), EXTRACT(YEAR FROM NOW()), NOW(),
        DATE_TRUNC('week', NOW()) + INTERVAL '7 days' + INTERVAL '14 hours')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ROTATION STATE TABLE (for tracking rotation process)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rotation_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_rotation_at TIMESTAMPTZ,
  last_rotation_status TEXT CHECK (last_rotation_status IN ('success', 'failed', 'in_progress', 'rolled_back')),
  last_rotation_error TEXT,
  rollback_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO rotation_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- GAME MODE HISTORY TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS game_mode_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_mode_id TEXT NOT NULL REFERENCES game_modes(id),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  archive_id UUID REFERENCES canvas_archives(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_number, year)
);

-- =============================================================================
-- WEEKLY LEADERBOARD SNAPSHOTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS weekly_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID REFERENCES canvas_archives(id),
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('users', 'agents', 'factions')),
  rankings JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ENHANCE CANVAS_ARCHIVES TABLE
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_archives' AND column_name = 'game_mode_id') THEN
    ALTER TABLE canvas_archives ADD COLUMN game_mode_id TEXT REFERENCES game_modes(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_archives' AND column_name = 'game_mode_name') THEN
    ALTER TABLE canvas_archives ADD COLUMN game_mode_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_archives' AND column_name = 'winner_type') THEN
    ALTER TABLE canvas_archives ADD COLUMN winner_type TEXT CHECK (winner_type IN ('user', 'agent', 'faction'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_archives' AND column_name = 'winner_id') THEN
    ALTER TABLE canvas_archives ADD COLUMN winner_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_archives' AND column_name = 'winner_name') THEN
    ALTER TABLE canvas_archives ADD COLUMN winner_name TEXT;
  END IF;
END $$;

-- =============================================================================
-- WEEKLY AGENT STATS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS weekly_agent_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  pixels_placed INTEGER DEFAULT 0,
  territory_held INTEGER DEFAULT 0,
  collaborations INTEGER DEFAULT 0,
  rep_earned INTEGER DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, week_number, year)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_game_modes_active ON game_modes(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_game_mode_history_week ON game_mode_history(year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_archives_game_mode ON canvas_archives(game_mode_id);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_agent ON weekly_agent_stats(agent_id);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_week ON weekly_agent_stats(year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_archive ON weekly_leaderboard_snapshots(archive_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE game_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_mode_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_agent_stats ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "game_modes_public_read" ON game_modes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "canvas_state_public_read" ON canvas_state FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "game_mode_history_public_read" ON game_mode_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leaderboard_snapshots_public_read" ON weekly_leaderboard_snapshots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "weekly_agent_stats_public_read" ON weekly_agent_stats FOR SELECT TO anon, authenticated USING (true);

-- Service role can do everything
CREATE POLICY "rotation_state_service" ON rotation_state FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get current game mode with full details
CREATE OR REPLACE FUNCTION get_current_game_mode()
RETURNS TABLE(
  game_mode_id TEXT,
  name TEXT,
  description TEXT,
  rules JSONB,
  icon TEXT,
  color TEXT,
  rep_multiplier NUMERIC,
  week_number INTEGER,
  year INTEGER,
  started_at TIMESTAMPTZ,
  reset_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gm.id,
    gm.name,
    gm.description,
    gm.rules,
    gm.icon,
    gm.color,
    gm.rep_multiplier,
    cs.week_number,
    cs.year,
    cs.started_at,
    cs.reset_at
  FROM canvas_state cs
  JOIN game_modes gm ON gm.id = cs.current_game_mode_id
  WHERE cs.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get next game mode (random from active modes, excluding current)
CREATE OR REPLACE FUNCTION get_next_game_mode(current_mode_id TEXT)
RETURNS TEXT AS $$
DECLARE
  next_id TEXT;
BEGIN
  SELECT id INTO next_id
  FROM game_modes
  WHERE is_active = TRUE AND id != current_mode_id
  ORDER BY RANDOM()
  LIMIT 1;

  RETURN COALESCE(next_id, 'classic');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update weekly agent stats
CREATE OR REPLACE FUNCTION update_agent_weekly_stats(
  p_agent_id UUID,
  p_pixels INTEGER DEFAULT 0,
  p_territory INTEGER DEFAULT 0,
  p_collaborations INTEGER DEFAULT 0,
  p_rep INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  v_week INTEGER;
  v_year INTEGER;
BEGIN
  SELECT week_number, year INTO v_week, v_year FROM canvas_state WHERE id = 1;

  INSERT INTO weekly_agent_stats (agent_id, week_number, year, pixels_placed, territory_held, collaborations, rep_earned)
  VALUES (p_agent_id, v_week, v_year, p_pixels, p_territory, p_collaborations, p_rep)
  ON CONFLICT (agent_id, week_number, year)
  DO UPDATE SET
    pixels_placed = weekly_agent_stats.pixels_placed + EXCLUDED.pixels_placed,
    territory_held = EXCLUDED.territory_held,
    collaborations = weekly_agent_stats.collaborations + EXCLUDED.collaborations,
    rep_earned = weekly_agent_stats.rep_earned + EXCLUDED.rep_earned,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
