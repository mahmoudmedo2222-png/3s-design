param(
  [switch]$RequireRunning
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$listener = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if (!$listener) {
  if ($RequireRunning) {
    Write-Error "No process is listening on port 4000."
  } else {
    Write-Host "No process is listening on port 4000."
  }
  exit 0
}

$process = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq $listener.OwningProcess }
$commandLine = $process.CommandLine

Write-Host "Port 4000 owner PID: $($listener.OwningProcess)"
Write-Host "Command line: $commandLine"

if ($commandLine -notlike "*$projectRoot*") {
  Write-Error "Port 4000 is not owned by this project: $projectRoot"
}

Write-Host "Port 4000 is owned by this project."
