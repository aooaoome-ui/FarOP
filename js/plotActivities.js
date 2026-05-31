import { getActStyle } from './activities.js';
import { actItems, cropItems } from './state.js';
import { fmtDate } from './utils.js';

// ============================================================
export function openPlotActs(cropId) {
  const crop = cropItems.find(c => c.id === cropId);
  if (!crop) return;
  const plot = crop.plot;
  const acts = [...actItems].filter(a => a.plot === plot || a.note?.includes(crop.name)).sort((a,b) => b.date.localeCompare(a.date));
  document.getElementById('plot-acts-name').innerHTML = `🌾 ${crop.name} · <span style="color:var(--gray-500);font-size:12px;">แปลง ${plot}</span>`;
  const listEl  = document.getElementById('plot-acts-list');
  const emptyEl = document.getElementById('plot-acts-empty');
  if (!acts.length) {
    listEl.innerHTML = ''; emptyEl.style.display = '';
  } else {
    emptyEl.style.display = 'none';
    listEl.innerHTML = acts.map(a => {
      const st = getActStyle(a.type);
      return `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--gray-50);">
        <div style="width:8px;height:8px;border-radius:50%;background:${st.color};flex-shrink:0;margin-top:5px;"></div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px;">
            <span style="font-size:11px;background:${st.bg};color:${st.color};border:1px solid ${st.border};border-radius:4px;padding:1px 7px;font-weight:500;">${st.icon} ${a.type}</span>
            <span style="font-size:11px;color:var(--gray-400);">📅 ${fmtDate(a.date)}</span>
            <span style="font-size:11px;color:var(--gray-400);">👤 ${a.person}</span>
          </div>
          ${a.note ? `<div style="font-size:12px;color:var(--gray-600);">${a.note}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }
  document.getElementById('modal-plot-acts').classList.add('open');
}

// ============================================================
// ===== SALES → CUSTOMER LINK (desktop table) =====
