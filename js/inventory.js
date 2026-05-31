import { saveData } from './firebase.js';
import { renderNotifications } from './notifications.js';
import { openRequisitionModal } from './planning.js';
import { _updateSelBar } from './selection.js';
import { askConfirmDel } from './shared.js';
import { editingInvId, farmSettings, invItems, nextInvId, setEditingInvId, setInvItems, setNextInvId } from './state.js';
import { closeModal, showToast } from './ui.js';
import { dateStr } from './utils.js';

// ============================================================
  // ผลผลิต
export function invStatus(item) {
  if (item.qty === 0)             return { label:'หมด',     cls:'badge-red' };
  if (item.qty <= item.threshold) return { label:'ใกล้หมด', cls:'badge-amber' };
  return                                 { label:'พอเพียง', cls:'badge-green' };
}

// ── Produce shelf-life helpers ──
export function produceExpiry(item) {
  if (!item.harvestDate || !item.shelfLife) return null;
  const d = new Date(item.harvestDate);
  d.setDate(d.getDate() + item.shelfLife);
  return d;
}

export function produceDaysLeft(item) {
  const exp = produceExpiry(item);
  if (!exp) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.ceil((exp - now) / 86400000);
}

export function produceStatus(item) {
  const days = produceDaysLeft(item);
  if (item.qty === 0)      return { label:'หมด',           cls:'badge-gray',   color:'#9a9890', overstock:false };
  if (days === null)       return { label:'มีในคลัง',      cls:'badge-green',  color:'#5cb85c', overstock:false };
  if (days < 0)            return { label:'ค้างสต็อก',    cls:'badge-red',    color:'#e04040', overstock:true  };
  if (days === 0)          return { label:'หมดอายุวันนี้', cls:'badge-red',    color:'#e04040', overstock:false };
  if (days <= 2)           return { label:'ใกล้หมดอายุ ' + days + 'ว.', cls:'badge-amber', color:'#e8a820', overstock:false };
  return                          { label:'สด (' + days + 'ว.)',  cls:'badge-green',  color:'#5cb85c', overstock:false };
}

// ── Inventory search state ──
const _invSearch = { produce: '', supply: '' };

export function onInvSearch(section) {
  const inp = document.getElementById('search-' + section);
  if (!inp) return;
  _invSearch[section] = inp.value.trim().toLowerCase();
  const clr = document.getElementById('search-' + section + '-clear');
  if (clr) clr.classList.toggle('visible', inp.value.length > 0);
  if (section === 'produce') renderInv._producePage = 1;
  if (section === 'supply')  renderInv._supplyPage  = 1;
  saveData(); renderInv();
}

export function clearInvSearch(section) {
  const inp = document.getElementById('search-' + section);
  if (inp) inp.value = '';
  _invSearch[section] = '';
  const clr = document.getElementById('search-' + section + '-clear');
  if (clr) clr.classList.remove('visible');
  if (section === 'produce') renderInv._producePage = 1;
  if (section === 'supply')  renderInv._supplyPage  = 1;
  renderInv();
}

export function renderInv() {
  const today = new Date(); today.setHours(0,0,0,0);
  // Sort produce by harvestDate desc (newest first), supplies by lastOrder desc
  const produceItems  = [...invItems.filter(i => i.cat === 'ผลผลิต')]
    .sort((a,b) => (b.harvestDate||'').localeCompare(a.harvestDate||''));
  const supplyItems   = [...invItems.filter(i => i.cat !== 'ผลผลิต')]
    .sort((a,b) => (b.lastOrder||'').localeCompare(a.lastOrder||''))
    .filter(i => {
      if (!_invSearch.supply) return true;
      const q = _invSearch.supply;
      return (i.name||'').toLowerCase().includes(q) || (i.cat||'').toLowerCase().includes(q);
    });

  const freshItems     = produceItems.filter(i => {
    const st = produceStatus(i);
    if (st.overstock) return false;
    if (_invSearch.produce) {
      const q = _invSearch.produce;
      return (i.name||'').toLowerCase().includes(q) || (i.lot||'').toLowerCase().includes(q);
    }
    return true;
  });
  const overstockItems = produceItems.filter(i => produceStatus(i).overstock);

  // ── Produce section (fresh only) ──
  const pBody  = document.getElementById('produce-table-body');
  const pEmpty = document.getElementById('produce-empty');
  if (pBody) {
    pBody.innerHTML = '';
    if (freshItems.length === 0) {
      if (pEmpty) pEmpty.style.display = 'block';
    } else {
      if (pEmpty) pEmpty.style.display = 'none';
      freshItems.forEach(item => {
        const st   = produceStatus(item);
        const exp  = produceExpiry(item);
        const expStr = exp ? exp.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—';
        const harvestStr = item.harvestDate
          ? new Date(item.harvestDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})
          : (item.lastOrder || '—');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${item.name}</strong></td>
          <td style="font-size:12px;color:var(--gray-400)">${item.lot || 'Crop 1'}</td>
          <td>
            <div class="qty-stepper">
              <button onclick="adjustQty(${item.id},-1)">−</button>
              <span class="qty-val" id="qty-${item.id}" style="color:${st.color};font-weight:600">${item.qty}</span>
              <button onclick="adjustQty(${item.id},1)">+</button>
            </div>
          </td>
          <td>${item.price > 0 ? item.price.toLocaleString('th-TH') + ' ฿' : '—'}</td>
          <td>${harvestStr}</td>
          <td style="text-align:center">${item.shelfLife || '—'}</td>
          <td>${expStr}</td>
          <td><span class="badge ${st.cls}" id="status-${item.id}">${st.label}</span></td>
          <td>
            <div class="inv-actions">
              <button class="btn-icon" title="ย้ายไปค้างสต็อก" onclick="markAsOverstock(${item.id})" style="font-size:12px" title="ค้างสต็อก">📦→⚠️</button>
              <button class="btn-icon edit" onclick="editInvItem(${item.id})">✏️</button>
              <button class="btn-icon del"  onclick="askConfirmDel('inv',${item.id},'${item.name}')">🗑</button>
            </div>
          </td>`;
        pBody.appendChild(tr);
      });
    }
  }

  // ── Overstock section ──
  const oBody  = document.getElementById('overstock-table-body');
  const oEmpty = document.getElementById('overstock-empty');
  const oCard  = document.getElementById('overstock-card');
  const chkAll = document.getElementById('overstock-check-all');
  if (oBody) {
    oBody.innerHTML = '';
    if (chkAll) chkAll.checked = false;
    if (overstockItems.length === 0) {
      if (oEmpty) oEmpty.style.display = 'block';
      if (oCard)  oCard.style.opacity = '0.65';
    } else {
      if (oEmpty) oEmpty.style.display = 'none';
      if (oCard)  oCard.style.opacity = '1';
      overstockItems.forEach(item => {
        const days     = produceDaysLeft(item);
        const overDays = days !== null ? Math.abs(days) : '?';
        const exp      = produceExpiry(item);
        const harvestStr = item.harvestDate
          ? new Date(item.harvestDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})
          : '—';
        const expStr   = exp ? exp.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—';
        // วันทิ้ง = วันที่บันทึกว่าค้างสต็อก (disposeDate) หรือยังไม่กำหนด
        const disposeStr = item.disposeDate
          ? new Date(item.disposeDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})
          : '<span style="color:var(--gray-400)">—</span>';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="checkbox" class="overstock-chk" data-id="${item.id}"></td>
          <td><strong style="color:var(--red-400)">${item.name}</strong></td>
          <td><span style="color:var(--red-400);font-weight:600">${item.qty} กก.</span></td>
          <td>${harvestStr}</td>
          <td>${expStr}</td>
          <td><span style="color:var(--red-400);font-weight:600">เกิน ${overDays} วัน</span></td>
          <td>${disposeStr}</td>
          <td>
            <div class="inv-actions">
              <button class="btn" style="background:var(--red-400);color:#fff;font-size:11px;padding:4px 10px;" onclick="disposeItem(${item.id})">🗑 ทิ้ง</button>
              <button class="btn-icon edit" onclick="editInvItem(${item.id})">✏️</button>
            </div>
          </td>`;
        oBody.appendChild(tr);
      });
    }
  }

  // ── Produce summary ──
  const pRow = document.getElementById('produce-summary-row');
  if (pRow) {
    const totalFresh = freshItems.reduce((s,i) => s + i.qty, 0);
    const nearExp    = freshItems.filter(i => { const d=produceDaysLeft(i); return d!==null && d>=0 && d<=2; }).length;
    const overCnt    = overstockItems.length;
    pRow.innerHTML = `
      <div class="quick-pill">📦 ${freshItems.length} ชนิด</div>
      <div class="quick-pill">⚖️ รวม <strong>${totalFresh.toLocaleString('th-TH')} กก.</strong></div>
      ${nearExp > 0 ? `<div class="quick-pill" style="border-color:#f9e28a;color:#b07a10;">⏰ ใกล้หมดอายุ ${nearExp} ชนิด</div>` : ''}
      ${overCnt > 0 ? `<div class="quick-pill" style="border-color:var(--red-200);color:var(--red-400);">⚠️ ค้างสต็อก ${overCnt} ชนิด</div>` : ''}`;
  }

  // ── Supplies with pagination ──
  const INV_PAGE = 15;
  if (!renderInv._supplyPage) renderInv._supplyPage = 1;
  if (!renderInv._producePage) renderInv._producePage = 1;

  // Produce pagination
  const pBody2 = document.getElementById('produce-table-body');
  // already rendered above, now apply pagination
  // Re-render with slice
  if (pBody2 && freshItems.length > 0) {
    const pp = renderInv._producePage;
    const pSlice = freshItems.slice((pp-1)*INV_PAGE, pp*INV_PAGE);
    pBody2.innerHTML = '';
    pSlice.forEach(item => {
      const st   = produceStatus(item);
      const exp  = produceExpiry(item);
      const expStr = exp ? exp.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—';
      const harvestStr = item.harvestDate
        ? new Date(item.harvestDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})
        : (item.lastOrder || '—');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type='checkbox' class='chk-produce' data-id='${item.id}' onchange="_updateSelBar('produce')"></td>
        <td><strong>${item.name}</strong></td>
        <td style="font-size:12px;color:var(--gray-400)">${item.lot || 'Crop 1'}</td>
        <td>
          <div class="qty-stepper">
            <button onclick="adjustQty(${item.id},-1)">−</button>
            <span class="qty-val" id="qty-${item.id}" style="color:${st.color};font-weight:600">${item.qty}</span>
            <button onclick="adjustQty(${item.id},1)">+</button>
          </div>
        </td>
        <td>${item.price > 0 ? item.price.toLocaleString('th-TH') + ' ฿' : '—'}</td>
        <td>${harvestStr}</td>
        <td style="text-align:center">${item.shelfLife || '—'}</td>
        <td>${expStr}</td>
        <td><span class="badge ${st.cls}" id="status-${item.id}">${st.label}</span></td>
        <td>
          <div class="inv-actions">
            <button class="btn-icon" title="ย้ายไปค้างสต็อก" onclick="markAsOverstock(${item.id})" style="font-size:12px">📦→⚠️</button>
            <button class="btn-icon edit" onclick="editInvItem(${item.id})">✏️</button>
            <button class="btn-icon del"  onclick="askConfirmDel('inv',${item.id},'${item.name}')">🗑</button>
          </div>
        </td>`;
      pBody2.appendChild(tr);
    });
    _renderInvPagination('produce', freshItems.length, pp, INV_PAGE);
  }

  // Supply pagination
  const tbody = document.getElementById('inv-table-body');
  if (tbody) {
    const sp = renderInv._supplyPage;
    const sSlice = supplyItems.slice((sp-1)*INV_PAGE, sp*INV_PAGE);
    tbody.innerHTML = '';
    sSlice.forEach(item => {
      const st = invStatus(item);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type='checkbox' class='chk-supply' data-id='${item.id}' onchange="_updateSelBar('supply')"></td>
        <td><strong>${item.name}</strong></td>
        <td>${item.cat}</td>
        <td>
          <div class="qty-stepper">
            <button onclick="adjustQty(${item.id},-1)">−</button>
            <span class="qty-val" id="qty-${item.id}">${item.qty}</span>
            <button onclick="adjustQty(${item.id},1)">+</button>
          </div>
        </td>
        <td>${item.unit}</td>
        <td>${item.price.toLocaleString('th-TH')} ฿</td>
        <td style="font-weight:600;color:var(--green-700)">${(item.qty * item.price).toLocaleString('th-TH')} ฿</td>
        <td>${item.lastOrder}</td>
        <td><span class="badge ${st.cls}" id="status-${item.id}">${st.label}</span></td>
        <td>
          <div class="inv-actions">
            <button class="btn-icon" title="เบิก" onclick="openRequisitionModal(${item.id})" style="font-size:12px">📋</button>
            <button class="btn-icon edit" onclick="editInvItem(${item.id})">✏️</button>
            <button class="btn-icon del"  onclick="askConfirmDel('inv',${item.id},'${item.name}')">🗑</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
    _renderInvPagination('supply', supplyItems.length, sp, INV_PAGE);
  }
  updateInvStats();
  renderNotifications();
}

export function _renderInvPagination(section, total, currentPage, pageSize) {
  const el = document.getElementById('pg-' + section);
  if (!el) return;
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="pg-btn" onclick="gotoInvPage('${section}',${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
  for (let i=1; i<=pages; i++) {
    html += `<button class="pg-btn ${i===currentPage?'active':''}" onclick="gotoInvPage('${section}',${i})">${i}</button>`;
  }
  html += `<button class="pg-btn" onclick="gotoInvPage('${section}',${currentPage+1})" ${currentPage===pages?'disabled':''}>›</button>`;
  html += `<span class="pg-info">${total} รายการ · หน้า ${currentPage}/${pages}</span>`;
  el.innerHTML = html;
}

export function gotoInvPage(section, p) {
  if (section === 'produce') renderInv._producePage = p;
  if (section === 'supply')  renderInv._supplyPage  = p;
  renderInv();
}

// ── Overstock checkbox helpers ──
export function toggleAllOverstock(checked) {
  document.querySelectorAll('.overstock-chk').forEach(c => c.checked = checked);
}

export function disposeSelectedOverstock() {
  const selected = [...document.querySelectorAll('.overstock-chk:checked')].map(c => parseInt(c.dataset.id));
  if (!selected.length) { showToast('⚠️ เลือกรายการที่ต้องการทิ้งก่อน'); return; }
  const names = selected.map(id => invItems.find(i=>i.id===id)?.name).filter(Boolean).join(', ');
  if (!confirm(`🗑 ยืนยันทิ้ง: ${names}?`)) return;
  selected.forEach(id => { setInvItems(invItems.filter(i => i.id !== id)); });
  renderInv();
  showToast(`🗑 ทิ้งผลผลิตที่เลือกแล้ว: ${names}`);
}

export function disposeItem(id) {
  const item = invItems.find(i => i.id === id);
  if (!item) return;
  const qty = item.qty;
  setInvItems(invItems.filter(i => i.id !== id));
  renderInv();
  showToast(`🗑 ทิ้งผลผลิต ${item.name} ${qty} กก. แล้ว`);
}

export function disposeAllOverstock() {
  const overItems = invItems.filter(i => i.cat === 'ผลผลิต' && produceStatus(i).overstock);
  if (overItems.length === 0) { showToast('✅ ไม่มีผลผลิตค้างสต็อก'); return; }
  const names = overItems.map(i => i.name).join(', ');
  if (!confirm(`🗑 ยืนยันทิ้งทั้งหมด: ${names}?`)) return;
  overItems.forEach(i => { setInvItems(invItems.filter(x => x.id !== i.id)); });
  renderInv();
  showToast(`🗑 ทิ้งผลผลิตค้างสต็อกทั้งหมดแล้ว`);
}

// ── Mark a produce item as overstock manually ──
export function markAsOverstock(id) {
  const item = invItems.find(i => i.id === id);
  if (!item) return;
  // Force expire: set harvestDate to way past shelfLife
  item.harvestDate = '2000-01-01'; // causes produceDaysLeft to be very negative
  renderInv();
  showToast(`⚠️ ย้าย ${item.name} ไปค้างสต็อกแล้ว`);
}

// ── Helper: deduct produce stock when a sale is recorded ──
export function deductProduceStock(productName, weightKg, invId, silent = false) {
  if (!productName || !weightKg) return { deducted: 0, remaining: weightKg };

  let remaining = weightKg;
  const deducted = [];

  // Primary: exact lot by invId
  if (invId) {
    const item = invItems.find(i => i.id === invId);
    if (item && item.qty > 0) {
      const take = Math.min(item.qty, remaining);
      item.qty = Math.max(0, item.qty - take);
      remaining -= take;
      deducted.push({ name: item.name, lot: item.lot, took: take, left: item.qty });
    }
  }

  // Cascade: other lots with same name (oldest first by harvestDate)
  if (remaining > 0) {
    const otherLots = invItems
      .filter(i => i.cat === 'ผลผลิต' && i.name === productName && i.qty > 0 && i.id !== invId)
      .sort((a, b) => (a.harvestDate || '').localeCompare(b.harvestDate || ''));
    for (const item of otherLots) {
      if (remaining <= 0) break;
      const take = Math.min(item.qty, remaining);
      item.qty = Math.max(0, item.qty - take);
      remaining -= take;
      deducted.push({ name: item.name, lot: item.lot, took: take, left: item.qty });
    }
  }

  const totalDeducted = weightKg - remaining;
  if (totalDeducted > 0) {
    renderInv();
    saveData();
    if (!silent) {
      const lots = deducted.map(d => `${d.lot || d.name} −${d.took}กก. (เหลือ ${d.left})`).join(' · ');
      showToast(`📦 หักสต็อก: ${lots}`, 'success');
    }
  }

  // Oversell warning
  if (remaining > 0 && !silent) {
    showToast(`⚠️ สต็อก${productName}ไม่พอ — ขาดอีก ${remaining.toFixed(1)} กก. กรุณาเพิ่มผลผลิตเข้าคลัง`, 'warn');
  }

  return { deducted: totalDeducted, remaining };
}

export function updateInvStats() {
  const supplyOnly = invItems.filter(i => i.cat !== 'ผลผลิต');
  const ok    = supplyOnly.filter(i => i.qty > (i.threshold||0)).length;
  const low   = supplyOnly.filter(i => i.qty > 0 && i.qty <= (i.threshold||0)).length;
  const empty = supplyOnly.filter(i => i.qty === 0).length;
  const totalVal = supplyOnly.reduce((s,i) => s + (i.qty * (i.price||0)), 0);
  document.getElementById('inv-ok-count').innerHTML    = `${ok} <span class="stat-unit">รายการ</span>`;
  document.getElementById('inv-low-count').innerHTML   = `${low} <span class="stat-unit">รายการ</span>`;
  document.getElementById('inv-empty-count').innerHTML = `${empty} <span class="stat-unit">รายการ</span>`;
  const tvEl = document.getElementById('inv-total-val');
  if (tvEl) tvEl.innerHTML = totalVal.toLocaleString('th-TH') + ' <span class="stat-unit">฿</span>';

  // Supply summary row — total value + breakdown by category
  const summEl = document.getElementById('supply-summary-row');
  if (summEl) {
    const cats = {};
    supplyOnly.forEach(i => {
      if (!cats[i.cat]) cats[i.cat] = 0;
      cats[i.cat] += i.qty * (i.price||0);
    });
    const topCats = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,4);
    summEl.innerHTML = `
      <div class="quick-pill">📦 ${supplyOnly.length} รายการ</div>
      <div class="quick-pill">💰 มูลค่าคลัง <strong>${totalVal.toLocaleString('th-TH')} ฿</strong></div>
      ${topCats.map(([cat,val])=>`<div class="quick-pill" style="font-size:11px">${cat}: ${val.toLocaleString('th-TH')} ฿</div>`).join('')}
    `;
  }
}

export function adjustQty(id, delta) {
  const item = invItems.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  document.getElementById('qty-' + id).textContent = item.qty;
  const st = invStatus(item);
  const badge = document.getElementById('status-' + id);
  badge.className = 'badge ' + st.cls;
  badge.textContent = st.label;
  updateInvStats();
  showToast(delta > 0 ? `✅ เพิ่มสต็อก ${item.name}` : `📦 ลดสต็อก ${item.name}`);
}

export function openInvModal(id, defaultCat) {
  setEditingInvId(id || null);
  document.getElementById('inv-modal-title').textContent = id ? 'แก้ไขวัสดุ' : 'เพิ่มวัสดุใหม่';
  document.getElementById('inv-save-btn').textContent    = id ? 'บันทึกการแก้ไข' : 'เพิ่มวัสดุ';
  if (id) {
    const item = invItems.find(i => i.id === id);
    document.getElementById('inv-name').value      = item.name;
    document.getElementById('inv-cat').value       = item.cat;
    document.getElementById('inv-unit').value      = item.unit;
    document.getElementById('inv-qty').value       = item.qty;
    document.getElementById('inv-price').value     = item.price;
    document.getElementById('inv-threshold').value = item.threshold;
    document.getElementById('inv-shelf').value     = item.shelfLife || 7;
    document.getElementById('inv-harvest-date').value = item.harvestDate || '';
    document.getElementById('inv-lot').value       = item.lot || '';
    document.getElementById('inv-date').value      = '';
    _toggleShelfFields(item.cat);
  } else {
    ['inv-name','inv-unit','inv-qty','inv-price','inv-date','inv-harvest-date','inv-lot'].forEach(x => document.getElementById(x).value = '');
    document.getElementById('inv-threshold').value = '0';
    document.getElementById('inv-shelf').value     = '7';
    document.getElementById('inv-date').value      = dateStr;
    document.getElementById('inv-cat').value       = defaultCat || 'ปุ๋ย';
    _toggleShelfFields(defaultCat || 'ปุ๋ย');
    if (defaultCat === 'ผลผลิต') {
      document.getElementById('inv-unit').value = 'กก.';
      document.getElementById('inv-threshold').value = '0';
      document.getElementById('inv-harvest-date').value = dateStr;
      document.getElementById('inv-modal-title').textContent = 'เพิ่มผลผลิตในคลัง';
      document.getElementById('inv-save-btn').textContent    = 'เพิ่มผลผลิต';
      // default shelf life from settings
      document.getElementById('inv-shelf').value = farmSettings.shelfLife || 7;
      // auto-set lot number
      const nextLot = invItems.filter(i => i.cat === 'ผลผลิต').length + 1;
      document.getElementById('inv-lot').value = 'Crop ' + nextLot;
    }
  }
  document.getElementById('modal-inv').classList.add('open');
}

export function _toggleShelfFields(cat) {
  const show = cat === 'ผลผลิต';
  document.getElementById('inv-shelf-wrap').style.display   = show ? '' : 'none';
  document.getElementById('inv-harvest-wrap').style.display = show ? '' : 'none';
  document.getElementById('inv-lot-wrap').style.display     = show ? '' : 'none';
}

export function editInvItem(id) { openInvModal(id); }

export function saveInvItem() {
  const name      = document.getElementById('inv-name').value.trim();
  const cat       = document.getElementById('inv-cat').value;
  const unit      = document.getElementById('inv-unit').value.trim();
  const qty       = parseInt(document.getElementById('inv-qty').value)    || 0;
  const price     = parseFloat(document.getElementById('inv-price').value) || 0;
  const threshold = parseInt(document.getElementById('inv-threshold').value) || 0;
  const rawDate   = document.getElementById('inv-date').value;
  const shelfLife   = cat === 'ผลผลิต' ? (parseInt(document.getElementById('inv-shelf').value) || 7) : null;
  const harvestDate = cat === 'ผลผลิต' ? (document.getElementById('inv-harvest-date').value || dateStr) : null;
  const lot         = cat === 'ผลผลิต' ? (document.getElementById('inv-lot').value.trim() || '') : null;
  if (!name || !unit) { showToast('⚠️ กรุณากรอกชื่อรายการและหน่วย'); return; }
  const lastOrder = rawDate
    ? new Date(rawDate).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' })
    : '—';
  if (editingInvId) {
    const item = invItems.find(i => i.id === editingInvId);
    Object.assign(item, { name, cat, unit, qty, price, threshold, shelfLife, harvestDate, lot, lastOrder: rawDate ? lastOrder : item.lastOrder });
    showToast('✅ แก้ไขรายการสำเร็จ');
  } else {
    invItems.push({ id: nextInvId, name, cat, qty, unit, price, threshold, shelfLife, harvestDate, lot, lastOrder });
  setNextInvId(nextInvId + 1);
    showToast('✅ เพิ่มวัสดุสำเร็จ');
  }
  closeModal('modal-inv');
  saveData(); renderInv();
}

// ============================================================
// ===== SALES DATA =====
