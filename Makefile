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
rebuild: ## Stop containers, wipe database, rebuild and reseed everything
	@echo "Stopping and removing containers with volumes..."
	@docker-compose -f docker-compose.dev.yml down -v
	@echo "Starting fresh containers..."
	@docker-compose -f docker-compose.dev.yml up -d
	@echo "Waiting for database to be ready..."
	@sleep 5
	@echo "Initializing database schema..."
	@docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py init-db
	@echo "Loading data..."
	@docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py full-rebuild
	@echo "Rebuild complete!"

# ==============================================================================
# Initial Setup & Data Management
# ==============================================================================

.PHONY: init-db
init-db: ## Initialize the database schema
	@echo "Initializing database..."
	@docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py init-db

.PHONY: load-data
load-data: ## Process local OSM data from the data directory
	@echo "Processing local OSM data..."
	@docker-compose -f docker-compose.dev.yml --profile tools run --rm data-pipeline python pipeline.py full-rebuild

# ==============================================================================
# Help
# ==============================================================================

.PHONY: help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk -F: '{ sub(/^ *## */, "", $$2); printf "\033[36m%-20s\033[0m %s\n", $$1, $$2 }'
