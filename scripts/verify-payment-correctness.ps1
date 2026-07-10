param(
  [switch]$RequireRunningApi
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [string]$Name,
    [string]$Command
  )

  Write-Host ""
  Write-Host "==> $Name"
  Invoke-Expression $Command
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Invoke-Step "Pinned runtime" "corepack pnpm runtime:check:strict"
Invoke-Step "API typecheck" "corepack pnpm --filter @3s-design/api typecheck"
Invoke-Step "API policy tests" "corepack pnpm --filter @3s-design/api test"

if ($RequireRunningApi) {
  Invoke-Step "Local API ownership" "corepack pnpm dev:api:verify-running"
  Invoke-Step "Checkout regression" "corepack pnpm --filter @3s-design/api test:checkout"
  Invoke-Step "Sales payment regression" "corepack pnpm --filter @3s-design/api test:sales-flow"
  Invoke-Step "Admin payment regression" "corepack pnpm --filter @3s-design/api test:admin-flow"
}

Write-Host ""
Write-Host "Payment correctness gate passed."
