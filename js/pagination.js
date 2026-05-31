import { ACT_GROUPS, getActStyle } from './activities.js';
import { cropStatusMap, editActItem, editCropItem } from './crops.js';
import { openCustHistory, openCustHistoryByName } from './customerHistory.js';
import { custTypeMap, editCustItem } from './customers.js';
import { openHarvestLogModal } from './harvestLog.js';
import { _renderActivityMobileCards, _renderCustMobileCards, _renderSalesMobileCards } from './mobileCards.js';
import { openSeasonDetail } from './planningSystem.js';
import { openPlotActs } from './plotActivities.js';
import { editSaleItem, paymentBadge, updateSaleStats } from './salesLink.js';
import { _updateSelBar } from './selection.js';
import { askConfirmDel } from './shared.js';
import { actItems, cropItems, custItems, db, salesData } from './state.js';
import { navigate } from './ui.js';
import { fmtDate } from './utils.js';

// ============================================================
const PAGE_SIZE = 31;

// State per table: { page, query }
export const _pgState = {
  crops:      { page:1, query:'' },
  activities: { page:1, query:'' },
  sales:      { page:1, query:'' },
  customers:  { page:1, query:'' },
};

// Search field indices per table (fields to search)
export function _searchMatch(item, query, table) {
  if (!query) return true;
  const q = query.toLowerCase();
  const fields = {
    crops:      [item.name, item.plot, item.status, item.harvest],
    activities: [item.type, item.plot, item.person, item.note, item.material],
    sales:      [item.product, item.customer, item.channel, item.payment, item.date],
    customers:  [item.name, item.type, item.contact, item.products],
  }[table] || [];
  return fields.some(f => f && String(f).toLowerCase().includes(q));
}

// Sort by date desc
export function _sortByDate(arr, dateField) {
  return [...arr].sort((a,b) => {
    const da = a[dateField] || '';
    const db = b[dateField] || '';
    return db.localeCompare(da);
  });
}

export function onSearch(table) {
  const inp = document.getElementById('search-' + table);
  if (!inp) return;
  _pgState[table].query = inp.value.trim();
  _pgState[table].page  = 1;
  const clr = document.getElementById('search-' + table + '-clear');
  if (clr) clr.classList.toggle('visible', inp.value.length > 0);
  _renderTable(table);
}

export function clearSearch(table) {
  const inp = document.getElementById('search-' + table);
  if (inp) inp.value = '';
  _pgState[table].query = '';
  _pgState[table].page  = 1;
  const clr = document.getElementById('search-' + table + '-clear');
  if (clr) clr.classList.remove('visible');
  _renderTable(table);
}

export function gotoPage(table, p) {
  _pgState[table].page = p;
  _renderTable(table);
}

export function _renderPagination(table, total, currentPage) {
  const el = document.getElementById('pg-' + table);
  if (!el) return;
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="pg-btn" onclick="gotoPage('${table}',${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;

  // Show max 7 page buttons with ellipsis
  let start = Math.max(1, currentPage - 3);
  let end   = Math.min(pages, start + 6);
  if (end - start < 6) start = Math.max(1, end - 6);

  if (start > 1) html += `<button class="pg-btn" onclick="gotoPage('${table}',1)">1</button><span class="pg-info">…</span>`;
  for (let i = start; i <= end; i++) {
    html += `<button class="pg-btn ${i===currentPage?'active':''}" onclick="gotoPage('${table}',${i})">${i}</button>`;
  }
  if (end < pages) html += `<span class="pg-info">…</span><button class="pg-btn" onclick="gotoPage('${table}',${pages})">${pages}</button>`;

  html += `<button class="pg-btn" onclick="gotoPage('${table}',${currentPage+1})" ${currentPage===pages?'disabled':''}>›</button>`;
  html += `<span class="pg-info">${total} รายการ · หน้า ${currentPage}/${pages}</span>`;
  el.innerHTML = html;
}

export function _renderTable(table) {
  const { page, query } = _pgState[table];
  if (table === 'crops')      _renderCropsPage(page, query);
  if (table === 'activities') _renderActivitiesPage(page, query);
  if (table === 'sales')      _renderSalesPage(page, query);
  if (table === 'customers')  _renderCustomersPage(page, query);
}

// ── Crops with pagination ──
export function _renderCropsPage(page, query) {
  const sorted   = _sortByDate(cropItems, 'planted');
  const filtered = sorted.filter(i => _searchMatch(i, query, 'crops'));

  // Update pills
  document.getElementById('crop-count-growing').textContent =
    cropItems.filter(i => !['พร้อมเก็บ','เก็บเกี่ยวแล้ว'].includes(i.status)).length + ' ชนิด';
  document.getElementById('crop-count-ready').textContent =
    cropItems.filter(i => i.status === 'พร้อมเก็บ').length + ' ชนิด';
  document.getElementById('crop-count-done').textContent =
    cropItems.filter(i => i.status === 'เก็บเกี่ยวแล้ว').length + ' ชนิด';

  const wrap = document.getElementById('crop-type-sections');
  if (!wrap) return;

  if (filtered.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gray-400);">
      ${cropItems.length === 0 ? '🌱 ยังไม่มีข้อมูลพืชผล — กด "+ เพิ่มพืชผล"' : 'ไม่พบพืชผลที่ค้นหา'}</div>`;
    return;
  }

  // Group by cropType
  const CROP_TYPE_ORDER = ['พืชผัก','พืชสวนครัว','ไม้ผล','ไม้ดอก','ไม้เศรษฐกิจ','พืชไร่','สมุนไพร','อื่นๆ'];
  const CROP_TYPE_ICON  = {'พืชผัก':'🥬','พืชสวนครัว':'🫚','ไม้ผล':'🍊','ไม้ดอก':'🌸','ไม้เศรษฐกิจ':'🌳','พืชไร่':'🌽','สมุนไพร':'🌿','อื่นๆ':'🪴'};
  const CROP_TYPE_COLOR = {'พืชผัก':'#16a34a','พืชสวนครัว':'#ca8a04','ไม้ผล':'#ea580c','ไม้ดอก':'#db2777','ไม้เศรษฐกิจ':'#65a30d','พืชไร่':'#b45309','สมุนไพร':'#0891b2','อื่นๆ':'#6b7280'};

  const groups = {};
  filtered.forEach(item => {
    const t = item.cropType || 'อื่นๆ';
    if (!groups[t]) groups[t] = [];
    groups[t].push(item);
  });

  // Sort by defined order
  const sortedTypes = Object.keys(groups).sort((a,b) =>
    (CROP_TYPE_ORDER.indexOf(a)+99) - (CROP_TYPE_ORDER.indexOf(b)+99));

  wrap.innerHTML = sortedTypes.map(type => {
    const items  = groups[type];
    const icon   = CROP_TYPE_ICON[type]  || '🪴';
    const color  = CROP_TYPE_COLOR[type] || '#6b7280';
    const rowsHTML = items.map(item => {
      const st = cropStatusMap[item.status] || { cls:'badge-gray', color:'#9a9890' };
      const totalFromLog = (item.harvestLog||[]).reduce((s,e)=>s+e.weight,0);
      const displayYield = totalFromLog > 0 ? totalFromLog
        : (item.yieldActual !== '' && item.yieldActual !== null ? item.yieldActual : '—');
      const logCount = (item.harvestLog||[]).length;
      return `<tr>
        <td><input type='checkbox' class='chk-crops' data-id='${item.id}' onchange="_updateSelBar('crops')"></td>
        <td><strong>${item.name}</strong></td>
        <td>${item.plot}</td>
        <td>${fmtDate(item.planted)}</td>
        <td>${item.harvest||'—'}</td>
        <td>${item.area}</td>
        <td><span class="badge ${st.cls}">${item.status}</span></td>
        <td>${item.yieldEst||'—'}</td>
        <td><span style="font-weight:600">${displayYield}</span>${logCount>0?`<span style="font-size:10px;color:var(--green-600);margin-left:3px">(${logCount}×)</span>`:''}</td>
        <td>
          <div class="inv-actions">
            <button class="btn-icon" title="ประวัติเก็บเกี่ยว" onclick="openHarvestLogModal(${item.id})" style="font-size:12px">📋</button>
            <button class="btn-icon" title="กิจกรรมในแปลง" onclick="openPlotActs(${item.id})" style="font-size:12px">🌿</button>
            ${item._seasonId ? `<button class="btn-icon" title="ดูแผนปลูก" onclick="navigate('plan',document.querySelector('[onclick*=\\'plan\\']'));setTimeout(()=>openSeasonDetail(${item._seasonId}),200)" style="font-size:12px">🗺️</button>` : ''}
            <button class="btn-icon edit" onclick="editCropItem(${item.id})">✏️</button>
            <button class="btn-icon del" onclick="askConfirmDel('crop',${item.id},'${item.name.replace(/'/g,"\\'")}')">🗑</button>
          </div>
        </td></tr>`;
    }).join('');

    return `<div class="card" style="margin-bottom:12px;border-left:4px solid ${color}">
      <div class="card-header" style="cursor:pointer" onclick="toggleCropTypeSection('ctsec-${type}')">
        <div>
          <div class="card-title">${icon} ${type}
            <span style="font-size:12px;font-weight:400;color:var(--gray-500);margin-left:6px">${items.length} ชนิด</span>
          </div>
        </div>
        <span id="ctsec-chevron-${type}" style="font-size:16px;color:var(--gray-400)">▾</span>
      </div>
      <div id="ctsec-${type}">
        <div class="table-wrap" style="max-height:320px;overflow-y:auto;">
          <table>
            <thead>
              <tr>
                <th style="width:32px"><input type="checkbox" onchange="toggleCropTypeAll(this,'${type}')"></th>
                <th>พืชผล</th><th>แปลง</th><th>วันปลูก</th><th>วันเก็บเกี่ยว</th>
                <th>พื้นที่ (ไร่)</th><th>สถานะ</th><th>คาด (กก.)</th><th>จริง (กก.)</th><th style="width:100px">จัดการ</th>
              </tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }).join('');
}

export function toggleCropTypeSection(id) {
  const el  = document.getElementById(id);
  const ch  = document.getElementById(id.replace('ctsec-','ctsec-chevron-'));
  if (!el) return;
  const hidden = el.style.display === 'none';
  el.style.display  = hidden ? '' : 'none';
  if (ch) ch.textContent = hidden ? '▾' : '▸';
}

export function toggleCropTypeAll(cb, type) {
  document.querySelectorAll('.chk-crops').forEach(c => {
    const id  = parseInt(c.dataset.id);
    const item = cropItems.find(x=>x.id===id);
    if (item && (item.cropType||'อื่นๆ') === type) c.checked = cb.checked;
  });
  _updateSelBar('crops');
}

// ── Activities with pagination ──
export function _renderActivitiesPage(page, query) {
  const sorted   = _sortByDate(actItems, 'date');
  const filtered = sorted.filter(i => _searchMatch(i, query, 'activities'));
  const start    = (page - 1) * PAGE_SIZE;
  const slice    = filtered.slice(start, start + PAGE_SIZE);
  const tbody    = document.getElementById('activity-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  slice.forEach(item => {
    const st = getActStyle(item.type);
    const fromCropBadge = item.fromCrop
      ? `<span style="font-size:9px;background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:4px;padding:1px 5px;margin-left:4px;">🌱 พืชผล</span>` : '';
    const typeBadge = `<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;background:${st.bg};color:${st.color};border:1px solid ${st.border};border-radius:5px;padding:2px 7px;font-weight:500;">${st.icon} ${item.type}</span>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type='checkbox' class='chk-acts' data-id='${item.id}' onchange="_updateSelBar('activities')"></td>
      <td>${fmtDate(item.date)}</td>
      <td>${typeBadge}${fromCropBadge}</td>
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
  _renderActivityMobileCards(slice);
  _renderPagination('activities', filtered.length, page);
  // Render legend from groups that appear in data
  _renderActLegend();
}

export function _renderActLegend() {
  const el = document.getElementById('act-legend-bar');
  if (!el) return;
  // Find which groups have data
  const usedGroups = new Set(actItems.map(i => getActStyle(i.type).group));
  el.innerHTML = [...usedGroups].map(g => {
    const gDef = ACT_GROUPS[g] || ACT_GROUPS['📌 อื่นๆ'];
    return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;background:${gDef.bg};color:${gDef.color};border:1px solid ${gDef.border};border-radius:12px;padding:3px 10px;">${g}</span>`;
  }).join('');
}

// ── Sales with pagination ──
export function _renderSalesPage(page, query) {
  const sorted   = _sortByDate(salesData, 'date');
  const filtered = sorted.filter(i => _searchMatch(i, query, 'sales'));
  const start    = (page - 1) * PAGE_SIZE;
  const slice    = filtered.slice(start, start + PAGE_SIZE);
  const tbody    = document.getElementById('sales-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  slice.forEach(item => {
    const cls = paymentBadge[item.payment] || 'badge-gray';
    const hasCust = custItems.some(c => c.name === item.customer);
    const custCell = hasCust
      ? `<button onclick="openCustHistoryByName('${item.customer.replace(/'/g,'\\\'')}')" style="background:none;border:none;color:var(--green-600);cursor:pointer;padding:0;font-size:inherit;text-decoration:underline;">${item.customer}</button>`
      : item.customer;
    const tr  = document.createElement('tr');
    tr.innerHTML = `<td><input type='checkbox' class='chk-sales' data-id='${item._id}' onchange="_updateSelBar('sales')"></td><td>${fmtDate(item.date)}</td><td>${item.product}</td><td>${custCell}</td><td>${item.channel}</td><td>${item.weight}</td><td>${item.price}</td><td>${item.total.toLocaleString('th-TH')}</td><td><span class="badge ${cls}">${item.payment}</span></td><td><div class="inv-actions"><button class="btn-icon edit" onclick="editSaleItem(${item._id})">✏️</button><button class="btn-icon del" onclick="askConfirmDel('sale',${item._id},'${item.product}')">🗑</button></div></td>`;
    tbody.appendChild(tr);
  });
  _renderSalesMobileCards(slice);
  _renderPagination('sales', filtered.length, page);
  updateSaleStats();
}

// ── Customers with pagination ──
export function _renderCustomersPage(page, query) {
  const sorted   = [...custItems].sort((a,b) => (b.lastOrder||'').localeCompare(a.lastOrder||''));
  const filtered = sorted.filter(i => _searchMatch(i, query, 'customers'));
  const start    = (page - 1) * PAGE_SIZE;
  const slice    = filtered.slice(start, start + PAGE_SIZE);
  const tbody    = document.getElementById('cust-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  slice.forEach(item => {
    const cls = custTypeMap[item.type] || 'badge-gray';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type='checkbox' class='chk-custs' data-id='${item.id}' onchange="_updateSelBar('customers')"></td>
      <td><button onclick="openCustHistory(${item.id})" style="background:none;border:none;cursor:pointer;font-weight:600;color:var(--green-700);padding:0;text-decoration:underline;">${item.name}</button></td>
      <td><span class="badge ${cls}">${item.type}</span></td>
      <td>${item.contact}</td>
      <td>${item.products}</td>
      <td>${item.total.toLocaleString('th-TH')} ฿</td>
      <td>${fmtDate(item.lastOrder)}</td>
      <td>
        <div class="inv-actions">
          <button class="btn-icon" onclick="openCustHistory(${item.id})" title="ประวัติ">🧾</button>
          <button class="btn-icon edit" onclick="editCustItem(${item.id})">✏️</button>
          <button class="btn-icon del"  onclick="askConfirmDel('cust',${item.id},'${item.name}')">🗑</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  _renderCustMobileCards(slice);
  _renderPagination('customers', filtered.length, page);
}

// ============================================================
// ===== REQUISITION SYSTEM =====
