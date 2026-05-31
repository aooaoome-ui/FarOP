import { getActStyle } from './activities.js';
import { editActItem } from './crops.js';
import { openCustHistory, openCustHistoryByName } from './customerHistory.js';
import { custTypeMap, editCustItem } from './customers.js';
import { editSaleItem, paymentBadge } from './salesLink.js';
import { askConfirmDel } from './shared.js';
import { fmtDate } from './utils.js';

// ===== MOBILE CARD VIEW + SWIPE TO DELETE =====
// ============================================================

export function _isMobile() { return window.innerWidth <= 768; }

// ── Swipe-to-delete helper ──
export function _attachSwipe(el, onDelete) {
  let startX = 0, dx = 0, swiping = false;
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; dx = 0; swiping = true; }, { passive:true });
  el.addEventListener('touchmove', e => {
    if (!swiping) return;
    dx = e.touches[0].clientX - startX;
    if (dx < -10) el.classList.add('swiping-left');
    if (dx > 10)  el.classList.remove('swiping-left');
  }, { passive:true });
  el.addEventListener('touchend', () => {
    swiping = false;
    if (dx < -60) { /* stay open — tap delete button */ }
    else el.classList.remove('swiping-left');
  });
  const delBtn = el.querySelector('.m-card-del-btn');
  if (delBtn) delBtn.addEventListener('click', () => { el.classList.remove('swiping-left'); onDelete(); });
}

// ── Activities mobile cards ──
export function _renderActivityMobileCards(slice) {
  const wrap = document.getElementById('activity-mobile-cards');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!slice.length) { wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:13px;">ยังไม่มีข้อมูล</div>'; return; }
  slice.forEach(item => {
    const st = getActStyle(item.type);
    const div = document.createElement('div');
    div.className = 'm-card';
    div.innerHTML = `
      <div class="m-card-del-btn">🗑<span style="font-size:10px;margin-top:2px;">ลบ</span></div>
      <div class="m-card-row">
        <span style="font-size:12px;background:${st.bg};color:${st.color};border:1px solid ${st.border};border-radius:5px;padding:2px 8px;font-weight:500;">${st.icon} ${item.type}</span>
        ${item.fromCrop ? '<span style="font-size:10px;background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:4px;padding:1px 6px;">🌱</span>' : ''}
      </div>
      <div style="font-size:13px;font-weight:600;margin-bottom:2px;">${item.note || '—'}</div>
      <div class="m-card-meta">📅 ${fmtDate(item.date)} · 📍 ${item.plot} · 👤 ${item.person}</div>
      ${item.material && item.material !== '—' ? `<div class="m-card-meta">🧪 ${item.material}</div>` : ''}
      <div class="m-card-actions">
        <button class="btn btn-outline" style="font-size:11px;padding:4px 10px;" onclick="editActItem(${item.id})">✏️ แก้ไข</button>
      </div>`;
    _attachSwipe(div, () => askConfirmDel('act', item.id, 'กิจกรรม ' + item.type));
    wrap.appendChild(div);
  });
}

// ── Sales mobile cards ──
export function _renderSalesMobileCards(slice) {
  const wrap = document.getElementById('sales-mobile-cards');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!slice.length) { wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:13px;">ยังไม่มีข้อมูล</div>'; return; }
  slice.forEach(item => {
    const cls = paymentBadge[item.payment] || 'badge-gray';
    const div = document.createElement('div');
    div.className = 'm-card';
    div.innerHTML = `
      <div class="m-card-del-btn">🗑<span style="font-size:10px;margin-top:2px;">ลบ</span></div>
      <div class="m-card-row" style="justify-content:space-between;">
        <span style="font-size:14px;font-weight:700;color:var(--green-700);">${item.total.toLocaleString('th-TH')} ฿</span>
        <span class="badge ${cls}">${item.payment}</span>
      </div>
      <div style="font-size:13px;font-weight:600;margin-bottom:2px;">🌿 ${item.product}</div>
      <div class="m-card-meta">📅 ${fmtDate(item.date)} · ⚖️ ${item.weight} กก. · ฿${item.price}/กก.</div>
      <div class="m-card-meta">
        👤 <button class="btn-link-inline" onclick="openCustHistoryByName('${item.customer.replace(/'/g,'\\\'')}')" style="background:none;border:none;color:var(--green-600);font-size:11px;cursor:pointer;padding:0;text-decoration:underline;">${item.customer}</button>
        · 📣 ${item.channel}
      </div>
      <div class="m-card-actions">
        <button class="btn btn-outline" style="font-size:11px;padding:4px 10px;" onclick="editSaleItem(${item._id})">✏️ แก้ไข</button>
      </div>`;
    _attachSwipe(div, () => askConfirmDel('sale', item._id, item.product));
    wrap.appendChild(div);
  });
}

// ── Customers mobile cards ──
export function _renderCustMobileCards(slice) {
  const wrap = document.getElementById('cust-mobile-cards');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!slice.length) { wrap.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:13px;">ยังไม่มีข้อมูล</div>'; return; }
  slice.forEach(item => {
    const cls = custTypeMap[item.type] || 'badge-gray';
    const div = document.createElement('div');
    div.className = 'm-card';
    div.innerHTML = `
      <div class="m-card-del-btn">🗑<span style="font-size:10px;margin-top:2px;">ลบ</span></div>
      <div class="m-card-row" style="justify-content:space-between;">
        <span style="font-size:14px;font-weight:700;">${item.name}</span>
        <span class="badge ${cls}">${item.type}</span>
      </div>
      <div class="m-card-meta">📞 ${item.contact} · 🌿 ${item.products}</div>
      <div class="m-card-meta">💰 ${item.total.toLocaleString('th-TH')} ฿ · สั่งล่าสุด ${fmtDate(item.lastOrder)}</div>
      <div class="m-card-actions">
        <button class="btn btn-outline" style="font-size:11px;padding:4px 10px;" onclick="openCustHistory(${item.id})">🧾 ประวัติ</button>
        <button class="btn btn-outline" style="font-size:11px;padding:4px 10px;" onclick="editCustItem(${item.id})">✏️ แก้ไข</button>
      </div>`;
    _attachSwipe(div, () => askConfirmDel('cust', item.id, item.name));
    wrap.appendChild(div);
  });
}

// ============================================================
// ===== FAB — context-aware =====
