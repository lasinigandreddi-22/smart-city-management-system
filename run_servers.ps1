# ========================================================
# Smart City Management System - Server Launch Script
# ========================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Smart City Management System - Starting Local Servers" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$CurrentDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { (Get-Location).Path }

# 1. Start Django Backend Server in new PowerShell window
Write-Host "[1/3] Starting Django REST Backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$CurrentDir\backend'; Write-Host '--- DJANGO REST BACKEND SERVER ---' -ForegroundColor Cyan; python manage.py runserver 127.0.0.1:8000"

# 2. Start Vite React Frontend Server in new PowerShell window
Write-Host "[2/3] Starting Vite React Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$CurrentDir\frontend'; Write-Host '--- VITE REACT FRONTEND SERVER ---' -ForegroundColor Cyan; npm run dev"

# 3. Open browser after small pause
Start-Sleep -Seconds 3
Write-Host "[3/3] Opening browser at http://localhost:5173..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Both servers have launched in separate terminal windows." -ForegroundColor Green
Write-Host "Local URLs:" -ForegroundColor White
Write-Host "  - Frontend Portal:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  - Backend REST API: http://127.0.0.1:8000/api/" -ForegroundColor Cyan
Write-Host "  - Django Admin:     http://127.0.0.1:8000/admin/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Demonstration Login Credentials:" -ForegroundColor White
Write-Host "  - Citizen:          citizen1    / Citizen@12345" -ForegroundColor Yellow
Write-Host "  - Administrator:    admin       / Admin@12345" -ForegroundColor Yellow
Write-Host "  - Service Dept:     department1 / Dept@12345" -ForegroundColor Yellow
Write-Host "  - Traffic Officer:  traffic1    / Traffic@12345" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Green
