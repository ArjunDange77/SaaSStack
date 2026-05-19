#!/usr/bin/env bash
set -e

echo "Waiting for Postgres at ${DB_HOST:-db}:${DB_PORT:-5432}..."

retry=0
until python - <<'PY'
import os
import sys

import psycopg2

try:
    psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("DB_HOST", "db"),
        port=os.getenv("DB_PORT", "5432"),
    )
    print("Postgres reachable")
except Exception as exc:
    print(f"Waiting for Postgres... ({exc})")
    sys.exit(1)
PY
do
  retry=$((retry + 1))
  if [ "$retry" -gt 30 ]; then
    echo "Postgres not available after $retry attempts, exiting."
    exit 1
  fi
  sleep 2
done

if [ "${RUN_BOOTSTRAP:-false}" = "true" ]; then
  echo "RUN_BOOTSTRAP=true — creating migrations (dev only)..."
  python manage.py makemigrations --noinput || true
fi

echo "Applying migrations..."
python manage.py migrate --noinput

if [ "$DJANGO_ENV" = "production" ] || [ "$DJANGO_ENV" = "staging" ]; then
  echo "Ensuring cache table for rate limiting..."
  python manage.py createcachetable
fi

if [ "${RUN_BOOTSTRAP:-false}" = "true" ]; then
  echo "Seeding kernel defaults..."
  python manage.py seed_kernel || true
  if [ "${SEED_PG_DEMO:-false}" = "true" ]; then
    echo "Seeding PG demo..."
    python manage.py seed_pg --demo || true
  else
    python manage.py seed_pg || true
  fi
fi

if [ "${SEED_STAGING_DEMO:-false}" = "true" ]; then
  echo "SEED_STAGING_DEMO=true — seeding kernel + pg-demo (idempotent)..."
  python manage.py seed_kernel || true
  python manage.py seed_pg --demo || true
fi

if [ "${SEED_SB_STAGING_DEMO:-false}" = "true" ]; then
  echo "SEED_SB_STAGING_DEMO=true — seeding kernel + sb-demo (idempotent)..."
  python manage.py seed_kernel || true
  python manage.py seed_school_bus || true
fi

# Manual/Portal recovery only — CI uses deploy/scripts/seed_goa_pilot_via_db.sh (no restart).
if [ "${SEED_GOA_PILOT_STAGING:-false}" = "true" ]; then
  echo "SEED_GOA_PILOT_STAGING=true — seeding sai-baba-school-bus pilot (reset)..."
  started=$(date +%s)
  python manage.py seed_kernel
  python manage.py seed_goa_pilot --reset
  echo "Goa pilot seed finished in $(($(date +%s) - started))s"
fi

if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ] && [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
  echo "Creating superuser (if not exists)..."
  python manage.py shell -c "from django.contrib.auth import get_user_model; User=get_user_model(); \
    u=User.objects.filter(username='${DJANGO_SUPERUSER_USERNAME}').first(); \
    (u or User.objects.create_superuser('${DJANGO_SUPERUSER_USERNAME}','${DJANGO_SUPERUSER_EMAIL}','${DJANGO_SUPERUSER_PASSWORD}'))"
fi

if [ "$DJANGO_ENV" = "production" ] || [ "$DJANGO_ENV" = "staging" ]; then
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

if [ "$DJANGO_ENV" = "production" ] || [ "$DJANGO_ENV" = "staging" ]; then
  echo "Starting Gunicorn (version ${APP_VERSION:-dev})..."
  exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
else
  echo "Starting Django development server on 0.0.0.0:8000"
  exec python manage.py runserver 0.0.0.0:8000
fi
