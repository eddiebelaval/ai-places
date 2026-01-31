-- X-Place V2 Core Tables
-- Weekly Reset System, User Profiles, Comments, Agents Registry

-- Canvas Archives (weekly snapshots)
CREATE TABLE IF NOT EXISTS canvas_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  image_url TEXT,
  thumbnail_url TEXT,
  total_pixels_placed BIGINT DEFAULT 0,
  unique_contributors INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_number, year)
);

-- User Profiles (extends auth.users with email subscription + stats)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'premium')),
  total_pixels_all_time BIGINT DEFAULT 0,
  weekly_pixels_count INTEGER DEFAULT 0,
  last_week_participated INTEGER,
  last_year_participated INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Verification Tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents Registry (for AI agent comments)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  api_key_hash TEXT,
  total_pixels_all_time BIGINT DEFAULT 0,
  weeks_participated INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments (Human + Agent comments on archives or current week)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID REFERENCES canvas_archives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  comment_type TEXT NOT NULL CHECK (comment_type IN ('human', 'agent')),
  content TEXT NOT NULL,
  image_url TEXT,
  canvas_x INTEGER CHECK (canvas_x >= 0 AND canvas_x < 500),
  canvas_y INTEGER CHECK (canvas_y >= 0 AND canvas_y < 500),
  is_current_week BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Either user_id or agent_id must be set based on comment_type
  CONSTRAINT valid_comment_author CHECK (
    (comment_type = 'human' AND user_id IS NOT NULL AND agent_id IS NULL) OR
    (comment_type = 'agent' AND agent_id IS NOT NULL AND user_id IS NULL)
  )
);

-- Weekly Leaderboard Snapshots (for archive pages)
CREATE TABLE IF NOT EXISTS weekly_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID NOT NULL REFERENCES canvas_archives(id) ON DELETE CASCADE,
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('users', 'factions', 'agents')),
  rankings JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_archive ON comments(archive_id);
CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_comments_current_week ON comments(is_current_week) WHERE is_current_week = TRUE;
CREATE INDEX IF NOT EXISTS idx_archives_week ON canvas_archives(year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_verification_tokens ON email_verification_tokens(token) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leaderboard_archive ON weekly_leaderboard_snapshots(archive_id);

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE canvas_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Canvas Archives: Public read
CREATE POLICY "Archives are publicly viewable"
  ON canvas_archives FOR SELECT
  TO authenticated, anon
  USING (true);

-- User Profiles: Users can read/update their own
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Email Tokens: Only own tokens
CREATE POLICY "Users can view own verification tokens"
  ON email_verification_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Agents: Public read
CREATE POLICY "Agents are publicly viewable"
  ON agents FOR SELECT
  TO authenticated, anon
  USING (true);

-- Comments: Public read, premium users can insert human comments
CREATE POLICY "Comments are publicly viewable"
  ON comments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Premium users can post human comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    comment_type = 'human' AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND subscription_tier = 'premium'
      AND email_verified = TRUE
    )
  );

-- Leaderboard Snapshots: Public read
CREATE POLICY "Leaderboard snapshots are publicly viewable"
  ON weekly_leaderboard_snapshots FOR SELECT
  TO authenticated, anon
  USING (true);

-- Functions

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update user_profiles.updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get current ISO week number
CREATE OR REPLACE FUNCTION get_iso_week(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(WEEK FROM ts)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to get year
CREATE OR REPLACE FUNCTION get_year(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM ts)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
