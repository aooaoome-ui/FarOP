import { saveData } from './firebase.js';
import { getAlerts } from './notifications.js';
import { renderSettings } from './settings.js';
import { actItems, cropItems, custItems, farmSettings, invItems, projectItems, salesData } from './state.js';
import { showToast } from './ui.js';

// ============================================================
let _aiOpen    = false;
let _aiHistory = []; // { role, content }
let _aiLoading = false;

export function toggleAiPanel() {
  _aiOpen = !_aiOpen;
  const panel = document.getElementById('ai-panel');
  if (!panel) return;
  panel.classList.toggle('open', _aiOpen);
  if (_aiOpen && _aiHistory.length === 0) _aiWelcome();
}

export function _aiWelcome() {
  const today   = new Date().toLocaleDateString('th-TH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const readyCnt = cropItems.filter(c => c.status === 'พร้อมเก็บ').length;
  const alertCnt = getAlerts().length;
  _aiAddBubble('bot', `สวัสดีครับ! ผมคือ AI ที่ปรึกษาฟาร์ม **${farmSettings.name}** 🌿\n\nวันนี้ (${today}) มีข้อมูลน่าสนใจ:\n- 🌾 พืชพร้อมเก็บ **${readyCnt}** แปลง\n- 🔔 การแจ้งเตือน **${alertCnt}** รายการ\n\nถามได้เลยครับ ทั้งข้อมูลในระบบ คำแนะนำด้านเกษตร โรคพืช หรืออะไรก็ตาม!`);
}

export function _aiFarmContext() {
  const today = new Date().toISOString().slice(0,10);
  const readyCrops = cropItems.filter(c=>c.status==='พร้อมเก็บ').map(c=>`${c.name} (${c.plot})`).join(', ') || 'ไม่มี';
  const activeCrops = cropItems.filter(c=>!['เก็บเกี่ยวแล้ว','เสียหาย/ตาย'].includes(c.status)).length;
  const monthRev = salesData.filter(s=>s.date&&s.date.startsWith(today.slice(0,7))).reduce((s,i)=>s+i.total,0);
  const lowSupply = invItems.filter(i=>i.cat!=='ผลผลิต'&&i.qty<=(i.threshold||0)&&i.qty>=0).map(i=>`${i.name} (${i.qty} ${i.unit})`).join(', ') || 'ไม่มี';
  const outOfStock = invItems.filter(i=>i.cat!=='ผลผลิต'&&i.qty===0).map(i=>i.name).join(', ') || 'ไม่มี';
  const recentActs = actItems.slice(0,5).map(a=>`${a.date} ${a.type} แปลง${a.plot}`).join('; ');
  const activeProj = projectItems.filter(p=>p.status==='กำลังดำเนินการ'||p.status==='มีปัญหา').map(p=>`${p.name} (${p.pct}%, ${p.status})`).join(', ') || 'ไม่มี';
  const topSales = Object.entries(salesData.reduce((m,s)=>{m[s.product]=(m[s.product]||0)+s.total;return m;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([p,v])=>`${p}=${v.toLocaleString('th-TH')}฿`).join(', ');

  return `=== ข้อมูลฟาร์ม "${farmSettings.name}" ===
วันที่: ${today}
ที่ตั้ง: ${farmSettings.location} | พื้นที่: ${farmSettings.area} ไร่
เจ้าของ: ${farmSettings.owner}

พืชผล:
- ทั้งหมด ${cropItems.length} รายการ (กำลังปลูก ${activeCrops} รายการ)
- พร้อมเก็บ: ${readyCrops}
- พืชที่ปลูก: ${cropItems.slice(0,10).map(c=>`${c.name}(${c.status})`).join(', ')}

กิจกรรมล่าสุด (5 รายการ): ${recentActs}

คลังวัสดุ:
- วัสดุใกล้หมด: ${lowSupply}
- หมดสต็อก: ${outOfStock}
- ผลผลิตในคลัง: ${invItems.filter(i=>i.cat==='ผลผลิต').map(i=>`${i.name}${i.qty}กก.`).join(', ')||'ว่าง'}

ยอดขาย:
- เดือนนี้: ${monthRev.toLocaleString('th-TH')} ฿
- สินค้าขายดี: ${topSales}
- ลูกค้า: ${custItems.slice(0,5).map(c=>c.name).join(', ')}

โครงการ: ${activeProj}
===`;
}

export function aiQuickAsk(btn) {
  const text = btn.textContent.replace(/^[\p{Emoji}\s]+/u,'').trim();
  document.getElementById('ai-input').value = text;
  sendAiMessage();
}

export function onProviderChange() {
  const prov  = document.querySelector('input[name="ai-provider"]:checked')?.value || 'openrouter';
  const sections = { openrouter:'openrouter-key-section', gemini:'gemini-key-section', anthropic:'anthropic-key-section' };
  const colors   = { openrouter:'#10b981', gemini:'#4285f4', anthropic:'#6366f1' };
  Object.keys(sections).forEach(p => {
    const sec  = document.getElementById(sections[p]);
    const card = document.getElementById('provider-card-' + p);
    if (sec)  sec.style.display  = p === prov ? '' : 'none';
    if (card) card.style.borderColor = p === prov ? colors[p] : 'var(--gray-200)';
  });
  // custom model field — เฉพาะ OpenRouter
  const modelSec = document.getElementById('openrouter-model-section');
  if (modelSec) modelSec.style.display = prov === 'openrouter' ? '' : 'none';
}

export function saveAiKey() {
  const prov  = document.querySelector('input[name="ai-provider"]:checked')?.value || 'openrouter';
  farmSettings.aiProvider    = prov;
  farmSettings.openrouterKey   = document.getElementById('st-openrouter-key')?.value.trim()    || '';
  farmSettings.openrouterModel = document.getElementById('st-openrouter-model')?.value.trim()  || '';
  farmSettings.geminiKey       = document.getElementById('st-gemini-key')?.value.trim()        || '';
  farmSettings.anthropicKey    = document.getElementById('st-anthropic-key')?.value.trim()     || '';
  saveData();
  renderSettings();
  const activeKey = { openrouter: farmSettings.openrouterKey, gemini: farmSettings.geminiKey, anthropic: farmSettings.anthropicKey }[prov];
  const labels    = { openrouter:'🆓 OpenRouter', gemini:'🌏 Gemini', anthropic:'⚡ Anthropic' };
  showToast(activeKey ? `✅ บันทึกแล้ว — ${labels[prov]} พร้อมใช้งาน` : '⚠️ ยังไม่ได้ใส่ API Key');
}

export async function sendAiMessage() {
  if (_aiLoading) return;
  const provider = farmSettings.aiProvider || 'openrouter';
  const keyMap   = { openrouter: farmSettings.openrouterKey, gemini: farmSettings.geminiKey, anthropic: farmSettings.anthropicKey };
  const apiKey   = keyMap[provider]?.trim();

  if (!apiKey) {
    _aiAddBubble('bot',
      '⚠️ **ยังไม่มี API Key**\n\nไปที่ **⚙️ ตั้งค่า → AI ที่ปรึกษาฟาร์ม**\n\n🆓 **แนะนำ OpenRouter** — ฟรี ใช้ได้ในไทย\nสมัครที่ [openrouter.ai](https://openrouter.ai/keys)');
    return;
  }

  const input = document.getElementById('ai-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = ''; input.style.height = 'auto';

  _aiAddBubble('user', text);
  _aiHistory.push({ role:'user', content: text });
  _aiLoading = true;
  document.getElementById('ai-send-btn').disabled = true;
  const thinkId = _aiAddBubble('bot', '⏳ กำลังคิด...', 'thinking');

  const systemPrompt = `คุณคือ AI ที่ปรึกษาเกษตรอินทรีย์สำหรับฟาร์ม "${farmSettings.name}" ในจังหวัดลำปาง ภาคเหนือของประเทศไทย

บทบาท: ให้คำแนะนำด้านเกษตรอินทรีย์ โรคพืช ศัตรูพืช การใส่ปุ๋ย และการเก็บเกี่ยว วิเคราะห์ข้อมูลในระบบ ตอบเป็นภาษาไทย กระชับ ใช้ emoji บ้าง

${_aiFarmContext()}`;

  try {
    let reply;
    if (provider === 'gemini') {
      reply = await _sendGemini(apiKey, systemPrompt, _aiHistory.slice(-8));
    } else if (provider === 'openrouter') {
      reply = await _sendOpenRouter(apiKey, systemPrompt, _aiHistory.slice(-8));
    } else {
      reply = await _sendAnthropic(apiKey, systemPrompt, _aiHistory.slice(-8));
    }
    _aiRemoveBubble(thinkId);
    _aiAddBubble('bot', reply);
    _aiHistory.push({ role:'assistant', content: reply });
  } catch (err) {
    _aiRemoveBubble(thinkId);
    _aiAddBubble('bot', `❌ **${err.message}**`);
  }

  _aiLoading = false;
  document.getElementById('ai-send-btn').disabled = false;
  document.getElementById('ai-input')?.focus();
}

export async function _sendGemini(apiKey, systemPrompt, history) {
  const contents = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  // เรียงตาม free quota: gemini-1.5-flash > gemini-2.0-flash-lite > gemini-2.0-flash
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
  let lastErr = '';

  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        })
      }
    );

    if (res.ok) {
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'ขอโทษครับ ไม่สามารถตอบได้';
    }

    const e    = await res.json().catch(() => ({}));
    const msg  = e.error?.message || e.error?.status || `HTTP ${res.status}`;
    lastErr    = `[${model}] ${msg}`;

    // ถ้าเป็นปัญหา key/region → ไม่ต้อง retry model อื่น
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      if (msg.toLowerCase().includes('api key')) throw new Error('API Key ไม่ถูกต้อง — ตรวจสอบในตั้งค่า');
      if (msg.toLowerCase().includes('region') || msg.toLowerCase().includes('location') || msg.toLowerCase().includes('country'))
        throw new Error('Gemini ไม่รองรับในภูมิภาคนี้\nลองใช้ VPN หรือเปลี่ยนเป็น Anthropic Claude แทน');
      throw new Error(`Gemini error: ${msg}`);
    }
    // 429 = quota/rate limit → ลอง model ถัดไป
  }

  throw new Error(`ใช้เกิน quota หรือ model ไม่พร้อม\n${lastErr}\nลองใหม่ในอีก 1 นาที หรือเปลี่ยนเป็น Anthropic`);
}

export async function _sendOpenRouter(apiKey, systemPrompt, history) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history
  ];
  // ดึง model จาก settings ถ้ามี หรือใช้ list ฟรี
  const customModel = farmSettings.openrouterModel?.trim();
  const models = customModel ? [customModel] : [
    'deepseek/deepseek-r1:free',
    'deepseek/deepseek-v3:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-235b-a22b:free',
    'google/gemini-2.5-flash-preview:free',
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'nousresearch/deephermes-3-llama-3-8b-preview:free'
  ];
  let lastErr = '';
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://farm-management-app.local',
          'X-Title': 'Farm Management AI'
        },
        body: JSON.stringify({ model, messages, max_tokens: 1000, temperature: 0.7 })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
      const e = await res.json().catch(() => ({}));
      const msg = e.error?.message || `HTTP ${res.status}`;
      if (res.status === 401) throw new Error('API Key ไม่ถูกต้อง — ตรวจสอบ key ที่ openrouter.ai/keys');
      if (res.status === 402) throw new Error('เครดิตหมด — เติมเงินขั้นต่ำ $1 ที่ openrouter.ai/credits');
      if (res.status === 429) throw new Error('ใช้เกิน rate limit — รอสักครู่แล้วลองใหม่');
      lastErr = `[${model.split('/')[1]}] ${msg}`;
    } catch(e) {
      if (e.message.includes('Key') || e.message.includes('เครดิต') || e.message.includes('rate')) throw e;
      lastErr = e.message;
    }
  }
  throw new Error(`ไม่มี free model พร้อมใช้งานตอนนี้\n\nวิธีแก้:\n① ดู model ที่ใช้ได้ที่ openrouter.ai/models?q=free\n② ก็อปชื่อ model แล้วใส่ในช่อง "กำหนด model เอง" ในตั้งค่า\n③ หรือเติมเครดิต $1 เพื่อใช้ได้ทุก model`);
}

export async function _sendAnthropic(apiKey, systemPrompt, history) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages: history
    })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('API Key ไม่ถูกต้อง กรุณาตรวจสอบในตั้งค่า');
    if (res.status === 429) throw new Error('ใช้เกิน quota กรุณารอสักครู่');
    throw new Error(e.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || 'ขอโทษครับ ไม่สามารถตอบได้';
}

let _aiMsgId = 0;
export function _aiAddBubble(role, text, extra = '') {
  const id   = 'ai-msg-' + (++_aiMsgId);
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return id;
  const div  = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.id = id;
  const icon = role === 'bot' ? '🤖' : '👤';
  // Convert markdown-ish text to HTML
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n• ')
    .replace(/\n/g, '<br>');
  div.innerHTML = `
    <div class="ai-avatar ${role}">${icon}</div>
    <div class="ai-bubble ${role} ${extra}">${html}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

export function _aiRemoveBubble(id) {
  document.getElementById(id)?.remove();
}

// Close AI panel when clicking outside
document.addEventListener('click', e => {
  if (!_aiOpen) return;
  const panel = document.getElementById('ai-panel');
  const fab   = document.getElementById('ai-fab');
  if (panel && !panel.contains(e.target) && fab && !fab.contains(e.target)) {
    _aiOpen = false;
    panel.classList.remove('open');
  }
});

// ============================================================
// ============================================================
export function _autoUpdateCropStatuses() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().slice(0, 10);
  const SKIP = new Set(['เก็บเกี่ยวแล้ว', 'เสียหาย/ตาย', 'พร้อมเก็บ']);
  let changed = false;
  cropItems.forEach(c => {
    if (!c.harvestDate || SKIP.has(c.status)) return;
    if (c.harvestDate <= todayISO) {
      c.status = 'พร้อมเก็บ';
      changed = true;
    }
  });
  if (changed) saveData();
}

// ============================================================
// ===== BOOT =====
