# Inicia, reinicia o apaga TBD en esta máquina: la app (Vite) y el servidor de sincronización (selfhost).
#   .\tbd.ps1 start      levanta los dos en segundo plano
#   .\tbd.ps1 stop       los apaga
#   .\tbd.ps1 restart    stop + start
#   .\tbd.ps1 status     muestra si están corriendo
# Los registros quedan en .tbd\app.log y .tbd\servidor.log.
param([ValidateSet("start", "stop", "restart", "status")][string]$Command = "status")

$Root = $PSScriptRoot
$RunDir = Join-Path $Root ".tbd"
$EnvFile = Join-Path $Root ".env"
$AppPort = 5173

function Get-EnvValue([string]$Name, [string]$Default) {
  if (Test-Path $EnvFile) {
    $line = Get-Content $EnvFile | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
    if ($line) { $value = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'"); if ($value) { return $value } }
  }
  return $Default
}
$ServerPort = [int](Get-EnvValue "TBD_PORT" (Get-EnvValue "PORT" "8787"))

$Services = @(
  @{ Name = "app";      Port = $AppPort;    Dir = $Root;                         Args = @("node_modules/vite/bin/vite.js", "--port", "$AppPort", "--strictPort") },
  @{ Name = "servidor"; Port = $ServerPort; Dir = (Join-Path $Root "selfhost"); Args = @("--env-file=../.env", "server.js") }
)

function Get-PidFile($s) { Join-Path $RunDir "$($s.Name).pid" }

function Get-RunningPid($s) {
  $pidFile = Get-PidFile $s
  if (Test-Path $pidFile) {
    $id = [int](Get-Content $pidFile)
    if (Get-Process -Id $id -ErrorAction SilentlyContinue) { return $id }
    Remove-Item $pidFile -Force
  }
  # Por si se levantó a mano: quien esté escuchando en el puerto.
  $conn = Get-NetTCPConnection -LocalPort $s.Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { return [int]$conn.OwningProcess }
  return $null
}

function Start-TbdService($s) {
  $running = Get-RunningPid $s
  if ($running) { Write-Host "  $($s.Name): ya está corriendo (PID $running, puerto $($s.Port))"; return }
  New-Item -ItemType Directory -Force $RunDir | Out-Null
  $log = Join-Path $RunDir "$($s.Name).log"
  $env:PORT = "$ServerPort"
  $p = Start-Process node -ArgumentList $s.Args -WorkingDirectory $s.Dir -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  Set-Content (Get-PidFile $s) $p.Id
  Start-Sleep -Seconds 2
  if ($p.HasExited) {
    Remove-Item (Get-PidFile $s) -Force
    Write-Host "  $($s.Name): no arrancó. Últimas líneas del error:" -ForegroundColor Red
    Get-Content "$log.err" -Tail 10 | ForEach-Object { Write-Host "    $_" }
  } else {
    Write-Host "  $($s.Name): iniciado (PID $($p.Id)) -> http://localhost:$($s.Port)" -ForegroundColor Green
  }
}

function Stop-TbdService($s) {
  $running = Get-RunningPid $s
  if (-not $running) { Write-Host "  $($s.Name): no estaba corriendo"; return }
  taskkill /PID $running /T /F | Out-Null
  Remove-Item (Get-PidFile $s) -Force -ErrorAction SilentlyContinue
  Write-Host "  $($s.Name): apagado (PID $running)" -ForegroundColor Yellow
}

function Show-TbdStatus($s) {
  $running = Get-RunningPid $s
  if ($running) { Write-Host "  $($s.Name): corriendo (PID $running) -> http://localhost:$($s.Port)" -ForegroundColor Green }
  else { Write-Host "  $($s.Name): apagado" -ForegroundColor DarkGray }
}

Write-Host "TBD · $Command"
switch ($Command) {
  "start"   { $Services | ForEach-Object { Start-TbdService $_ } }
  "stop"    { $Services | ForEach-Object { Stop-TbdService $_ } }
  "restart" { $Services | ForEach-Object { Stop-TbdService $_ }; Start-Sleep -Seconds 1; $Services | ForEach-Object { Start-TbdService $_ } }
  "status"  { $Services | ForEach-Object { Show-TbdStatus $_ } }
}
