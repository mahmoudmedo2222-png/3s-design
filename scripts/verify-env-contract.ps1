param(
  [ValidateSet("local", "staging", "production")]
  [string]$Environment = "staging",
  [string]$EnvFile = "",
  [ValidateSet("", "paypal", "paymob", "fawry")]
  [string]$Provider = "paymob",
  [switch]$RequireR2,
  [switch]$RequireOpenAI,
  [switch]$AllowPlaceholders
)

$ErrorActionPreference = "Stop"

if (!$EnvFile) {
  $EnvFile = if ($Environment -eq "production") { ".env.production" } elseif ($Environment -eq "staging") { ".env.staging" } else { ".env" }
}

function Read-EnvFile {
  param([string]$Path)

  if (!(Test-Path -LiteralPath $Path)) {
    throw "Environment file not found: $Path"
  }

  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (!$trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    $separator = $trimmed.IndexOf("=")
    if ($separator -lt 1) {
      continue
    }

    $name = $trimmed.Substring(0, $separator).Trim()
    $value = $trimmed.Substring($separator + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $values[$name] = $value
  }

  return $values
}

function Test-IsMissing {
  param($Values, [string]$Name)

  return !$Values.ContainsKey($Name) -or [string]::IsNullOrWhiteSpace([string]$Values[$Name])
}

function Test-IsPlaceholder {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $true
  }

  $lower = $Value.ToLowerInvariant()
  return $lower.Contains("change-me") -or
    $lower.Contains("change-this") -or
    $lower.Contains("yourdomain") -or
    $lower.Contains("your_github_owner") -or
    $lower.Contains("your_repo") -or
    $lower -eq "admin@example.com" -or
    $lower -eq "admin@yourdomain.com"
}

function Add-Required {
  param([string[]]$List, [string[]]$Items)
  return @($List + $Items | Select-Object -Unique)
}

$values = Read-EnvFile -Path $EnvFile
$required = @(
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_ACCESS_TTL",
  "JWT_REFRESH_TTL_DAYS",
  "PAYMENT_PENDING_EXPIRY_MINUTES",
  "PAYMENT_PENDING_EXPIRY_MINUTES_MANUAL"
)

if ($Environment -ne "local") {
  $required = Add-Required $required @("APP_ENV")
}

if ($RequireOpenAI) {
  $required = Add-Required $required @("OPENAI_API_KEY", "OPENAI_AI_DISCOVERY_MODEL")
}

if ($RequireR2) {
  $required = Add-Required $required @(
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_BASE_URL",
    "R2_SIGNED_UPLOAD_TTL_SECONDS",
    "R2_SIGNED_DOWNLOAD_TTL_SECONDS",
    "R2_REQUIRE_UPLOAD_CHECKSUM"
  )
}

if ($Provider -eq "paymob") {
  $required = Add-Required $required @(
    "PAYMOB_API_KEY",
    "PAYMOB_API_BASE_URL",
    "PAYMOB_INTEGRATION_ID_CARD",
    "PAYMOB_IFRAME_ID",
    "PAYMOB_HMAC_SECRET",
    "PAYMOB_PAYMENT_KEY_TTL_SECONDS"
  )
} elseif ($Provider -eq "paypal") {
  $required = Add-Required $required @("PAYPAL_CHECKOUT_URL_TEMPLATE", "PAYMENT_WEBHOOK_SECRET_PAYPAL")
} elseif ($Provider -eq "fawry") {
  $required = Add-Required $required @("FAWRY_CHECKOUT_URL_TEMPLATE", "PAYMENT_WEBHOOK_SECRET_FAWRY")
}

if ($Environment -eq "production") {
  $required = Add-Required $required @(
    "APP_DOMAIN",
    "ACME_EMAIL",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "REDIS_URL",
    "REGISTRY_IMAGE_API",
    "REGISTRY_IMAGE_WEB",
    "R2_REQUIRE_UPLOAD_CHECKSUM"
  )
}

$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

foreach ($name in $required) {
  if (Test-IsMissing $values $name) {
    $errors.Add("Missing required variable: $name")
    continue
  }

  if (!$AllowPlaceholders -and (Test-IsPlaceholder ([string]$values[$name]))) {
    $errors.Add("Placeholder value is not allowed for: $name")
  }
}

if ($values.ContainsKey("JWT_ACCESS_SECRET")) {
  $jwtSecret = [string]$values["JWT_ACCESS_SECRET"]
  if ($Environment -ne "local" -and $jwtSecret.Length -lt 48) {
    $errors.Add("JWT_ACCESS_SECRET must be at least 48 characters outside local development.")
  }
}

if ($RequireR2 -and $values.ContainsKey("R2_REQUIRE_UPLOAD_CHECKSUM") -and $Environment -ne "local") {
  if ([string]$values["R2_REQUIRE_UPLOAD_CHECKSUM"] -ne "true") {
    $errors.Add("R2_REQUIRE_UPLOAD_CHECKSUM must be true for staging/production.")
  }
}

foreach ($ttlName in @("R2_SIGNED_UPLOAD_TTL_SECONDS", "R2_SIGNED_DOWNLOAD_TTL_SECONDS", "PAYMOB_PAYMENT_KEY_TTL_SECONDS")) {
  if ($values.ContainsKey($ttlName)) {
    $parsedTtl = 0
    if (!([int]::TryParse([string]$values[$ttlName], [ref]$parsedTtl))) {
      $errors.Add("$ttlName must be an integer number of seconds.")
    }
  }
}

if ($values.ContainsKey("APP_ENV") -and $Environment -ne "local") {
  $appEnv = ([string]$values["APP_ENV"]).ToLowerInvariant()
  if ($appEnv -ne $Environment) {
    $warnings.Add("APP_ENV is '$appEnv' but target environment is '$Environment'.")
  }
}

Write-Host "Environment contract check"
Write-Host "Target: $Environment"
Write-Host "File: $EnvFile"
Write-Host "Provider: $(if ($Provider) { $Provider } else { 'none' })"
Write-Host "R2 required: $RequireR2"
Write-Host "OpenAI required: $RequireOpenAI"

if ($warnings.Count -gt 0) {
  Write-Host ""
  Write-Host "Warnings:"
  foreach ($warning in $warnings) {
    Write-Host "- $warning"
  }
}

if ($errors.Count -gt 0) {
  Write-Host ""
  Write-Host "Blockers:"
  foreach ($errorItem in $errors) {
    Write-Host "- $errorItem"
  }
  throw "Environment contract check failed with $($errors.Count) blocker(s)."
}

Write-Host ""
Write-Host "Environment contract check passed."
