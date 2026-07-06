#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/3s-design}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"

if [ ! -f ".env.production" ]; then
  echo "Missing $APP_DIR/.env.production"
  echo "Create it from .env.production.example before deploying."
  exit 1
fi

set -a
. ./.env.production
set +a

docker compose --env-file .env.production -f "$COMPOSE_FILE" pull
docker compose --env-file .env.production -f "$COMPOSE_FILE" up -d --remove-orphans
docker image prune -f
