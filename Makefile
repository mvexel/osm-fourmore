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

.PHONY: down
down: ## Stop and remove all development containers and volumes
	@echo "Stopping and removing containers and volumes..."
	@docker-compose -f docker-compose.dev.yml down -v

.PHONY: logs
logs: ## Tail the logs for the backend service
	@echo "Tailing backend logs..."
	@docker-compose -f docker-compose.dev.yml logs -f backend

.PHONY: restart
restart: ## Restart all services
	@docker-compose -f docker-compose.dev.yml restart

# ==============================================================================
# Initial Setup & Data Management
# ==============================================================================

.PHONY: setup
setup: ## Run the initial one-time setup script
	@scripts/setup.sh

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
