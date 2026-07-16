/* ==========================================================================
   CINTEXA SUPPORT — live chat widget frontend
   Calls a Cloudflare Worker endpoint (see /worker/support-worker.js) which
   proxies to the Anthropic API with a system prompt scoped to Cintexa sales
   and support. Update SUPPORT_ENDPOINT below to your deployed Worker URL
   before going live.
   ========================================================================== */

(function () {
  const SUPPORT_ENDPOINT = 'https://support.cintexa.workers.dev/chat'; // <-- replace with your deployed Worker URL

  const launcher = document.getElementById('support-launcher');
  const panel = document.getElementById('support-panel');
  const closeBtn = document.getElementById('support-close');
  const messagesEl = document.getElementById('support-messages');
  const suggestionsEl = document.getElementById('support-suggestions');
  const form = document.getElementById('support-form');
  const input = document.getElementById('support-input');
  const sendBtn = document.getElementById('support-send');

  if (!launcher || !panel) return;

  const SUGGESTIONS = [
    'What services do you offer?',
    'How do your packages compare?',
    'How do I get started?',
  ];

  let history = []; // { role: 'user' | 'assistant', content: string }
  let isOpen = false;
  let isSending = false;

  function open() {
    isOpen = true;
    panel.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true');
    if (messagesEl.children.length === 0) {
      addMessage('support', "Hi, I'm here to help 👋 Ask me about our website, app, or software development services, how our packages work, or how to get a project started. What can I help with?");
      renderSuggestions();
    }
    input.focus();
  }

  function close() {
    isOpen = false;
    panel.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
  }

  launcher.addEventListener('click', () => (isOpen ? close() : open()));
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); });

  function addMessage(from, text) {
    const wrap = document.createElement('div');
    wrap.className = `cs-msg from-${from}`;
    const avatar = document.createElement('div');
    avatar.className = 'cs-msg-avatar';
    avatar.innerHTML = '<img src="assets/logo/cintexa-logo-widget.png" alt="" width="16" height="16">';
    const bubble = document.createElement('div');
    bubble.className = 'cs-bubble';
    // Render plain text safely with paragraph breaks; no HTML injection from model output.
    text.split('\n').filter(Boolean).forEach(line => {
      const p = document.createElement('p');
      p.textContent = line;
      bubble.appendChild(p);
    });
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'cs-msg from-support';
    wrap.id = 'support-typing-indicator';
    wrap.innerHTML = `
      <div class="cs-msg-avatar"><img src="assets/logo/cintexa-logo-widget.png" alt="" width="16" height="16"></div>
      <div class="cs-typing"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('support-typing-indicator');
    if (el) el.remove();
  }

  function renderSuggestions() {
    suggestionsEl.innerHTML = '';
    SUGGESTIONS.forEach(s => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cs-suggestion-chip';
      chip.textContent = s;
      chip.addEventListener('click', () => { input.value = s; sendMessage(); });
      suggestionsEl.appendChild(chip);
    });
  }

  function clearSuggestions() { suggestionsEl.innerHTML = ''; }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isSending) return;

    clearSuggestions();
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';
    isSending = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(SUPPORT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error(`Worker responded ${res.status}`);
      const data = await res.json();
      hideTyping();

      const reply = data.reply || "Sorry, I didn't quite catch that — could you rephrase?";
      addMessage('support', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      hideTyping();
      addMessage('support', "I'm having trouble connecting right now. In the meantime, you can reach the team directly at info@cintexa.com, or use the contact form below.");
      console.error('Support widget error:', err);
    } finally {
      isSending = false;
      sendBtn.disabled = false;
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 90) + 'px';
  });
})();
