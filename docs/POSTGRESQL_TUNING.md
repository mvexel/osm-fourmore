# PostgreSQL Performance Tuning for FourMore

This document describes the PostgreSQL performance tuning configuration for FourMore, optimized for deployment on a Hetzner CCX23 VPS (4 vCPU, 16GB RAM).

## Overview

The configuration is based on [PostGIS Performance Tuning recommendations](https://postgis.net/docs/manual-3.6/postgis_administration.html#database_tuning_configuration) and automatically applied via Docker Compose.

## Configuration File

The tuned PostgreSQL configuration is located at `config/postgresql.conf` and includes:

### Memory Settings
- **shared_buffers = 4GB** (25% of RAM)
  - Dedicated memory for caching database data
  - Reduces disk I/O for frequently accessed data

- **work_mem = 64MB**
  - Memory per query operation (sorts, hash tables)
  - Balanced for multiple concurrent users
  - Can be increased per-session for heavy queries

- **maintenance_work_mem = 1GB**
  - Memory for VACUUM, CREATE INDEX, and bulk operations
  - Speeds up index creation and data loading

- **effective_cache_size = 12GB** (75% of RAM)
  - Query planner hint for available system cache
  - Not actual memory allocation, just planning guidance

### Parallel Query Settings
- **max_worker_processes = 4** (matches vCPUs)
- **max_parallel_workers_per_gather = 2**
- **max_parallel_workers = 4**
- **max_parallel_maintenance_workers = 2**
  - Enables parallel query execution for PostGIS operations
  - Significantly improves performance for spatial queries

### Storage Optimization (NVMe SSD)
- **random_page_cost = 1.1**
  - Optimized for fast NVMe storage on Hetzner
  - Default is 4.0 for spinning disks

- **effective_io_concurrency = 200**
  - Higher concurrency for SSD storage

### Query Planner
- **constraint_exclusion = partition**
  - Optimizes queries on partitioned tables

## Local Development

The configuration is automatically applied when running:

```bash
docker-compose --profile database up
# or
docker-compose --profile full up
```

### Verify Configuration

After starting PostgreSQL, verify the settings are applied:

```bash
# Connect to the database
docker-compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

# Check individual settings
SHOW shared_buffers;
SHOW work_mem;
SHOW max_parallel_workers_per_gather;

# See all custom settings
SELECT name, setting, unit FROM pg_settings
WHERE source != 'default' AND source != 'override'
ORDER BY name;
```

## Production Deployment on Hetzner CCX23

### Prerequisites
- Hetzner CCX23 VPS (4 vCPU, 16GB RAM)
- Docker and Docker Compose installed
- Project repository cloned

### Deployment Steps

1. **Ensure config directory exists:**
   ```bash
   cd /path/to/fourmore
   ls -l config/postgresql.conf
   ```

2. **Start PostgreSQL with the tuned configuration:**
   ```bash
   docker-compose --profile database up -d
   ```

3. **Verify the configuration loaded successfully:**
   ```bash
   docker-compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SHOW shared_buffers;"
   ```

   Expected output: `4GB`

4. **Check PostgreSQL logs for any warnings:**
   ```bash
   docker-compose logs postgres | grep -i warning
   ```

### Restart After Changes

If you modify `config/postgresql.conf`, restart PostgreSQL:

```bash
docker-compose restart postgres
```

## Performance Monitoring

### Enable Query Statistics Extension

The configuration includes `pg_stat_statements` for tracking query performance.

Enable it in your database:

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Monitor Slow Queries

Queries taking longer than 1 second are logged. View them:

```bash
docker-compose logs postgres | grep "duration:"
```

### Check Query Performance Stats

```sql
-- Top 10 slowest queries by total time
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Monitor Memory Usage

```sql
-- Current memory settings
SELECT
    name,
    setting,
    unit,
    context
FROM pg_settings
WHERE name IN (
    'shared_buffers',
    'work_mem',
    'maintenance_work_mem',
    'effective_cache_size'
);
```

## Tuning for Your Workload

### If You Have Many Concurrent Users

Reduce `work_mem` to prevent memory exhaustion:

```conf
work_mem = 32MB  # or even 16MB
```

### If You Have Complex Spatial Queries

Increase `work_mem` per session:

```sql
SET work_mem = '256MB';
-- Run your complex query
```

### For Large Data Imports

Temporarily increase maintenance memory:

```sql
SET maintenance_work_mem = '2GB';
-- Run CREATE INDEX or VACUUM
```

## Troubleshooting

### PostgreSQL Won't Start

Check logs:
```bash
docker-compose logs postgres
```

Common issues:
- **Syntax error in config**: Review `config/postgresql.conf` for typos
- **Insufficient memory**: Reduce `shared_buffers` if system has less than 16GB RAM
- **Config file not found**: Ensure volume mount is correct in `docker-compose.yml`

### Performance Not Improved

1. **Verify config is loaded:**
   ```sql
   SHOW shared_buffers;  -- Should be 4GB
   SHOW max_parallel_workers_per_gather;  -- Should be 2
   ```

2. **Check if parallel queries are being used:**
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT ST_Contains(geom, ST_MakePoint(-122.4, 37.8))
   FROM your_spatial_table;
   ```
   Look for "Parallel" in the query plan.

3. **Enable query timing:**
   ```sql
   \timing on
   -- Run your queries
   ```

## Resources

- [PostGIS Performance Tips](https://postgis.net/docs/manual-3.6/performance_tips.html)
- [PostgreSQL Configuration Tuning](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
- [PgTune](https://pgtune.leopard.in.ua/) - Online configuration generator

## Notes

- Configuration is optimized for **16GB RAM**
- If deploying on a different server size, adjust memory settings proportionally
- Monitor actual memory usage and adjust as needed
- The `shared_preload_libraries` setting requires a full PostgreSQL restart to take effect
