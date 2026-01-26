// Whiteboard Interview Simulator - Frontend Application

class WhiteboardCanvas {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.isDrawing = false;
    this.currentTool = 'pen';
    this.strokeColor = '#22c55e';
    this.strokeWidth = 4;
    this.history = [];
    this.historyIndex = -1;
    this.hasBeenModified = false; // Track if user has drawn anything
    
    this.initCanvas();
    this.bindEvents();
  }

  initCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.saveState();
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Store current content
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Set canvas size
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // Restore content
    this.ctx.putImageData(imageData, 0, 0);
    
    // Set default styles
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseout', () => this.stopDrawing());

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrawing(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.stopDrawing());
  }

  getPosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  startDrawing(e) {
    this.isDrawing = true;
    const pos = this.getPosition(e);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(e) {
    if (!this.isDrawing) return;

    const pos = this.getPosition(e);

    if (this.currentTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = this.strokeWidth * 4;
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeWidth;
    }

    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.ctx.closePath();
      this.hasBeenModified = true; // Mark as modified when user draws
      this.saveState();
    }
  }

  setTool(tool) {
    this.currentTool = tool;
    this.canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
  }

  setColor(color) {
    this.strokeColor = color;
  }

  setStrokeWidth(width) {
    this.strokeWidth = parseInt(width);
  }

  saveState() {
    this.historyIndex++;
    this.history = this.history.slice(0, this.historyIndex);
    this.history.push(this.canvas.toDataURL());
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
      };
      img.src = this.history[this.historyIndex];
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.saveState();
  }

  addText(x, y, text) {
    this.ctx.font = '16px "Instrument Sans", sans-serif';
    this.ctx.fillStyle = this.strokeColor;
    this.ctx.fillText(text, x, y);
    this.hasBeenModified = true;
    this.saveState();
  }

  getImageData() {
    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the whiteboard content
    tempCtx.drawImage(this.canvas, 0, 0);
    
    // Return as base64 (without data URL prefix for API)
    return tempCanvas.toDataURL('image/png').split(',')[1];
  }

  isEmpty() {
    // Use the modification flag instead of checking pixels
    // This is more reliable as it tracks actual user interaction
    return !this.hasBeenModified;
  }

  // Check if there are actual visible pixels (backup method)
  hasVisibleContent() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    // Check for any non-transparent pixels (alpha > 0)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  }
}

class SpeechRecognizer {
  constructor(onResult, onStateChange) {
    this.onResult = onResult;
    this.onStateChange = onStateChange;
    this.recognition = null;
    this.isListening = false;
    this.finalTranscript = '';
    
    this.init();
  }

  init() {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStateChange(true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStateChange(false);
      
      // If we have a final transcript, send it
      if (this.finalTranscript) {
        this.onResult(this.finalTranscript, true);
        this.finalTranscript = '';
      }
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Send interim results for live preview
      this.onResult(this.finalTranscript + interimTranscript, false);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.onStateChange(false);
      
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access to use speech-to-text.');
      }
    };
  }

  isSupported() {
    return this.recognition !== null;
  }

  start() {
    if (!this.recognition) return;
    
    this.finalTranscript = '';
    try {
      this.recognition.start();
    } catch (e) {
      // Already started
      console.warn('Recognition already started');
    }
  }

  stop() {
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
    } catch (e) {
      console.warn('Recognition already stopped');
    }
  }

  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }
}

class InterviewSimulator {
  constructor() {
    this.sessionId = null;
    this.interviewType = null;
    this.timerInterval = null;
    this.startTime = null;
    this.isLoading = false;
    this.whiteboard = null;
    this.speechRecognizer = null;
    this.preRecordingNotes = '';

    this.initElements();
    this.bindEvents();
    this.initSpeechRecognition();
  }

  initElements() {
    // Screens
    this.startScreen = document.getElementById('start-screen');
    this.interviewScreen = document.getElementById('interview-screen');

    // Start screen elements
    this.optionButtons = document.querySelectorAll('.option-btn');

    // Interview screen elements
    this.interviewTypeBadge = document.getElementById('interview-type-badge');
    this.timerDisplay = document.getElementById('timer');
    this.endInterviewBtn = document.getElementById('end-interview');
    this.messagesContainer = document.getElementById('messages');
    this.userInput = document.getElementById('user-input');
    this.sendBtn = document.getElementById('send-btn');
    this.loadingOverlay = document.getElementById('loading-overlay');

    // Whiteboard elements
    this.canvasElement = document.getElementById('whiteboard');
    this.toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
    this.colorPicker = document.getElementById('color-picker');
    this.strokeWidthSelect = document.getElementById('stroke-width');
    this.undoBtn = document.getElementById('undo-btn');
    this.clearBtn = document.getElementById('clear-btn');
    this.notesInput = document.getElementById('notes-input');
    this.submitWhiteboardBtn = document.getElementById('submit-whiteboard');

    // Text input overlay
    this.textOverlay = document.getElementById('text-overlay');
    this.canvasTextInput = document.getElementById('canvas-text-input');

    // Voice elements
    this.voiceBtn = document.getElementById('voice-btn');
    this.voiceStatus = this.voiceBtn?.querySelector('.voice-status');
    this.voiceIndicator = document.getElementById('voice-indicator');
  }

  initSpeechRecognition() {
    this.speechRecognizer = new SpeechRecognizer(
      // onResult callback
      (transcript, isFinal) => {
        // Append to existing notes
        this.notesInput.value = this.preRecordingNotes + transcript;
        
        // Auto-scroll to bottom of textarea
        this.notesInput.scrollTop = this.notesInput.scrollHeight;
      },
      // onStateChange callback
      (isListening) => {
        this.updateVoiceUI(isListening);
      }
    );

    // Update UI if speech not supported
    if (!this.speechRecognizer.isSupported()) {
      if (this.voiceBtn) {
        this.voiceBtn.style.display = 'none';
      }
    }
  }

  updateVoiceUI(isListening) {
    if (!this.voiceBtn) return;

    if (isListening) {
      this.voiceBtn.classList.add('recording');
      this.voiceStatus.textContent = 'Stop';
      this.voiceIndicator.classList.add('active');
    } else {
      this.voiceBtn.classList.remove('recording');
      this.voiceStatus.textContent = 'Speak';
      this.voiceIndicator.classList.remove('active');
    }
  }

  toggleVoiceRecording() {
    if (!this.speechRecognizer) return;

    if (!this.speechRecognizer.isListening) {
      // Save current notes before recording
      this.preRecordingNotes = this.notesInput.value;
      if (this.preRecordingNotes && !this.preRecordingNotes.endsWith(' ') && !this.preRecordingNotes.endsWith('\n')) {
        this.preRecordingNotes += ' ';
      }
    }

    this.speechRecognizer.toggle();
  }

  bindEvents() {
    // Interview type selection
    this.optionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.startInterview(type);
      });
    });

    // Send message (quick text response)
    this.sendBtn.addEventListener('click', () => this.sendQuickMessage());

    // Input handling
    this.userInput.addEventListener('input', () => {
      this.autoResizeTextarea();
      this.updateSendButton();
    });

    this.userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendQuickMessage();
      }
    });

    // End interview
    this.endInterviewBtn.addEventListener('click', () => this.endInterview());

    // Whiteboard tools
    this.toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.toolButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = btn.dataset.tool;
        
        if (tool === 'text') {
          this.enableTextMode();
        } else {
          this.whiteboard?.setTool(tool);
        }
      });
    });

    this.colorPicker.addEventListener('input', (e) => {
      this.whiteboard?.setColor(e.target.value);
    });

    this.strokeWidthSelect.addEventListener('change', (e) => {
      this.whiteboard?.setStrokeWidth(e.target.value);
    });

    this.undoBtn.addEventListener('click', () => {
      this.whiteboard?.undo();
    });

    this.clearBtn.addEventListener('click', () => {
      if (confirm('Clear the entire whiteboard?')) {
        this.whiteboard?.clear();
      }
    });

    // Submit whiteboard
    this.submitWhiteboardBtn.addEventListener('click', () => this.submitWhiteboard());

    // Voice recording
    if (this.voiceBtn) {
      this.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
    }

    // Text input handling
    this.canvasTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.placeText();
      } else if (e.key === 'Escape') {
        this.hideTextOverlay();
      }
    });

    this.canvasTextInput.addEventListener('blur', () => {
      if (this.canvasTextInput.value) {
        this.placeText();
      } else {
        this.hideTextOverlay();
      }
    });
  }

  enableTextMode() {
    this.canvasElement.style.cursor = 'text';
    this.canvasElement.onclick = (e) => {
      const rect = this.canvasElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.showTextOverlay(x, y);
      this.canvasElement.onclick = null;
    };
  }

  showTextOverlay(x, y) {
    this.textOverlay.style.display = 'block';
    this.textOverlay.style.left = x + 'px';
    this.textOverlay.style.top = y + 'px';
    this.canvasTextInput.value = '';
    this.canvasTextInput.style.color = this.colorPicker.value;
    this.canvasTextInput.focus();
    this.pendingTextPosition = { x, y };
  }

  hideTextOverlay() {
    this.textOverlay.style.display = 'none';
    this.canvasElement.style.cursor = 'crosshair';
    
    // Reset to pen tool
    this.toolButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tool="pen"]').classList.add('active');
    this.whiteboard?.setTool('pen');
  }

  placeText() {
    const text = this.canvasTextInput.value.trim();
    if (text && this.pendingTextPosition) {
      this.whiteboard.addText(
        this.pendingTextPosition.x,
        this.pendingTextPosition.y + 16,
        text
      );
    }
    this.hideTextOverlay();
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async startInterview(type) {
    this.sessionId = this.generateSessionId();
    this.interviewType = type;

    // Update UI
    const typeLabels = {
      'systems-design': 'System Design',
      'webtech': 'Web Technologies'
    };

    this.interviewTypeBadge.textContent = typeLabels[type] || type;

    // Switch screens
    this.startScreen.classList.remove('active');
    this.interviewScreen.classList.add('active');

    // Initialize whiteboard
    setTimeout(() => {
      this.whiteboard = new WhiteboardCanvas(this.canvasElement);
    }, 100);

    // Start timer
    this.startTimer();

    // Get first question from interviewer
    await this.getInterviewerResponse(null, null, null);
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      this.timerDisplay.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  autoResizeTextarea() {
    this.userInput.style.height = 'auto';
    this.userInput.style.height = Math.min(this.userInput.scrollHeight, 100) + 'px';
  }

  updateSendButton() {
    const hasContent = this.userInput.value.trim().length > 0;
    this.sendBtn.disabled = !hasContent || this.isLoading;
  }

  addMessage(role, content, hasWhiteboard = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'interviewer' ? 'I' : 'Y';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const roleLabel = document.createElement('div');
    roleLabel.className = 'message-role';
    roleLabel.textContent = role === 'interviewer' ? 'Interviewer' : 'You';

    contentDiv.appendChild(roleLabel);

    // Add whiteboard indicator if applicable
    if (hasWhiteboard && role === 'user') {
      const indicator = document.createElement('div');
      indicator.className = 'message-whiteboard-indicator';
      indicator.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="8" y1="8" x2="16" y2="8"/>
          <line x1="8" y1="12" x2="14" y2="12"/>
        </svg>
        <span>Whiteboard submitted</span>
      `;
      contentDiv.appendChild(indicator);
    }

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.innerHTML = this.formatMessage(content);

    contentDiv.appendChild(textDiv);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  formatMessage(content) {
    // Basic markdown-like formatting
    let formatted = content
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Code blocks
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return formatted;
  }

  scrollToBottom() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  showLoading(show) {
    this.isLoading = show;
    this.loadingOverlay.classList.toggle('active', show);
    this.submitWhiteboardBtn.disabled = show;
    this.updateSendButton();
  }

  async sendQuickMessage() {
    const content = this.userInput.value.trim();
    if (!content || this.isLoading) return;

    // Clear input
    this.userInput.value = '';
    this.autoResizeTextarea();
    this.updateSendButton();

    // Add user message
    this.addMessage('user', content, false);

    // Get interviewer response
    await this.getInterviewerResponse(content, null, null);
  }

  async submitWhiteboard() {
    if (this.isLoading) return;

    // Stop voice recording if active
    if (this.speechRecognizer?.isListening) {
      this.speechRecognizer.stop();
      // Wait a moment for final transcript
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const notes = this.notesInput.value.trim();
    
    // Check if whiteboard has content (either modified flag or visible pixels)
    const hasDrawing = this.whiteboard && 
      (!this.whiteboard.isEmpty() || this.whiteboard.hasVisibleContent());

    if (!hasDrawing && !notes) {
      alert('Please draw something on the whiteboard or add notes before submitting.');
      return;
    }

    // Always get whiteboard image if whiteboard exists (even if it looks empty, send it)
    // This ensures the AI can see what the user drew
    const imageData = this.whiteboard ? this.whiteboard.getImageData() : null;
    
    console.log('Submitting whiteboard:', { 
      hasDrawing, 
      hasNotes: !!notes, 
      imageDataLength: imageData?.length 
    });

    // Construct message text
    let messageText = '';
    if (notes) {
      messageText = notes;
    } else {
      messageText = '[Whiteboard submitted for review]';
    }

    // Add user message to chat
    this.addMessage('user', messageText, hasDrawing);

    // Get interviewer response with image
    // Always include image context when we have image data
    const imageContext = imageData 
      ? 'Please carefully analyze the whiteboard image I have drawn. Describe what you see and ask follow-up questions about specific elements in my diagram.' 
      : null;
    
    await this.getInterviewerResponse(
      notes || 'Please review my whiteboard solution.',
      imageData,
      imageContext
    );
  }

  async getInterviewerResponse(userMessage, imageData, imageContext) {
    this.showLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          message: userMessage,
          imageData: imageData,
          imageContext: imageContext,
          interviewType: userMessage === null ? this.interviewType : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      this.addMessage('interviewer', data.message);

    } catch (error) {
      console.error('Error:', error);
      this.addMessage('interviewer', 
        'I apologize, but there seems to be a technical issue. Please refresh the page and try again.');
    } finally {
      this.showLoading(false);
    }
  }

  async endInterview() {
    if (!confirm('Are you sure you want to end this interview?')) {
      return;
    }

    this.stopTimer();

    // Reset session on server
    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });
    } catch (error) {
      console.error('Error resetting session:', error);
    }

    // Stop voice recording if active
    if (this.speechRecognizer?.isListening) {
      this.speechRecognizer.stop();
    }

    // Reset state
    this.sessionId = null;
    this.interviewType = null;
    this.whiteboard = null;
    this.preRecordingNotes = '';
    this.messagesContainer.innerHTML = '';
    this.notesInput.value = '';
    this.timerDisplay.textContent = '00:00';

    // Switch screens
    this.interviewScreen.classList.remove('active');
    this.startScreen.classList.add('active');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new InterviewSimulator();
});
