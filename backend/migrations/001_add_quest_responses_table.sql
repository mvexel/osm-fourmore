-- Migration: Add quest_responses table
-- Description: Tracks completed quests globally to prevent duplicate quest responses
-- Date: 2025-09-30

CREATE TABLE quest_responses (
    id SERIAL PRIMARY KEY,
    poi_osm_type CHAR(1) NOT NULL,
    poi_osm_id BIGINT NOT NULL,
    quest_id VARCHAR NOT NULL,
    answer VARCHAR NOT NULL,
    osm_changeset_id VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_poi_quest UNIQUE (poi_osm_type, poi_osm_id, quest_id)
);

-- Create index on created_at for potential analytics queries
CREATE INDEX idx_quest_responses_created_at ON quest_responses(created_at);

-- Comments for documentation
COMMENT ON TABLE quest_responses IS 'Tracks completed quests to prevent showing already-answered quests';
COMMENT ON COLUMN quest_responses.poi_osm_type IS 'OSM element type: N (node) or W (way)';
COMMENT ON COLUMN quest_responses.poi_osm_id IS 'OSM element ID';
COMMENT ON COLUMN quest_responses.quest_id IS 'Quest identifier from quest definition filename';
COMMENT ON COLUMN quest_responses.answer IS 'User answer: yes or no';
COMMENT ON COLUMN quest_responses.osm_changeset_id IS 'OSM changeset ID if successful, null if OSM update failed';
COMMENT ON CONSTRAINT uq_poi_quest ON quest_responses IS 'Ensures each quest can only be answered once per POI';
