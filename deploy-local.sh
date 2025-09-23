#!/bin/bash
# Local Deployment Script for FourMore
# Run this script to deploy locally with Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.local"

echo -e "${BLUE}🚀 FourMore Local Deployment${NC}"
echo "================================"

# Function to check dependencies
check_dependencies() {
    echo -e "${YELLOW}🔍 Checking dependencies...${NC}"

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running${NC}"
        echo "Please start Docker Desktop"
        exit 1
    fi

    # Check if Docker Compose is available
    if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not available${NC}"
        echo "Please install Docker Compose"
        exit 1
    fi

    # Use docker compose if available, otherwise docker-compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi

    echo -e "${GREEN}✅ Dependencies checked${NC}"
}

# Function to create local environment file
create_env_file() {
    echo -e "${YELLOW}⚙️  Creating local environment configuration...${NC}"

    cat > $ENV_FILE << 'EOF'
# Local Development Environment
DATABASE_URL=postgresql://fourmore:fourmore_dev_password@localhost:5432/fourmore
REDIS_URL=redis://localhost:6379
JWT_SECRET=local_dev_jwt_secret_change_in_production
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Set to true to populate with Utah data on startup
POPULATE_UTAH_DATA=false
EOF

    echo -e "${GREEN}✅ Environment file created: $ENV_FILE${NC}"
}



# Function to build and start services
deploy_services() {
    echo -e "${YELLOW}🐳 Building and starting services...${NC}"

    # Stop any existing services
    $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE down --volumes 2>/dev/null || true

    # Build images
    echo "Building Docker images..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache

    # Start services
    echo "Starting services..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE up -d

    echo -e "${GREEN}✅ Services started${NC}"
}

# Function to wait for services and show status
wait_and_show_status() {
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"

    # Wait for database to be ready
    echo "Waiting for database..."
    timeout 60 bash -c 'until docker exec $(docker compose -f docker-compose.yml ps -q postgres) pg_isready -U fourmore -d fourmore; do sleep 2; done' 2>/dev/null || {
        echo -e "${RED}❌ Database failed to start${NC}"
        show_logs
        exit 1
    }

    # Wait for backend to be ready
    echo "Waiting for backend..."
    timeout 60 bash -c 'until curl -s http://localhost:8000/health > /dev/null 2>&1; do sleep 2; done' || {
        echo "Backend health check failed, but continuing..."
    }

    echo -e "${GREEN}✅ Services are ready${NC}"

    # Show service status
    echo ""
    echo -e "${BLUE}📊 Service Status:${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE ps
}

# Function to show completion message
show_completion() {
    echo ""
    echo -e "${GREEN}🎉 Local Deployment Complete!${NC}"
    echo "================================"
    echo ""
    echo -e "${BLUE}📱 Application URLs:${NC}"
    echo "  • Frontend:  http://localhost:3000"
    echo "  • Backend:   http://localhost:8000"
    echo "  • API Docs:  http://localhost:8000/docs"
    echo ""
    echo -e "${BLUE}🗄️  Database Access:${NC}"
    echo "  • Host: localhost:5432"
    echo "  • Database: fourmore"
    echo "  • User: fourmore"
    echo "  • Password: fourmore_dev_password"
    echo ""
    echo -e "${BLUE}🛠️  Management Commands:${NC}"
    echo "  • View logs:    $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
    echo "  • Stop all:     $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE down"
    echo "  • Restart:      $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE restart"
    echo "  • Show status:  $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE ps"
    echo ""
    echo -e "${YELLOW}💡 Tips:${NC}"
    echo "  • Frontend auto-reloads when you edit files"
    echo "  • Check logs if something isn't working"
    echo "  • Use 'docker compose down --volumes' to reset database"
}

# Function to show logs on error
show_logs() {
    echo -e "${RED}❌ Deployment failed. Here are the recent logs:${NC}"
    $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE logs --tail=50
}

# Function to check if frontend needs to be built separately
check_frontend() {
    if [ ! -f "frontend/package.json" ]; then
        return
    fi

    echo -e "${YELLOW}🌐 Setting up frontend development...${NC}"
    echo "For frontend development, you may want to run it separately with hot reload:"
    echo ""
    echo "  cd frontend"
    echo "  npm install"
    echo "  npm run dev"
    echo ""
    echo "This will start the frontend at http://localhost:5173 with hot reload."
    echo "The containerized frontend at http://localhost:3000 is for production-like testing."
}

# Main deployment function
main() {
    echo -e "${BLUE}Starting local deployment...${NC}"

    check_dependencies
    create_env_file
    deploy_services
    wait_and_show_status
    check_frontend
    show_completion
}

# Handle script arguments
case "${1:-}" in
    "stop")
        echo -e "${YELLOW}🛑 Stopping services...${NC}"
        $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE down
        echo -e "${GREEN}✅ Services stopped${NC}"
        exit 0
        ;;
    "logs")
        $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE logs -f
        exit 0
        ;;
    "status")
        $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE ps
        exit 0
        ;;
    "clean")
        echo -e "${YELLOW}🧹 Cleaning up containers and volumes...${NC}"
        $DOCKER_COMPOSE -f $COMPOSE_FILE --env-file $ENV_FILE down --volumes --rmi local
        docker system prune -f
        echo -e "${GREEN}✅ Cleanup complete${NC}"
        exit 0
        ;;
    "help"|"-h"|"--help")
        echo "FourMore Local Deployment Script"
        echo ""
        echo "Usage: $0 [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  (none)    Deploy application locally"
        echo "  stop      Stop all services"
        echo "  logs      Show service logs"
        echo "  status    Show service status"
        echo "  clean     Stop services and clean up volumes/images"
        echo "  help      Show this help message"
        exit 0
        ;;
esac

# Run main deployment
main "$@"