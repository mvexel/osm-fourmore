-- Migration: Add user settings JSONB field
-- Description: Adds flexible JSONB settings field to store user preferences including expert mode and other settings
-- Date: 2025-09-30

ALTER TABLE users ADD COLUMN settings JSONB DEFAULT '{}';

-- Create an index on the settings JSONB field for better query performance
CREATE INDEX idx_users_settings ON users USING GIN (settings);

-- Comments for documentation
COMMENT ON COLUMN users.settings IS 'JSONB field storing user preferences and settings including expert mode, theme, notifications, etc.';