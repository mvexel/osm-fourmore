# FourMore Backend Docker Production Deployment Guide

This guide provides step-by-step instructions for deploying the FourMore backend API on a VPS using Docker and Docker Compose, including data loading.

## Prerequisites

- Clean Ubuntu/Debian VPS with root access
- Domain name pointing to your VPS (optional but recommended)
- At least 4GB RAM and 30GB storage
- Basic familiarity with Linux command line

## 1. Server Setup

### Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application user
sudo adduser fourmore
sudo usermod -aG docker fourmore
sudo su - fourmore
```

### Clone Application Repository

```bash
# As fourmore user
cd /home/fourmore
git clone https://github.com/your-username/fourmore.git
cd fourmore
```

## 2. Docker Configuration

### Create Production Environment File

```bash
# Create production environment file
cp .env.example .env.production
nano .env.production
```

Configure `.env.production`:

```env
# Database (Docker service name)
DATABASE_URL=postgresql://fourmore:your_secure_password_here@postgres:5432/fourmore

# OSM OAuth - Register at https://www.openstreetmap.org/oauth2/applications
OSM_CLIENT_ID=your_osm_client_id
OSM_CLIENT_SECRET=your_osm_client_secret
OSM_REDIRECT_URI=https://yourdomain.com/auth/callback

# JWT Configuration
JWT_SECRET_KEY=your_super_secure_jwt_secret_min_32_chars_long
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Production settings
DEBUG=False
ENVIRONMENT=production

# PostgreSQL (for Docker)
POSTGRES_DB=fourmore
POSTGRES_USER=fourmore
POSTGRES_PASSWORD=your_secure_password_here

# Redis
REDIS_URL=redis://redis:6379

# Data Pipeline
DATA_DIR=/app/data
```

**Note**: The Dockerfiles for both `backend/` and `data-pipeline/` already exist in the repository and don't need to be created manually. The production Docker Compose file (`docker-compose.prod.yml`) also already exists in the repository.

## 3. Initial Deployment

### Build and Start Services

```bash
# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Build and start core services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Initialize Database

```bash
# Initialize database tables using the data-pipeline container
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline python pipeline.py init-db

# Verify database initialization
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

## 4. Data Loading

### Option A: Load Sample Data (Delaware - Quick Start)

```bash
# Create data directory and download Delaware data
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline bash -c "
  cd /app/data &&
  wget https://download.geofabrik.de/north-america/us/delaware-latest.osm.pbf &&
  cd /app/src &&
  python pipeline.py process /app/data/delaware-latest.osm.pbf
"
```

### Option B: Load Utah Data (Recommended for Utah deployment)

```bash
# Download and process Utah OSM data
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline bash -c "
  cd /app/data &&
  wget https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf &&
  cd /app/src &&
  python pipeline.py process /app/data/utah-latest.osm.pbf
"

# Verify Utah data loading
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "
SELECT
    COUNT(*) as total_pois,
    COUNT(DISTINCT category) as categories,
    MIN(ST_Y(location)) as min_lat,
    MAX(ST_Y(location)) as max_lat,
    MIN(ST_X(location)) as min_lon,
    MAX(ST_X(location)) as max_lon
FROM pois;
"
```

### Option C: Load Full US Data (Production)

```bash
# This will download ~8GB and take several hours
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline bash -c "
  cd /app/src && python pipeline.py full-rebuild
"

# Monitor progress in another terminal
docker-compose --env-file .env.production -f docker-compose.prod.yml logs -f data-pipeline
```

### Verify Data Loading

```bash
# Check loaded data
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "
SELECT
    COUNT(*) as total_pois,
    COUNT(DISTINCT category) as categories
FROM pois;
"

# Check spatial indexes
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'pois';
"
```

## 5. Reverse Proxy Setup

### Configure Nginx

```bash
# Create nginx config for Docker backend
sudo nano /etc/nginx/sites-available/fourmore
```

Content for nginx config:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Upstream backend
upstream fourmore_backend {
    server 127.0.0.1:8000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting for general API
    limit_req zone=api burst=20 nodelay;

    # API routes
    location /api/ {
        proxy_pass http://fourmore_backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check (no rate limiting)
    location /health {
        proxy_pass http://fourmore_backend/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }

    # API docs
    location /docs {
        proxy_pass http://fourmore_backend/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Strict rate limiting for authentication endpoints
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://fourmore_backend/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security: Block access to sensitive paths
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Enable Site and SSL

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fourmore /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Start nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Get SSL certificate (replace yourdomain.com)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test SSL
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Service Management

### Start All Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Service Control Commands

```bash
# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v

# Rebuild and restart a service
docker-compose -f docker-compose.prod.yml up -d --build backend
```

## 7. Automated Data Pipeline

### Create Data Update Script

```bash
# Create update script
nano /home/fourmore/fourmore/update-data.sh
chmod +x /home/fourmore/fourmore/update-data.sh
```

Content for update script:

```bash
#!/bin/bash
set -e

cd /home/fourmore/fourmore
LOG_FILE="/home/fourmore/fourmore/data-update.log"

echo "$(date): Starting data update..." >> $LOG_FILE

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Run data pipeline (Utah data update)
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline bash -c "
  cd /app/data &&
  rm -f utah-latest.osm.pbf &&
  wget https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf &&
  cd /app/src &&
  python pipeline.py process /app/data/utah-latest.osm.pbf
" >> $LOG_FILE 2>&1

# Restart backend to clear any caches
docker-compose -f docker-compose.prod.yml restart backend

echo "$(date): Data update completed" >> $LOG_FILE
```

### Setup Systemd Timer (Alternative to Cron)

```bash
# Create systemd service for data updates
sudo nano /etc/systemd/system/fourmore-data-update.service
```

Content:
```ini
[Unit]
Description=FourMore Data Update
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=fourmore
WorkingDirectory=/home/fourmore/fourmore
ExecStart=/home/fourmore/fourmore/update-data.sh
```

```bash
# Create systemd timer
sudo nano /etc/systemd/system/fourmore-data-update.timer
```

Content:
```ini
[Unit]
Description=Run FourMore data update weekly
Requires=fourmore-data-update.service

[Timer]
OnCalendar=Sun 02:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable fourmore-data-update.timer
sudo systemctl start fourmore-data-update.timer

# Check timer status
sudo systemctl status fourmore-data-update.timer
sudo systemctl list-timers fourmore-data-update.timer
```

## 8. Monitoring and Maintenance

### Health Checks

```bash
# Check API health
curl https://yourdomain.com/health

# Check all Docker services
docker-compose -f docker-compose.prod.yml ps

# Check individual service health
docker-compose -f docker-compose.prod.yml exec backend curl -f http://localhost:8000/health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U fourmore -d fourmore
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Check database content
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "SELECT COUNT(*) FROM pois;"
```

### View Logs

```bash
# All service logs
docker-compose -f docker-compose.prod.yml logs --tail=100

# Specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f redis

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Data update logs
tail -f /home/fourmore/fourmore/data-update.log
```

### Database Maintenance

```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U fourmore -d fourmore > fourmore_backup_$(date +%Y%m%d).sql

# Database backup with compression
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U fourmore -d fourmore | gzip > fourmore_backup_$(date +%Y%m%d).sql.gz

# Database optimization (monthly)
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "VACUUM ANALYZE;"

# Check database and container sizes
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check Docker volume sizes
docker system df
docker volume ls
```

### Container Management

```bash
# Update containers
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Clean up unused images/containers
docker system prune -f
docker image prune -f
docker volume prune -f  # WARNING: removes unused volumes

# Monitor resource usage
docker stats
```

## 9. Security Considerations

### Firewall Setup

```bash
# Install and configure UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw deny 8000  # Block direct access to Docker backend port
sudo ufw enable

# Check firewall status
sudo ufw status verbose
```

### Docker Security

```bash
# Ensure Docker daemon security
sudo nano /etc/docker/daemon.json
```

Content for `/etc/docker/daemon.json`:
```json
{
    "icc": false,
    "userland-proxy": false,
    "no-new-privileges": true,
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}
```

```bash
# Restart Docker daemon
sudo systemctl restart docker

# Verify Docker security
docker info | grep -i security
```

### Database Security

The database is secured within the Docker network and not exposed publicly. All connections use the internal Docker network.

### Regular Updates

```bash
# Create comprehensive update script
nano /home/fourmore/update-system.sh
chmod +x /home/fourmore/update-system.sh
```

Content:
```bash
#!/bin/bash
set -e

echo "$(date): Starting system update..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd /home/fourmore/fourmore
docker-compose -f docker-compose.prod.yml pull

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml up -d --build

# Clean up old images
docker image prune -f

echo "$(date): System update completed"
```

## 10. Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs backend

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check configuration syntax
docker-compose -f docker-compose.prod.yml config

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

**Database connection errors:**
```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "SELECT version();"

# Check database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U fourmore -d fourmore

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

**SSL certificate issues:**
```bash
# Renew certificate
sudo certbot renew
sudo systemctl restart nginx

# Check certificate status
sudo certbot certificates
```

**Data loading issues:**
```bash
# Check data pipeline logs
docker-compose --env-file .env.production -f docker-compose.prod.yml logs data-pipeline

# Verify data directory
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline ls -la /app/data/

# Manual data processing
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline python pipeline.py --help
```

**Out of disk space:**
```bash
# Check disk usage
df -h
docker system df

# Clean up Docker resources
docker system prune -a -f
docker volume prune -f
```

### Performance Tuning

For high-traffic deployments:

1. **Scale backend containers:**
```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

2. **Tune PostgreSQL settings** by creating a custom config:
```bash
# Create custom postgresql.conf
mkdir -p postgres-config
nano postgres-config/postgresql.conf

# Mount it in docker-compose.prod.yml:
# volumes:
#   - ./postgres-config/postgresql.conf:/etc/postgresql/postgresql.conf
```

3. **Add Redis caching** (already included in docker-compose)

4. **Implement load balancing** with multiple backend instances

5. **Monitor resource usage:**
```bash
# Real-time container stats
docker stats

# Check system resources
htop
```

### Backup and Recovery

```bash
# Full backup script
nano /home/fourmore/backup.sh
chmod +x /home/fourmore/backup.sh
```

Content for backup script:
```bash
#!/bin/bash
BACKUP_DIR="/home/fourmore/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U fourmore -d fourmore | gzip > $BACKUP_DIR/database_$DATE.sql.gz

# Backup Docker volumes
docker run --rm -v fourmore_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_volume_$DATE.tar.gz -C /data .
docker run --rm -v fourmore_osm_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/osm_volume_$DATE.tar.gz -C /data .

# Backup configuration
tar czf $BACKUP_DIR/config_$DATE.tar.gz .env.production docker-compose.prod.yml

echo "Backup completed: $DATE"
```

### Disaster Recovery

```bash
# Restore database from backup
gunzip -c database_20231201_120000.sql.gz | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U fourmore -d fourmore

# Restore volumes
docker run --rm -v fourmore_postgres_data:/data -v $PWD:/backup alpine tar xzf /backup/postgres_volume_20231201_120000.tar.gz -C /data
```

## Support

For issues specific to this Docker deployment:

1. **Check container logs first:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=100
   ```

2. **Verify all services are healthy:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   curl https://yourdomain.com/health
   ```

3. **Test database connectivity:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec postgres pg_isready
   ```

4. **Review configuration:**
   ```bash
   docker-compose -f docker-compose.prod.yml config
   ```

## Quick Reference Commands

```bash
# Essential daily commands
docker-compose -f docker-compose.prod.yml ps                    # Check status
docker-compose -f docker-compose.prod.yml logs backend         # View logs
docker-compose -f docker-compose.prod.yml restart backend      # Restart API
curl https://yourdomain.com/health                             # Health check

# Maintenance commands
docker system df                                               # Check space
docker system prune -f                                        # Clean up
./update-system.sh                                            # Update all
./backup.sh                                                   # Create backup
```

---

**🎉 Your FourMore backend is now deployed with Docker!**

The API should be accessible at `https://yourdomain.com/api/` with full SSL/TLS encryption, automated data updates, and production-ready monitoring.

## 5. Reverse Proxy Setup

### Configure Nginx

```bash
# Create nginx config for Docker backend
sudo nano /etc/nginx/sites-available/fourmore
```

Content for nginx config:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Upstream backend
upstream fourmore_backend {
    server 127.0.0.1:8000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting for general API
    limit_req zone=api burst=20 nodelay;

    # API routes
    location /api/ {
        proxy_pass http://fourmore_backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check (no rate limiting)
    location /health {
        proxy_pass http://fourmore_backend/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }

    # API docs
    location /docs {
        proxy_pass http://fourmore_backend/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Strict rate limiting for authentication endpoints
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://fourmore_backend/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security: Block access to sensitive paths
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Enable Site and SSL

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fourmore /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Start nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Get SSL certificate (replace yourdomain.com)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test SSL
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Service Management

### Start All Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Service Control Commands

```bash
# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v

# Rebuild and restart a service
docker-compose -f docker-compose.prod.yml up -d --build backend
```

## 7. Automated Data Pipeline

### Create Data Update Script

```bash
# Create update script
nano /home/fourmore/fourmore/update-data.sh
chmod +x /home/fourmore/fourmore/update-data.sh
```

Content for update script:

```bash
#!/bin/bash
set -e

cd /home/fourmore/fourmore
LOG_FILE="/home/fourmore/fourmore/data-update.log"

echo "$(date): Starting data update..." >> $LOG_FILE

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Run data pipeline (Utah data update)
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline bash -c "
  cd /app/data &&
  rm -f utah-latest.osm.pbf &&
  wget https://download.geofabrik.de/north-america/us/utah-latest.osm.pbf &&
  cd /app/src &&
  python pipeline.py process /app/data/utah-latest.osm.pbf
" >> $LOG_FILE 2>&1

# Restart backend to clear any caches
docker-compose -f docker-compose.prod.yml restart backend

echo "$(date): Data update completed" >> $LOG_FILE
```

### Setup Systemd Timer (Alternative to Cron)

```bash
# Create systemd service for data updates
sudo nano /etc/systemd/system/fourmore-data-update.service
```

Content:
```ini
[Unit]
Description=FourMore Data Update
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=fourmore
WorkingDirectory=/home/fourmore/fourmore
ExecStart=/home/fourmore/fourmore/update-data.sh
```

```bash
# Create systemd timer
sudo nano /etc/systemd/system/fourmore-data-update.timer
```

Content:
```ini
[Unit]
Description=Run FourMore data update weekly
Requires=fourmore-data-update.service

[Timer]
OnCalendar=Sun 02:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable fourmore-data-update.timer
sudo systemctl start fourmore-data-update.timer

# Check timer status
sudo systemctl status fourmore-data-update.timer
sudo systemctl list-timers fourmore-data-update.timer
```

## 8. Monitoring and Maintenance

### Health Checks

```bash
# Check API health
curl https://yourdomain.com/health

# Check all Docker services
docker-compose -f docker-compose.prod.yml ps

# Check individual service health
docker-compose -f docker-compose.prod.yml exec backend curl -f http://localhost:8000/health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U fourmore -d fourmore
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Check database content
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "SELECT COUNT(*) FROM pois;"
```

### View Logs

```bash
# All service logs
docker-compose -f docker-compose.prod.yml logs --tail=100

# Specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f redis

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Data update logs
tail -f /home/fourmore/fourmore/data-update.log
```

### Database Maintenance

```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U fourmore -d fourmore > fourmore_backup_$(date +%Y%m%d).sql

# Database backup with compression
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U fourmore -d fourmore | gzip > fourmore_backup_$(date +%Y%m%d).sql.gz

# Database optimization (monthly)
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "VACUUM ANALYZE;"

# Check database and container sizes
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check Docker volume sizes
docker system df
docker volume ls
```

### Container Management

```bash
# Update containers
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Clean up unused images/containers
docker system prune -f
docker image prune -f
docker volume prune -f  # WARNING: removes unused volumes

# Monitor resource usage
docker stats
```

## 9. Security Considerations

### Firewall Setup

```bash
# Install and configure UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw deny 8000  # Block direct access to Docker backend port
sudo ufw enable

# Check firewall status
sudo ufw status verbose
```

### Docker Security

```bash
# Ensure Docker daemon security
sudo nano /etc/docker/daemon.json
```

Content for `/etc/docker/daemon.json`:
```json
{
    "icc": false,
    "userland-proxy": false,
    "no-new-privileges": true,
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}
```

```bash
# Restart Docker daemon
sudo systemctl restart docker

# Verify Docker security
docker info | grep -i security
```

### Database Security

The database is secured within the Docker network and not exposed publicly. All connections use the internal Docker network.

### Regular Updates

```bash
# Create comprehensive update script
nano /home/fourmore/update-system.sh
chmod +x /home/fourmore/update-system.sh
```

Content:
```bash
#!/bin/bash
set -e

echo "$(date): Starting system update..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd /home/fourmore/fourmore
docker-compose -f docker-compose.prod.yml pull

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml up -d --build

# Clean up old images
docker image prune -f

echo "$(date): System update completed"
```

## 10. Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs backend

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check configuration syntax
docker-compose -f docker-compose.prod.yml config

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

**Database connection errors:**
```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U fourmore -d fourmore -c "SELECT version();"

# Check database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U fourmore -d fourmore

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

**SSL certificate issues:**
```bash
# Renew certificate
sudo certbot renew
sudo systemctl restart nginx

# Check certificate status
sudo certbot certificates
```

**Data loading issues:**
```bash
# Check data pipeline logs
docker-compose --env-file .env.production -f docker-compose.prod.yml logs data-pipeline

# Verify data directory
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline ls -la /app/data/

# Manual data processing
docker-compose --env-file .env.production -f docker-compose.prod.yml run --rm data-pipeline python pipeline.py --help
```

**Out of disk space:**
```bash
# Check disk usage
df -h
docker system df

# Clean up Docker resources
docker system prune -a -f
docker volume prune -f
```

### Performance Tuning

For high-traffic deployments:

1. **Scale backend containers:**
```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

2. **Tune PostgreSQL settings** by creating a custom config:
```bash
# Create custom postgresql.conf
mkdir -p postgres-config
nano postgres-config/postgresql.conf

# Mount it in docker-compose.prod.yml:
# volumes:
#   - ./postgres-config/postgresql.conf:/etc/postgresql/postgresql.conf
```

3. **Add Redis caching** (already included in docker-compose)

4. **Implement load balancing** with multiple backend instances

5. **Monitor resource usage:**
```bash
# Real-time container stats
docker stats

# Check system resources
htop
```

### Backup and Recovery

```bash
# Full backup script
nano /home/fourmore/backup.sh
chmod +x /home/fourmore/backup.sh
```

Content for backup script:
```bash
#!/bin/bash
BACKUP_DIR="/home/fourmore/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U fourmore -d fourmore | gzip > $BACKUP_DIR/database_$DATE.sql.gz

# Backup Docker volumes
docker run --rm -v fourmore_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_volume_$DATE.tar.gz -C /data .
docker run --rm -v fourmore_osm_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/osm_volume_$DATE.tar.gz -C /data .

# Backup configuration
tar czf $BACKUP_DIR/config_$DATE.tar.gz .env.production docker-compose.prod.yml

echo "Backup completed: $DATE"
```

### Disaster Recovery

```bash
# Restore database from backup
gunzip -c database_20231201_120000.sql.gz | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U fourmore -d fourmore

# Restore volumes
docker run --rm -v fourmore_postgres_data:/data -v $PWD:/backup alpine tar xzf /backup/postgres_volume_20231201_120000.tar.gz -C /data
```

## Support

For issues specific to this Docker deployment:

1. **Check container logs first:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=100
   ```

2. **Verify all services are healthy:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   curl https://yourdomain.com/health
   ```

3. **Test database connectivity:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec postgres pg_isready
   ```

4. **Review configuration:**
   ```bash
   docker-compose -f docker-compose.prod.yml config
   ```

## Quick Reference Commands

```bash
# Essential daily commands
docker-compose -f docker-compose.prod.yml ps                    # Check status
docker-compose -f docker-compose.prod.yml logs backend         # View logs
docker-compose -f docker-compose.prod.yml restart backend      # Restart API
curl https://yourdomain.com/health                             # Health check

# Maintenance commands
docker system df                                               # Check space
docker system prune -f                                        # Clean up
./update-system.sh                                            # Update all
./backup.sh                                                   # Create backup
```

---

**🎉 Your FourMore backend is now deployed with Docker!**

The API should be accessible at `https://yourdomain.com/api/` with full SSL/TLS encryption, automated data updates, and production-ready monitoring.
