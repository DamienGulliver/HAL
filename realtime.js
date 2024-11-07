import WebSocket from "ws";
import 'dotenv/config';
import Speaker from 'speaker';
import recorder from 'node-record-lpcm16';

let recording = null;
let speaker = null;
let isWaitingForPlayback = false;
let audioQueue = [];

function startListening() {
  if (isWaitingForPlayback) return;
  
  console.log("\nListening... (Start speaking)");
  
  recording = recorder.record({
    sampleRate: 24000,
    channels: 1,
    audioType: 'raw',
    endian: 'LE',
    bitwidth: 16
  });

  recording.stream().on('data', chunk => {
    if (isWaitingForPlayback) return;
    
    const base64AudioData = chunk.toString('base64');
    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64AudioData
    }));
  });
}

function stopListening() {
  if (recording) {
    recording.stop();
    recording = null;
  }
}

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
  headers: {
    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
    "OpenAI-Beta": "realtime=v1",
  },
});

ws.on("open", function open() {
  console.log("Connected to server.");
  
  ws.send(JSON.stringify({
    type: 'session.update',
    session: {
      modalities: ["text", "audio"],
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    }
  }));
});

ws.on("message", function incoming(message) {
  const data = JSON.parse(message.toString());
  
  switch (data.type) {
    case 'session.created':
    case 'session.updated':
      startListening();
      break;
      
    case 'input_audio_buffer.speech_started':
      if (!isWaitingForPlayback) {
        console.log("Voice detected...");
      }
      break;
      
    case 'input_audio_buffer.speech_stopped':
      if (!isWaitingForPlayback) {
        console.log("Silence detected, processing...");
        stopListening();
      }
      break;
      
    case 'response.audio.delta':
      if (!speaker) {
        isWaitingForPlayback = true;
        stopListening();
        speaker = new Speaker({
          channels: 1,
          bitDepth: 16,
          sampleRate: 24000,
          signed: true,
          endianness: 'LE'
        });
      }
      
      const audioChunk = Buffer.from(data.delta, 'base64');
      audioQueue.push(audioChunk);
      
      if (audioQueue.length === 1) {
        function playNextChunk() {
          if (audioQueue.length > 0 && speaker) {
            const chunk = audioQueue[0];
            speaker.write(chunk);
            audioQueue.shift();
            if (audioQueue.length > 0) {
              setTimeout(playNextChunk, 10);
            }
          }
        }
        playNextChunk();
      }
      break;
      
    case 'response.audio_transcript.delta':
      process.stdout.write(data.delta);
      break;
      
    case 'response.audio.done':
      console.log('\nResponse audio complete');
      if (speaker) {
        setTimeout(() => {
          speaker.end();
          // Wait for a significant delay before starting to listen again
          setTimeout(() => {
            speaker = null;
            isWaitingForPlayback = false;
            audioQueue = [];
            // Additional delay before starting to listen
            setTimeout(startListening, 5000);
          }, 2000);
        }, 1000);
      }
      break;
      
    case 'response.audio_transcript.done':
      console.log('\nFull transcript:', data.transcript);
      break;
  }
});

ws.on("error", function error(err) {
  console.error("WebSocket error:", err);
  stopListening();
});

ws.on("close", function close() {
  console.log("Disconnected from server");
  stopListening();
});

process.on('SIGINT', () => {
  stopListening();
  if (speaker) {
    speaker.end();
  }
  ws.close();
  process.exit();
});