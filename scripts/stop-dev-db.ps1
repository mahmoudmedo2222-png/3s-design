$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$dataDir = Join-Path $projectRoot ".postgres-data"

if (Test-Path $dataDir) {
  & (Join-Path $pgBin "pg_ctl.exe") -D $dataDir stop -m fast
}
