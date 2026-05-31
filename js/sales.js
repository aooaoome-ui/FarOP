import { renderDashboard } from './dashboard.js';
import { saveData } from './firebase.js';
import { buildReportCharts } from './charts.js';
import { deductProduceStock, produceDaysLeft, produceStatus } from './inventory.js';
import { calcSeTotal, renderSales } from './salesLink.js';
import { _nextSaleId, cropItems, invItems, salesData, setNextSaleId } from './state.js';
import { closeModal, showToast } from './ui.js';
import { dateStr } from './utils.js';

export function toggleHarvestDate() {
  const isCont = document.getElementById('crop-harvest-cont').checked;
  const inp    = document.getElementById('crop-harvest');
  inp.disabled = isCont;
  if (isCont) inp.value = '';
}

// Fix 2: _buildProductOptions — show each inventory lot separately
export function _buildProductOptions(selectId, currentVal) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- เลือกสินค้า/ผลผลิต --</option>';

  // Split produce into fresh vs overstock
  const produceAll   = invItems.filter(i => i.cat === 'ผลผลิต' && i.qty > 0);
  const freshProduce = produceAll.filter(i => !produceStatus(i).overstock);
  const overProduce  = produceAll.filter(i =>  produceStatus(i).overstock);

  // Group 1: ผลผลิตสด (อายุยังดีอยู่)
  if (freshProduce.length > 0) {
    const grp = document.createElement('optgroup');
    grp.label = '🌾 ผลผลิตในคลัง (สด)';
    freshProduce.forEach(i => {
      const st = produceStatus(i);
      const opt = document.createElement('option');
      opt.value = '__inv__' + i.id + '__' + i.name;
      const lotLabel  = i.lot ? ' · ' + i.lot : '';
      const dateLabel = i.harvestDate ? ' · เข้า ' + new Date(i.harvestDate).toLocaleDateString('th-TH',{day:'numeric',month:'short'}) : '';
      const daysLabel = st.label !== 'มีในคลัง' ? ' [' + st.label + ']' : '';
      opt.textContent = i.name + lotLabel + dateLabel + ' (' + i.qty + ' กก.)' + daysLabel;
      if (opt.value === currentVal || i.name === currentVal) opt.selected = true;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  }

  // Group 2: ผลผลิตค้างสต็อก (เกินอายุไข)
  if (overProduce.length > 0) {
    const grp2 = document.createElement('optgroup');
    grp2.label = '⚠️ ผลผลิตค้างสต็อก (เกินอายุไข)';
    overProduce.forEach(i => {
      const days = produceDaysLeft(i);
      const opt  = document.createElement('option');
      opt.value  = '__inv__' + i.id + '__' + i.name;
      const lotLabel  = i.lot ? ' · ' + i.lot : '';
      const overLabel = days !== null ? ' [เกิน ' + Math.abs(days) + ' วัน]' : '';
      opt.textContent = i.name + lotLabel + ' (' + i.qty + ' กก.)' + overLabel;
      opt.style.color = '#c0392b';
      if (opt.value === currentVal || i.name === currentVal) opt.selected = true;
      grp2.appendChild(opt);
    });
    sel.appendChild(grp2);
  }

  // Group 3: พืชผลที่ปลูก
  if (cropItems.length > 0) {
    const grp3 = document.createElement('optgroup');
    grp3.label = '🌱 พืชผลที่ปลูก';
    cropItems.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name + (c.yieldActual ? ' (' + c.yieldActual + ' กก.)' : '') + ' · ' + (c.status || '');
      if (c.name === currentVal) opt.selected = true;
      grp3.appendChild(opt);
    });
    sel.appendChild(grp3);
  }
}

export function onSaleProductSelect() {
  const raw   = document.getElementById('sale-product-select').value;
  const name  = raw.startsWith('__inv__') ? raw.split('__')[3] : raw;
  document.getElementById('sale-product-input').value = name;

  // ── auto-fill วันที่จากวันเข้าคลังของผลผลิตที่เลือก ──
  if (raw.startsWith('__inv__')) {
    const invId = _getInvIdFromSelectVal(raw);
    const item  = invId ? invItems.find(i => i.id === invId) : null;
    if (item && item.harvestDate) {
      document.getElementById('sale-date-input').value = item.harvestDate;
      _showSaleDateHint('📅 วันเข้าคลัง: ' + new Date(item.harvestDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}));
    }
  } else {
    _showSaleDateHint('');
  }

  // ── stock preview ──
  _updateSaleStockPreview();
}

export function _updateSaleStockPreview() {
  const raw     = document.getElementById('sale-product-select')?.value || '';
  const invId   = _getInvIdFromSelectVal(raw);
  const prodName = raw.startsWith('__inv__') ? raw.split('__')[3] : raw;
  const weight  = parseFloat(document.getElementById('sale-weight')?.value) || 0;

  let preview = document.getElementById('sale-stock-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'sale-stock-preview';
    preview.style.cssText = 'font-size:11px;margin-top:5px;padding:6px 10px;border-radius:8px;display:none;';
    const weightInput = document.getElementById('sale-weight');
    if (weightInput) weightInput.parentNode.appendChild(preview);
  }

  if (!prodName || !raw.startsWith('__inv__')) { preview.style.display = 'none'; return; }

  // total available across all lots
  const totalAvail = invItems
    .filter(i => i.cat === 'ผลผลิต' && i.name === prodName && i.qty > 0)
    .reduce((s, i) => s + i.qty, 0);

  const isOverSell = weight > 0 && weight > totalAvail;
  const afterSell  = Math.max(0, totalAvail - weight);

  preview.style.display = '';
  if (isOverSell) {
    preview.style.background = '#fef2f2';
    preview.style.color      = '#ef4444';
    preview.style.border     = '1px solid #fecaca';
    preview.innerHTML = `⚠️ <strong>สต็อกไม่พอ</strong> — มีในคลัง <strong>${totalAvail} กก.</strong> ขาดอีก <strong>${(weight - totalAvail).toFixed(1)} กก.</strong>`;
  } else if (weight > 0) {
    preview.style.background = '#f0fdf4';
    preview.style.color      = '#15803d';
    preview.style.border     = '1px solid #bbf7d0';
    preview.innerHTML = `📦 มีในคลัง <strong>${totalAvail} กก.</strong> → หลังขาย เหลือ <strong>${afterSell.toFixed(1)} กก.</strong>`;
  } else {
    preview.style.background = '#f8fafc';
    preview.style.color      = '#64748b';
    preview.style.border     = '1px solid #e2e8f0';
    preview.innerHTML = `📦 สต็อกปัจจุบัน: <strong>${totalAvail} กก.</strong>`;
  }
}

export function _showSaleDateHint(text) {
  let hint = document.getElementById('sale-date-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'sale-date-hint';
    hint.style.cssText = 'font-size:11px;color:var(--green-600);margin-top:3px;';
    const dateGroup = document.getElementById('sale-date-input').parentNode;
    dateGroup.appendChild(hint);
  }
  hint.textContent = text;
}

export function _getInvIdFromSelectVal(val) {
  if (!val || !val.startsWith('__inv__')) return null;
  return parseInt(val.split('__')[2]);
}

export function toggleSaleProductInput() {
  const inp = document.getElementById('sale-product-input');
  const isVisible = inp.style.display !== 'none';
  inp.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) inp.focus();
}

export function toggleSaleTotalAuto() {
  const isAuto = document.getElementById('sale-total-auto').checked;
  const inp = document.getElementById('sale-total');
  if (isAuto) {
    inp.readOnly = true;
    inp.style.background = 'var(--gray-50)';
    calcSaleTotal();
  } else {
    inp.readOnly = false;
    inp.style.background = '';
    inp.focus();
  }
}

export function onSaleTotalInput() {
  // user typing manually — uncheck auto
  document.getElementById('sale-total-auto').checked = false;
  document.getElementById('sale-total').readOnly = false;
  document.getElementById('sale-total').style.background = '';
}

export function openSaleModal() {
  _buildProductOptions('sale-product-select', '');
  document.getElementById('sale-product-input').value = '';
  document.getElementById('sale-product-input').style.display = 'none';
  document.getElementById('sale-date-input').value    = dateStr;
  document.getElementById('sale-customer-input').value= '';
  document.getElementById('sale-channel-input').value = 'ตลาด';
  document.getElementById('sale-weight').value = '';
  document.getElementById('sale-price').value  = '';
  document.getElementById('sale-total').value  = '';
  document.getElementById('sale-total').readOnly = true;
  document.getElementById('sale-total').style.background = 'var(--gray-50)';
  document.getElementById('sale-total-auto').checked = true;
  document.getElementById('sale-payment-input').value = 'เงินสด';
  _showSaleDateHint('');
  document.getElementById('modal-sale').classList.add('open');
}

export function calcSaleTotal() {
  if (!document.getElementById('sale-total-auto').checked) return;
  const w = parseFloat(document.getElementById('sale-weight').value) || 0;
  const p = parseFloat(document.getElementById('sale-price').value)  || 0;
  document.getElementById('sale-total').value = w && p ? (w * p).toLocaleString('th-TH') : '';
}

export function _getSaleTotal(totalInputId, autoCheckId) {
  const auto = document.getElementById(autoCheckId).checked;
  if (auto) {
    // already computed by calcSaleTotal
    const raw = document.getElementById(totalInputId).value.replace(/,/g, '').replace(' ฿','').trim();
    return parseFloat(raw) || 0;
  } else {
    const raw = document.getElementById(totalInputId).value.replace(/,/g, '').replace(' ฿','').trim();
    return parseFloat(raw) || 0;
  }
}

export function saveSale() {
  const rawSelect = document.getElementById('sale-product-select').value;
  const manualInput = document.getElementById('sale-product-input').style.display !== 'none'
    ? document.getElementById('sale-product-input').value.trim() : '';
  // product name
  const product = manualInput || (rawSelect.startsWith('__inv__') ? rawSelect.split('__')[3] : rawSelect);
  // invId for exact lot deduction (null if typed manually or from crop list)
  const invId   = manualInput ? null : _getInvIdFromSelectVal(rawSelect);

  const customer = document.getElementById('sale-customer-input').value.trim();
  const date     = document.getElementById('sale-date-input').value || dateStr;
  const channel  = document.getElementById('sale-channel-input').value;
  const w = parseFloat(document.getElementById('sale-weight').value) || 0;
  const p = parseFloat(document.getElementById('sale-price').value)  || 0;
  const payment  = document.getElementById('sale-payment-input').value;
  const total    = _getSaleTotal('sale-total', 'sale-total-auto') || (w * p);
  if (!product) { showToast('⚠️ กรุณาเลือกหรือกรอกชื่อสินค้า'); return; }
  salesData.push({ _id: _nextSaleId, date, product, invId, customer, channel, weight: w, price: p, total, payment });
  setNextSaleId(_nextSaleId + 1);
  deductProduceStock(product, w, invId);
  closeModal('modal-sale');
  saveData(); renderSales();
  renderDashboard(); setTimeout(buildReportCharts, 100);
  showToast('✅ บันทึกการขายสำเร็จ');
}

// ===== SALE EDIT HELPERS =====
export function onSeProductSelect() {
  const raw  = document.getElementById('se-product-select').value;
  const name = raw.startsWith('__inv__') ? raw.split('__')[3] : raw;
  document.getElementById('se-product').value = name;

  // ── auto-fill วันที่จากวันเข้าคลัง ──
  if (raw.startsWith('__inv__')) {
    const invId = _getInvIdFromSelectVal(raw);
    const item  = invId ? invItems.find(i => i.id === invId) : null;
    if (item && item.harvestDate) {
      document.getElementById('se-date').value = item.harvestDate;
      let hint = document.getElementById('se-date-hint');
      if (!hint) {
        hint = document.createElement('div');
        hint.id = 'se-date-hint';
        hint.style.cssText = 'font-size:11px;color:var(--green-600);margin-top:3px;';
        document.getElementById('se-date').parentNode.appendChild(hint);
      }
      hint.textContent = '📅 วันเข้าคลัง: ' + new Date(item.harvestDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
    }
  }
}

export function toggleSeProductInput() {
  const inp = document.getElementById('se-product');
  // se-product is always visible in edit modal, so just focus it
  inp.focus();
  inp.select();
}

export function toggleSeTotalAuto() {
  const isAuto = document.getElementById('se-total-auto').checked;
  const inp = document.getElementById('se-total');
  if (isAuto) {
    inp.readOnly = true;
    inp.style.background = 'var(--gray-50)';
    calcSeTotal();
  } else {
    inp.readOnly = false;
    inp.style.background = '';
    inp.focus();
  }
}

export function onSeTotalInput() {
  document.getElementById('se-total-auto').checked = false;
  document.getElementById('se-total').readOnly = false;
  document.getElementById('se-total').style.background = '';
}

// ============================================================
