#!/bin/bash

# Store the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Store the project root directory (one level up from scripts)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Print fancy header
echo "=================================="
echo "Edge AI Assistant - Setup Script"
echo "=================================="
echo

# Ensure we're starting from the project root
cd "$PROJECT_ROOT"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "✓ Homebrew already installed ($(brew --version | head -n 1))"
fi

# Check and install Node.js
echo
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    brew install node
else
    echo "✓ Node.js already installed ($(node --version))"
    echo "  Checking for updates..."
    brew upgrade node 2>/dev/null || echo "  Already up to date"
fi

# Check and install SoX
echo
if ! command -v sox &> /dev/null; then
    echo "Installing SoX..."
    brew install sox
else
    echo "✓ SoX already installed ($(sox --version))"
    echo "  Checking for updates..."
    brew upgrade sox 2>/dev/null || echo "  Already up to date"
fi

# Check and install PortAudio
echo
if ! brew list portaudio &> /dev/null; then
    echo "Installing PortAudio..."
    brew install portaudio
else
    echo "✓ PortAudio already installed"
    echo "  Checking for updates..."
    brew upgrade portaudio 2>/dev/null || echo "  Already up to date"
fi

# Check and install pkg-config
echo
if ! command -v pkg-config &> /dev/null; then
    echo "Installing pkg-config..."
    brew install pkg-config
else
    echo "✓ pkg-config already installed ($(pkg-config --version))"
    echo "  Checking for updates..."
    brew upgrade pkg-config 2>/dev/null || echo "  Already up to date"
fi

# Install Node.js dependencies
echo
echo "Installing/Updating Node.js dependencies..."
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig"
cd "$PROJECT_ROOT/pc/src"
npm install
echo "✓ Node.js dependencies up to date"

# Create .env file if it doesn't exist
echo
if [ ! -f .env ] && [ -f .env.example ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created in pc/src directory"
elif [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "OPENAI_API_KEY=your_api_key_here" > .env
    echo "✓ .env file created in pc/src directory"
else
    echo "✓ .env file exists (checking if OPENAI_API_KEY is set)"
    if grep -q "OPENAI_API_KEY=your_api_key_here" .env; then
        echo "  ⚠️  Warning: OPENAI_API_KEY is still set to default value"
    elif ! grep -q "OPENAI_API_KEY=" .env; then
        echo "  ⚠️  Warning: OPENAI_API_KEY not found in .env"
    else
        echo "  ✓ OPENAI_API_KEY is set"
    fi
fi

# Print completion message
echo
echo "=================================="
echo "Setup check complete!"
echo "=================================="
echo
if grep -q "OPENAI_API_KEY=your_api_key_here" .env || ! grep -q "OPENAI_API_KEY=" .env; then
    echo "Required Action:"
    echo "- Edit pc/src/.env and add your OpenAI API key"
    echo
fi
echo "Recommended Steps:"
echo "1. Verify microphone permissions"
echo "   - System Preferences → Security & Privacy → Privacy"
echo "   - Enable microphone access for Terminal/iTerm2"
echo
echo "2. Run the assistant"
echo "   cd pc/src && node index.js"
echo
echo "If you encounter any issues:"
echo "- Check troubleshooting in README.md"
echo "- Open an issue on GitHub"
echo "=================================="