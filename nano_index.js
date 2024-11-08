import WebSocket from 'ws';
import dotenv from 'dotenv';
import fs from 'fs';
import { spawn } from 'child_process';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is missing from .env file');
    process.exit(1);
}

let isRecording = false;
let recordingStream = null;
let sessionConfigured = false;
let responseBuffer = Buffer.alloc(0);
let isResponseInProgress = false;
let isCurrentlyPlaying = false;

function playCompleteResponse() {
    if (responseBuffer.length === 0 || isCurrentlyPlaying) return;
    
    isCurrentlyPlaying = true;
    console.log('Starting audio playback...');
    
    // Save buffer to temporary file
    const tempFile = `/tmp/response_${Date.now()}.raw`;
    fs.writeFileSync(tempFile, responseBuffer);
    
    // Play using aplay
    const aplay = spawn('aplay', [
        '-f', 'S16_LE',    // Format: 16-bit signed little-endian
        '-r', '24000',     // Sample rate: 24kHz
        '-c', '1',         // Channels: mono
        tempFile
    ]);
    
    aplay.stdout.on('data', (data) => {
        console.log(`aplay stdout: ${data}`);
    });

    aplay.stderr.on('data', (data) => {
        console.error(`aplay stderr: ${data}`);
    });
    
    aplay.on('close', (code) => {
        console.log(`Finished playing audio (exit code: ${code})`);
        // Clean up
        fs.unlinkSync(tempFile);
        responseBuffer = Buffer.alloc(0);
        isResponseInProgress = false;
        isCurrentlyPlaying = false;
        
        // Resume recording after a short delay
        setTimeout(() => {
            if (sessionConfigured) {
                startRecording();
            }
        }, 1000);
    });
}

function startRecording() {
    if (isRecording || isResponseInProgress || isCurrentlyPlaying) return;
    
    console.log('Starting microphone recording...');
    isRecording = true;

    try {
        // Open FIFO for reading
        const audioPath = '/tmp/audio_pipe';
        console.log(`Opening FIFO at ${audioPath}`);
        
        if (!fs.existsSync(audioPath)) {
            console.error('FIFO does not exist at', audioPath);
            return;
        }

        const fifoStream = fs.createReadStream(audioPath);
        
        fifoStream.on('data', (data) => {
            if (ws.readyState === WebSocket.OPEN && !isResponseInProgress && !isCurrentlyPlaying) {
                ws.send(JSON.stringify({
                    type: 'input_audio_buffer.append',
                    audio: data.toString('base64')
                }));
            }
        });

        fifoStream.on('error', (err) => {
            console.error('FIFO reading error:', err);
            stopRecording();
        });

        recordingStream = fifoStream;

    } catch (error) {
        console.error('Failed to start recording:', error);
        isRecording = false;
    }
}

function stopRecording() {
    if (!isRecording || !recordingStream) return;
    
    console.log('Stopping microphone recording...');
    isRecording = false;
    
    try {
        recordingStream.destroy();
        recordingStream = null;
    } catch (error) {
        console.error('Error stopping recording:', error);
    }
}

const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
    headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
    }
});

ws.on('open', function() {
    console.log('Connected to OpenAI');
    
    ws.send(JSON.stringify({
        type: "session.update",
        session: {
            modalities: ["text", "audio"],
            instructions: "Your knowledge cutoff is 2023-10. You are a helpful assistant.",
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
                model: "whisper-1"
            },
            turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500
            },
            temperature: 0.8,
            max_response_output_tokens: "inf"
        }
    }));
});

ws.on('message', function(data) {
    try {
        const event = JSON.parse(data.toString());
        console.log('Received event:', event);
        
        switch (event.type) {
            case 'session.updated':
                if (!sessionConfigured) {
                    sessionConfigured = true;
                    console.log('Session configured. Starting recording...');
                    startRecording();
                }
                break;

            case 'input_audio_buffer.speech_started':
                if (!isResponseInProgress && !isCurrentlyPlaying) {
                    console.log('Speech detected');
                }
                break;

            case 'input_audio_buffer.speech_stopped':
                if (!isResponseInProgress && !isCurrentlyPlaying) {
                    console.log('Speech ended');
                    stopRecording();
                    
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'input_audio_buffer.commit'
                        }));
                        ws.send(JSON.stringify({
                            type: 'response.create'
                        }));
                    }
                }
                break;

            case 'response.created':
                isResponseInProgress = true;
                stopRecording();
                responseBuffer = Buffer.alloc(0);
                break;

            case 'response.audio.delta':
                if (event.delta && isResponseInProgress) {
                    const chunk = Buffer.from(event.delta, 'base64');
                    responseBuffer = Buffer.concat([responseBuffer, chunk]);
                }
                break;

            case 'response.audio.done':
                if (!isCurrentlyPlaying) {
                    console.log('All audio received, playing response...');
                    playCompleteResponse();
                }
                break;

            case 'response.done':
                console.log('Server response complete, waiting for audio playback to finish...');
                break;

            case 'response.audio_transcript.delta':
                if (event.delta) {
                    process.stdout.write(event.delta);
                }
                break;

            case 'conversation.item.created':
                if (event.item.role === 'assistant') {
                    console.log('\nAssistant response:', event.item.content);
                }
                break;

            case 'error':
                if (event.error.message.includes('buffer too small')) {
                    console.log('Ignoring buffer size warning - continuing to record...');
                } else {
                    console.error('Error event:', event.error);
                }
                break;
        }
    } catch (error) {
        console.error('Error parsing message:', error);
    }
});

ws.on('error', function(error) {
    console.error('WebSocket error:', error);
    stopRecording();
    isResponseInProgress = false;
    isCurrentlyPlaying = false;
    responseBuffer = Buffer.alloc(0);
});

ws.on('close', function() {
    console.log('Connection closed');
    stopRecording();
    isResponseInProgress = false;
    isCurrentlyPlaying = false;
    responseBuffer = Buffer.alloc(0);
});

process.on('SIGINT', () => {
    console.log('Shutting down...');
    stopRecording();
    isResponseInProgress = false;
    isCurrentlyPlaying = false;
    responseBuffer = Buffer.alloc(0);
    ws.close();
    process.exit(0);
});
