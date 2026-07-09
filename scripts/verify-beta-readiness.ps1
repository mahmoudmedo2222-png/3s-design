param(
  [string]$ApiBaseUrl = "http://localhost:4000/api",
  [ValidateSet("", "paypal", "paymob", "fawry")]
  [string]$Provider = "",
  [switch]$AllowManualOnly
)

$ErrorActionPreference = "Stop"

$readinessUrl = "$ApiBaseUrl/health/beta-readiness"

try {
  $readiness = Invoke-RestMethod -Method Get -Uri $readinessUrl -TimeoutSec 15
} catch {
  Write-Error "Beta readiness check could not reach $readinessUrl. Start the API and try again. $($_.Exception.Message)"
}

Write-Host "Beta readiness"
Write-Host "API: $ApiBaseUrl"
Write-Host "Database configured: $($readiness.databaseConfigured)"
Write-Host "Provider checkout ready: $($readiness.providerCheckoutReady)"
Write-Host "Overall ok: $($readiness.ok)"
if ($Provider) {
  Write-Host "Target provider: $Provider"
}

if ($readiness.paymentProviders) {
  Write-Host ""
  Write-Host "Payment providers:"
  foreach ($paymentProvider in $readiness.paymentProviders) {
    $state = if ($paymentProvider.configured) { "ready" } else { "blocked" }
    Write-Host "- $($paymentProvider.provider): $state / $($paymentProvider.mode)"
    if ($paymentProvider.blocking -and $paymentProvider.blocking.Count -gt 0) {
      Write-Host "  blocking: $($paymentProvider.blocking -join ', ')"
    }
    if ($paymentProvider.nextAction) {
      Write-Host "  next: $($paymentProvider.nextAction)"
    }
  }
}

if ($readiness.blockers -and $readiness.blockers.Count -gt 0) {
  Write-Host ""
  Write-Host "Blockers:"
  foreach ($blocker in $readiness.blockers) {
    Write-Host "- $($blocker.provider): $($blocker.nextAction)"
  }
}

if (!$readiness.databaseConfigured) {
  Write-Error "Beta readiness failed: DATABASE_URL is not configured."
}

if ($Provider) {
  $targetProvider = $readiness.paymentProviders | Where-Object { $_.provider -eq $Provider } | Select-Object -First 1
  if (!$targetProvider) {
    Write-Error "Beta readiness failed: target provider '$Provider' was not returned by the API."
  }

  if (!$targetProvider.configured -and !$AllowManualOnly) {
    $missing = if ($targetProvider.blocking -and $targetProvider.blocking.Count -gt 0) { $targetProvider.blocking -join ', ' } else { "required provider settings" }
    Write-Error "Beta readiness failed: $Provider checkout is not configured. Missing: $missing"
  }

  if ($targetProvider.configured) {
    Write-Host ""
    Write-Host "$Provider checkout is configured for sandbox/live verification."
  }
}

if (!$readiness.providerCheckoutReady -and !$AllowManualOnly) {
  Write-Error "Beta readiness failed: no provider checkout is configured. Add Paymob sandbox credentials or run with -AllowManualOnly for manual-flow demos."
}

if (!$readiness.ok -and !$AllowManualOnly) {
  Write-Error "Beta readiness failed: /health/beta-readiness returned ok=false."
}

if ($AllowManualOnly -and !$readiness.providerCheckoutReady) {
  Write-Host ""
  Write-Host "Manual-only mode accepted. This is not enough for paid beta; use it only for controlled demos."
}

Write-Host ""
Write-Host "Beta readiness check passed."
