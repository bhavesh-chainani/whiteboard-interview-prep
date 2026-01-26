# Whiteboard Interview Simulator

An AI-powered technical interview simulator that replicates the experience of a FAANG-level whiteboard interview. Practice systems design, frontend, backend, and algorithm questions with a realistic AI interviewer **who can actually see your whiteboard drawings**.

## Features

- **Real Whiteboard**: Draw diagrams, flowcharts, and system architectures directly in the browser
- **AI Vision**: The interviewer uses GPT-4 Vision to actually see and analyze your whiteboard drawings
- **Speech-to-Text**: Click the mic button to speak your thoughts - they're transcribed in real-time
- **Multiple Interview Types**: Systems Design, Frontend, Backend, and Algorithms
- **Realistic Probing**: The interviewer references specific elements in your diagrams when asks follow-ups
- **Drawing Tools**: Pen, eraser, text, color picker, stroke width, undo
- **Notes Section**: Add code, pseudocode, or explanations alongside your drawings
- **Session Timer**: Track how long you've been interviewing

## How It Works

1. Select an interview type (Systems Design, Frontend, Backend, or Algorithms)
2. The interviewer asks you a technical question
3. **Draw your solution on the whiteboard** - create architecture diagrams, data flows, etc.
4. **Speak your thoughts** - click the mic button to explain your approach verbally (speech-to-text)
5. Add additional notes or pseudocode in the text area
6. Click "Submit to Interviewer" when ready to discuss
7. The AI analyzes both your drawing AND your spoken/written notes, then asks probing questions

## Screenshots

The interface features:
- **Left panel**: Chat with the interviewer
- **Right panel**: Interactive whiteboard with drawing tools + notes area

## Setup

### Prerequisites

- Node.js 18+ 
- OpenAI API key (with GPT-4 Vision access)

### Installation

1. Clone this repository:
   ```bash
   cd whiteboard-interview-prep
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:3000`

## Whiteboard Tools

| Tool | Description |
|------|-------------|
| **Pen** | Draw freehand lines and shapes |
| **Eraser** | Erase parts of your drawing |
| **Text** | Click to add text labels |
| **Color** | Change drawing color |
| **Stroke Width** | Thin, Medium, or Thick lines |
| **Undo** | Undo last action |
| **Clear** | Clear the entire whiteboard |

## Speech-to-Text

| Action | Description |
|--------|-------------|
| **Click Mic** | Start recording your voice |
| **Speak** | Your words are transcribed in real-time to the notes area |
| **Click Stop** | Stop recording |

The speech recognition uses your browser's built-in Web Speech API (works best in Chrome/Edge). Your spoken explanation is automatically appended to any existing notes.

## Interview Tips

- **Draw clearly**: The AI can see your whiteboard, so make your diagrams clear
- **Label components**: Add text labels to boxes and arrows
- **Think out loud**: Use the notes section to explain your reasoning
- **Start simple**: Begin with a basic design, then add complexity
- **Show data flow**: Use arrows to indicate how data moves through your system

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript, HTML5 Canvas, CSS3
- **AI**: OpenAI GPT-4o with Vision
- **Fonts**: Instrument Sans, JetBrains Mono

## Project Structure

```
whiteboard-interview-prep/
├── server.js           # Express server with OpenAI Vision integration
├── public/
│   ├── index.html      # Main HTML with split-panel layout
│   ├── styles.css      # Dark theme styling
│   └── app.js          # Whiteboard canvas + chat logic
├── package.json
├── .env                # Environment variables (create this)
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send message + optional whiteboard image |
| `/api/reset` | POST | Reset interview session |
| `/api/health` | GET | Health check |

## License

MIT
