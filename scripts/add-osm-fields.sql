-- Migration: Add OSM editing fields
-- Description: Adds osm_access_token to users table and osm_version to pois table

-- Add osm_access_token to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS osm_access_token VARCHAR;

-- Add osm_version to pois table
ALTER TABLE pois ADD COLUMN IF NOT EXISTS osm_version INTEGER;

-- Update comment
COMMENT ON COLUMN users.osm_access_token IS 'OAuth2 access token for OSM API writes';
COMMENT ON COLUMN pois.osm_version IS 'Current OSM version number for this element';