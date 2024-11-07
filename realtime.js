import WebSocket from "ws";
import 'dotenv/config';
import Speaker from 'speaker';

// Initialize speaker with correct PCM format for OpenAI's audio
const speaker = new Speaker({
    channels: 1,          // Mono audio
    bitDepth: 16,         // 16-bit audio
    sampleRate: 24000,    // OpenAI's sample rate
    signed: true,         // Signed PCM
    endianness: 'LE'     // Little-endian (important for correct playback)
});

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
    headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "OpenAI-Beta": "realtime=v1",
    },
});

// Track if we're currently playing audio
let isPlaying = false;
let totalBytesReceived = 0;

ws.on("open", function open() {
    console.log("Connected to server.");
    
    const event = {
        type: 'conversation.item.create',
        item: {
            type: 'message',
            role: 'user',
            content: [
                {
                    type: 'input_text',
                    text: 'Hello!'
                }
            ]
        }
    };
    
    ws.send(JSON.stringify(event));
    ws.send(JSON.stringify({type: 'response.create'}));
});

ws.on("message", function incoming(message) {
    const data = JSON.parse(message.toString());
    
    switch (data.type) {
        case 'response.audio.delta':
            if (!isPlaying) {
                isPlaying = true;
                console.log('Started receiving audio data...');
            }
            
            // Convert base64 to binary buffer
            const audioChunk = Buffer.from(data.delta, 'base64');
            totalBytesReceived += audioChunk.length;
            
            console.log(`Received audio chunk: ${audioChunk.length} bytes (Total: ${totalBytesReceived} bytes)`);
            
            try {
                // Write the audio chunk directly to the speaker
                speaker.write(audioChunk);
            } catch (err) {
                console.error('Error writing to speaker:', err);
            }
            break;
            
        case 'response.audio_transcript.delta':
            process.stdout.write(data.delta);
            break;
            
        case 'response.audio.done':
            console.log('\nFinished receiving audio data');
            console.log(`Total audio data received: ${totalBytesReceived} bytes`);
            
            // Add a small delay before ending to ensure all audio is played
            setTimeout(() => {
                speaker.end();
                isPlaying = false;
                totalBytesReceived = 0;
            }, 500);
            break;
            
        case 'response.audio_transcript.done':
            console.log('\nFull transcript:', data.transcript);
            break;
    }
});

// Error handling
speaker.on('error', (err) => {
    console.error('Speaker error:', err);
});

speaker.on('open', () => {
    console.log('Speaker opened and ready');
});

ws.on("error", function error(err) {
    console.error("WebSocket error:", err);
    if (speaker) {
        speaker.end();
    }
});

ws.on("close", function close() {
    console.log("Disconnected from server");
    if (speaker) {
        speaker.end();
    }
});

// Handle process termination
process.on('SIGINT', () => {
    if (speaker) {
        speaker.end();
    }
    ws.close();
    process.exit();
});