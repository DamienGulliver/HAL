import WebSocket from 'ws';
import dotenv from 'dotenv';
import recorder from 'node-record-lpcm16';
import Speaker from 'speaker';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is missing from .env file');
    process.exit(1);
}

let currentSpeaker = null;
let isRecording = false;
let recordingStream = null;
let sessionConfigured = false;
let responseBuffer = Buffer.alloc(0);
let isResponseInProgress = false;
let isCurrentlyPlaying = false;

function createNewSpeaker() {
    return new Speaker({
        channels: 1,
        bitDepth: 16,
        sampleRate: 24000,
        signed: true
    });
}

function playCompleteResponse() {
    try {
        if (responseBuffer.length === 0 || isCurrentlyPlaying) return;
        
        isCurrentlyPlaying = true;
        console.log('Starting audio playback...');
        
        currentSpeaker = createNewSpeaker();
        
        currentSpeaker.on('finish', () => {
            console.log('Speaker finished playing audio');
            currentSpeaker = null;
            responseBuffer = Buffer.alloc(0);
            isResponseInProgress = false;
            isCurrentlyPlaying = false;
            
            setTimeout(() => {
                if (sessionConfigured) {
                    startRecording();
                }
            }, 1000);
        });

        currentSpeaker.write(responseBuffer);
        
        // Add delay before ending the stream to prevent audio clipping
        setTimeout(() => {
            if (currentSpeaker) {
                currentSpeaker.end();
            }
        }, 500);  // 500ms delay should be enough to prevent clipping
        
    } catch (error) {
        console.error('Error playing audio:', error);
        isCurrentlyPlaying = false;
    }
}

function startRecording() {
    if (isRecording || isResponseInProgress || isCurrentlyPlaying) return;
    
    console.log('Starting microphone recording...');
    isRecording = true;

    const recordingOptions = {
        sampleRate: 16000,
        channels: 1,
        compress: false,
        threshold: 0.5,
        recordProgram: 'rec',
        silence: '1.0',
    };

    try {
        recordingStream = recorder.record(recordingOptions);
        console.log('Recording stream created');

        recordingStream.stream()
            .on('data', (data) => {
                if (ws.readyState === WebSocket.OPEN && !isResponseInProgress && !isCurrentlyPlaying) {
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
                    console.error('Error event:', error.error);
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