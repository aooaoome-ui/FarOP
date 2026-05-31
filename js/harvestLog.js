import { renderCrops } from './crops.js';
import { saveData } from './firebase.js';
import { renderInv } from './inventory.js';
import { _harvestLogCropId, actItems, actRendered, cropItems, editingCropId, farmSettings, invItems, nextActId, nextInvId, setActRendered, setHarvestLogCropId, setNextActId, setNextInvId } from './state.js';
import { showToast } from './ui.js';
import { dateStr, fmtDate } from './utils.js';

// ============================================================

export function openHarvestLogModal(cropId) {
  // if called from table button directly
  if (cropId) setHarvestLogCropId(cropId);
  else if (editingCropId) setHarvestLogCropId(editingCropId);
  if (!_harvestLogCropId) return;
  const crop = cropItems.find(i => i.id === _harvestLogCropId);
  if (!crop) return;
  if (!crop.harvestLog) crop.harvestLog = [];
  document.getElementById('harvest-log-title').textContent = '📋 ประวัติเก็บเกี่ยว';
  document.getElementById('harvest-log-crop-name').textContent = crop.name + ' · ' + (crop.cropType||'') + ' · แปลง ' + crop.plot;
  document.getElementById('hl-date').value   = dateStr;
  document.getElementById('hl-weight').value = '';
  document.getElementById('hl-note').value   = '';
  renderHarvestLogTable(crop);
  document.getElementById('modal-harvest-log').classList.add('open');
}

export function renderHarvestLogTable(crop) {
  const tbody = document.getElementById('harvest-log-body');
  const log   = crop.harvestLog || [];
  tbody.innerHTML = '';
  if (log.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:16px">ยังไม่มีประวัติเก็บเกี่ยว</td></tr>';
  } else {
    [...log].sort((a,b)=>b.date.localeCompare(a.date)).forEach((entry, idx) => {
      const realIdx = log.indexOf(entry);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align:center;color:var(--gray-400)">${log.length - idx}</td>
        <td>${fmtDate(entry.date)}</td>
        <td style="font-weight:600;color:var(--green-700)">${entry.weight} กก.</td>
        <td>${entry.note || '—'}</td>
        <td><button class="btn-icon del" onclick="removeHarvestEntry(${realIdx})" style="font-size:12px">🗑</button></td>`;
      tbody.appendChild(tr);
    });
  }
  const total = log.reduce((s,e)=>s+e.weight, 0);
  document.getElementById('harvest-log-total').textContent = total.toLocaleString('th-TH') + ' กก.';
  document.getElementById('harvest-log-count').textContent = log.length + ' ครั้ง';
}

export function addHarvestEntry() {
  const crop = cropItems.find(i => i.id === _harvestLogCropId);
  if (!crop) return;
  const dt     = document.getElementById('hl-date').value || dateStr;
  const weight = parseFloat(document.getElementById('hl-weight').value);
  const note   = document.getElementById('hl-note').value.trim();
  if (!weight || weight <= 0) { showToast('⚠️ กรุณากรอกน้ำหนัก'); return; }
  if (!crop.harvestLog) crop.harvestLog = [];
  const roundNo = crop.harvestLog.length + 1;
  crop.harvestLog.push({ date: dt, weight, note });
  // Update yieldActual = total from log
  crop.yieldActual = crop.harvestLog.reduce((s,e)=>s+e.weight, 0);

  // ── เปลี่ยนสถานะเป็น เก็บเกี่ยวแล้ว อัตโนมัติ ──
  const prevStatus = crop.status;
  crop.status = 'เก็บเกี่ยวแล้ว';

  // ── บันทึกกิจกรรม ──
  actItems.unshift({
    id:       nextActId,
    date:     dt,
    type:     'เก็บเกี่ยว',
    plot:     crop.plot || '—',
    person:   '—',
    material: '—',
    note:     `เก็บเกี่ยว ${crop.name} รอบที่ ${roundNo} ได้ ${weight} กก.${note ? ' · ' + note : ''}`,
    fromCrop: true
  });
  setActRendered(false);

  // Auto-add to inv (เพิ่มผลผลิตเข้าคลังทุกครั้งที่บันทึกน้ำหนัก)
  {
    const lotNum = invItems.filter(i => i.cat === 'ผลผลิต' && i.name === crop.name).length + 1;
    invItems.push({ id: nextInvId, name: crop.name, cat: 'ผลผลิต', qty: weight,
      unit: 'กก.', price: 0, threshold: 0,
      shelfLife: farmSettings.shelfLife || 7,
      harvestDate: dt,
      lot: 'Crop ' + lotNum,
      lastOrder: dt });
  setNextActId(nextActId + 1);
  setNextInvId(nextInvId + 1);
    renderInv();
  }
  document.getElementById('hl-weight').value = '';
  document.getElementById('hl-note').value   = '';
  renderHarvestLogTable(crop);
  renderCrops();
  saveData();
  showToast(`✅ บันทึกการเก็บเกี่ยว ${weight} กก. · รวม ${crop.yieldActual} กก.`);
}

export function removeHarvestEntry(idx) {
  const crop = cropItems.find(i => i.id === _harvestLogCropId);
  if (!crop || !crop.harvestLog) return;
  const removed = crop.harvestLog.splice(idx, 1)[0];
  crop.yieldActual = crop.harvestLog.reduce((s,e)=>s+e.weight, 0) || '';
  renderHarvestLogTable(crop);
  renderCrops();
  saveData();
  showToast(`🗑 ลบรายการ ${removed.weight} กก. แล้ว`);
}

// ============================================================
// ===== PAGINATION + SEARCH ENGINE =====
