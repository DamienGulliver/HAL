import WebSocket from "ws";
import 'dotenv/config';

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
    headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "OpenAI-Beta": "realtime=v1",
    },
});

ws.on("open", function open() {
    console.log("Connected to server.");
    
    // Send the conversation item
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
    
    // Send the message and then create the response
    ws.send(JSON.stringify(event));
    ws.send(JSON.stringify({type: 'response.create'}));
});

ws.on("message", function incoming(message) {
    const parsedMessage = JSON.parse(message.toString());
    console.log(JSON.stringify(parsedMessage, null, 2));
    
    // Handle different types of responses
    if (parsedMessage.type === 'response.message') {
        const output = parsedMessage.response?.output;
        if (output && output.length > 0) {
            output.forEach(item => {
                if (item.content?.text) {
                    console.log('\nAI:', item.content.text);
                }
            });
        }
    }
});

ws.on("error", function error(err) {
    console.error("WebSocket error:", err);
});

ws.on("close", function close() {
    console.log("Disconnected from server");
});