# PowerShell Clean Script
Write-Host "Cleaning all node_modules and lock files..." -ForegroundColor Cyan

# Remove node_modules directories
if (Test-Path node_modules) {
    Write-Host "Removing root node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules
}

if (Test-Path backend\node_modules) {
    Write-Host "Removing backend node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force backend\node_modules
}

if (Test-Path frontend\node_modules) {
    Write-Host "Removing frontend node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force frontend\node_modules
}

if (Test-Path shared\node_modules) {
    Write-Host "Removing shared node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force shared\node_modules
}

# Remove lock files
if (Test-Path package-lock.json) {
    Write-Host "Removing root package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force package-lock.json
}

if (Test-Path backend\package-lock.json) {
    Write-Host "Removing backend package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force backend\package-lock.json
}

if (Test-Path frontend\package-lock.json) {
    Write-Host "Removing frontend package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force frontend\package-lock.json
}

if (Test-Path shared\package-lock.json) {
    Write-Host "Removing shared package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force shared\package-lock.json
}

Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Run setup.bat" -ForegroundColor Cyan

