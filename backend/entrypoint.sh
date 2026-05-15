#!/usr/bin/env bash
set -e

# simple wait-for-postgres using psql-like retry (works in most images)
echo "Waiting for Postgres at $DB_HOST:$DB_PORT..."

retry=0
until python - <<PY
import os, sys, time
import psycopg2
try:
    psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("DB_HOST","db"),
        port=os.getenv("DB_PORT","5432"),
    )
    print("Postgres reachable")
except Exception as e:
    print("Waiting for Postgres... (%s)"%e)
    sys.exit(1)
PY
do
  retry=$((retry+1))
  if [ $retry -gt 30 ]; then
    echo "Postgres not available after $retry attempts, exiting."
    exit 1
  fi
  sleep 2
done

echo "Creating Django migrations (if needed)..."
# Create migrations for apps (dev convenience). In prod, prefer committed migrations.
python manage.py makemigrations --noinput || true

# apply migrations and collectstatic (if any)
echo "Applying migrations..."
python manage.py migrate --noinput

echo "Seeding kernel defaults (tenant, nav, branding)..."
python manage.py seed_kernel || true

# create default superuser if env provided (non-interactive)
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ] && [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
  echo "Creating superuser (if not exists)..."
  python manage.py shell -c "from django.contrib.auth import get_user_model; User=get_user_model(); \
    u=User.objects.filter(username='${DJANGO_SUPERUSER_USERNAME}').first(); \
    \
    (u or User.objects.create_superuser('${DJANGO_SUPERUSER_USERNAME}','${DJANGO_SUPERUSER_EMAIL}','${DJANGO_SUPERUSER_PASSWORD}'))"
fi

# optional static collection (uncomment if you use)
# echo "Collecting static files..."
# python manage.py collectstatic --noinput

# runserver in dev or gunicorn in production-like mode
if [ "$DJANGO_ENV" = "production" ]; then
  echo "Starting Gunicorn..."
  exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
else
  echo "Starting Django development server on 0.0.0.0:8000"
  exec python manage.py runserver 0.0.0.0:8000
fi

