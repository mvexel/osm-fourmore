# FourMore Setup Guide

This guide will help you set up and run the FourMore MVP locally.

## Prerequisites

- Python 3.9+ with pip
- Node.js 18+ with npm
- Docker and Docker Compose
- Git

## Quick Start

### 1. Clone and Setup Environment

```bash
# Navigate to project directory
cd /Users/mvexel/dev/fourmore

# Create Python virtual environment for data pipeline
python -m venv data-pipeline/venv
source data-pipeline/venv/bin/activate  # On Windows: data-pipeline\venv\Scripts\activate
pip install -r data-pipeline/requirements.txt

# Create Python virtual environment for backend
python -m venv backend/venv
source backend/venv/bin/activate  # On Windows: backend\venv\Scripts\activate
pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Start Database Services

```bash
# Start PostgreSQL and Redis with Docker
docker-compose up -d

# Wait for database to be ready (about 30 seconds)
docker-compose logs postgres
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
# Activate data pipeline environment
source data-pipeline/venv/bin/activate

# Initialize database tables
cd data-pipeline/src
python pipeline.py init-db
cd ../..
```

### 6. Load Sample Data (Optional - for testing)

**Option A: Quick test with small area:**
```bash
# Download a small state file for testing (e.g., Delaware - small file)
mkdir -p data
cd data
wget https://download.geofabrik.de/north-america/us/delaware-latest.osm.pbf
cd ..

# Process the data
source data-pipeline/venv/bin/activate
cd data-pipeline/src
python pipeline.py process ../../data/delaware-latest.osm.pbf
cd ../..
```

**Option B: Full US data (large download ~8GB):**
```bash
# This will take significant time and space
source data-pipeline/venv/bin/activate
cd data-pipeline/src
python pipeline.py full-rebuild
cd ../..
```

### 7. Start the Services

**Terminal 1 - Backend API:**
```bash
source backend/venv/bin/activate
cd backend/app
python main.py

# API will be available at: http://localhost:8000
# API docs at: http://localhost:8000/docs
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev

# Frontend will be available at: http://localhost:3000
```

## Testing the Application

1. **Open your browser** to http://localhost:3000
2. **Click "Sign in with OpenStreetMap"**
3. **Authorize the application** on the OSM website
4. **Allow location access** when prompted
5. **Browse nearby places** and test check-ins

## Development Commands

### Data Pipeline Commands

```bash
# Activate environment
source data-pipeline/venv/bin/activate
cd data-pipeline/src

# Download OSM data
python pipeline.py download --data-dir ../../data

# Initialize database
python pipeline.py init-db

# Process OSM file
python pipeline.py process /path/to/file.osm.pbf

# Full rebuild (download + process)
python pipeline.py full-rebuild

# Help
python pipeline.py --help
```

### Backend Commands

```bash
# Activate environment
source backend/venv/bin/activate
cd backend/app

# Run development server
python main.py

# Run with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
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
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Start fresh
docker-compose up -d

# Reinitialize
source data-pipeline/venv/bin/activate
cd data-pipeline/src
python pipeline.py init-db
```

## Troubleshooting

### Common Issues

**1. Database Connection Errors:**
```bash
# Check if containers are running
docker-compose ps

# Check database logs
docker-compose logs postgres

# Restart services
docker-compose restart
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
cd backend/app && python main.py  # Logs to console

# Frontend logs
# Open browser dev tools (F12) → Console tab

# Database logs
docker-compose logs postgres

# Data pipeline logs
tail -f weekly_rebuild.log  # After running pipeline
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