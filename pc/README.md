# PC Voice Assistant

Voice assistant using OpenAI's Realtime API for natural conversations. This implementation runs on macOS (tested), Windows (not thoroughly tested), and Linux (not thoroughly tested) systems.

## Features
- 🎤 Real-time voice input and output
- 🔄 Bi-directional audio streaming
- 🎯 Low-latency responses
- 🌐 Cross-platform support

## Prerequisites
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Node.js 18.0 or higher
- Platform-specific audio dependencies (see setup instructions below)

## Setup Instructions

### macOS

1. Navigate to the project root directory and run the setup script:
```bash
# Make script executable
chmod +x scripts/setup_mac.sh

# Run setup
./scripts/setup_mac.sh

# Start the assistant
cd pc/src/
node index.js
```

2. Configure permissions:
   - Open System Preferences → Security & Privacy → Privacy
   - Enable microphone access for Terminal/iTerm2

### Windows

There are two ways to set up the project on Windows:

#### Option 1: Automated Setup (Recommended)

1. Open PowerShell as Administrator:
   - Press Win + X
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. Navigate to the project directory
```powershell
cd path\to\project
```

3. Allow script execution for this session:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
```

4. Run the setup script:
```powershell
.\scripts\setup_windows.ps1
```

5. Restart your terminal after installation completes

#### Option 2: Manual Setup

If you prefer to install components manually:

1. Install [Node.js](https://nodejs.org/) (v18 or higher)

2. Install [Chocolatey](https://chocolatey.org/install) package manager:
   - Open PowerShell as Administrator
   - Run the following command:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

3. Install SoX audio processor:
```powershell
choco install sox.portable
```

4. Install Windows Build Tools:
```powershell
npm install --global --production windows-build-tools
```

5. Install project dependencies:
```powershell
cd path\to\project\pc
npm install
```

### Linux (Ubuntu/Debian)

1. Navigate to the project root directory and run the setup script:
```bash
# Make script executable
chmod +x scripts/setup_linux.sh

# Run setup with sudo
sudo ./scripts/setup_linux.sh
```

2. Log out and back in for audio group changes to take effect

3. Test audio setup:
```bash
# Test recording
arecord -d 5 test.wav
# Test playback
aplay test.wav
```

## Configuration

The setup scripts will create a .env file in the src directory. If you need to configure it manually:

1. Create a .env file in the src directory:
```bash
# From the src directory
cp .env.example .env
```

2. Add your OpenAI API key to .env:
```
OPENAI_API_KEY=your_api_key_here
```

## Running the Assistant

From the project root directory:
```bash
cd pc/src && node index.js
```

## Troubleshooting

### macOS Issues
- **No audio input**: Check microphone permissions in System Preferences
- **Sox errors**: Run `brew reinstall sox`
- **PortAudio errors**: Run `brew reinstall portaudio`

### Windows Issues
- **'sox' not recognized**: 
  - Close and reopen PowerShell
  - If still not working, manually add SoX to your PATH:
    ```powershell
    $env:Path += ";C:\ProgramData\chocolatey\lib\sox.portable\tools"
    ```
- **Node.js native module errors**:
  ```powershell
  npm install -g node-gyp
  npm config set python python2.7
  npm install --global --production windows-build-tools
  ```
- **Permission errors**: Ensure PowerShell is running as Administrator

### Linux Issues
- **Audio permission denied**: 
  - Ensure you've logged out and back in after setup
  - Check group membership: `groups $USER` should show 'audio'
- **No audio devices**: Run `arecord -l` to list devices
- **Missing libraries**: Run `sudo apt-get install libasound2-dev`

## Common Errors and Solutions

| Error | Solution |
|-------|----------|
| `OPENAI_API_KEY is missing` | Add your API key to .env file |
| `Error: Command failed: sox` | Reinstall Sox using package manager |
| `Error: No such file or directory: 'rec'` | Install Sox audio processor |
| `Error: Cannot find module` | Run `npm install` again |
| `Error: not authorized` | Check microphone permissions |

## Development

### Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `DEBUG`: Set to 'true' for verbose logging (optional)

### Important Files
```
pc/
├── src/
│   └── index.js      # Main application file
│   └── .env          # Environment variables
├── package.json      # Node.js dependencies
```

## Contributing
Contributions are welcome! Please read the [Contributing Guidelines](..docs/CONTRIBUTING.md) and [Code of Conduct](..docs/CODE_OF_CONDUCT.md) before submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.