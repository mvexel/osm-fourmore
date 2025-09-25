# FourMore Setup Guide

This guide will help you set up and run the FourMore MVP locally.

## Prerequisites

- Docker and Docker Compose (recommended)
- Node.js 18+ with npm (for frontend development)
- Git

## Quick Start (Docker Development)

### 1. Clone and Setup Environment

```bash
# Navigate to project directory
cd /Users/mvexel/dev/fourmore

# Install frontend dependencies (for local development)
cd frontend
npm install
cd ..

# Copy shared database models for development
cp data-pipeline/src/database.py backend/app/database.py
```

### 2. Start Development Services

```bash
# Start all development services (database, backend with hot reload)
docker-compose -f docker-compose.dev.yml up -d

# Or run in foreground to see logs
docker-compose -f docker-compose.dev.yml up

# Check services are running
docker-compose -f docker-compose.dev.yml ps
```

### 3. Configure OSM OAuth Application

1. **Register OSM Application:**
   - Go to https://www.openstreetmap.org/oauth2/applications
   - Click "Register a new application"
   - Fill out the form:
     - **Name**: FourMore Local Development
     - **Redirect URI**: `http://127.0.0.1:3000/auth/callback`
     - **Scopes**: Select `read_prefs` (read user preferences)
   - Save the application

2. **Get Credentials:**
   - Copy the **Client ID** and **Client Secret**

### 4. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your OSM credentials
# Replace the placeholder values:
```

Edit `.env` file:
```env
# Database (should work as-is with Docker)
DATABASE_URL=postgresql://fourmore:fourmore_dev_password@localhost:5432/fourmore

# OSM OAuth - REPLACE WITH YOUR ACTUAL VALUES
OSM_CLIENT_ID=your_actual_client_id_from_osm
OSM_CLIENT_SECRET=your_actual_client_secret_from_osm
OSM_REDIRECT_URI=http://127.0.0.1:3000/auth/callback

# JWT Secret - CHANGE THIS
JWT_SECRET_KEY=your_super_secret_jwt_key_change_this_in_production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Redis
REDIS_URL=redis://localhost:6379

# Data Pipeline
OSM_DATA_URL=https://download.geofabrik.de/north-america/us-latest.osm.pbf
DATA_DIR=./data
```

### 4.5. Optional: Use ngrok for OAuth Callbacks (Alternative to Localhost)

If you encounter issues with OAuth callbacks due to network restrictions or need to test from different devices:

1. **Install ngrok** (if not already installed):
   ```bash
   # Using npm (recommended)
   npm install -g ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start ngrok tunnel** for port 3000:
   ```bash
   ngrok http 3000
   ```
   This will give you a URL like `https://abc123.ngrok.io`

3. **Update OSM Application**:
   - Go back to https://www.openstreetmap.org/oauth2/applications
   - Edit your application
   - Change **Redirect URI** to: `https://abc123.ngrok.io/auth/callback` (use your ngrok URL)

4. **Update .env file**:
   ```env
   OSM_REDIRECT_URI=https://abc123.ngrok.io/auth/callback
   ```

5. **Restart your frontend** to pick up the new redirect URI.

**Note**: ngrok URLs change each time you restart ngrok, so you'll need to update the OSM application and .env file accordingly. For persistent URLs, consider ngrok's paid plan.

### 5. Initialize Database

```bash
# Initialize database tables using Docker
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py init-db
```

### 6. Load Sample Data (Optional - for testing)

**Option A: Quick test with small area (Delaware):**
```bash
# Download and process Delaware data using Docker
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline bash -c "
  cd /app/data &&
  wget https://download.geofabrik.de/north-america/us/delaware-latest.osm.pbf &&
  cd /app/src &&
  python pipeline.py process /app/data/delaware-latest.osm.pbf
"
```

**Option B: Full US data (large download ~8GB):**
```bash
# This will download ~8GB and take several hours
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline bash -c "
  cd /app/src && python pipeline.py full-rebuild
"

# Monitor progress in another terminal
docker-compose -f docker-compose.dev.yml --profile tools logs -f data-pipeline
```

### 7. Start the Frontend

**The backend is already running via Docker with hot reload!**

```bash
# Start frontend development server
cd frontend
npm run dev

# Frontend will be available at: http://localhost:3000
# Backend API is available at: http://localhost:8000
# API docs at: http://localhost:8000/docs
```

## Testing the Application

1. **Open your browser** to http://localhost:3000
2. **Click "Sign in with OpenStreetMap"**
3. **Authorize the application** on the OSM website
4. **Allow location access** when prompted
5. **Browse nearby places** and test check-ins

## Development Commands

### Data Pipeline Commands (Docker)

```bash
# Initialize database
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py init-db

# Process OSM file (mounted from host)
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py process /app/data/file.osm.pbf

# Full rebuild (download + process)
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py full-rebuild

# Help
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py --help
```

### Backend Commands (Docker)

```bash
# Backend runs automatically with hot reload in Docker
# View backend logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Restart backend service
docker-compose -f docker-compose.dev.yml restart backend

# Access backend container shell
docker-compose -f docker-compose.dev.yml exec backend bash
```

### Frontend Commands

```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Database Management

### View Database Contents

```bash
# Connect to database
docker exec -it fourmore-postgres-1 psql -U fourmore -d fourmore

# Useful queries:
SELECT COUNT(*) FROM pois;
SELECT category, COUNT(*) FROM pois GROUP BY category;
SELECT * FROM users;
SELECT COUNT(*) FROM checkins;
```

### Reset Database

```bash
# Stop containers
docker-compose -f docker-compose.dev.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.dev.yml down -v

# Start fresh
docker-compose -f docker-compose.dev.yml up -d

# Reinitialize
docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py init-db
```

## Troubleshooting

### Common Issues

**1. Database Connection Errors:**
```bash
# Check if containers are running
docker-compose -f docker-compose.dev.yml ps

# Check database logs
docker-compose -f docker-compose.dev.yml logs postgres

# Restart services
docker-compose -f docker-compose.dev.yml restart
```

**2. OSM OAuth Errors:**
- Verify redirect URI matches exactly: `http://localhost:3000/auth/callback`
- Check client ID and secret in `.env` file
- Ensure OSM application has `read_prefs` scope

**3. Location Not Working:**
- Use HTTPS in production (location API requires secure context)
- Check browser permissions
- Test on mobile device or localhost

**4. No Places Found:**
- Ensure you've loaded OSM data for your area
- Check if you're in the US (default data covers US only)
- Increase search radius in the app

### Logs and Debugging

```bash
# Backend logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Frontend logs
# Open browser dev tools (F12) → Console tab

# Database logs
docker-compose -f docker-compose.dev.yml logs postgres

# Data pipeline logs
docker-compose -f docker-compose.dev.yml --profile tools logs data-pipeline
```

### Performance Tips

1. **Index Creation**: Database indexes are created automatically
2. **Data Size**: Start with state-level data for testing
3. **Memory**: Ensure Docker has at least 4GB RAM allocated
4. **Storage**: Full US data requires ~20GB disk space

## Production Deployment

For production deployment, you'll need to:

1. **Update OSM OAuth redirect URI** to your domain
2. **Set secure JWT secret** in environment variables
3. **Use managed PostgreSQL** service
4. **Configure HTTPS** for geolocation to work
5. **Set up data pipeline cron job** on server
6. **Enable API rate limiting** and monitoring

## Next Steps

- Add more US regional data or expand to other countries
- Implement category-based filtering improvements
- Add user check-in photos
- Build mobile apps with React Native
- Add social features (friends, leaderboards)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs
3. Verify all prerequisites are installed
4. Ensure OSM OAuth is configured correctly