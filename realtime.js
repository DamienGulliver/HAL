import WebSocket from "ws";
import 'dotenv/config';
import Speaker from 'speaker';

// Configure audio format for Mac
const audioFormat = {
    channels: 1,
    bitDepth: 16,
    sampleRate: 24000,
    signed: true,
    float: false,
    // Mac-specific configurations
    device: 'default',
    endianness: 'LE'
};

// Initialize speaker with the Mac-specific format
const speaker = new Speaker(audioFormat);

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
        case 'response.audio.data':
            if (!isPlaying) {
                isPlaying = true;
                console.log('Started receiving audio data...');
            }
            const audioChunk = Buffer.from(data.data, 'base64');
            totalBytesReceived += audioChunk.length;
            console.log(`Received audio chunk: ${audioChunk.length} bytes (Total: ${totalBytesReceived} bytes)`);
            
            try {
                // Add a small delay before playing to ensure proper buffering
                setTimeout(() => {
                    speaker.write(audioChunk);
                    console.log('Wrote chunk to speaker');
                }, 50);
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