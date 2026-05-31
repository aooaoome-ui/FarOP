import { saveData } from './firebase.js';
import { invStatus, renderInv } from './inventory.js';
import { _nextReqId, farmSettings, inputBatches, invItems, planTemplates, plotSeasons, reqItems, setReqItems, soilRests } from './state.js';
import { closeModal, showToast } from './ui.js';
import { dateStr, fmtDate } from './utils.js';

// ============================================================
// planTemplates — สูตรการปลูก/ดูแล (reusable)
// plotSeasons — แผนปลูกจริง (instance)

// soilRests — ช่วงพักดิน

// inputBatches — การผลิตวัสดุอินทรีย์

// Built-in input production templates
export const INPUT_TEMPLATES = {
  'ปุ๋ยหมัก':     { icon:'🪣', days:90, color:'#92400e', stages:[
    {name:'เริ่มกองปุ๋ย',      day:0},  {name:'พลิกกอง+ตรวจความชื้น',day:14},
    {name:'พลิกกอง รอบสอง',    day:30}, {name:'ตรวจสอบกลิ่น/สี',     day:60},
    {name:'พร้อมใช้งาน 🎉',    day:90}]},
  'น้ำหมักชีวภาพ':{ icon:'🧴', days:30, color:'#065f46', stages:[
    {name:'เตรียมส่วนผสม+เริ่มหมัก',day:0}, {name:'คนและตรวจกลิ่น',day:7},
    {name:'กรองกาก',              day:21}, {name:'พร้อมใช้งาน 🎉',   day:30}]},
  'ไตรโคเดอม่า':  { icon:'🍄', days:14, color:'#3b5e2b', stages:[
    {name:'เตรียมอาหารเลี้ยงเชื้อ',day:0}, {name:'เพาะและขยายเชื้อ',day:7},
    {name:'พร้อมใช้งาน 🎉',       day:14}]},
  'บิวเวอเรีย':   { icon:'🦠', days:14, color:'#1e3a5f', stages:[
    {name:'เตรียมอาหารเลี้ยงเชื้อ',day:0}, {name:'เพาะและขยายเชื้อ',day:7},
    {name:'พร้อมใช้งาน 🎉',       day:14}]},
  'เมธาไรเซียม':  { icon:'🦠', days:14, color:'#4c1d95', stages:[
    {name:'เตรียมอาหารเลี้ยงเชื้อ',day:0}, {name:'เพาะและขยายเชื้อ',day:7},
    {name:'พร้อมใช้งาน 🎉',       day:14}]},
  'ถ่านไบโอชาร์':  { icon:'🔥', days:7,  color:'#374151', stages:[
    {name:'เผาถ่าน',              day:0}, {name:'ดับและระบาย',       day:2},
    {name:'บ่มและบดหยาบ',         day:5}, {name:'พร้อมใส่ดิน 🎉',    day:7}]},
};

export function openRequisitionModal(presetInvId) {
  // Populate item dropdown (supply only)
  const sel = document.getElementById('req-item-select');
  sel.innerHTML = '<option value="">-- เลือกวัสดุ --</option>';
  invItems.filter(i => i.cat !== 'ผลผลิต').forEach(i => {
    const opt = document.createElement('option');
    opt.value = i.id;
    opt.textContent = i.name + ' (คงเหลือ: ' + i.qty + ' ' + i.unit + ')';
    if (presetInvId && i.id === presetInvId) opt.selected = true;
    sel.appendChild(opt);
  });
  // Populate person dropdown
  const pSel = document.getElementById('req-person-select');
  pSel.innerHTML = '<option value="">-- เลือกผู้เบิก --</option>';
  farmSettings.workers.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w; opt.textContent = w;
    pSel.appendChild(opt);
  });
  const other = document.createElement('option');
  other.value = 'other'; other.textContent = '✏️ พิมพ์เอง...';
  pSel.appendChild(other);

  document.getElementById('req-date').value = dateStr;
  document.getElementById('req-qty').value  = '';
  document.getElementById('req-purpose').value = '';
  document.getElementById('req-note').value = '';
  document.getElementById('req-person-other-wrap').style.display = 'none';
  document.getElementById('req-summary').innerHTML = 'เลือกวัสดุและจำนวนเพื่อดูสรุป';

  if (presetInvId) onReqItemSelect();
  document.getElementById('modal-requisition').classList.add('open');
}

export function onReqItemSelect() {
  const sel  = document.getElementById('req-item-select');
  const invId = parseInt(sel.value);
  const item  = invItems.find(i => i.id === invId);
  const info  = document.getElementById('req-stock-info');
  if (item) {
    const st = invStatus(item);
    info.innerHTML = `<span style="font-weight:600">${item.qty} ${item.unit}</span> · ราคา ${item.price.toLocaleString('th-TH')} ฿/${item.unit} · <span class="badge ${st.cls}" style="font-size:10px">${st.label}</span>`;
  } else {
    info.textContent = '—';
  }
  updateReqTotal();
}

export function handleReqPersonChange() {
  const val  = document.getElementById('req-person-select').value;
  const wrap = document.getElementById('req-person-other-wrap');
  if (wrap) wrap.style.display = val === 'other' ? '' : 'none';
  if (val === 'other') document.getElementById('req-person-other')?.focus();
}

export function updateReqTotal() {
  const invId = parseInt(document.getElementById('req-item-select').value);
  const item  = invItems.find(i => i.id === invId);
  const qty   = parseFloat(document.getElementById('req-qty').value) || 0;
  const summEl = document.getElementById('req-summary');
  if (!item || !qty) { summEl.innerHTML = 'เลือกวัสดุและจำนวนเพื่อดูสรุป'; return; }
  const totalCost = qty * item.price;
  const afterQty  = item.qty - qty;
  const statusClass = afterQty < 0 ? 'color:var(--red-400);font-weight:600' : 'color:var(--green-700);font-weight:600';
  summEl.innerHTML = `
    📦 <strong>${item.name}</strong> เบิก <strong>${qty} ${item.unit}</strong> · ราคา ${item.price.toLocaleString('th-TH')} ฿/${item.unit}<br>
    💰 มูลค่าที่เบิก: <strong>${totalCost.toLocaleString('th-TH')} ฿</strong><br>
    📊 คงเหลือหลังเบิก: <span style="${statusClass}">${afterQty} ${item.unit}</span>
    ${afterQty < 0 ? ' <span style="color:var(--red-400)">⚠️ เกินจำนวนที่มี</span>' : ''}
  `;
}

export function saveRequisition() {
  const invId   = parseInt(document.getElementById('req-item-select').value);
  const item    = invItems.find(i => i.id === invId);
  const qty     = parseFloat(document.getElementById('req-qty').value) || 0;
  const date    = document.getElementById('req-date').value || dateStr;
  const perSel  = document.getElementById('req-person-select').value;
  const person  = perSel === 'other' || !perSel
    ? (document.getElementById('req-person-other').value.trim() || '—')
    : perSel;
  const purpose = document.getElementById('req-purpose').value.trim();
  const note    = document.getElementById('req-note').value.trim();

  if (!item)   { showToast('⚠️ เลือกรายการวัสดุก่อน'); return; }
  if (!qty || qty <= 0) { showToast('⚠️ กรอกจำนวนที่เบิก'); return; }
  if (qty > item.qty) { if (!confirm(`⚠️ จำนวนเบิก (${qty}) เกินกว่าที่มีในคลัง (${item.qty} ${item.unit})\nดำเนินการต่อหรือไม่?`)) return; }

  const totalCost = qty * item.price;
  // Deduct from inventory
  item.qty = Math.max(0, item.qty - qty);

  // Record
  reqItems.unshift({ id: _nextReqId, date, invId, itemName: item.name, qty, unit: item.unit, person, purpose, note, totalCost });

  closeModal('modal-requisition');
  renderInv();
  renderReqHistory();
  saveData();
  showToast(`✅ เบิก ${item.name} ${qty} ${item.unit} สำเร็จ · มูลค่า ${totalCost.toLocaleString('th-TH')} ฿`);
}

export function renderReqHistory() {
  const tbody = document.getElementById('req-table-body');
  const emptyEl = document.getElementById('req-empty');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (reqItems.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  [...reqItems].sort((a,b) => b.date.localeCompare(a.date)).forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(r.date)}</td>
      <td><strong>${r.itemName}</strong></td>
      <td style="font-weight:600">${r.qty}</td>
      <td>${r.unit}</td>
      <td>${r.person}</td>
      <td>${r.purpose||'—'}</td>
      <td>${r.note||'—'}</td>
      <td>
        <button class="btn-icon del" onclick="deleteReqItem(${r.id})" title="ลบ">🗑</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

export function deleteReqItem(id) {
  const r = reqItems.find(x => x.id === id);
  if (!r) return;
  if (!confirm(`ลบประวัติการเบิก "${r.itemName}" ${r.qty} ${r.unit}?\n(จำนวนจะถูกคืนเข้าคลัง)`)) return;
  // Restore qty
  const item = invItems.find(i => i.id === r.invId);
  if (item) item.qty += r.qty;
  setReqItems(reqItems.filter(x => x.id !== id));
  renderInv();
  renderReqHistory();
  saveData();
  showToast('🗑 ลบประวัติการเบิกและคืนวัสดุแล้ว');
}

// ============================================================
// ===== CHECKBOX SELECTION SYSTEM =====
