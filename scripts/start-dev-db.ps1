$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$dataDir = Join-Path $projectRoot ".postgres-data"
$logFile = Join-Path $projectRoot ".postgres-log"
$port = "55432"

if (!(Test-Path $dataDir)) {
  $passwordFile = Join-Path $env:TEMP "3s-design-pg-pass.txt"
  Set-Content -Path $passwordFile -Value "postgres" -NoNewline -Encoding ASCII
  & (Join-Path $pgBin "initdb.exe") -D $dataDir -U postgres --auth=scram-sha-256 --encoding=UTF8 --locale=C --pwfile=$passwordFile
  Remove-Item -Force $passwordFile
}

& (Join-Path $pgBin "pg_ctl.exe") -D $dataDir status *> $null
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $pgBin "pg_ctl.exe") -D $dataDir -l $logFile -o "-p $port" start
}

$env:PGPASSWORD = "postgres"
$exists = & (Join-Path $pgBin "psql.exe") -h 127.0.0.1 -p $port -U postgres -d postgres -tAc "select 1 from pg_database where datname = '3s_design';"
if ($exists.Trim() -ne "1") {
  & (Join-Path $pgBin "createdb.exe") -h 127.0.0.1 -p $port -U postgres 3s_design
}

Write-Host "3S Design dev database is running on 127.0.0.1:$port"
