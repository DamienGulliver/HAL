import WebSocket from 'ws';
import dotenv from 'dotenv';
import recorder from 'node-record-lpcm16';
import Speaker from 'speaker';

// Load environment variables
dotenv.config();

// Validate API key exists
if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is missing from .env file');
    process.exit(1);
}

let currentSpeaker = null;
let audioBuffer = Buffer.alloc(0);
let isRecording = false;
let recordingStream = null;
let sessionConfigured = false;

function createNewSpeaker() {
    return new Speaker({
        channels: 1,
        bitDepth: 16,
        sampleRate: 24000,
        signed: true
    });
}

function playAudio(base64Audio) {
    try {
        // Create new speaker if we don't have one
        if (!currentSpeaker) {
            currentSpeaker = createNewSpeaker();
        }
        
        // Convert base64 to buffer
        const chunk = Buffer.from(base64Audio, 'base64');
        
        // Append to our audio buffer
        audioBuffer = Buffer.concat([audioBuffer, chunk]);
        
        // Play through speaker
        currentSpeaker.write(chunk);
    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

function cleanupAudio() {
    try {
        if (currentSpeaker) {
            // End the current speaker stream
            currentSpeaker.end();
            currentSpeaker = null;
        }
        // Reset the audio buffer
        audioBuffer = Buffer.alloc(0);
    } catch (error) {
        console.error('Error cleaning up audio:', error);
    }
}

function startRecording() {
    if (isRecording) return;
    
    console.log('Starting microphone recording...');
    isRecording = true;

    // Configure recording options for macOS
    const recordingOptions = {
        sampleRate: 16000,
        channels: 1,
        compress: false,
        threshold: 0.5,
        recordProgram: 'rec', // Uses Sox on macOS
        silence: '1.0', // Silence detection
    };

    try {
        recordingStream = recorder.record(recordingOptions);
        console.log('Recording stream created');

        // Handle the audio data
        recordingStream.stream()
            .on('data', (data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    // Send the raw PCM data
                    ws.send(JSON.stringify({
                        type: 'input_audio_buffer.append',
                        audio: data.toString('base64')
                    }));
                }
            })
            .on('error', (err) => {
                console.error('Recording error:', err);
                stopRecording();
            });

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
        recordingStream.stop();
        recordingStream = null;
        
        // Commit the audio and request response
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'input_audio_buffer.commit'
            }));
            ws.send(JSON.stringify({
                type: 'response.create'
            }));
        }
    } catch (error) {
        console.error('Error stopping recording:', error);
    }
}

// Create WebSocket connection
const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
    headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
    }
});

// Initialize session on connection
ws.on('open', function() {
    console.log('Connected to OpenAI');
    
    // Configure session
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

// Handle incoming messages
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
                console.log('Speech detected');
                break;

            case 'input_audio_buffer.speech_stopped':
                console.log('Speech ended');
                stopRecording();
                // Restart recording after a brief pause
                setTimeout(() => {
                    if (sessionConfigured) {
                        startRecording();
                    }
                }, 1000);
                break;

            case 'response.created':
                // Clean up any previous audio when starting a new response
                cleanupAudio();
                break;

            case 'response.audio.delta':
                if (event.delta) {
                    playAudio(event.delta);
                }
                break;

            case 'response.audio.done':
                // Handle end of audio stream
                console.log('Audio response complete');
                setTimeout(() => cleanupAudio(), 500); // Give a small delay to finish playing
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

            case 'input_audio_buffer.committed':
                console.log('Audio committed to conversation');
                break;

            case 'error':
                if (event.error.message.includes('buffer too small')) {
                    // Ignore the "buffer too small" error as it's not critical
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

// Handle WebSocket errors
ws.on('error', function(error) {
    console.error('WebSocket error:', error);
    stopRecording();
    cleanupAudio();
});

// Handle WebSocket close
ws.on('close', function() {
    console.log('Connection closed');
    stopRecording();
    cleanupAudio();
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down...');
    stopRecording();
    cleanupAudio();
    ws.close();
    process.exit(0);
});