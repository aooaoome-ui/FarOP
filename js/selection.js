import { renderActivities, renderCrops } from './crops.js';
import { renderCustomers } from './customers.js';
import { renderDashboard } from './dashboard.js';
import { buildReportCharts } from './charts.js';
import { saveData } from './firebase.js';
import { renderInv } from './inventory.js';
import { renderSales } from './salesLink.js';
import { actItems, cropItems, custItems, invItems, salesData } from './state.js';
import { showToast } from './ui.js';

// ============================================================
// Maps table key → { idAttr, dataArr, deleteFn }
const _chkConfig = {
  crops:      { cls:'chk-crops',      idAttr:'data-id', getArr:()=>cropItems,   deleteById:(id)=>{ cropItems  = cropItems.filter(i=>i.id!==id); } },
  activities: { cls:'chk-acts',       idAttr:'data-id', getArr:()=>actItems,    deleteById:(id)=>{ actItems   = actItems.filter(i=>i.id!==id);  } },
  sales:      { cls:'chk-sales',      idAttr:'data-id', getArr:()=>salesData,   deleteById:(id)=>{ salesData  = salesData.filter(i=>i._id!==id); } },
  customers:  { cls:'chk-custs',      idAttr:'data-id', getArr:()=>custItems,   deleteById:(id)=>{ custItems  = custItems.filter(i=>i.id!==id); } },
  produce:    { cls:'chk-produce',    idAttr:'data-id', getArr:()=>invItems.filter(i=>i.cat==='ผลผลิต'),    deleteById:(id)=>{ invItems = invItems.filter(i=>i.id!==id); } },
  supply:     { cls:'chk-supply',     idAttr:'data-id', getArr:()=>invItems.filter(i=>i.cat!=='ผลผลิต'),    deleteById:(id)=>{ invItems = invItems.filter(i=>i.id!==id); } },
};

export function toggleCheckAll(table, checked) {
  document.querySelectorAll('.' + _chkConfig[table]?.cls).forEach(c => c.checked = checked);
  _updateSelBar(table);
}

export function _updateSelBar(table) {
  const cfg = _chkConfig[table]; if (!cfg) return;
  const checked = [...document.querySelectorAll('.' + cfg.cls + ':checked')];
  const bar  = document.getElementById('action-bar-' + table);
  const cnt  = document.getElementById('sel-count-' + table);
  if (bar)  bar.style.display  = checked.length > 0 ? 'flex' : 'none';
  if (cnt)  cnt.textContent    = `เลือก ${checked.length} รายการ`;
  // sync header checkbox
  const all  = document.querySelectorAll('.' + cfg.cls);
  const hdr  = document.getElementById('chk-all-' + table);
  if (hdr) hdr.checked = all.length > 0 && checked.length === all.length;
}

export function clearSelected(table) {
  document.querySelectorAll('.' + _chkConfig[table]?.cls).forEach(c => c.checked = false);
  const hdr = document.getElementById('chk-all-' + table);
  if (hdr) hdr.checked = false;
  _updateSelBar(table);
}

export function deleteSelected(table) {
  const cfg = _chkConfig[table]; if (!cfg) return;
  const ids = [...document.querySelectorAll('.' + cfg.cls + ':checked')]
    .map(c => parseInt(c.getAttribute(cfg.idAttr)));
  if (!ids.length) { showToast('⚠️ เลือกรายการก่อน'); return; }
  if (!confirm(`ลบ ${ids.length} รายการที่เลือก?`)) return;
  ids.forEach(id => cfg.deleteById(id));
  // Re-render affected page
  if (table === 'crops')      { renderCrops();      }
  if (table === 'activities') { renderActivities(); }
  if (table === 'sales')      { renderSales(); renderDashboard(); setTimeout(buildReportCharts,100); }
  if (table === 'customers')  { renderCustomers();  }
  if (table === 'produce' || table === 'supply') { renderInv(); }
  showToast(`🗑 ลบ ${ids.length} รายการแล้ว`);
  saveData();
}

// ============================================================
// ===== PROJECT MANAGEMENT SYSTEM =====
