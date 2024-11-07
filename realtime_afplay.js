import WebSocket from "ws";
import 'dotenv/config';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
    headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "OpenAI-Beta": "realtime=v1",
    },
});

// Buffer to collect audio data
let audioBuffer = Buffer.alloc(0);
let isReceivingAudio = false;

// Function to play audio using afplay
async function playAudio(buffer) {
    const tempFile = 'temp_audio.raw';
    try {
        // Write the PCM data to a temporary file
        fs.writeFileSync(tempFile, buffer);
        
        // Convert and play the audio using ffplay (more flexible than afplay for raw PCM)
        const command = `ffplay -f s16le -ar 24000 -ac 1 -nodisp -autoexit ${tempFile}`;
        console.log('Playing audio...');
        await execAsync(command);
        console.log('Finished playing audio');
    } catch (error) {
        console.error('Error playing audio:', error);
    } finally {
        // Clean up the temporary file
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
}

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

ws.on("message", async function incoming(message) {
    const data = JSON.parse(message.toString());
    
    switch (data.type) {
        case 'response.audio.data':
            if (!isReceivingAudio) {
                isReceivingAudio = true;
                console.log('Started receiving audio data...');
            }
            const chunk = Buffer.from(data.data, 'base64');
            audioBuffer = Buffer.concat([audioBuffer, chunk]);
            console.log(`Received audio chunk: ${chunk.length} bytes (Total: ${audioBuffer.length} bytes)`);
            break;
            
        case 'response.audio_transcript.delta':
            process.stdout.write(data.delta);
            break;
            
        case 'response.audio.done':
            console.log('\nFinished receiving audio data');
            console.log(`Total audio data received: ${audioBuffer.length} bytes`);
            if (audioBuffer.length > 0) {
                await playAudio(audioBuffer);
                // Reset the buffer after playing
                audioBuffer = Buffer.alloc(0);
            }
            isReceivingAudio = false;
            break;
            
        case 'response.audio_transcript.done':
            console.log('\nFull transcript:', data.transcript);
            break;
    }
});

ws.on("error", function error(err) {
    console.error("WebSocket error:", err);
});

ws.on("close", function close() {
    console.log("Disconnected from server");
});

// Handle process termination
process.on('SIGINT', () => {
    ws.close();
    process.exit();
});