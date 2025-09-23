# FourMore Setup Guide

This guide covers both automated deployment and manual development setup for FourMore.

## Prerequisites

- Docker and Docker Compose
- Git
- (Optional) Python 3.9+ and Node.js 18+ for manual development

## 🚀 Quick Deployment (Recommended)

### Local Development
```bash
# One-command local deployment
./deploy-local.sh

# Choose whether to load Utah data when prompted
# Access app at http://localhost:3000
```

### Production VPS
```bash
# Copy to VPS and deploy
scp -r . user@your-vps:/tmp/fourmore
ssh user@your-vps "cd /tmp/fourmore && sudo ./deploy-vps.sh"
```

Both deployment scripts handle everything automatically:
- ✅ Docker containers and networking
- ✅ Database initialization
- ✅ Environment configuration
- ✅ Optional Utah OSM data loading
- ✅ SSL certificates (VPS only)

## 🛠️ Manual Development Setup

If you prefer manual setup or need to customize the development environment:

### 1. Configure OSM OAuth

First, set up OpenStreetMap OAuth for authentication:

1. **Register OSM Application:**
   - Go to https://www.openstreetmap.org/oauth2/applications
   - Click "Register a new application"
   - Fill out the form:
     - **Name**: FourMore Local Development
     - **Redirect URI**: `http://localhost:3000/auth/callback`
     - **Scopes**: Select `read_prefs` (read user preferences)
   - Save the application

2. **Configure Environment:**
   ```bash
   # Copy environment template
   cp .env.example .env.local

   # Edit .env.local with your OSM credentials
   ```

   Update these values in `.env.local`:
   ```env
   OSM_CLIENT_ID=your_actual_client_id_from_osm
   OSM_CLIENT_SECRET=your_actual_client_secret_from_osm
   JWT_SECRET=change_this_secure_secret
   ```

### 2. Deploy with Docker

```bash
# Deploy locally with your configuration
./deploy-local.sh
```

### 3. Manual Development (Alternative)

If you need to run services outside Docker:

#### Start Database Services
```bash
# Start only database services
docker compose up -d postgres redis

# Wait for database to be ready
docker compose logs postgres
```

#### Setup Python Backend
```bash
# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations and start backend
python migrate.py
python -m app.main
# Backend available at http://localhost:8000
```

#### Setup Frontend
```bash
# Install and start frontend
cd frontend
npm install
npm run dev
# Frontend available at http://localhost:5173
```

## 🗺️ Data Management

### Utah Test Data
The deployment scripts can automatically load Utah OSM data (~150MB):

```bash
# Enable during deployment
./deploy-local.sh  # Choose 'y' when prompted

# Or manually enable
echo "POPULATE_UTAH_DATA=true" >> .env.local
docker compose restart backend
```

### Custom OSM Data
To load different regions:

1. **Edit migration script** (`backend/migrate.py`)
2. **Change URL** to your desired region from [Geofabrik](https://download.geofabrik.de/)
3. **Restart backend** to trigger data loading

## 🔧 Development Commands

### Local Deployment Management
```bash
# Deploy and start all services
./deploy-local.sh

# Stop all services
./deploy-local.sh stop

# View logs
./deploy-local.sh logs

# Check status
./deploy-local.sh status

# Clean up everything
./deploy-local.sh clean
```

### Docker Compose Commands
```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild containers
docker compose build --no-cache
```

### Database Access
```bash
# Connect to database
docker compose exec postgres psql -U fourmore -d fourmore

# Useful queries
SELECT COUNT(*) FROM pois;  -- Count POIs
SELECT category, COUNT(*) FROM pois GROUP BY category;  -- POIs by category
SELECT * FROM users LIMIT 10;  -- View users
```

## 🌐 Production Deployment

The VPS deployment script (`./deploy-vps.sh`) handles production deployment with:

- ✅ **SSL Certificates**: Automatic Let's Encrypt setup
- ✅ **Security**: Firewall, security headers, secure configurations
- ✅ **Domain Setup**: Custom domain configuration
- ✅ **Data Loading**: Automatic Utah data population
- ✅ **Management Scripts**: Backup, update, and monitoring tools

### VPS Requirements
- Ubuntu 20.04+ or similar
- Root access via SSH
- Domain name pointing to server IP
- Ports 80/443 accessible

### VPS Deployment Steps
1. **Copy project to VPS**:
   ```bash
   scp -r . user@your-vps:/tmp/fourmore
   ```

2. **Run deployment script**:
   ```bash
   ssh user@your-vps
   cd /tmp/fourmore
   sudo ./deploy-vps.sh
   ```

3. **Follow prompts** for:
   - Domain name
   - Database password
   - SSL email
   - JWT secret

## 🐛 Troubleshooting

### Common Issues

**1. OSM OAuth Errors:**
- Verify redirect URI: `http://localhost:3000/auth/callback`
- Check client ID/secret in environment file
- Ensure OSM application has `read_prefs` scope

**2. Database Connection Errors:**
```bash
# Check if containers are running
docker compose ps

# Check database logs
docker compose logs postgres

# Restart services
docker compose restart
```

**3. No Places Found:**
- Ensure Utah data is loaded (`POPULATE_UTAH_DATA=true`)
- Check if you're in Utah or adjust search location
- Verify POI count: `SELECT COUNT(*) FROM pois;`

**4. Frontend Issues:**
- Check backend is running at http://localhost:8000
- Verify CORS origins in environment configuration
- Check browser console for errors

### Reset Everything
```bash
# Complete reset (removes all data)
./deploy-local.sh clean

# Or manually
docker compose down --volumes
docker system prune -f
```

## 📚 Additional Resources

- **OpenStreetMap OAuth**: https://www.openstreetmap.org/oauth2/applications
- **Geofabrik Downloads**: https://download.geofabrik.de/
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **FastAPI Docs**: Auto-generated at http://localhost:8000/docs

## 🏗️ Architecture Notes

The new integrated architecture combines the data pipeline and backend:

```
backend/
├── app/
│   ├── pipeline/           # OSM data processing
│   │   └── osm_processor.py
│   ├── database.py         # Database models
│   └── main.py             # FastAPI app
├── migrate.py              # Enhanced migration with data loading
└── Dockerfile              # Includes OSM dependencies
```

This eliminates the need for separate data pipeline management and provides a cleaner deployment experience.