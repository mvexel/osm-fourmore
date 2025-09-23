#!/bin/bash
# Quick development setup script for FourMore

set -e

echo "🚀 Setting up FourMore development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📂 Working in: $PROJECT_ROOT"

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your OSM OAuth credentials${NC}"
    echo "   Get them from: https://www.openstreetmap.org/oauth2/applications"
    echo ""
fi

# Setup Python environments
echo "🐍 Setting up Python environments..."

# Data pipeline
if [ ! -d "data-pipeline/venv" ]; then
    echo "Creating data pipeline virtual environment..."
    cd data-pipeline
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    cd ..
    echo -e "${GREEN}✅ Data pipeline environment ready${NC}"
else
    echo "✅ Data pipeline environment already exists"
fi

# Backend
if [ ! -d "backend/venv" ]; then
    echo "Creating backend virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    cd ..
    echo -e "${GREEN}✅ Backend environment ready${NC}"
else
    echo "✅ Backend environment already exists"
fi

# Setup frontend
echo "📦 Setting up frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo "✅ Frontend dependencies already installed"
fi
cd ..

# Start database services
echo "🗄️  Starting database services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is ready
until docker-compose exec postgres pg_isready -U fourmore -d fourmore > /dev/null 2>&1; do
    echo "Waiting for database..."
    sleep 2
done

echo -e "${GREEN}✅ Database is ready${NC}"

# Initialize database
echo "🔧 Initializing database..."
cd data-pipeline
source venv/bin/activate
cd src
python pipeline.py init-db
cd ../..

echo -e "${GREEN}✅ Database initialized${NC}"

# Create data directory
mkdir -p data

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your OSM OAuth credentials"
echo "2. Load some test data:"
echo -e "   ${YELLOW}./scripts/load-test-data.sh${NC}"
echo "3. Start the services:"
echo -e "   ${YELLOW}./scripts/start-dev.sh${NC}"
echo ""
echo "Or follow the manual steps in SETUP.md"