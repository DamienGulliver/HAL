# Edge Voice Assistant - Jetson Nano

*NOTE: Edge implementation is still under development, and may not work. Memory constraints seem to be causing issues currently. At present, only the face/audio detection python script can be run*

Edge device implementation of the voice assistant, optimized for the NVIDIA Jetson Nano. This version includes face detection capabilities alongside voice interaction.

## Features
- 👤 Real-time face detection
- 🎤 Voice interaction
- 🔄 Bi-directional audio streaming
- 🎯 Low-latency responses
- 🤖 Edge-optimized processing

## Prerequisites

### Hardware Requirements
- NVIDIA Jetson Nano Developer Kit
- USB camera
- USB microphone or audio interface
- MicroSD card (minimum 32GB, Class 10/UHS-1 or better)
- Power supply (5V 4A DC barrel jack recommended)

## Installation

### 1. System Image Setup
1. Download the pre-configured SD card image from [Q-Engineering](https://github.com/Qengineering/Jetson-Nano-image)
   - This image comes with pre-installed deep learning packages and CUDA support

2. Flash the image to your microSD card:
   - Use [balenaEtcher](https://www.balena.io/etcher/)

3. Insert the SD card into your Nano and power it on

4. First boot setup:
   - Login credentials:
     ```
     username: nano
     password: nano
     ```
   - Follow the initial setup wizard
   - Connect to your network

### 2. Project Setup

1. Clone the repository:
```bash
git clone https://github.com/DamienGulliver/HAL
cd HAL/nano
```

2. Install Node.js for ARM64:
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version
```

3. Install system dependencies:
```bash
sudo apt-get update
sudo apt-get install -y sox libsox-fmt-all alsa-utils libasound2-dev portaudio19-dev
```

4. Install npm dependencies:
```bash
npm install
```

5. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
nano .env
```

## Running the Assistant

1. Test audio setup:
```bash
# List audio devices
arecord -l
aplay -l

# Test recording
arecord -d 5 test.wav
# Test playback
aplay test.wav
```

2. Start the assistant:
```bash
python3 src/face_detection_piped.py
```

## Performance Optimization

The Q-Engineering image comes with several optimizations, but you can further tune the system:

1. Enable maximum performance mode:
```bash
sudo nvpmodel -m 0
sudo jetson_clocks
```

2. Monitor system performance:
```bash
jtop
```

3. Check camera frame rate:
```bash
v4l2-ctl --list-formats-ext
```

## Troubleshooting

### Common Issues

1. **Camera not detected**:
```bash
# Check camera connection
ls /dev/video*
# Test camera
nvgstcapture-1.0
```

2. **Audio issues**:
```bash
# Add user to audio group
sudo usermod -a -G audio $USER
# Log out and back in

# Check audio devices
arecord -l
```

3. **Performance issues**:
```bash
# Check CPU/GPU throttling
sudo jetson_clocks --show

# Monitor temperatures
tegrastats
```

### Error Messages

| Error | Solution |
|-------|----------|
| `Cannot open camera` | Check USB connection and permissions |
| `ALSA error` | Verify audio device configuration |
| `CUDA out of memory` | Reduce batch size or image resolution |
| `ImportError: No module named 'cv2'` | Reinstall OpenCV: `pip3 install opencv-python` |

## Development Notes

- The face detection model is optimized for Jetson Nano's CUDA cores
- Audio processing is tuned for minimal latency
- The system automatically adjusts processing based on available resources

### Important Files
```
nano/
├── src/
│   ├── face_detection.py           # Base face detection with audio
│   └── face_detection_piped.py     # Face detection with audio sent to a pipe
├── requirements.txt                # Python dependencies
├── package.json                    # Node.js dependencies
└── .env                           # Environment variables
```

## Contributing
Please read [CONTRIBUTING.md](../docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.