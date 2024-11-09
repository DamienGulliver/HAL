# HAL: Multimodal Voice Assistant

An AI-powered voice assistant inspired by HAL-9000 (2001, A Space Odyssey). The system runs on both personal computers (Mac/Windows/Linux) and edge devices (Jetson Nano, in development). The OpenAI Realtime API (currently in preview) is used to allow low-latency voice conversations with GPT-4o. When run on a Jetson Nano connected with a USB camera and microphone, the system combines real-time conversational abilities with face detection and audio processing. 

The eventual aim is to build a home assistant module (that looks and sounds like HAL-9000) with real-time conversational abilities, facial detection & recognition, audio and scent detection. This project is at a very early stage, under active development and may (will) break often.

If you would like to build a replica of the HAL-9000 interface, 3D printed components can be found here:
 - https://www.thingiverse.com/thing:1805762

If you are interested in developing scent detection capability, the Bosch BME688 development kit could be a good starting point:
 - https://www.sparkfun.com/products/19630

<div align="center">
  <img src="assets/hal9000.jpg" width="600" height="400" alt="HAL 9000">
</div>

## Overview

This project provides two implementations:
- **PC Version**: Full-featured voice assistant with real-time audio processing
- **Jetson Nano Version**: Edge-optimized implementation with face detection and audio capabilities

### Features
- 🎤 Real-time voice interaction
- 👤 Face detection and tracking (only on Jetson Nano currently)
- 🔄 Bi-directional audio streaming
- 🎯 Low-latency responses
- 🖥️ Cross-platform support (Mac, Windows, Linux)
- 🤖 Edge device support (Jetson Nano)

## Quickstart (Mac OS only for now)
```bash
# clone this repo
git clone https://github.com/DamienGulliver/HAL.git

# Change directory
cd HAL

# Make setup script executable
chmod +x scripts/setup_mac.sh

# Run setup (and read the instructions printed to the terminal)
./scripts/setup_mac.sh

# Start the assistant
cd pc/src/
node index.js
```

## Installation

For detailed setup instructions, please refer to:
- PC Setup: See [pc/README.md](pc/README.md)
- Jetson Nano Setup: See [nano/README.md](nano/README.md)

## Requirements

### PC Requirements
- Node.js 18.0 or higher
- OpenAI API key (and credit on your billing account)
- Microphone and speakers
- For Windows: Sox audio processor
- For Linux: ALSA development files

### Jetson Nano Requirements
- SD card flashed with QEngineering Deep Learning image
- OpenAI API key (and credit on your billing account)
- USB camera
- Microphone and speakers

## Detailed Documentation
- [PC Setup Guide](pc/README.md)
- [Jetson Nano Setup Guide](nano/README.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)
- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [Setting up Jetson Nano SD Card](https://github.com/Qengineering/Jetson-Nano-image)

## Project Structure
```
📁 HAL/
├── 📁 pc/                  # PC implementation
├── 📁 nano/                # Jetson Nano implementation
└── 📁 scripts/             # Setup scripts for each platform
└── 📁 docs/                # Documentation
```
See the README files in each directory for platform-specific details.

## System Architecture
The assistant uses:
- OpenAI's Realtime API for real-time conversations with GPT-4o
- Custom face detection algorithms optimized for edge devices
- Cross-platform audio processing pipelines
- Bi-directional audio streaming with low latency

## Contributing
Contributions are welcome! Please read our [Contributing Guidelines](docs/CONTRIBUTING.md) before submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- OpenAI for their Realtime API
- NVIDIA for Jetson Nano support
- [Q-Engineering](https://qengineering.eu) for their Jetson Nano Deep Learning image
- [CONCENTRIX](https://www.thingiverse.com/concentrix/designs) for their HAL-9000 3D print files
- Contributors and maintainers

## Support
For support:
- [Create an issue](https://github.com/DamienGulliver/HAL/issues)