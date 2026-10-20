#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status.
set -o errexit

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing backend dependencies..."
pip install -r backend/requirements.txt

echo "==> Collecting static files..."
python backend/manage.py collectstatic --noinput

echo "==> Running database migrations..."
python backend/manage.py migrate

echo "==> Seeding initial demonstration data..."
python backend/manage.py seed_data

echo "==> Backend build completed successfully!"
