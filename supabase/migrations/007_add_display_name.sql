-- Migration 007: Add display_name and is_active columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
