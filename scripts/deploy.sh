#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/autofanqian}"
BRANCH="${BRANCH:-main}"
APP_NAME="${APP_NAME:-autofanqian}"
LOCK_FILE="${DEPLOY_LOCK_FILE:-/tmp/${APP_NAME}.deploy.lock}"

mkdir -p "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deployment is already running."
  exit 1
fi

cd "$APP_DIR"

echo "Deploying ${APP_NAME} from origin/${BRANCH}..."
git fetch origin "$BRANCH"
git reset --hard "origin/${BRANCH}"
npm ci
npm run db:generate
npx prisma migrate deploy
npm run build
pm2 reload "$APP_NAME" --update-env || pm2 start npm --name "$APP_NAME" -- start
pm2 save

echo "Deployment finished."
