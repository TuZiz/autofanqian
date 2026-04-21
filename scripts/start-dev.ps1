param(
  [switch]$SkipDevServer
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Get-EnvValue($path, $key) {
  $line = Get-Content $path | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $value = ($line -replace "^\s*$key\s*=\s*", "").Trim()
  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    return $value.Substring(1, $value.Length - 2)
  }

  return $value
}

function Ensure-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $name"
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"
$envExampleFile = Join-Path $projectRoot ".env.example"

Write-Step "Checking runtime"
Ensure-Command "node"
Ensure-Command "npm"

if (-not (Test-Path $envFile)) {
  if (-not (Test-Path $envExampleFile)) {
    throw "Missing .env and .env.example"
  }

  Copy-Item $envExampleFile $envFile
  Write-Host "Created .env from .env.example. Please verify database and mail settings." -ForegroundColor Yellow
}

if (-not (Test-Path (Join-Path $projectRoot "node_modules"))) {
  Write-Step "Installing dependencies"
  npm install
}

$databaseUrl = Get-EnvValue $envFile "DATABASE_URL"
if (-not $databaseUrl) {
  throw "DATABASE_URL is missing in .env"
}

$databaseUri = [System.Uri]::new($databaseUrl)
$databaseName = $databaseUri.AbsolutePath.TrimStart("/")
if ([string]::IsNullOrWhiteSpace($databaseName)) {
  throw "Could not parse database name from DATABASE_URL"
}

$adminDatabaseUrl = [System.Text.RegularExpressions.Regex]::Replace(
  $databaseUrl,
  "/$([System.Text.RegularExpressions.Regex]::Escape($databaseName))(\?|$)",
  "/postgres`$1"
)

Write-Step "Checking PostgreSQL connection"
try {
  $test = Test-NetConnection -ComputerName $databaseUri.Host -Port $databaseUri.Port -WarningAction SilentlyContinue
  if (-not $test.TcpTestSucceeded) {
    throw "Database port is not reachable: $($databaseUri.Host):$($databaseUri.Port)"
  }
} catch {
  throw "Could not connect to PostgreSQL. Start the database first and try again."
}

Write-Step "Ensuring target database exists"
$env:ADMIN_DATABASE_URL = $adminDatabaseUrl
$env:TARGET_DATABASE = $databaseName
@'
const { Client } = require("pg");

const adminDatabaseUrl = process.env.ADMIN_DATABASE_URL;
const targetDatabase = process.env.TARGET_DATABASE;

async function main() {
  const client = new Client({ connectionString: adminDatabaseUrl });
  await client.connect();

  const result = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [targetDatabase]
  );

  if (result.rowCount === 0) {
    const safeName = `"${targetDatabase.replace(/"/g, "\"\"")}"`;
    await client.query(`CREATE DATABASE ${safeName}`);
    console.log(`Database created: ${targetDatabase}`);
  } else {
    console.log(`Database already exists: ${targetDatabase}`);
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@ | node -
Remove-Item Env:ADMIN_DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:TARGET_DATABASE -ErrorAction SilentlyContinue

Write-Step "Applying database migrations"
npx prisma migrate deploy

if ($SkipDevServer) {
  Write-Step "Preflight complete"
  Write-Host "Dependencies, database, and migrations are ready." -ForegroundColor Green
  exit 0
}

Write-Step "Starting development server"
Write-Host "Open http://localhost:3000 after startup." -ForegroundColor Green
npm run dev
