# Makefile for FourMore Development

# Use bash as the shell
SHELL := /bin/bash

# Default command: show help
.DEFAULT_GOAL := help

# ==============================================================================
# Development Lifecycle
# ==============================================================================

.PHONY: up
up: ## Start all development services in the background
	@echo "Starting development containers..."
	@docker-compose -f docker-compose.dev.yml up -d

.PHONY: up-build
up-build: ## Start services and force a rebuild of the images
	@docker-compose -f docker-compose.dev.yml up -d --build

.PHONY: down
down: ## Stop and remove all development containers
	@echo "Stopping and removing containers..."
	@docker-compose -f docker-compose.dev.yml down

.PHONY: logs
logs: ## Tail the logs for the backend service
	@echo "Tailing backend logs..."
	@docker-compose -f docker-compose.dev.yml logs -f backend

.PHONY: restart
restart: ## Restart all services
	@docker-compose -f docker-compose.dev.yml restart

.PHONY: rebuild
rebuild: ## Reset services, rebuild the database, load OSM data, and generate mappings
	@echo "Generating category mappings..."
	@./scripts/generate-mappings.sh
	@echo "Stopping and removing containers with volumes..."
	@docker-compose -f docker-compose.dev.yml down -v
	@echo "Starting services..."
	@docker-compose -f docker-compose.dev.yml up -d
	@$(MAKE) wait-for-db
	@$(MAKE) load-data
	@echo "Rebuild complete!"

# ==============================================================================
# Build & Generate
# ==============================================================================

.PHONY: build
build: ## Generate mappings and build frontend
	@echo "Generating category mappings..."
	@./scripts/generate-mappings.sh
	@echo "Building frontend..."
	@cd frontend && npm run build
	@echo "Build complete!"

.PHONY: generate-mappings
generate-mappings: ## Generate category mappings from category_mapping.json
	@./scripts/generate-mappings.sh

# ==============================================================================
# Initial Setup & Data Management
# ==============================================================================

.PHONY: wait-for-db
wait-for-db:
	@echo "Waiting for database to be ready..."
	@bash -lc 'for i in {1..30}; do docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U fourmore -d fourmore >/dev/null 2>&1 && exit 0; echo "  postgres is still starting..."; sleep 2; done; echo "Postgres did not become ready in time" >&2; exit 1'

.PHONY: load-data
load-data: ## Load OSM data into Postgres using osm2pgsql
	@echo "Loading OSM data with osm2pgsql..."
	@docker-compose -f docker-compose.dev.yml --profile tools run --rm $(if $(OSM_DATA_FILE),-e OSM_DATA_FILE=$(OSM_DATA_FILE),) data-pipeline ./run_osm2pgsql.sh

# ==============================================================================
# Production
# ==============================================================================

.PHONY: prod-up
prod-up: ## Start all production services in the background
	@echo "Starting production containers..."
	@docker-compose -f docker-compose.prod.yml up -d

.PHONY: prod-up-build
prod-up-build: ## Start production services and force a rebuild of the images
	@docker-compose -f docker-compose.prod.yml up -d --build

.PHONY: prod-down
prod-down: ## Stop and remove all production containers
	@echo "Stopping and removing production containers..."
	@docker-compose -f docker-compose.prod.yml down

.PHONY: prod-logs
prod-logs: ## Tail the logs for the production backend service
	@echo "Tailing production backend logs..."
	@docker-compose -f docker-compose.prod.yml logs -f backend

.PHONY: prod-restart
prod-restart: ## Restart all production services
	@docker-compose -f docker-compose.prod.yml restart

# ==============================================================================
# Help
# ==============================================================================

.PHONY: help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk -F: '{ sub(/^ *## */, "", $$2); printf "\033[36m%-20s\033[0m %s\n", $$1, $$2 }'
