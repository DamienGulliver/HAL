import WebSocket from 'ws';
import dotenv from 'dotenv';
import recorder from 'node-record-lpcm16';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is missing from .env file');
    process.exit(1);
}

const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
    headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
    }
});

let isRecording = false;
let recordingStream = null;
let sessionConfigured = false;

// Initialize session configuration
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
                    // Send the raw PCM data directly (it's already in the correct format)
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
            case 'input_audio_buffer.committed':
                console.log('Audio committed to conversation');
                break;
            case 'conversation.item.created':
                if (event.item.role === 'assistant') {
                    console.log('Assistant response:', event.item.content);
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
});

ws.on('close', function() {
    console.log('Connection closed');
    stopRecording();
});

process.on('SIGINT', () => {
    console.log('Shutting down...');
    stopRecording();
    ws.close();
    process.exit(0);
});