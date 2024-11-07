import WebSocket from "ws";
import 'dotenv/config';
import Speaker from 'speaker';
import recorder from 'node-record-lpcm16';

// Track states
let isRecording = false;
let isSpeakerPlaying = false;
let recording = null;
let speaker = null;

function createSpeaker() {
  speaker = new Speaker({
    channels: 1,
    bitDepth: 16,
    sampleRate: 24000,
    signed: true,
    endianness: 'LE'
  });

  speaker.on('open', () => {
    console.log('Speaker opened');
    isSpeakerPlaying = true;
  });

  speaker.on('close', () => {
    console.log('Speaker closed');
    isSpeakerPlaying = false;
    speaker = null;
    startListening();
  });

  speaker.on('error', (err) => {
    console.error('Speaker error:', err);
    isSpeakerPlaying = false;
    speaker = null;
  });

  return speaker;
}

// Function to convert raw PCM buffer to base64
function rawToBase64(buffer) {
  return buffer.toString('base64');
}

function startListening() {
  if (isRecording || isSpeakerPlaying) {
    return;
  }
  
  console.log("\nListening... (Start speaking)");
  isRecording = true;
  
  recording = recorder.record({
    sampleRate: 24000,
    channels: 1,
    audioType: 'raw',
    endian: 'LE',
    bitwidth: 16
  });

  recording.stream().on('data', chunk => {
    if (!isRecording) return;
    
    const base64AudioData = rawToBase64(chunk);
    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64AudioData
    }));
  });
}

function stopRecording() {
  if (recording) {
    recording.stop();
    isRecording = false;
  }
}

// Initialize WebSocket connection
const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
  headers: {
    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
    "OpenAI-Beta": "realtime=v1",
  },
});

ws.on("open", async function open() {
  console.log("Connected to server.");
  
  // Configure session with Server VAD
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

ws.on("message", async function incoming(message) {
  const data = JSON.parse(message.toString());
  
  switch (data.type) {
    case 'session.created':
    case 'session.updated':
      startListening();
      break;
      
    case 'input_audio_buffer.speech_started':
      console.log("Voice detected...");
      break;
      
    case 'input_audio_buffer.speech_stopped':
      console.log("Silence detected, processing...");
      stopRecording();
      break;
      
    case 'response.audio.delta':
      if (!speaker) {
        speaker = createSpeaker();
      }
      const audioChunk = Buffer.from(data.delta, 'base64');
      try {
        speaker.write(audioChunk);
      } catch (err) {
        console.error('Error writing to speaker:', err);
      }
      break;
      
    case 'response.audio_transcript.delta':
      process.stdout.write(data.delta);
      break;
      
    case 'response.audio.done':
      console.log('\nResponse audio complete');
      if (speaker) {
        // Give a small delay before ending the speaker to ensure all audio is played
        setTimeout(() => {
          speaker.end();
        }, 500);
      }
      break;
      
    case 'response.audio_transcript.done':
      console.log('\nFull transcript:', data.transcript);
      break;
      
    case 'error':
      console.error('Server error:', data.error);
      break;
  }
});

// Error handling
ws.on("error", function error(err) {
  console.error("WebSocket error:", err);
  stopRecording();
});

ws.on("close", function close() {
  console.log("Disconnected from server");
  stopRecording();
  if (speaker) {
    speaker.end();
  }
});

// Handle process termination
process.on('SIGINT', () => {
  stopRecording();
  if (speaker) {
    speaker.end();
  }
  ws.close();
  process.exit();
});