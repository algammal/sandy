/*
 * Vanilla JS, no build step, no framework — this is a test harness, not a
 * product UI (per the project spec: don't polish this beyond what's needed
 * to actually exercise and inspect the voice pipeline).
 *
 * State machine, all driven by real events only — never a timeout-faked
 * "listening" indicator:
 *   idle -> connecting -> listening <-> thinking <-> speaking -> (back to listening)
 * "active" (red) class means "tap to end call" regardless of sub-state.
 */

const callButton = document.getElementById("callButton");
const buttonLabel = callButton.querySelector(".call-button-label");
const statusText = document.getElementById("statusText");
const errorBanner = document.getElementById("errorBanner");
const resetButton = document.getElementById("resetButton");
const modelInfo = document.getElementById("modelInfo");
const transcriptEl = document.getElementById("transcript");
const toolCallsEl = document.getElementById("toolCalls");
const player = document.getElementById("player");
const debugToggle = document.getElementById("debugToggle");
const textInputRow = document.getElementById("textInputRow");
const textInput = document.getElementById("textInput");
const sendTextButton = document.getElementById("sendTextButton");

let ws = null;
let callActive = false;
let micStream = null;
let audioContext = null;
let analyser = null;
let mediaRecorder = null;
let recordedChunks = [];
let micAvailable = false;

let audioQueue = [];
let isPlayingAudio = false;
let turnComplete = true;

const VAD = {
  calibrated: false,
  threshold: 0.02,
  silenceMsNeeded: 900,
  minSpeechMs: 250,
  maxUtteranceMs: 20000,
};

function setState(state) {
  callButton.className = "call-button " + (callActive ? state + " active" : "idle");
  const labels = {
    idle: "Start Call",
    connecting: "Connecting…",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
  };
  buttonLabel.textContent = callActive ? (state === "idle" ? "End Call" : labels[state]) : "Start Call";
  statusText.textContent = callActive ? labels[state] || state : "Not started.";
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
}

function appendTranscript(speaker, text, language, lowConfidence) {
  const div = document.createElement("div");
  div.className = "msg " + (speaker === "you" ? "you" : "agent");
  div.textContent = text;
  if (lowConfidence) {
    div.style.opacity = "0.6";
    div.title = "Low-confidence transcript — the agent did not trust this and asked for clarification instead of acting on it.";
  }
  if (language || lowConfidence) {
    const langSpan = document.createElement("span");
    langSpan.className = "lang";
    langSpan.textContent = (language ? "detected: " + language : "") + (lowConfidence ? "  ⚠ unclear — not trusted" : "");
    div.appendChild(langSpan);
  }
  transcriptEl.appendChild(div);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

// Appends to the last agent message if one is "open" for this turn, so a
// streamed multi-sentence reply reads as one paragraph instead of many bubbles.
let openAgentBubble = null;
function appendAgentSentence(text) {
  if (!openAgentBubble) {
    openAgentBubble = document.createElement("div");
    openAgentBubble.className = "msg agent";
    transcriptEl.appendChild(openAgentBubble);
  }
  openAgentBubble.textContent = (openAgentBubble.textContent + " " + text).trim();
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function closeAgentBubble() {
  openAgentBubble = null;
}

// ---------- WebSocket + message handling ----------

function connectWebSocket() {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${scheme}//${location.host}/ws/call`);
  ws.binaryType = "blob";

  ws.onopen = () => {
    setState("thinking"); // waiting for greeting
  };

  ws.onmessage = async (event) => {
    if (event.data instanceof Blob) {
      enqueueAudio(event.data);
      return;
    }
    const msg = JSON.parse(event.data);
    handleServerMessage(msg);
  };

  ws.onerror = () => {
    showError("Connection to the voice-agent server was lost. Is the server running?");
  };

  ws.onclose = () => {
    if (callActive) {
      showError("Server connection closed unexpectedly.");
      endCall();
    }
  };
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case "info":
      modelInfo.textContent = `LLM: ${msg.llm}  ·  STT: ${msg.stt}  ·  TTS: ${msg.tts}`;
      break;
    case "agent_text":
      appendAgentSentence(msg.text);
      break;
    case "user_text":
      closeAgentBubble();
      appendTranscript("you", msg.text, msg.language, msg.low_confidence);
      setState("thinking");
      break;
    case "tool_calls":
      toolCallsEl.textContent = JSON.stringify(msg.calls, null, 2);
      break;
    case "turn_done":
      closeAgentBubble();
      turnComplete = true;
      maybeResumeAfterTurn();
      break;
    case "error":
      showError(msg.message);
      break;
  }
}

// ---------- Audio playback queue ----------

function enqueueAudio(blob) {
  audioQueue.push(blob);
  if (!isPlayingAudio) playNextAudio();
}

function playNextAudio() {
  if (audioQueue.length === 0) {
    isPlayingAudio = false;
    maybeResumeAfterTurn();
    return;
  }
  isPlayingAudio = true;
  setState("speaking");
  const blob = audioQueue.shift();
  const url = URL.createObjectURL(blob);
  player.src = url;
  player.onended = () => {
    URL.revokeObjectURL(url);
    playNextAudio();
  };
  player.play().catch(() => {
    // Autoplay can be blocked before the first user gesture; the call
    // button click itself counts as a user gesture, so this should be rare.
    showError("Browser blocked audio playback — click the call button again.");
  });
}

function maybeResumeAfterTurn() {
  if (!callActive) return;
  if (!turnComplete || isPlayingAudio || audioQueue.length > 0) return;
  if (debugToggle.checked) {
    setState("listening"); // "listening" here just means "your turn to type"
    return;
  }
  if (micAvailable) startListening();
}

// ---------- Microphone capture + simple energy VAD ----------

async function ensureMic() {
  if (micStream) return true;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    micAvailable = true;
    return true;
  } catch (err) {
    micAvailable = false;
    showError("Microphone unavailable (" + err.message + ") — falling back to text input mode.");
    debugToggle.checked = true;
    textInputRow.hidden = false;
    return false;
  }
}

function currentRms() {
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

async function calibrateVad() {
  const samples = [];
  const start = performance.now();
  while (performance.now() - start < 400) {
    samples.push(currentRms());
    await new Promise((r) => setTimeout(r, 30));
  }
  const ambient = Math.max(...samples);
  VAD.threshold = Math.max(0.015, ambient * 3);
  VAD.calibrated = true;
}

function startListening() {
  if (!callActive || !micAvailable) return;
  setState("listening");
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(micStream);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "audio/webm" });
    if (blob.size < 2000) {
      // Too short to plausibly contain speech — don't bother the server, just listen again.
      maybeResumeAfterTurn();
      return;
    }
    turnComplete = false;
    setState("thinking");
    ws.send(blob);
  };
  mediaRecorder.start();
  runVadLoop();
}

async function runVadLoop() {
  if (!VAD.calibrated) await calibrateVad();

  let speechMs = 0;
  let silenceMsAfterSpeech = 0;
  let elapsedMs = 0;
  const stepMs = 40;

  while (mediaRecorder && mediaRecorder.state === "recording") {
    await new Promise((r) => setTimeout(r, stepMs));
    elapsedMs += stepMs;
    const rms = currentRms();

    if (rms > VAD.threshold) {
      speechMs += stepMs;
      silenceMsAfterSpeech = 0;
    } else if (speechMs >= VAD.minSpeechMs) {
      silenceMsAfterSpeech += stepMs;
    }

    if (silenceMsAfterSpeech >= VAD.silenceMsNeeded || elapsedMs >= VAD.maxUtteranceMs) {
      mediaRecorder.stop();
      break;
    }
  }
}

// ---------- Call lifecycle ----------

async function startCall() {
  clearError();
  callActive = true;
  resetButton.disabled = false;
  setState("connecting");

  await ensureMic(); // failure here is handled gracefully inside (falls back to text mode)
  connectWebSocket();
}

function endCall() {
  callActive = false;
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
  if (ws) {
    ws.close();
    ws = null;
  }
  audioQueue = [];
  isPlayingAudio = false;
  setState("idle");
  resetButton.disabled = true;
}

callButton.addEventListener("click", () => {
  if (callActive) {
    endCall();
  } else {
    startCall();
  }
});

resetButton.addEventListener("click", () => {
  if (!ws) return;
  transcriptEl.innerHTML = "";
  toolCallsEl.textContent = "(none yet)";
  closeAgentBubble();
  ws.send(JSON.stringify({ type: "reset" }));
});

debugToggle.addEventListener("change", () => {
  textInputRow.hidden = !debugToggle.checked;
  if (debugToggle.checked && mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
});

function sendTextInput() {
  const text = textInput.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
  turnComplete = false;
  setState("thinking");
  ws.send(JSON.stringify({ type: "text_input", text }));
  textInput.value = "";
}

sendTextButton.addEventListener("click", sendTextInput);
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendTextInput();
});
