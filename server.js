import express from 'express';
import { OpenAI } from 'openai';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(join(__dirname, 'public')));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load prompty files
function loadPromptyFile(filename) {
  try {
    const filePath = join(__dirname, 'prompts', filename);
    const content = readFileSync(filePath, 'utf-8');
    
    // Parse the prompty file - extract content after the second '---'
    const parts = content.split('---');
    if (parts.length >= 3) {
      // Get the system prompt part (after metadata)
      const promptSection = parts.slice(2).join('---').trim();
      // Remove the 'system:' prefix if present
      return promptSection.replace(/^system:\s*/i, '').trim();
    }
    return content;
  } catch (error) {
    console.error(`Error loading prompty file ${filename}:`, error.message);
    return null;
  }
}

// Load base prompt
const BASE_PROMPT = loadPromptyFile('base.prompty');

// Load interview-specific prompts
const INTERVIEW_PROMPTS = {
  'systems-design': loadPromptyFile('systems-design.prompty'),
  'frontend': loadPromptyFile('frontend.prompty'),
  'backend': loadPromptyFile('backend.prompty'),
  'algorithms': loadPromptyFile('algorithms.prompty'),
};

// Build complete prompt for interview type
function buildSystemPrompt(interviewType) {
  const basePrompt = BASE_PROMPT || getDefaultBasePrompt();
  const typePrompt = INTERVIEW_PROMPTS[interviewType];
  
  if (typePrompt) {
    // Replace {{base_prompt}} placeholder with actual base prompt
    const fullPrompt = typePrompt.replace('{{base_prompt}}', basePrompt);
    return fullPrompt;
  }
  
  // Fallback to base prompt with generic instruction
  return `${basePrompt}\n\nThe candidate has requested a ${interviewType} interview. Ask an appropriate question for this type.`;
}

// Default base prompt if file loading fails
function getDefaultBasePrompt() {
  return `You are a senior interviewer at a top-tier tech company (Google / Meta / Amazon / Stripe-level).
You are conducting a live whiteboard interview.

Your job is NOT to teach.
Your job is to evaluate how the candidate thinks.

CRITICAL: You have vision capabilities. The candidate has a whiteboard where they can draw diagrams, write code, and take notes. When they submit their whiteboard, you WILL RECEIVE an image of their drawing. You MUST analyze and describe what you see in the image. Look at:
- Architecture diagrams (boxes, circles, labels)
- Arrows showing data flow or connections
- Text labels and annotations
- Any code or pseudocode written on the whiteboard

When you receive an image, ALWAYS start by briefly describing what you observe (e.g., "I can see you've drawn a system with three main components...") before asking follow-up questions.

IMPORTANT BEHAVIOR RULES:
- Do NOT give the solution unless explicitly asked
- Do NOT correct immediately — probe first
- Do NOT over-explain
- When you see their whiteboard, reference specific elements you observe
- Interact in short, realistic interviewer-style questions
- Let silence exist if needed
- Push until the design or answer either holds up or breaks

TONE:
- Calm
- Professional
- Slightly skeptical
- Curious, not friendly
- No emojis
- No coaching tone`;
}

// Store conversation history per session
const sessions = new Map();

app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message, imageData, imageContext, interviewType } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Initialize or retrieve session
    if (!sessions.has(sessionId)) {
      const systemPrompt = buildSystemPrompt(interviewType || 'systems-design');
      console.log(`Starting ${interviewType} interview for session ${sessionId}`);
      
      sessions.set(sessionId, [
        { role: 'system', content: systemPrompt }
      ]);
    }

    const conversation = sessions.get(sessionId);

    // Build the user message content
    if (message || imageData) {
      const userContent = [];

      // Add image if provided
      if (imageData) {
        console.log('Processing whiteboard image, data length:', imageData.length);
        
        // Add text context FIRST for better model understanding
        const textContent = imageContext 
          ? `[WHITEBOARD SUBMISSION - Please analyze the attached image carefully]\n\n${imageContext}\n\nCandidate's notes: ${message || 'No additional notes provided.'}`
          : `[WHITEBOARD SUBMISSION]\n\n${message || 'Please review my whiteboard solution.'}`;
        
        userContent.push({
          type: 'text',
          text: textContent
        });
        
        // Then add the image
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${imageData}`,
            detail: 'high'
          }
        });
      } else if (message) {
        userContent.push({
          type: 'text',
          text: message
        });
      }

      // Always use array format when there's an image, otherwise use simple string
      const contentToStore = imageData ? userContent : userContent[0].text;
      
      conversation.push({ 
        role: 'user', 
        content: contentToStore
      });
      
      console.log('Message added to conversation. Has image:', !!imageData);
    }

    // Call OpenAI with vision capability
    console.log('Sending to OpenAI. Message count:', conversation.length);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversation,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const assistantMessage = completion.choices[0].message.content;
    console.log('Received response from OpenAI, length:', assistantMessage.length);

    // Store assistant response
    conversation.push({ role: 'assistant', content: assistantMessage });

    res.json({ 
      message: assistantMessage,
      sessionId 
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ 
      error: 'Failed to get response from interviewer',
      details: error.message 
    });
  }
});

// Get available interview types
app.get('/api/interview-types', (req, res) => {
  const types = Object.keys(INTERVIEW_PROMPTS).map(key => ({
    id: key,
    name: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    available: !!INTERVIEW_PROMPTS[key]
  }));
  res.json(types);
});

// Reset session endpoint
app.post('/api/reset', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
    console.log(`Session ${sessionId} reset`);
  }
  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    promptsLoaded: {
      base: !!BASE_PROMPT,
      ...Object.fromEntries(
        Object.entries(INTERVIEW_PROMPTS).map(([k, v]) => [k, !!v])
      )
    }
  });
});

app.listen(PORT, () => {
  console.log(`Interview simulator running at http://localhost:${PORT}`);
  console.log('Loaded prompts:', {
    base: !!BASE_PROMPT,
    ...Object.fromEntries(
      Object.entries(INTERVIEW_PROMPTS).map(([k, v]) => [k, !!v])
    )
  });
});
