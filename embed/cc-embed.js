/**
 * cc-embed.js — Café Claude Expert-Comptable Widget
 * Slide-out AI assistant for Infofrankrijk tools
 * 
 * Usage:
 *   <script src="/embed/cc-embed.js"
 *     data-tool-id="financieel_kompas"
 *     data-tool-name="Financieel Kompas"
 *     data-expert-emoji="📊"
 *     data-expert-label="L'Expert-Comptable"
 *     data-color="#800000"
 *     data-position="bottom-right"
 *     data-api-url="/api/chat"
 *   ></script>
 *
 * The host page must expose window.getToolState() returning an object
 * with the current input values and calculated results.
 */
;(function () {
  'use strict';

  const script = document.currentScript;
  const CFG = {
    toolId: script?.getAttribute('data-tool-id') || 'unknown',
    toolName: script?.getAttribute('data-tool-name') || 'Tool',
    emoji: script?.getAttribute('data-expert-emoji') || '🤖',
    label: script?.getAttribute('data-expert-label') || 'AI Assistent',
    color: script?.getAttribute('data-color') || '#800000',
    position: script?.getAttribute('data-position') || 'bottom-right',
    apiUrl: script?.getAttribute('data-api-url') || '/api/chat',
  };

  const COLOR = CFG.color;
  const COLOR_LIGHT = COLOR + '18';
  const COLOR_MED = COLOR + '30';

  /* ── Inject styles ── */
  const style = document.createElement('style');
  style.textContent = `
    #cc-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 99998;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${COLOR}; color: #fff; border: none; cursor: pointer;
      font-size: 24px; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #cc-fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,0.3); }
    #cc-fab.open { transform: rotate(45deg) scale(1); }

    #cc-panel {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 380px; max-width: calc(100vw - 32px);
      height: 520px; max-height: calc(100vh - 80px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: none; flex-direction: column;
      font-family: 'Mulish', 'Segoe UI', sans-serif;
      overflow: hidden;
    }
    #cc-panel.open { display: flex; }

    #cc-header {
      background: ${COLOR}; color: #fff;
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    #cc-header-emoji { font-size: 22px; }
    #cc-header-text { flex: 1; }
    #cc-header-title {
      font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600;
      line-height: 1.3;
    }
    #cc-header-sub { font-size: 11px; opacity: 0.8; line-height: 1.3; }
    #cc-close {
      background: none; border: none; color: #fff; font-size: 20px;
      cursor: pointer; padding: 4px; opacity: 0.8; line-height: 1;
    }
    #cc-close:hover { opacity: 1; }

    #cc-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
    }

    .cc-msg {
      max-width: 88%; padding: 10px 14px;
      border-radius: 12px; font-size: 13px;
      line-height: 1.7; word-wrap: break-word;
    }
    .cc-msg.assistant {
      background: ${COLOR_LIGHT}; color: #2c2c2a;
      align-self: flex-start; border-bottom-left-radius: 4px;
    }
    .cc-msg.user {
      background: ${COLOR}; color: #fff;
      align-self: flex-end; border-bottom-right-radius: 4px;
    }
    .cc-msg.system {
      background: #f5f3ee; color: #888;
      align-self: center; text-align: center;
      font-size: 12px; padding: 8px 12px;
    }

    .cc-typing {
      align-self: flex-start; padding: 10px 14px;
      background: ${COLOR_LIGHT}; border-radius: 12px;
      border-bottom-left-radius: 4px;
      display: flex; gap: 4px; align-items: center;
    }
    .cc-typing span {
      width: 6px; height: 6px; background: ${COLOR}; border-radius: 50%;
      opacity: 0.4; animation: cc-bounce 1.2s infinite;
    }
    .cc-typing span:nth-child(2) { animation-delay: 0.15s; }
    .cc-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes cc-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    #cc-input-area {
      padding: 12px; border-top: 1px solid #eae5e0;
      display: flex; gap: 8px; flex-shrink: 0;
    }
    #cc-input {
      flex: 1; border: 1px solid #d3d1c7; border-radius: 8px;
      padding: 8px 12px; font-size: 13px;
      font-family: 'Mulish', sans-serif; resize: none;
      outline: none; line-height: 1.4;
      max-height: 72px; overflow-y: auto;
    }
    #cc-input:focus { border-color: ${COLOR}; }
    #cc-input::placeholder { color: #b4b2a9; }
    #cc-send {
      background: ${COLOR}; color: #fff; border: none;
      border-radius: 8px; width: 40px; height: 40px;
      cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity 0.15s;
    }
    #cc-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #cc-send:hover:not(:disabled) { opacity: 0.85; }

    #cc-suggestions {
      padding: 0 16px 8px; display: flex; flex-wrap: wrap; gap: 6px;
      flex-shrink: 0;
    }
    .cc-suggestion {
      background: ${COLOR_LIGHT}; color: ${COLOR};
      border: 1px solid ${COLOR_MED};
      border-radius: 16px; padding: 5px 12px;
      font-size: 11px; cursor: pointer;
      font-family: 'Mulish', sans-serif;
      transition: background 0.15s;
    }
    .cc-suggestion:hover { background: ${COLOR_MED}; }

    @media (max-width: 440px) {
      #cc-panel { width: calc(100vw - 16px); right: 8px; bottom: 8px; height: calc(100vh - 72px); }
      #cc-fab { bottom: 16px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  /* ── Create DOM ── */
  // FAB
  const fab = document.createElement('button');
  fab.id = 'cc-fab';
  fab.innerHTML = CFG.emoji;
  fab.title = CFG.label;
  document.body.appendChild(fab);

  // Panel
  const panel = document.createElement('div');
  panel.id = 'cc-panel';
  panel.innerHTML = `
    <div id="cc-header">
      <span id="cc-header-emoji">${CFG.emoji}</span>
      <div id="cc-header-text">
        <div id="cc-header-title">${CFG.label}</div>
        <div id="cc-header-sub">${CFG.toolName} — Infofrankrijk</div>
      </div>
      <button id="cc-close" title="Sluiten">×</button>
    </div>
    <div id="cc-messages"></div>
    <div id="cc-suggestions"></div>
    <div id="cc-input-area">
      <textarea id="cc-input" rows="1" placeholder="Stel een vraag over uw berekening…"></textarea>
      <button id="cc-send" disabled title="Verstuur">➤</button>
    </div>
  `;
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector('#cc-messages');
  const suggestionsEl = panel.querySelector('#cc-suggestions');
  const inputEl = panel.querySelector('#cc-input');
  const sendBtn = panel.querySelector('#cc-send');
  const closeBtn = panel.querySelector('#cc-close');

  let conversationHistory = [];
  let isOpen = false;
  let isProcessing = false;

  /* ── Suggestions ── */
  const SUGGESTIONS = [
    'Leg het verschil uit',
    'Hoe kan ik optimaliseren?',
    'Wat doet de lijfrente?',
    'Waarom betaal ik meer?',
  ];

  function renderSuggestions() {
    suggestionsEl.innerHTML = '';
    if (conversationHistory.length > 0) return;
    SUGGESTIONS.forEach((text) => {
      const btn = document.createElement('button');
      btn.className = 'cc-suggestion';
      btn.textContent = text;
      btn.addEventListener('click', () => sendMessage(text));
      suggestionsEl.appendChild(btn);
    });
  }

  /* ── Messages ── */
  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `cc-msg ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'cc-typing';
    div.id = 'cc-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('cc-typing')?.remove();
  }

  /* ── Get tool state ── */
  function getToolState() {
    if (typeof window.getToolState === 'function') {
      return window.getToolState();
    }
    return null;
  }

  /* ── API call ── */
  async function sendMessage(text) {
    if (isProcessing || !text.trim()) return;
    isProcessing = true;
    sendBtn.disabled = true;
    inputEl.value = '';
    suggestionsEl.innerHTML = '';

    addMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });

    showTyping();

    try {
      const toolState = getToolState();
      const res = await fetch(CFG.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          toolState,
        }),
      });

      hideTyping();

      if (!res.ok) {
        addMessage('system', 'Er ging iets mis. Probeer het opnieuw.');
        isProcessing = false;
        sendBtn.disabled = false;
        return;
      }

      const data = await res.json();
      const reply = data.reply || 'Geen antwoord ontvangen.';
      addMessage('assistant', reply);
      conversationHistory.push({ role: 'assistant', content: reply });
    } catch (err) {
      hideTyping();
      console.error('cc-embed error:', err);
      addMessage('system', 'Verbindingsfout. Controleer uw internetverbinding.');
    }

    isProcessing = false;
    sendBtn.disabled = !inputEl.value.trim();
  }

  /* ── Event listeners ── */
  fab.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    fab.classList.toggle('open', isOpen);
    fab.innerHTML = isOpen ? '✕' : CFG.emoji;
    if (isOpen && conversationHistory.length === 0) {
      addMessage(
        'assistant',
        `Welkom bij ${CFG.label}. Ik kan uw ${CFG.toolName}-berekening interpreteren, het verschil tussen de landen uitleggen, en optimalisatietips geven. Wat wilt u weten?`
      );
      renderSuggestions();
      inputEl.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.classList.remove('open');
    fab.classList.remove('open');
    fab.innerHTML = CFG.emoji;
  });

  inputEl.addEventListener('input', () => {
    sendBtn.disabled = !inputEl.value.trim() || isProcessing;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 72) + 'px';
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputEl.value);
    }
  });

  sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
})();
