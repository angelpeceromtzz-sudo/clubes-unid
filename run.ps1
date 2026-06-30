param(
  [string]$Action = "all"
)

$BackendDir = Join-Path $PSScriptRoot "backend"
$RootDir = $PSScriptRoot

function Start-Backend {
  Write-Host "[INFO] Iniciando servidor Express..." -ForegroundColor Cyan
  $proc = Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory $BackendDir -PassThru -NoNewWindow
  Write-Host "[INFO] Backend lanzado con PID $($proc.Id)" -ForegroundColor Green

  Start-Sleep -Seconds 5
  Write-Host "[INFO] Migraciones ejecutadas. Backend corriendo en puerto 4000" -ForegroundColor Green
  return $proc
}

function Stop-Backend {
  param([int]$ProcessId)
  if ($ProcessId -and (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $ProcessId -Force
    Write-Host "[INFO] Backend (PID $ProcessId) detenido." -ForegroundColor Yellow
  } else {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
      $_.CommandLine -match "index.js"
    } | Stop-Process -Force
    Write-Host "[INFO] Procesos node remanentes finalizados." -ForegroundColor Yellow
  }
}

function Test-Health {
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -TimeoutSec 5
    Write-Host "[TEST] Health check: $($r.status)" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "[TEST] Health check falló: $_" -ForegroundColor Red
    return $false
  }
}

function Run-Tests {
  Write-Host "[TEST] Ejecutando pruebas..." -ForegroundColor Cyan
  node "$RootDir/debug_test.mjs"
  Write-Host "[TEST] Pruebas finalizadas." -ForegroundColor Green
}

switch ($Action) {
  "backend" {
    Start-Backend
  }
  "test" {
    $proc = Start-Backend
    if (Test-Health) {
      Run-Tests
    }
    Stop-Backend -ProcessId $proc.Id
  }
  "all" {
    $proc = Start-Backend
    Start-Sleep -Seconds 2
    if (Test-Health) {
      Run-Tests
      Write-Host "[INFO] Sistema listo para desarrollo." -ForegroundColor Magenta
      Write-Host "[INFO] Backend activo en PID $($proc.Id). Presiona Ctrl+C para detener." -ForegroundColor Magenta
      Wait-Process -Id $proc.Id
    } else {
      Stop-Backend -ProcessId $proc.Id
    }
  }
  default {
    Write-Host "Uso: .\run.ps1 [-Action backend|test|all]" -ForegroundColor White
  }
}
