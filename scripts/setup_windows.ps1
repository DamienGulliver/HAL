# Requires -RunAsAdministrator

# Get script location and project root
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR

# Print fancy header
Write-Host "=================================="
Write-Host "Edge AI Assistant - Windows Setup"
Write-Host "=================================="
Write-Host ""

# Function to check if a command exists
function Test-Command($CommandName) {
    return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

# Function to check if running as Administrator
function Test-Administrator {
    $user = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    return $user.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if running as Administrator
if (-not (Test-Administrator)) {
    Write-Host "Error: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Red
    exit 1
}

# Ensure we're in the project root
Set-Location -Path $PROJECT_ROOT

# Check directory structure
if (-not (Test-Path "pc")) {
    Write-Host "Error: Invalid project structure. Are you in the correct directory?" -ForegroundColor Red
    exit 1
}

# Check for Chocolatey
if (-not (Test-Command "choco")) {
    Write-Host "Installing Chocolatey..."
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
        refreshenv
        Write-Host "✓ Chocolatey installed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Error installing Chocolatey. Please install manually from https://chocolatey.org/" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "✓ Chocolatey already installed" -ForegroundColor Green
}

# Install/Update Node.js
if (-not (Test-Command "node")) {
    Write-Host "Installing Node.js..."
    choco install nodejs -y
    refreshenv
    Write-Host "✓ Node.js installed" -ForegroundColor Green
}
else {
    $nodeVersion = (node --version)
    Write-Host "✓ Node.js already installed ($nodeVersion)" -ForegroundColor Green
    Write-Host "  Checking for updates..."
    choco upgrade nodejs -y
}

# Install/Update Sox
if (-not (Test-Command "sox")) {
    Write-Host "Installing Sox..."
    choco install sox.portable -y
    refreshenv
    Write-Host "✓ Sox installed" -ForegroundColor Green
}
else {
    $soxVersion = (sox --version)
    Write-Host "✓ Sox already installed ($soxVersion)" -ForegroundColor Green
    Write-Host "  Checking for updates..."
    choco upgrade sox.portable -y
}

# Install Windows Build Tools if needed
if (-not (Test-Command "npm")) {
    refreshenv
}
Write-Host "Installing Windows Build Tools..."
npm install --global --production windows-build-tools

# Install Node.js dependencies
Write-Host ""
Write-Host "Installing Node.js dependencies..."
Set-Location -Path "$PROJECT_ROOT\pc\src"
npm install
Write-Host "✓ Node.js dependencies installed" -ForegroundColor Green

# Create .env file if it doesn't exist
Write-Host ""
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "Creating .env file from template..."
        Copy-Item ".env.example" ".env"
        Write-Host "✓ .env file created in pc/src directory" -ForegroundColor Green
    }
    else {
        Write-Host "Creating .env file..."
        Set-Content -Path ".env" -Value "OPENAI_API_KEY=your_api_key_here"
        Write-Host "✓ .env file created in pc/src directory" -ForegroundColor Green
    }
}
else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    Write-Host "  Checking if OPENAI_API_KEY is set..."
    $envContent = Get-Content ".env"
    if ($envContent -match "OPENAI_API_KEY=your_api_key_here") {
        Write-Host "  ⚠️ Warning: OPENAI_API_KEY is still set to default value" -ForegroundColor Yellow
    }
    elseif (-not ($envContent -match "OPENAI_API_KEY=")) {
        Write-Host "  ⚠️ Warning: OPENAI_API_KEY not found in .env" -ForegroundColor Yellow
    }
    else {
        Write-Host "  ✓ OPENAI_API_KEY is set" -ForegroundColor Green
    }
}

# Return to project root
Set-Location -Path $PROJECT_ROOT

# Print completion message
Write-Host ""
Write-Host "=================================="
Write-Host "Setup check complete!"
Write-Host "=================================="
Write-Host ""

# Check if API key needs to be set
if (-not (Test-Path "pc\src\.env") -or 
    (Get-Content "pc\src\.env" | Select-String "OPENAI_API_KEY=your_api_key_here") -or 
    -not (Get-Content "pc\src\.env" | Select-String "OPENAI_API_KEY=")) {
    Write-Host "Required Action:"
    Write-Host "- Edit pc\src\.env and add your OpenAI API key"
    Write-Host ""
}

Write-Host "Recommended Steps:"
Write-Host "1. Verify microphone permissions"
Write-Host "   - Windows Settings → Privacy → Microphone"
Write-Host "   - Ensure microphone access is enabled for your terminal"
Write-Host ""
Write-Host "2. Run the assistant"
Write-Host "   cd pc\src"
Write-Host "   node index.js"
Write-Host ""
Write-Host "If you encounter any issues:"
Write-Host "- Check troubleshooting in README.md"
Write-Host "- Open an issue on GitHub"
Write-Host "=================================="

# Notify about system restart
Write-Host ""
Write-Host "Note: You may need to restart your system or"
Write-Host "at least your terminal for all changes to take effect."
Write-Host ""