param(
  [Parameter(Mandatory = $true)]
  [string]$Command
)

$ErrorActionPreference = 'Stop'

function Get-NodeMajor([string]$NodeExe) {
  $version = & $NodeExe -v
  if ($LASTEXITCODE -ne 0) {
    throw "Could not execute Node at $NodeExe"
  }

  return [int]($version.TrimStart('v').Split('.')[0])
}

$activeNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$activeNode = $null
if ($activeNodeCommand) {
  $activeNode = $activeNodeCommand.Source
}
if ($activeNode -and (Get-NodeMajor $activeNode) -eq 22) {
  Write-Host "Using active Node: $(& $activeNode -v)"
  Invoke-Expression $Command
  exit $LASTEXITCODE
}

$pnpmCache = Join-Path $env:LOCALAPPDATA 'pnpm-cache\dlx'
$cachedNode22 = $null
if (Test-Path -LiteralPath $pnpmCache) {
  $cachedNode22 = Get-ChildItem -Path $pnpmCache -Recurse -Filter node.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like '*node@22*' -and $_.FullName -like '*\bin\node.exe' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

if (-not $cachedNode22) {
  Write-Error "Node 22 was not found. Install/use Node 22 first, then rerun: nvm use 22, fnm use 22, or pnpm dlx node@22 node -v"
  exit 1
}

$node22Bin = Split-Path $cachedNode22.FullName
$env:PATH = "$node22Bin;$env:PATH"

Write-Host "Using cached Node: $(& node -v)"
Invoke-Expression $Command
exit $LASTEXITCODE
