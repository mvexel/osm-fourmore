# Makefile for FourMore Development
# Complete containerized development and deployment workflow

# Use bash as the shell
SHELL := /bin/bash

# Environment configuration
ENV_FILE ?= .env.development
COMPOSE_FILE ?= docker-compose.dev.yml

# Default command: show help
.DEFAULT_GOAL := help

# ==============================================================================
# Main Development Workflow
# ==============================================================================

.PHONY: init
init: ## 🚀 One-time setup: generate mappings, build images, init database, download OSM data
	@echo "🚀 Initializing FourMore development environment..."
	@$(MAKE) generate-mappings
	@echo "🏗️  Building Docker images..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) build
	@echo "🗂️  Creating data directory..."
	@mkdir -p data
	@$(MAKE) download-osm
	@echo "🐳 Starting services for initialization..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up -d postgres redis
	@$(MAKE) wait-for-db
	@$(MAKE) init-db
	@$(MAKE) seed-db
	@echo ""
	@echo "🎉 Initialization complete! Use 'make up' to start development."

.PHONY: up
up: ## ⬆️  Start development services (frontend + backend + database)
	@$(MAKE) generate-mappings
	@echo "🐳 Starting FourMore development stack..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up -d
	@echo ""
	@echo "🌟 FourMore is running!"
	@echo "   Frontend:  http://localhost:3000"
	@echo "   Backend:   http://localhost:8000"
	@echo "   API Docs:  http://localhost:8000/docs"
	@echo "   Database:  localhost:5432"
	@echo ""
	@echo "Use 'make logs' to view logs, 'make down' to stop."

.PHONY: down
down: ## ⬇️  Stop all services
	@echo "🛑 Stopping FourMore services..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) down
	@echo "✅ Services stopped."

.PHONY: restart
restart: ## 🔄 Restart all services
	@echo "🔄 Restarting FourMore services..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) restart
	@echo "✅ Services restarted."

.PHONY: logs
logs: ## 📋 View logs from all services
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) logs -f

.PHONY: logs-backend
logs-backend: ## 📋 View backend logs only
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) logs -f backend

.PHONY: logs-frontend
logs-frontend: ## 📋 View frontend logs only
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) logs -f frontend

# ==============================================================================
# Database Management
# ==============================================================================

.PHONY: init-db
init-db: ## 🗄️  Initialize database with PostGIS extensions
	@echo "🗄️  Initializing database..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) exec -T postgres psql -U fourmore -d fourmore -f /docker-entrypoint-initdb.d/init-db.sql
	@echo "✅ Database initialized."

.PHONY: clear-db
clear-db: ## 🧹 Clear POI data (keep schema)
	@echo "🧹 Clearing POI data from database..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) exec postgres psql -U fourmore -d fourmore -c "TRUNCATE TABLE IF EXISTS pois CASCADE;"
	@echo "✅ POI data cleared."

.PHONY: reset-db
reset-db: ## 🔄 Reset database completely (drops and recreates)
	@echo "🔄 Resetting database completely..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) down -v postgres
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up -d postgres
	@$(MAKE) wait-for-db
	@$(MAKE) init-db
	@echo "✅ Database reset complete."

.PHONY: seed-db
seed-db: ## 🌱 Import OSM data using osm2pgsql
	@echo "🌱 Seeding database with OSM data..."
	@$(MAKE) wait-for-db
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) --profile tools run --rm data-pipeline
	@echo "✅ Database seeded with OSM data."

.PHONY: wait-for-db
wait-for-db: ## ⏳ Wait for database to be ready
	@echo "⏳ Waiting for database to be ready..."
	@for i in {1..30}; do \
		docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) exec -T postgres pg_isready -U fourmore -d fourmore >/dev/null 2>&1 && break; \
		echo "  Database is starting... ($$i/30)"; \
		sleep 2; \
	done
	@echo "✅ Database is ready!"

# ==============================================================================
# Build & Generate
# ==============================================================================

.PHONY: build
build: ## 🏗️  Generate mappings and build frontend assets (no containers)
	@echo "🏗️  Building FourMore..."
	@$(MAKE) generate-mappings
	@echo "📦 Building frontend..."
	@cd frontend && npm run build
	@echo "✅ Build complete!"

.PHONY: rebuild-images
rebuild-images: ## 🏗️  Rebuild Docker images only (no data loading)
	@echo "🏗️  Rebuilding Docker images..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) build --no-cache
	@echo "✅ Images rebuilt."

.PHONY: rebuild
rebuild: ## 🔄 Full rebuild: containers + database + OSM data
	@echo "🔄 Full rebuild of FourMore environment..."
	@$(MAKE) generate-mappings
	@$(MAKE) down
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) down -v
	@$(MAKE) rebuild-images
	@$(MAKE) download-osm
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up -d postgres redis
	@$(MAKE) wait-for-db
	@$(MAKE) init-db
	@$(MAKE) seed-db
	@echo "✅ Full rebuild complete!"

.PHONY: generate-mappings
generate-mappings: ## 📝 Generate category mappings from JSON
	@./scripts/generate-mappings.sh

# ==============================================================================
# Data Management
# ==============================================================================

.PHONY: download-osm
download-osm: ## 📥 Download OSM data file
	@./scripts/download-osm.sh

.PHONY: update-osm
update-osm: ## 🔄 Update OSM data and reload database
	@echo "🔄 Updating OSM data..."
	@rm -f data/utah-latest.osm.pbf
	@$(MAKE) download-osm
	@$(MAKE) clear-db
	@$(MAKE) seed-db
	@echo "✅ OSM data updated!"

# ==============================================================================
# Production Deployment
# ==============================================================================

.PHONY: deploy
deploy: ## 🚀 Deploy to production
	@echo "🚀 Deploying FourMore to production..."
	@$(MAKE) generate-mappings
	@ENV_FILE=.env.production $(MAKE) build-prod
	@ENV_FILE=.env.production docker-compose up -d
	@echo "✅ Production deployment complete!"

.PHONY: build-prod
build-prod: ## 🏗️  Build production images
	@echo "🏗️  Building production images..."
	@docker-compose --env-file .env.production build
	@echo "✅ Production images built."

.PHONY: prod-logs
prod-logs: ## 📋 View production logs
	@docker-compose --env-file .env.production logs -f

.PHONY: prod-down
prod-down: ## ⬇️  Stop production services
	@docker-compose --env-file .env.production down

# ==============================================================================
# Development Tools
# ==============================================================================

.PHONY: shell-backend
shell-backend: ## 🐚 Open shell in backend container
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) exec backend bash

.PHONY: shell-frontend
shell-frontend: ## 🐚 Open shell in frontend container
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) exec frontend sh

.PHONY: shell-db
shell-db: ## 🐚 Open PostgreSQL shell
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) exec postgres psql -U fourmore -d fourmore

.PHONY: clean
clean: ## 🧹 Clean up Docker resources
	@echo "🧹 Cleaning up Docker resources..."
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) down -v --remove-orphans
	@docker system prune -f
	@echo "✅ Cleanup complete."

.PHONY: status
status: ## 📊 Show status of all services
	@echo "📊 FourMore Service Status:"
	@docker-compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) ps

# ==============================================================================
# Help
# ==============================================================================

.PHONY: help
help: ## 📚 Show this help message
	@echo "FourMore Development Commands"
	@echo "============================="
	@echo ""
	@echo "Quick Start:"
	@echo "  make init    # One-time setup (run this first!)"
	@echo "  make up      # Start development environment"
	@echo "  make down    # Stop all services"
	@echo ""
	@echo "All Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk -F: '{ sub(/^[[:space:]]*## /, "", $$2); printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2 }'
	@echo ""
	@echo "Environment:"
	@echo "  Current: $(ENV_FILE)"
	@echo "  Override with: make up ENV_FILE=.env.production"