SHELL := /bin/bash

DEV_ENV ?= $(if $(wildcard .env.development.local),.env.development.local,.env.development)
DEV_COMPOSE := docker-compose.dev.yml
PROD_ENV ?= $(if $(wildcard .env.production.local),.env.production.local,.env.production)
PROD_COMPOSE := docker-compose.prod.yml

COMPOSE_DEV := FOURMORE_ENV_FILE=$(DEV_ENV) docker-compose --env-file $(DEV_ENV) -f $(DEV_COMPOSE)
COMPOSE_PROD := FOURMORE_ENV_FILE=$(PROD_ENV) docker-compose --env-file $(PROD_ENV) -f $(PROD_COMPOSE)

USE_SYSTEM_DB ?= false

.PHONY: help backend-dev backend-prod frontend-dev frontend-prod \
	db-init-dev db-init-prod db-seed-dev db-seed-prod stop-dev stop-prod

help:
	@echo "FourMore make targets"
	@echo "======================="
	@echo "backend-dev   - Build and start the backend stack for development"
	@echo "backend-prod  - Build and start the backend stack for production"
	@echo "frontend-dev  - Build and start the frontend for development"
	@echo "frontend-prod - Build and start the frontend for production"
	@echo "db-init-dev   - Initialize the development database schema"
	@echo "db-init-prod  - Initialize the production database schema"
	@echo "db-seed-dev   - Seed the development database using the data pipeline"
	@echo "db-seed-prod  - Seed the production database using the data pipeline"
	@echo "stop-dev      - Stop and remove development containers"
	@echo "stop-prod     - Stop and remove production containers"
	@echo "rebuild-dev   - Rebuild and restart development containers"
	@echo "rebuild-prod  - Rebuild and restart production containers"
	@echo ""
	@echo "Tip: set USE_SYSTEM_DB=true to skip the Postgres container"

backend-dev:
	@if [ "$(USE_SYSTEM_DB)" = "true" ]; then \
		echo "Starting backend with system Postgres"; \
		$(COMPOSE_DEV) up --build -d redis backend; \
	else \
		echo "Starting backend with Dockerized Postgres"; \
		$(COMPOSE_DEV) up --build -d postgres redis backend; \
	fi

backend-prod:
	$(COMPOSE_PROD) up --build -d backend

frontend-dev:
	@echo "Starting frontend locally (outside Docker)..."
	cd frontend && npm run dev

frontend-prod:
	$(COMPOSE_PROD) up --build -d frontend

db-init-dev:
	$(COMPOSE_DEV) up -d postgres
	$(COMPOSE_DEV) exec -T postgres bash -c 'until pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB >/dev/null 2>&1; do sleep 1; done && psql -U $$POSTGRES_USER -d $$POSTGRES_DB -f /docker-entrypoint-initdb.d/init-db.sql'

db-init-prod:
	$(COMPOSE_PROD) up -d postgres
	$(COMPOSE_PROD) exec -T postgres bash -c 'until pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB >/dev/null 2>&1; do sleep 1; done && psql -U $$POSTGRES_USER -d $$POSTGRES_DB -f /docker-entrypoint-initdb.d/init-db.sql'

db-seed-dev:
	$(COMPOSE_DEV) up -d postgres
	$(COMPOSE_DEV) run --rm data-pipeline

db-seed-prod:
	$(COMPOSE_PROD) up -d postgres
	$(COMPOSE_PROD) run --rm data-pipeline

stop-dev:
	$(COMPOSE_DEV) down

stop-prod:
	$(COMPOSE_PROD) down

rebuild-dev:
	$(COMPOSE_DEV) build --no-cache
	$(COMPOSE_DEV) up -d

rebuild-prod:
	$(COMPOSE_PROD) build --no-cache
	$(COMPOSE_PROD) up -d