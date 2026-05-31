import { onProviderChange } from './ai.js';
import { saveData } from './firebase.js';
import { actItems, actRendered, calEvents, cropItems, cropRendered, custItems, custRendered, farmSettings, goalItems, goalsRendered, invItems, invRendered, salesData, salesRendered, setActRendered, setCropRendered, setCustRendered, setGoalsRendered, setInvRendered, setSalesRendered, setInvItems, setCalEvents } from './state.js';
import { navigate, showToast } from './ui.js';
import { dateStr } from './utils.js';

// ============================================================

export function renderSettings() {
  const s = farmSettings;
  document.getElementById('st-farm-name').value  = s.name;
  document.getElementById('st-farm-loc').value   = s.location;
  document.getElementById('st-farm-area').value  = s.area;
  document.getElementById('st-farm-owner').value = s.owner || '';
  document.getElementById('st-farm-desc').value  = s.desc  || '';
  document.getElementById('st-shelf-life').value = s.shelfLife || 7;
  document.getElementById('st-alert-pct').value  = s.alertPct  || 20;
  // ── AI key status ──
  const keyEl   = document.getElementById('st-anthropic-key');
  const gKeyEl  = document.getElementById('st-gemini-key');
  const orKeyEl = document.getElementById('st-openrouter-key');
  const statusEl = document.getElementById('ai-key-status');
  if (keyEl)   keyEl.value   = s.anthropicKey  || '';
  if (gKeyEl)  gKeyEl.value  = s.geminiKey     || '';
  if (orKeyEl)   orKeyEl.value   = s.openrouterKey  || '';
  const orModelEl = document.getElementById('st-openrouter-model');
  if (orModelEl) orModelEl.value = s.openrouterModel || '';
  const prov = s.aiProvider || 'openrouter';
  const radio = document.getElementById('ai-provider-' + prov);
  if (radio) radio.checked = true;
  onProviderChange();
  const keyMap   = { openrouter: s.openrouterKey, gemini: s.geminiKey, anthropic: s.anthropicKey };
  const labelMap = { openrouter:'🆓 OpenRouter', gemini:'🌏 Gemini', anthropic:'⚡ Anthropic' };
  const activeKey = keyMap[prov];
  if (statusEl) {
    statusEl.innerHTML = activeKey
      ? `✅ <span style="color:var(--green-700);font-weight:600;">${labelMap[prov]} — พร้อมใช้งาน</span>`
      : `⚠️ <span style="color:#f59e0b;">ยังไม่มี API Key — ใส่แล้วกดบันทึก</span>`;
  }
  // Render per-type shelf life inputs
  const CROP_TYPES = ['พืชผัก','พืชสวนครัว','ไม้ผล','ไม้ดอก','ไม้เศรษฐกิจ','พืชไร่','สมุนไพร','อื่นๆ'];
  const sbtEl = document.getElementById('shelf-by-type-list');
  if (sbtEl) {
    sbtEl.innerHTML = CROP_TYPES.map(t => {
      const val = (s.shelfByType||{})[t] || s.shelfLife || 7;
      return `<div style="display:flex;align-items:center;gap:8px;background:var(--gray-50);border-radius:var(--radius-sm);padding:6px 10px;">
        <span style="flex:1;font-size:13px">${t}</span>
        <input type="number" id="st-shelf-${t}" value="${val}" min="1" max="365"
          style="width:70px;padding:4px 8px;border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:13px;text-align:center">
        <span style="font-size:11px;color:var(--gray-400)">วัน</span>
      </div>`;
    }).join('');
  }
  renderWorkerList();
  renderPlotList();
}

export function renderWorkerList() {
  const el = document.getElementById('worker-list');
  if (!el) return;
  el.innerHTML = farmSettings.workers.map((w,i) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-50);border:1px solid var(--green-200);border-radius:20px;padding:4px 10px;font-size:13px;">
      👷 ${w}
      <button onclick="removeWorker(${i})" style="background:none;border:none;cursor:pointer;color:var(--red-400);font-size:14px;line-height:1;padding:0 2px;">×</button>
    </span>`
  ).join('');
  // Sync to activity modal worker dropdown
  _syncWorkerDropdown();
}

export function renderPlotList() {
  const el = document.getElementById('plot-list');
  if (!el) return;
  el.innerHTML = farmSettings.plots.map((p,i) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--sky-50);border:1px solid var(--sky-200);border-radius:20px;padding:4px 10px;font-size:13px;">
      🗺️ ${p}
      <button onclick="removePlot(${i})" style="background:none;border:none;cursor:pointer;color:var(--red-400);font-size:14px;line-height:1;padding:0 2px;">×</button>
    </span>`
  ).join('');
  // Sync to activity modal plot dropdown
  _syncPlotDropdown();
}

export function addWorker() {
  const inp = document.getElementById('st-worker-new');
  const val = inp.value.trim();
  if (!val) { inp.focus(); return; }
  if (farmSettings.workers.includes(val)) { showToast('⚠️ มีชื่อนี้แล้ว'); return; }
  farmSettings.workers.push(val);
  inp.value = '';
  renderWorkerList();
  saveData();
  showToast('✅ เพิ่มผู้ปฏิบัติงาน: ' + val);
}

export function removeWorker(idx) {
  const name = farmSettings.workers[idx];
  farmSettings.workers.splice(idx, 1);
  renderWorkerList();
  saveData();
  showToast('🗑 ลบ ' + name + ' แล้ว');
}

export function addPlot() {
  const inp = document.getElementById('st-plot-new');
  const val = inp.value.trim();
  if (!val) { inp.focus(); return; }
  if (farmSettings.plots.includes(val)) { showToast('⚠️ มีแปลงนี้แล้ว'); return; }
  farmSettings.plots.push(val);
  inp.value = '';
  renderPlotList();
  saveData();
  showToast('✅ เพิ่มแปลง: ' + val);
}

export function removePlot(idx) {
  const name = farmSettings.plots[idx];
  farmSettings.plots.splice(idx, 1);
  renderPlotList();
  saveData();
  showToast('🗑 ลบแปลง ' + name + ' แล้ว');
}

export function saveSettingsFarm() {
  farmSettings.name     = document.getElementById('st-farm-name').value.trim() || farmSettings.name;
  farmSettings.location = document.getElementById('st-farm-loc').value.trim();
  farmSettings.area     = parseFloat(document.getElementById('st-farm-area').value) || farmSettings.area;
  farmSettings.owner    = document.getElementById('st-farm-owner').value.trim();
  farmSettings.desc     = document.getElementById('st-farm-desc').value.trim();
  // Update sidebar badge
  _applySidebarInfo();
  saveData();
  showToast('✅ บันทึกข้อมูลฟาร์มแล้ว');
}

export function saveSettingsDefaults() {
  farmSettings.shelfLife = parseInt(document.getElementById('st-shelf-life').value) || 7;
  farmSettings.alertPct  = parseInt(document.getElementById('st-alert-pct').value)  || 20;
  // Save per-type shelf life
  if (!farmSettings.shelfByType) farmSettings.shelfByType = {};
  const CROP_TYPES = ['พืชผัก','พืชสวนครัว','ไม้ผล','ไม้ดอก','ไม้เศรษฐกิจ','พืชไร่','สมุนไพร','อื่นๆ'];
  CROP_TYPES.forEach(t => {
    const el = document.getElementById('st-shelf-' + t);
    if (el && el.value) farmSettings.shelfByType[t] = parseInt(el.value) || farmSettings.shelfLife;
  });
  saveData();
  showToast('✅ บันทึกค่าเริ่มต้นแล้ว');
}

export function _applySidebarInfo() {
  const badge = document.querySelector('.badge-text');
  if (badge) {
    badge.innerHTML = `${farmSettings.name}<br>
      <span style="font-size:11px;opacity:.6;">${farmSettings.location} · ${farmSettings.area} ไร่ · </span>
      <span style="font-size:11px;color:var(--green-600);font-weight:600;">V0.4.5</span>`;
  }
  // Update title tag
  document.title = farmSettings.name + ' — ระบบจัดการฟาร์ม';
}

// Sync workers to activity person dropdown
export function _syncWorkerDropdown() {
  const sel = document.getElementById('act-person-select');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- เลือกผู้ปฏิบัติงาน --</option>';
  farmSettings.workers.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w; opt.textContent = w;
    if (w === cur) opt.selected = true;
    sel.appendChild(opt);
  });
  const other = document.createElement('option');
  other.value = 'other'; other.textContent = '✏️ พิมพ์เอง...';
  sel.appendChild(other);
}

export function handleActPersonChange() {
  const val = document.getElementById('act-person-select')?.value;
  const wrap = document.getElementById('act-person-other-wrap');
  if (wrap) wrap.style.display = val === 'other' ? '' : 'none';
  if (val === 'other') document.getElementById('act-person')?.focus();
}

// Sync plots to activity plot dropdown
export function _syncPlotDropdown() {
  const sel = document.getElementById('act-plot-select');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- เลือกแปลง --</option>';
  farmSettings.plots.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    if (p === cur) opt.selected = true;
    sel.appendChild(opt);
  });
  const other = document.createElement('option');
  other.value = 'other'; other.textContent = '✏️ พิมพ์เอง...';
  sel.appendChild(other);
  // also add ทุกแปลง
  const all = document.createElement('option');
  all.value = 'ทุกแปลง'; all.textContent = 'ทุกแปลง';
  sel.insertBefore(all, other);
}

// Export data as JSON file
export function exportData() {
  const data = { farmSettings, cropItems, actItems, invItems, custItems, salesData, goalItems, calEvents, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'farm_backup_' + dateStr + '.json';
  a.click();
  showToast('📤 ส่งออกข้อมูลสำเร็จ');
}

// Import data from JSON file
export function importDataPrompt() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!confirm('📥 นำเข้าข้อมูลจากไฟล์?\n\nข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด')) return;
        if (data.farmSettings) Object.assign(farmSettings, data.farmSettings);
        if (data.cropItems)    { cropItems.length=0; data.cropItems.forEach(x=>cropItems.push(x)); }
        if (data.actItems)     { actItems.length=0; data.actItems.forEach(x=>actItems.push(x)); }
        if (data.invItems)     setInvItems(data.invItems);
        if (data.custItems)    { custItems.length=0; data.custItems.forEach(x=>custItems.push(x)); }
        if (data.salesData)    { salesData.length=0; data.salesData.forEach(x=>salesData.push(x)); }
        if (data.goalItems)    { goalItems.length=0; data.goalItems.forEach(x=>goalItems.push(x)); }
        if (data.calEvents)    setCalEvents(data.calEvents);
        saveData();
        // Reset render flags
        setActRendered(false); setCropRendered(false); setCustRendered(false); setGoalsRendered(false); setInvRendered(false); setSalesRendered(false);
        navigate('dashboard', document.querySelector('.nav-item[onclick*="dashboard"]'));
        showToast('✅ นำเข้าข้อมูลสำเร็จ');
      } catch(e) { showToast('❌ ไฟล์ไม่ถูกต้อง'); }
    };
    reader.readAsText(file);
  };
  inp.click();
}

// ============================================================
// ===== 🔥 FIREBASE CONFIG — ใส่ค่าจาก Firebase Console =====
