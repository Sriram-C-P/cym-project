Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting TLDR..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

$root = $PSScriptRoot
if (-not $root) { $root = $PWD.Path }

# Resolve paths
$venvPython = Join-Path $root "backend\venv\Scripts\python.exe"
$pythonExe = if (Test-Path $venvPython) { $venvPython } else { "python" }
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$viteJs = Join-Path $frontendDir "node_modules\vite\bin\vite.js"

Write-Host "Backend: $pythonExe (in $backendDir)" -ForegroundColor DarkGray
Write-Host "Frontend: node (in $frontendDir)" -ForegroundColor DarkGray

# Quote the vite.js path to handle spaces in directory names
$backend = Start-Process -FilePath $pythonExe -ArgumentList "app.py" -WorkingDirectory $backendDir -NoNewWindow -PassThru
$frontend = Start-Process -FilePath "node" -ArgumentList "`"$viteJs`"" -WorkingDirectory $frontendDir -NoNewWindow -PassThru

try {
    while ($true) { Start-Sleep -Milliseconds 500 }
}
finally {
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
}
