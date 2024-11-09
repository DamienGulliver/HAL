#!/bin/bash

# Store the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Store the project root directory (one level up from scripts)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Print fancy header
echo "=================================="
echo "Edge AI Assistant - Linux Setup"
echo "=================================="
echo

# Check if script is run with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run script as root or with sudo"
    exit 1
fi

# Store the real user who ran sudo
REAL_USER=${SUDO_USER:-$(whoami)}
USER_HOME=$(eval echo ~$REAL_USER)

# Ensure we're starting from the project root
cd "$PROJECT_ROOT"

# Check directory structure
if [ ! -d "pc" ]; then
    echo "Error: Invalid project structure. Are you in the correct directory?"
    exit 1
fi

# Detect distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VERSION=$VERSION_ID
else
    echo "Cannot detect Linux distribution"
    exit 1
fi

echo "Detected: $OS $VERSION"
echo

# Function to install Node.js
install_node() {
    echo "Installing Node.js..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        apt-get install -y nodejs
        echo "✓ Node.js installed ($(node --version))"
    else
        echo "✓ Node.js already installed ($(node --version))"
    fi
}

# Function to install audio dependencies
install_audio_deps() {
    echo "Installing audio dependencies..."
    apt-get install -y sox libsox-fmt-all alsa-utils libasound2-dev
    echo "✓ Audio dependencies installed"
}

# Update package list
echo "Updating package list..."
apt-get update

# Install curl if not present
if ! command -v curl &> /dev/null; then
    echo "Installing curl..."
    apt-get install -y curl
fi

# Install dependencies based on distribution
case "$OS" in
    "Ubuntu"|"Debian GNU/Linux")
        # Install build essentials
        echo "Installing build essentials..."
        apt-get install -y build-essential python3
        
        # Install Node.js
        install_node
        
        # Install audio dependencies
        install_audio_deps
        ;;
    *)
        echo "Unsupported distribution: $OS"
        echo "Please install the following packages manually:"
        echo "- Node.js 18 or higher"
        echo "- Sox and Sox formats"
        echo "- ALSA utils and development files"
        exit 1
        ;;
esac

# Set up audio permissions
echo
echo "Setting up audio permissions..."
usermod -a -G audio $REAL_USER
echo "✓ Added user to audio group"

# Install Node.js dependencies
echo
echo "Installing Node.js dependencies..."
cd "$PROJECT_ROOT/pc/src"
sudo -u $REAL_USER npm install
echo "✓ Node.js dependencies installed"

# Create .env file if it doesn't exist
echo
if [ ! -f .env ] && [ -f .env.example ]; then
    echo "Creating .env file from template..."
    sudo -u $REAL_USER cp .env.example .env
    echo "✓ .env file created in pc/src directory"
elif [ ! -f .env ]; then
    echo "Creating .env file..."
    sudo -u $REAL_USER bash -c 'echo "OPENAI_API_KEY=your_api_key_here" > .env'
    echo "✓ .env file created in pc/src directory"
else
    echo "✓ .env file exists (checking if OPENAI_API_KEY is set)"
    if grep -q "OPENAI_API_KEY=your_api_key_here" .env; then
        echo "  ⚠️  Warning: OPENAI_API_KEY is still set to default value"
    elif ! grep -q "OPENAI_API_KEY=" .env; then
        echo "  ⚠️