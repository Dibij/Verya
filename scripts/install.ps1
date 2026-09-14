# Verya Windows Installer
# Installs Verya to %LOCALAPPDATA%\Programs\Verya without requiring administrator privileges.
# Configures User PATH so 'verya' is immediately accessible from PowerShell, CMD, Windows Terminal, etc.

$ErrorActionPreference = "Stop"

$AppName = "Verya"
$Repo = "Dibij/Verya"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\$AppName"
$BinDir = $InstallDir

Write-Host @"

 __   _____ ____  _   _   _   
 \ \ / / __| __ )\ \ / / /_\  
  \ V /| _||    \ \ V / / _ \ 
   \_/ |___|_||_|  |_| /_/ \_\

 Installing Verya — Visual editing for real code...

"@ -ForegroundColor Cyan

# Check for Node.js
$nodeInstalled = $false
try {
    $nodeVer = & node --version 2>$null
    if ($nodeVer) {
        $nodeInstalled = $true
        Write-Host "✓ Node.js detected: $nodeVer" -ForegroundColor Green
    }
} catch {}

if (-not $nodeInstalled) {
    Write-Host "⚠ Node.js was not detected in PATH. Verya requires Node.js (v18+) to run preview runtimes." -ForegroundColor Yellow
    Write-Host "  Please install Node.js from https://nodejs.org if you haven't already.`n" -ForegroundColor Gray
}

# Create installation directory
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "Installing to: $InstallDir" -ForegroundColor Gray

# If running locally from repository:
$RepoRoot = Split-Path -Parent $PSScriptRoot
if ((Test-Path (Join-Path $RepoRoot "package.json")) -and (Test-Path (Join-Path $RepoRoot "packages"))) {
    Write-Host "Copying Verya files from local build..." -ForegroundColor Gray
    Copy-Item -Path (Join-Path $RepoRoot "package.json") -Destination $InstallDir -Force
    Copy-Item -Path (Join-Path $RepoRoot "tsconfig.base.json") -Destination $InstallDir -Force
    Copy-Item -Path (Join-Path $RepoRoot "node_modules") -Destination $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $RepoRoot "packages") -Destination $InstallDir -Recurse -Force
} else {
    # Downloading release bundle from GitHub Releases
    Write-Host "Fetching latest release archive from GitHub ($Repo)..." -ForegroundColor Gray
    $zipUrl = "https://github.com/$Repo/releases/latest/download/verya-windows-x64.zip"
    $tempZip = Join-Path $env:TEMP "verya-windows-x64.zip"
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip -UseBasicParsing
        Expand-Archive -Path $tempZip -DestinationPath $InstallDir -Force
        Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "⚠ Could not download release zip ($zipUrl). Falling back to git clone..." -ForegroundColor Yellow
        git clone https://github.com/$Repo.git $InstallDir --depth 1
        Push-Location $InstallDir
        npm install --omit=dev
        npm run build
        Pop-Location
    }
}

# Ensure production dependencies exist in installation directory
$cliCommander = Join-Path $InstallDir "node_modules\commander"
if (-not (Test-Path $cliCommander)) {
    Write-Host "Installing production dependencies in $InstallDir..." -ForegroundColor Gray
    Push-Location $InstallDir
    npm install --omit=dev
    Pop-Location
}

# Create verya.cmd runner in InstallDir
$cmdRunner = Join-Path $BinDir "verya.cmd"
$cmdContent = @"
@echo off
if not exist "%~dp0\node_modules\commander" (
  echo [Verya] Installing dependencies...
  call npm install --omit=dev --prefix "%~dp0"
)
node "%~dp0\packages\cli\dist\index.js" %*
"@
Set-Content -Path $cmdRunner -Value $cmdContent -Encoding ASCII

# Create verya.ps1 runner in InstallDir
$ps1Runner = Join-Path $BinDir "verya.ps1"
$ps1Content = @"
if (-not (Test-Path "`$PSScriptRoot\node_modules\commander")) {
  Write-Host "[Verya] Installing dependencies..." -ForegroundColor Cyan
  npm install --omit=dev --prefix "`$PSScriptRoot"
}
& node "`$PSScriptRoot\packages\cli\dist\index.js" @args
"@
Set-Content -Path $ps1Runner -Value $ps1Content -Encoding UTF8

# Add to User PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathEntries = $userPath -split ';' | Where-Object { $_ -ne "" }

if ($pathEntries -notcontains $BinDir) {
    Write-Host "Configuring User PATH..." -ForegroundColor Gray
    $newPath = ($pathEntries + $BinDir) -join ';'
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = "$env:Path;$BinDir"
    Write-Host "✓ Added '$BinDir' to User PATH" -ForegroundColor Green
} else {
    Write-Host "✓ User PATH already contains '$BinDir'" -ForegroundColor Green
}

Write-Host @"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✔ Verya installation complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To get started:
1. Open a new terminal window (PowerShell, Command Prompt, or Windows Terminal)
2. Navigate to your React project:
   cd path\to\my-react-app
3. Run:
   verya

"@ -ForegroundColor Cyan
