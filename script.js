(function(){
  const toggle = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const form = document.getElementById('chat-form');
  const input = document.getElementById('input');
  const messagesEl = document.getElementById('messages');
  const typing = document.getElementById('typing-indicator');
  const chatMain = document.getElementById('chat-main');

  const PERSONA = { name: 'Finance Manager', tone: 'strict', focus: 'business-finance' };

  function setTheme(isDark){
    root.dataset.theme = isDark ? 'dark' : 'light';
    toggle.textContent = isDark ? 'Dark' : 'Light';
  }
  toggle.addEventListener('click', ()=>{
    const isDark = root.dataset.theme !== 'dark';
    setTheme(isDark);
    saveMeta();
  });
  const meta = JSON.parse(localStorage.getItem('chat_meta') || '{}');
  setTheme(meta.theme !== 'light');

  function loadMessages(){ try{return JSON.parse(localStorage.getItem('chat_messages') || '[]');}catch(e){return []} }
  function saveMessages(arr){ localStorage.setItem('chat_messages', JSON.stringify(arr)); }
  function saveMeta(){ localStorage.setItem('chat_meta', JSON.stringify({ theme: root.dataset.theme })); }

  function renderMessages(){
    messagesEl.innerHTML = '';
    const arr = loadMessages();
    arr.forEach(m => {
      const node = createMessageNode(m.text, m.sender, m.time);
      messagesEl.appendChild(node);
    });
    chatMain.scrollTop = chatMain.scrollHeight;
  }

  function createMessageNode(text, sender='sent', time=null){
    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const t = time || new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    meta.innerHTML = `${sender==='sent'?'You':PERSONA.name} <span class="time">${t}</span>`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    msg.appendChild(meta);
    msg.appendChild(bubble);
    return msg;
  }

  function pushMessage(text, sender){
    const arr = loadMessages();
    arr.push({text, sender, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});
    saveMessages(arr);
    renderMessages();
  }

  function generateBusinessReply(input){
    const s = input.toLowerCase();
    const keywords = {
      budget: 'Set a 3-tier budget: fixed costs, variable costs, and discretionary spending.',
      save: 'To save more: automate transfers and separate savings for business reserves.',
      invoice: 'Send invoices within 24 hours of delivery and track unpaid invoices weekly.',
      payroll: 'Keep a payroll reserve of 1.5x monthly payroll for stability.',
      profit: 'Improve profit by cutting variable costs and revising low-margin services.',
      expenses: 'Categorize and review monthly expenses to reduce unnecessary costs.',
      loan: 'Compare loan APRs and ensure monthly payments stay below 30% of cashflow.',
      pricing: 'Use value-based pricing for premium services and clear packages for clients.',
      'cash flow': 'Build a 90-day cashflow forecast and track overdue receivables.',
      tax: 'Set aside 25% of income for taxes and keep receipts well organized.'
    };
    for(const k in keywords){ if(s.includes(k)) return keywords[k]; }
    if(s.includes('plan') || s.includes('help')){
      return 'I can help create a 30-day finance action plan. Share your monthly revenue and expenses.';
    }
    return 'I can assist with budgeting, invoices, cashflow, and savings. Ask me something specific.';
  }

  function replyTo(text){
    typing.classList.remove('hidden');
    const delay = Math.min(2500 + text.length * 20, 6000);
    setTimeout(()=>{
      typing.classList.add('hidden');
      const reply = generateBusinessReply(text);
      pushMessage(reply, 'received');
    }, delay);
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const txt = input.value.trim();
    if(!txt) return;
    pushMessage(txt, 'sent');
    input.value = '';
    setTimeout(()=> replyTo(txt), 300);
  });

  const existing = loadMessages();
  if(existing.length === 0){
    pushMessage('Hello — I am your Business Finance Assistant. What’s your biggest money challenge right now?', 'received');
  } else { renderMessages(); }

})();