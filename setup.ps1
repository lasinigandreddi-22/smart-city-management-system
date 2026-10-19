# ========================================================
# Smart City Management System - Environment Setup Script
# ========================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Smart City Management System - Full Setup & Seeding" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Install Python requirements
Write-Host "`n[1/5] Installing Backend Python Dependencies..." -ForegroundColor Yellow
cd "$CurrentDir\backend"
python -m pip install -r requirements.txt

# 2. Run Django Migrations
Write-Host "`n[2/5] Running Django Database Migrations..." -ForegroundColor Yellow
python manage.py makemigrations
python manage.py migrate

# 3. Seed Repeatable Demo Data
Write-Host "`n[3/5] Seeding Demonstration Accounts & City Records..." -ForegroundColor Yellow
python manage.py seed_data

# 4. Run Automated Backend Test Suite
Write-Host "`n[4/5] Running Backend Automated Tests..." -ForegroundColor Yellow
python manage.py test

# 5. Install Frontend Dependencies
Write-Host "`n[5/5] Installing Frontend Dependencies with npm..." -ForegroundColor Yellow
cd "$CurrentDir\frontend"
npm install

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "Setup Completed Successfully!" -ForegroundColor Green
Write-Host "You can now start both servers anytime by running:" -ForegroundColor White
Write-Host "  .\run_servers.ps1" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green
