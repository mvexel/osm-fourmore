-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create database and user if they don't exist
-- (This is handled by the Docker environment variables, but keeping for reference)