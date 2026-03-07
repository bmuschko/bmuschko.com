// AI Context feature — calls Google Gemini to generate structured narratives
(function() {
  var API_URL = window.AI_CONFIG ? window.AI_CONFIG.apiUrl : '';
  var cache = {};

  var SVG_VIEW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="bc-ai-icon"><path d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.062 1.06A.75.75 0 116.11 5.173L5.05 4.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 01-1.062-1.061l1.061-1.06a.75.75 0 011.06 0zM10 7a3 3 0 100 6 3 3 0 000-6zm-6.25 3a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5H3a.75.75 0 01.75.75zm14 0a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5H17a.75.75 0 01.75.75zm-11.89 5.11a.75.75 0 011.06-1.06l1.062 1.06a.75.75 0 01-1.061 1.06l-1.06-1.06zm8.78 0a.75.75 0 10-1.06-1.06l-1.062 1.06a.75.75 0 001.061 1.06l1.06-1.06zM10 17a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 17z"/></svg>';
  var SVG_HIDE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="bc-ai-icon"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>';

  window.loadAiContext = function(btn) {
    var card = btn.closest('.bc-card-body');
    var responseEl = card.querySelector('.bc-ai-response');
    var loadingEl = card.querySelector('.bc-ai-loading');
    var errorEl = card.querySelector('.bc-ai-error');
    var contentEl = card.querySelector('.bc-ai-content');
    var cacheKey = btn.getAttribute('data-ai-company') + '::' + btn.getAttribute('data-ai-role');

    // Toggle off if already visible
    if (responseEl.style.display !== 'none') {
      responseEl.style.display = 'none';
      btn.innerHTML = SVG_VIEW + ' View AI Context';
      return;
    }

    responseEl.style.display = 'block';

    // Serve from cache if available
    if (cache[cacheKey]) {
      populateSections(contentEl, cache[cacheKey]);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'none';
      contentEl.style.display = 'block';
      btn.innerHTML = SVG_HIDE + ' Hide AI Context';
      return;
    }

    // Show loading
    loadingEl.style.display = 'flex';
    errorEl.style.display = 'none';
    contentEl.style.display = 'none';
    btn.disabled = true;

    var context = btn.getAttribute('data-ai-context');
    var bullets = btn.getAttribute('data-ai-bullets');
    var role = btn.getAttribute('data-ai-role');
    var company = btn.getAttribute('data-ai-company');

    var prompt = 'You are writing narrative context for a professional portfolio website. ' +
      'The person is named Benjamin and held the role of "' + role + '" at "' + company + '". ' +
      'Here are their resume bullet points:\n\n' + bullets + '\n\n' +
      'And here is additional behind-the-scenes context they provided:\n\n' + context + '\n\n' +
      'Based on this information, write a brief professional narrative in exactly 4 sections. ' +
      'Each section should be 2-3 sentences. Write in third person. Be specific and concrete, not generic. ' +
      'Return your response as a JSON object with exactly these keys: ' +
      '"situation", "approach", "technical", "lessons". ' +
      'Each value should be a plain text string (no markdown). ' +
      'Return ONLY the JSON object, no other text.';

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    })
    .then(function(res) {
      if (!res.ok) {
        return res.json().then(function(errData) {
          var msg = (errData.error && errData.error.message) || ('status ' + res.status);
          throw new Error(msg);
        });
      }
      return res.json();
    })
    .then(function(data) {
      var text = data.candidates[0].content.parts[0].text;
      text = text.replace(/^```json?\s*/, '').replace(/\s*```$/, '').trim();
      var parsed = JSON.parse(text);
      if (!parsed.situation || !parsed.approach || !parsed.technical || !parsed.lessons) {
        throw new Error('Response missing expected sections');
      }
      cache[cacheKey] = parsed;
      populateSections(contentEl, parsed);
      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = SVG_HIDE + ' Hide AI Context';
    })
    .catch(function(err) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'block';
      errorEl.textContent = 'Unable to load AI context. ' + (err.message || 'Please try again.');
      var retry = document.createElement('a');
      retry.href = '#';
      retry.textContent = ' Retry';
      retry.className = 'bc-ai-retry';
      retry.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        responseEl.style.display = 'none';
        btn.disabled = false;
        loadAiContext(btn);
      };
      errorEl.appendChild(retry);
      btn.disabled = false;
    });
  };

  function populateSections(el, data) {
    el.querySelector('[data-section="situation"]').textContent = data.situation;
    el.querySelector('[data-section="approach"]').textContent = data.approach;
    el.querySelector('[data-section="technical"]').textContent = data.technical;
    el.querySelector('[data-section="lessons"]').textContent = data.lessons;
  }
})();

// Ask AI Chat feature
(function() {
  var API_URL = window.AI_CONFIG ? window.AI_CONFIG.apiUrl : '';
  var SYSTEM_CONTEXT = window.AI_CONFIG ? window.AI_CONFIG.systemContext : '';
  var history = [];
  var sending = false;

  window.openChat = function() {
    var overlay = document.getElementById('bc-chat-overlay');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(function() { document.getElementById('bc-chat-input').focus(); }, 100);

    // Handle viewport resize from virtual keyboard on mobile
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }
  };

  window.closeChat = function() {
    document.getElementById('bc-chat-overlay').style.display = 'none';
    document.body.style.overflow = '';
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleViewportResize);
    }
  };

  function handleViewportResize() {
    var modal = document.querySelector('.bc-chat-modal');
    if (modal && window.visualViewport) {
      modal.style.height = window.visualViewport.height + 'px';
    }
  }

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var overlay = document.getElementById('bc-chat-overlay');
      if (overlay && overlay.style.display !== 'none') {
        closeChat();
      }
    }
  });

  window.sendChatMessage = function(text) {
    if (!text || !text.trim() || sending) return;
    text = text.trim();

    var input = document.getElementById('bc-chat-input');
    var messagesEl = document.getElementById('bc-chat-messages');
    var emptyEl = document.getElementById('bc-chat-empty');

    // Hide empty state
    if (emptyEl) emptyEl.style.display = 'none';

    // Clear input
    input.value = '';

    // Add user message
    appendMessage('user', text);
    history.push({ role: 'user', parts: [{ text: text }] });

    // Show loading
    var loadingEl = document.createElement('div');
    loadingEl.className = 'bc-chat-msg bc-chat-msg-assistant';
    loadingEl.innerHTML = '<div class="bc-chat-msg-bubble"><div class="bc-ai-loading" style="display:flex"><div class="bc-ai-spinner"></div><span>Thinking...</span></div></div>';
    messagesEl.appendChild(loadingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    sending = true;

    // Build request with conversation history
    var contents = [{ role: 'user', parts: [{ text: SYSTEM_CONTEXT }] }, { role: 'model', parts: [{ text: 'Understood. I\'ll answer questions about Benjamin based on the portfolio information provided.' }] }].concat(history);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    })
    .then(function(res) {
      if (!res.ok) {
        return res.json().then(function(errData) {
          throw new Error((errData.error && errData.error.message) || ('status ' + res.status));
        });
      }
      return res.json();
    })
    .then(function(data) {
      messagesEl.removeChild(loadingEl);
      var reply = data.candidates[0].content.parts[0].text;
      history.push({ role: 'model', parts: [{ text: reply }] });
      appendMessage('assistant', reply);
      sending = false;
    })
    .catch(function(err) {
      messagesEl.removeChild(loadingEl);
      appendMessage('error', 'Unable to get a response. ' + (err.message || 'Please try again.'));
      // Remove the failed user message from history so they can retry
      history.pop();
      sending = false;
    });
  };

  function renderMarkdown(text) {
    // Escape HTML first to prevent XSS
    var div = document.createElement('div');
    div.textContent = text;
    var safe = div.innerHTML;
    // Process line by line for block-level elements
    var lines = safe.split('\n');
    var out = [];
    var inUl = false, inOl = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // Unordered list: * item, - item
      var ulMatch = line.match(/^[\*\-]\s+(.+)/);
      // Ordered list: 1. item
      var olMatch = line.match(/^\d+\.\s+(.+)/);
      // Header: ## text
      var h3Match = line.match(/^###\s+(.+)/);
      var h2Match = line.match(/^##\s+(.+)/);
      var h1Match = line.match(/^#\s+(.+)/);
      if (ulMatch) {
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (!inUl) { out.push('<ul>'); inUl = true; }
        out.push('<li>' + ulMatch[1] + '</li>');
      } else if (olMatch) {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (!inOl) { out.push('<ol>'); inOl = true; }
        out.push('<li>' + olMatch[1] + '</li>');
      } else {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (h3Match) { out.push('<strong>' + h3Match[1] + '</strong>'); }
        else if (h2Match) { out.push('<strong>' + h2Match[1] + '</strong>'); }
        else if (h1Match) { out.push('<strong>' + h1Match[1] + '</strong>'); }
        else if (line.trim() === '') { out.push('<br>'); }
        else { out.push(line); }
      }
    }
    if (inUl) out.push('</ul>');
    if (inOl) out.push('</ol>');
    safe = out.join('\n');
    // Inline formatting
    safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*(.+?)\*/g, '<em>$1</em>');
    safe = safe.replace(/`(.+?)`/g, '<code>$1</code>');
    // Join remaining plain lines with <br>
    safe = safe.replace(/\n(?!<)/g, '<br>');
    safe = safe.replace(/\n/g, '');
    return safe;
  }

  function appendMessage(role, text) {
    var messagesEl = document.getElementById('bc-chat-messages');
    var msg = document.createElement('div');
    msg.className = 'bc-chat-msg bc-chat-msg-' + role;
    var bubble = document.createElement('div');
    bubble.className = 'bc-chat-msg-bubble';
    if (role === 'assistant') {
      bubble.innerHTML = renderMarkdown(text);
    } else {
      bubble.textContent = text;
    }
    msg.appendChild(bubble);
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
})();
