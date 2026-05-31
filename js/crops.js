import { renderInv } from './inventory.js';
import { saveData } from './firebase.js';
import { renderNotifications } from './notifications.js';
import { _pgState, _renderActivitiesPage, _renderCropsPage } from './pagination.js';
import { askConfirmDel } from './shared.js';
import { actFilteredItems, actItems, actRendered, cropItems, editingActId, editingCropId, farmSettings, invItems, nextActId, nextCropId, nextInvId, setActFilteredItems, setActRendered, setEditingActId, setEditingCropId, setNextCropId, setNextActId, setNextInvId } from './state.js';
import { closeModal, showToast } from './ui.js';
import { dateStr, fmtDate } from './utils.js';

// ============================================================
export const cropStatusMap = {
  'เพาะกล้า':     { cls:'badge-earth', color:'#a07850' },
  'ย้ายกล้า':     { cls:'badge-sky',   color:'#3b8fd4' },
  'เติบโต':       { cls:'badge-sky',   color:'#3b8fd4' },
  'กำลังโต':      { cls:'badge-amber', color:'#e8a820' },
  'พร้อมเก็บ':    { cls:'badge-green', color:'#5cb85c' },
  'เก็บเกี่ยวแล้ว':{ cls:'badge-gray', color:'#9a9890' },
};

export function renderCrops() {
  _pgState.crops.page = 1;
  _renderCropsPage(_pgState.crops.page, _pgState.crops.query);
}

export function openCropModal(id) {
  setEditingCropId(id || null);
  document.getElementById('crop-modal-title').textContent = id ? 'แก้ไขพืชผล' : 'เพิ่มพืชผลใหม่';
  document.getElementById('crop-save-btn').textContent    = id ? 'บันทึกการแก้ไข' : 'เพิ่มพืชผล';
  const logBtn = document.getElementById('crop-harvest-log-btn');
  if (id) {
    const item = cropItems.find(i => i.id === id);
    document.getElementById('crop-name').value         = item.name;
    document.getElementById('crop-type').value         = item.cropType || 'พืชผัก';
    document.getElementById('crop-plot').value         = item.plot;
    document.getElementById('crop-planted').value      = item.planted;
    document.getElementById('crop-area').value         = item.area;
    document.getElementById('crop-status').value       = item.status;
    document.getElementById('crop-yield-est').value    = item.yieldEst;
    document.getElementById('crop-yield-actual').value = '';
    if (item.harvest === 'ต่อเนื่อง') {
      document.getElementById('crop-harvest-cont').checked = true;
      document.getElementById('crop-harvest').value = '';
      document.getElementById('crop-harvest').disabled = true;
    } else {
      document.getElementById('crop-harvest-cont').checked = false;
      document.getElementById('crop-harvest').disabled = false;
      document.getElementById('crop-harvest').value = item.harvestDate || '';
    }
    if (logBtn) logBtn.style.display = 'inline-flex';
  } else {
    ['crop-name','crop-plot','crop-yield-est','crop-yield-actual'].forEach(x => document.getElementById(x).value = '');
    document.getElementById('crop-type').value         = 'พืชผัก';
    document.getElementById('crop-planted').value      = dateStr;
    document.getElementById('crop-harvest').value      = '';
    document.getElementById('crop-harvest').disabled   = false;
    document.getElementById('crop-harvest-cont').checked = false;
    document.getElementById('crop-area').value         = '';
    document.getElementById('crop-status').value       = 'เติบโต';
    if (logBtn) logBtn.style.display = 'none';
  }
  document.getElementById('modal-crop').classList.add('open');
}

export function editCropItem(id) { openCropModal(id); }

export function saveCropItem() {
  const name        = document.getElementById('crop-name').value.trim();
  const cropType    = document.getElementById('crop-type').value;
  const plot        = document.getElementById('crop-plot').value.trim();
  const planted     = document.getElementById('crop-planted').value;
  const isCont      = document.getElementById('crop-harvest-cont').checked;
  const harvestDateRaw = document.getElementById('crop-harvest').value || '';
  // ── วันเก็บเกี่ยว: ถ้าไม่ใส่ → ใช้วันปัจจุบัน (ยกเว้น "ต่อเนื่อง") ──
  const harvestDate = isCont ? '' : (harvestDateRaw || dateStr);
  const harvest     = isCont ? 'ต่อเนื่อง'
                    : new Date(harvestDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
  const area        = parseFloat(document.getElementById('crop-area').value) || 0;
  const yieldEst    = parseInt(document.getElementById('crop-yield-est').value) || 0;
  const yieldActualInput = document.getElementById('crop-yield-actual').value;
  const yieldActualNew   = yieldActualInput !== '' ? parseFloat(yieldActualInput) : null;
  // ── ถ้าใส่น้ำหนักผลผลิต → บังคับสถานะเป็น เก็บเกี่ยวแล้ว อัตโนมัติ ──
  if (yieldActualNew !== null && yieldActualNew > 0) {
    document.getElementById('crop-status').value = 'เก็บเกี่ยวแล้ว';
  }
  const status = document.getElementById('crop-status').value;
  if (!name) { showToast('⚠️ กรุณากรอกชื่อพืชผล'); return; }

  let prevStatus = null;
  if (editingCropId) {
    const item = cropItems.find(i => i.id === editingCropId);
    prevStatus = item.status;
    if (yieldActualNew !== null && yieldActualNew > 0) {
      if (!item.harvestLog) item.harvestLog = [];
      item.harvestLog.push({ date: harvestDate, weight: yieldActualNew, note: '' });
    }
    const totalActual = (item.harvestLog || []).reduce((s,e)=>s+e.weight,0);
    Object.assign(item, { name, cropType, plot, planted, harvest, harvestDate, area, status, yieldEst,
      yieldActual: totalActual > 0 ? totalActual : item.yieldActual });
    showToast('✅ แก้ไขข้อมูลพืชผลสำเร็จ' + (yieldActualNew ? ` (เพิ่มผลผลิต ${yieldActualNew} กก.)` : ''));
  } else {
    const harvestLog = yieldActualNew !== null && yieldActualNew > 0
      ? [{ date: harvestDate, weight: yieldActualNew, note: '' }] : [];
    cropItems.push({ id: nextCropId, name, cropType, plot, planted, harvest, harvestDate, area, status,
      yieldEst, yieldActual: yieldActualNew || '', harvestLog });
  setNextCropId(nextCropId + 1);
  setNextActId(nextActId + 1);
  setNextInvId(nextInvId + 1);
    showToast('✅ เพิ่มพืชผลสำเร็จ');
  }

  // ── auto-link activity: ใช้ harvestDate เป็นวันที่ของ activity เก็บเกี่ยว ──
  const autoActMap = {
    'เพาะกล้า':      { type: 'เพาะกล้า',        date: planted || dateStr,  note: `เพาะกล้า ${name}` },
    'ย้ายกล้า':      { type: 'ปลูก / ย้ายกล้า',  date: planted || dateStr,  note: `ย้ายกล้า ${name} ลงแปลง ${plot || '—'}` },
    'เก็บเกี่ยวแล้ว':{ type: 'เก็บเกี่ยว',        date: harvestDate || dateStr, note: `เก็บเกี่ยว ${name}${yieldActualNew ? ' ได้ ' + yieldActualNew + ' กก.' : ''}` },
  };
  if (autoActMap[status] && (prevStatus === null || prevStatus !== status)) {
    const actDef = autoActMap[status];
    actItems.unshift({
      id:       nextActId,
      date:     actDef.date,
      type:     actDef.type,
      plot:     plot || '—',
      person:   '—',
      material: '—',
      note:     actDef.note,
      fromCrop: true
    });
    setActRendered(false);
  }

  // ── auto-add to inventory: ใช้ harvestDate เป็น วันเข้าคลัง ──
  if (status === 'เก็บเกี่ยวแล้ว' && prevStatus !== 'เก็บเกี่ยวแล้ว') {
    const qty    = yieldActualNew ? Number(yieldActualNew) : 0;
    const lotNum = invItems.filter(i => i.cat === 'ผลผลิต' && i.name === name).length + 1;
    invItems.push({
      id: nextInvId, name, cat: 'ผลผลิต', qty, unit: 'กก.',
      price: 0, threshold: 0, shelfLife: farmSettings.shelfLife || 7,
      harvestDate: harvestDate,   // ← วันเก็บเกี่ยวที่ใส่ หรือวันปัจจุบัน
      lot: 'Crop ' + lotNum,
      lastOrder: harvestDate
    });
    showToast('🌾 เพิ่มผลผลิตเข้าคลัง: ' + name + (qty > 0 ? ' ' + qty + ' กก.' : '') + ' · วันที่ ' + harvest);
    renderInv();
  }

  closeModal('modal-crop');
  saveData(); renderCrops();
  renderNotifications();
}
// ============================================================
export function handleActTypeChange() {
  const v = document.getElementById('act-type-select').value;
  document.getElementById('act-type-other-wrap').style.display = v === 'other' ? 'block' : 'none';
}
export function handleActPlotChange() {
  const v = document.getElementById('act-plot-select').value;
  document.getElementById('act-plot-other-wrap').style.display = v === 'other' ? '' : 'none';
}

export function renderActivities(items) {
  if (items) {
    // called from filter — render directly without pagination
    const tbody = document.getElementById('activity-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    items.forEach(item => {
      const fromCropBadge = item.fromCrop
        ? `<span class="badge badge-green" style="font-size:10px;margin-left:4px;">🌱 จากพืชผล</span>` : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtDate(item.date)}</td>
        <td>${item.type}${fromCropBadge}</td>
        <td>${item.plot}</td>
        <td>${item.person}</td>
        <td>${item.material || '—'}</td>
        <td>${item.note || '—'}</td>
        <td>
          <div class="inv-actions">
            <button class="btn-icon edit" onclick="editActItem(${item.id})">✏️</button>
            <button class="btn-icon del"  onclick="askConfirmDel('act',${item.id},'กิจกรรม ${item.type}')">🗑</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
    document.getElementById('pg-activities').innerHTML = '';
    return;
  }
  _pgState.activities.page = 1;
  _renderActivitiesPage(_pgState.activities.page, _pgState.activities.query);
}

export function filterActivities() {
  const from = document.getElementById('act-filter-from').value;
  const to   = document.getElementById('act-filter-to').value;
  if (!from && !to) { saveData(); renderActivities(); return; }
  const filtered = actItems.filter(i => {
    if (from && i.date < from) return false;
    if (to   && i.date > to)   return false;
    return true;
  });
  setActFilteredItems(filtered);
  renderActivities(filtered);
}
export function clearActFilter() {
  document.getElementById('act-filter-from').value = '';
  document.getElementById('act-filter-to').value   = '';
  setActFilteredItems(null);
  renderActivities();
}

export function openActivityModal(id) {
  setEditingActId(id || null);
  document.getElementById('act-modal-title').textContent = id ? 'แก้ไขกิจกรรม' : 'บันทึกกิจกรรมใหม่';
  document.getElementById('act-save-btn').textContent    = id ? 'บันทึกการแก้ไข' : 'บันทึกกิจกรรม';
  document.getElementById('act-type-other-wrap').style.display  = 'none';
  document.getElementById('act-plot-other-wrap').style.display  = 'none';
  document.getElementById('act-person-other-wrap').style.display = 'none';
  if (id) {
    const item = actItems.find(i => i.id === id);
    document.getElementById('act-date').value     = item.date;
    document.getElementById('act-material').value = item.material === '—' ? '' : item.material;
    document.getElementById('act-note').value     = item.note    === '—' ? '' : item.note;
    // person dropdown
    const personSel = document.getElementById('act-person-select');
    const personOpts = Array.from(personSel.options).map(o=>o.value);
    if (personOpts.includes(item.person)) {
      personSel.value = item.person;
    } else {
      personSel.value = 'other';
      document.getElementById('act-person-other-wrap').style.display = '';
      document.getElementById('act-person').value = item.person;
    }
    const typeOpts = Array.from(document.getElementById('act-type-select').options).map(o => o.value);
    if (typeOpts.includes(item.type)) {
      document.getElementById('act-type-select').value = item.type;
    } else {
      document.getElementById('act-type-select').value = 'other';
      document.getElementById('act-type-other-wrap').style.display = 'block';
      document.getElementById('act-type-other').value  = item.type;
    }
    const plotOpts = Array.from(document.getElementById('act-plot-select').options).map(o => o.value);
    if (plotOpts.includes(item.plot)) {
      document.getElementById('act-plot-select').value = item.plot;
    } else {
      document.getElementById('act-plot-select').value = 'other';
      document.getElementById('act-plot-other-wrap').style.display = '';
      document.getElementById('act-plot-other').value  = item.plot;
    }
  } else {
    document.getElementById('act-date').value     = dateStr;
    document.getElementById('act-type-select').value = 'รดน้ำ';
    document.getElementById('act-plot-select').value = 'ทุกแปลง';
    document.getElementById('act-person-select').value = '';
    document.getElementById('act-person').value   = '';
    document.getElementById('act-material').value = '';
    document.getElementById('act-note').value     = '';
    document.getElementById('act-type-other').value = '';
    document.getElementById('act-plot-other').value = '';
  }
  document.getElementById('modal-activity').classList.add('open');
}

export function editActItem(id) { openActivityModal(id); }

export function saveActivityItem() {
  const date   = document.getElementById('act-date').value;
  const tSel   = document.getElementById('act-type-select').value;
  const type   = tSel === 'other' ? document.getElementById('act-type-other').value.trim() : tSel;
  const pSel   = document.getElementById('act-plot-select').value;
  const plot   = pSel === 'other' ? document.getElementById('act-plot-other').value.trim() : pSel;
  // person: from dropdown or typed
  const perSel = document.getElementById('act-person-select').value;
  const person = perSel === 'other' || perSel === ''
    ? document.getElementById('act-person').value.trim()
    : perSel;
  const material = document.getElementById('act-material').value.trim() || '—';
  const note     = document.getElementById('act-note').value.trim() || '—';
  if (!type) { showToast('⚠️ กรุณาระบุประเภทกิจกรรม'); return; }
  if (editingActId) {
    const item = actItems.find(i => i.id === editingActId);
    Object.assign(item, { date, type, plot, person, material, note });
    showToast('✅ แก้ไขกิจกรรมสำเร็จ');
  } else {
    actItems.unshift({ id: nextActId, date, type, plot, person, material, note });
    showToast('✅ บันทึกกิจกรรมสำเร็จ');
  }
  closeModal('modal-activity');
  renderActivities();
}

// ===== EXPORT PDF =====
export function exportActPDF() {
  const from = document.getElementById('act-filter-from').value;
  const to   = document.getElementById('act-filter-to').value;
  const list = actFilteredItems || actItems;
  let rows = list.map(i =>
    `<tr><td>${fmtDate(i.date)}</td><td>${i.type}</td><td>${i.plot}</td><td>${i.person}</td><td>${i.material}</td><td>${i.note}</td></tr>`
  ).join('');
  const range = from || to ? `<p style="font-size:12px;color:#666">ช่วงวันที่: ${from ? fmtDate(from) : '—'} ถึง ${to ? fmtDate(to) : '—'}</p>` : '';
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:sans-serif;padding:24px;font-size:13px}h2{color:#1a4d1a;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{background:#1a4d1a;color:#fff;padding:8px;text-align:left;font-size:12px}
  td{padding:7px 8px;border-bottom:1px solid #ddd}tr:nth-child(even)td{background:#f5faf5}</style>
  </head><body><h2>บันทึกกิจกรรมฟาร์มอินทรีย์</h2>${range}
  <table><thead><tr><th>วันที่</th><th>กิจกรรม</th><th>แปลง</th><th>ผู้ดำเนินการ</th><th>วัสดุที่ใช้</th><th>หมายเหตุ</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

// ===== EXPORT EXCEL (CSV) =====
export function exportActExcel() {
  const list = actFilteredItems || actItems;
  const BOM = '\uFEFF';
  const header = 'วันที่,ประเภทกิจกรรม,แปลง,ผู้ดำเนินการ,วัสดุที่ใช้,หมายเหตุ\n';
  const rows = list.map(i =>
    [fmtDate(i.date), i.type, i.plot, i.person, i.material, i.note]
      .map(v => `"${String(v).replace(/"/g,'""')}"`)
      .join(',')
  ).join('\n');
  const blob = new Blob([BOM + header + rows], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'farm_activities.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('📊 ดาวน์โหลด Excel สำเร็จ');
}

// ============================================================
// ===== 3. CUSTOMERS =====
