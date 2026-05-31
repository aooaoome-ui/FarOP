import { paymentBadge } from './salesLink.js';
import { custTypeMap } from './customers.js';
import { custItems, salesData } from './state.js';
import { fmtDate } from './utils.js';

export function openCustHistory(id) {
  const cust = custItems.find(c => c.id === id);
  if (!cust) return;
  _showCustHistory(cust);
}

export function openCustHistoryByName(name) {
  const cust = custItems.find(c => c.name === name);
  if (cust) { _showCustHistory(cust); return; }
  // No customer record — show what we have from sales
  _showCustHistoryFromSales(name);
}

export function _showCustHistory(cust) {
  const sales = [...salesData].filter(s => s.customer === cust.name).sort((a,b) => b.date.localeCompare(a.date));
  const total = sales.reduce((s,i) => s + i.total, 0);
  const totalW = sales.reduce((s,i) => s + (i.weight||0), 0);
  document.getElementById('cust-hist-name').innerHTML = `👤 ${cust.name} <span class="badge ${custTypeMap[cust.type]||'badge-gray'}" style="font-size:11px;">${cust.type}</span>`;
  document.getElementById('cust-hist-stats').innerHTML = `
    <div class="quick-pill">🛒 ${sales.length} รายการ</div>
    <div class="quick-pill">💰 รวม <strong>${total.toLocaleString('th-TH')} ฿</strong></div>
    <div class="quick-pill">⚖️ รวม <strong>${totalW.toLocaleString('th-TH')} กก.</strong></div>
    ${cust.contact ? `<div class="quick-pill">📞 ${cust.contact}</div>` : ''}`;
  _renderCustHistTimeline(sales);
  document.getElementById('modal-cust-history').classList.add('open');
}

export function _showCustHistoryFromSales(name) {
  const sales = [...salesData].filter(s => s.customer === name).sort((a,b) => b.date.localeCompare(a.date));
  const total = sales.reduce((s,i) => s + i.total, 0);
  document.getElementById('cust-hist-name').innerHTML = `👤 ${name}`;
  document.getElementById('cust-hist-stats').innerHTML = `<div class="quick-pill">🛒 ${sales.length} รายการ</div><div class="quick-pill">💰 <strong>${total.toLocaleString('th-TH')} ฿</strong></div>`;
  _renderCustHistTimeline(sales);
  document.getElementById('modal-cust-history').classList.add('open');
}

export function _renderCustHistTimeline(sales) {
  const el = document.getElementById('cust-hist-timeline');
  if (!el) return;
  if (!sales.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:13px;">ยังไม่มีประวัติการซื้อ</div>'; return; }
  el.innerHTML = sales.map((s, i) => {
    const cls = paymentBadge[s.payment] || 'badge-gray';
    return `
      <div style="display:flex;gap:12px;padding:10px 0;${i < sales.length-1 ? 'border-bottom:1px solid var(--gray-100)' : ''}">
        <div style="display:flex;flex-direction:column;align-items:center;gap:0;flex-shrink:0;">
          <div style="width:10px;height:10px;border-radius:50%;background:var(--green-500);margin-top:3px;"></div>
          ${i < sales.length-1 ? '<div style="width:2px;flex:1;background:var(--gray-100);margin-top:3px;"></div>' : ''}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:600;">🌿 ${s.product}</span>
            <span style="font-size:13px;font-weight:700;color:var(--green-700);">${s.total.toLocaleString('th-TH')} ฿</span>
          </div>
          <div style="font-size:11px;color:var(--gray-400);margin-top:2px;">
            📅 ${fmtDate(s.date)} · ⚖️ ${s.weight} กก. · ฿${s.price}/กก. · 📣 ${s.channel}
          </div>
          <div style="margin-top:4px;"><span class="badge ${cls}" style="font-size:10px;">${s.payment}</span></div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// ===== PLOT ACTIVITIES MODAL =====
