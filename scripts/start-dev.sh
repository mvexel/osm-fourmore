#!/bin/bash
# Start FourMore development servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🚀 Starting FourMore development servers...${NC}"

# Check if .env exists and has OSM credentials
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Run ./scripts/dev-setup.sh first"
    exit 1
fi

# Check for OSM credentials
if grep -q "your_osm_client_id" .env; then
    echo -e "${YELLOW}⚠️  Warning: OSM OAuth credentials not configured in .env${NC}"
    echo "Authentication will not work until you:"
    echo "1. Register app at https://www.openstreetmap.org/oauth2/applications"
    echo "2. Update OSM_CLIENT_ID and OSM_CLIENT_SECRET in .env"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start database if not running
echo "🗄️  Checking database..."
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "Starting database..."
    docker-compose up -d
fi

# Wait for database to be ready with retry logic
echo "⏳ Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T postgres pg_isready -U fourmore -d fourmore >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is ready${NC}"
        break
    fi
    echo "Database not ready yet, waiting... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Database failed to become ready after $MAX_RETRIES attempts${NC}"
    exit 1
fi

# Additional connection test with the exact connection string used by the app
echo "🔗 Testing database connection..."
if ! docker-compose exec -T postgres psql -U fourmore -d fourmore -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${RED}❌ Database connection test failed${NC}"
    exit 1
fi

# Check if we have any POI data
echo "📊 Checking for existing POI data..."
POI_COUNT=$(docker-compose exec -T postgres psql -U fourmore -d fourmore -t -c "SELECT COUNT(*) FROM pois;" 2>/dev/null | tr -d '[:space:]' || echo "0")

# Ensure POI_COUNT is a valid number
if ! [[ "$POI_COUNT" =~ ^[0-9]+$ ]]; then
    POI_COUNT="0"
fi

if [ "$POI_COUNT" -eq "0" ]; then
    echo -e "${YELLOW}⚠️  No POI data found in database${NC}"
    echo "Load test data with: ${YELLOW}./scripts/load-test-data.sh${NC}"
    echo ""
    read -p "Continue without data? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ Database has $POI_COUNT POIs${NC}"
fi

# Function to kill background jobs
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping development servers...${NC}"
    jobs -p | xargs -r kill
    wait
    echo -e "${GREEN}✅ All servers stopped${NC}"
    exit 0
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

echo ""
echo -e "${GREEN}Starting services...${NC}"

# Start backend in background
echo -e "🐍  Starting Python backend (port 8000)..."
cd backend
source venv/bin/activate
python -m app.main &
BACKEND_PID=$!
cd ../

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "⚛️  Starting React frontend (port 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}🎉 Development servers started!${NC}"
echo ""
echo -e "📱 Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "🔧 Backend API: ${BLUE}http://localhost:8000${NC}"
echo -e "📚 API Docs: ${BLUE}http://localhost:8000/docs${NC}"
echo -e "🗄️  Database: ${BLUE}postgresql://fourmore:fourmore_dev_password@localhost:5432/fourmore${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for user to interrupt
wait