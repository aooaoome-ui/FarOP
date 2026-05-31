import { PROJ_STATUS_MAP, openProjectDetail } from './projects.js';
import { saveData } from './firebase.js';
import { _nextCalId, calEvents, calMonth, calView, calYear, editingCalId, projectItems, setCalMonth, setCalView as _setCalViewState, setCalYear, setEditingCalId, setNextCalId } from './state.js';
import { closeModal, navigate, showToast } from './ui.js';
import { dateStr, fmtDate } from './utils.js';

// ============================================================
const CAL_PRIORITY_COLOR = { high:'high', medium:'medium', normal:'normal', farm:'farm', personal:'personal' };
const CAL_PRIORITY_LABEL = { high:'สำคัญมาก', medium:'ปานกลาง', normal:'ปกติ', farm:'เกษตร', personal:'ส่วนตัว' };
const CAL_DOW_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const CAL_DOW_CLS = ['sun','mon','tue','wed','thu','fri','sat'];
const CAL_MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                        'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

// seed some sample events
export function isoDate(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// ── สร้าง virtual events จากโครงการ ──
export function getProjectCalEvents() {
  const chk = document.getElementById('cal-show-projects');
  if (chk && !chk.checked) return [];
  const events = [];
  for (const p of projectItems) {
    const basePriority = p.status === 'มีปัญหา' ? 'medium'
                       : p.status === 'เสร็จสิ้น' ? 'project_done' : 'project';
    const sm = PROJ_STATUS_MAP[p.status] || PROJ_STATUS_MAP['วางแผน'];
    // วันเริ่มต้นโครงการ
    if (p.start) {
      events.push({
        id: p.id * 10000 + 9001,
        title: `📁 ${p.name} · เริ่มต้น`,
        start: p.start, end: p.start,
        priority: 'project', cat: 'โครงการ',
        _isProj: true, _projId: p.id,
        _projStatus: p.status, _projPct: p.pct,
        note: `${sm.icon} ${p.status} · ความคืบหน้า ${p.pct}%${p.desc?' · '+p.desc:''}`,
      });
    }
    // กำหนดเสร็จโครงการ
    if (p.end) {
      const daysLeft = Math.ceil((new Date(p.end) - new Date()) / 86400000);
      const endPri = daysLeft < 0 ? 'high' : daysLeft < 7 ? 'medium' : 'project';
      events.push({
        id: p.id * 10000 + 9002,
        title: `📁 ${p.name} · กำหนดเสร็จ`,
        start: p.end, end: p.end,
        priority: endPri, cat: 'โครงการ',
        _isProj: true, _projId: p.id,
        _projStatus: p.status, _projPct: p.pct,
        note: `กำหนดเสร็จ: ${sm.icon} ${p.status} · ${daysLeft < 0 ? 'เกินกำหนด ' + Math.abs(daysLeft) + ' วัน' : 'อีก ' + daysLeft + ' วัน'}`,
      });
    }
    // Timeline steps ที่มีวันที่
    (p.timeline || []).forEach((step, i) => {
      if (!step.date) return;
      const stepPri = step.status === 'issue' ? 'medium'
                    : step.status === 'done'  ? 'project_done'
                    : step.status === 'skip'  ? 'project_done'
                    : step.status === 'doing' ? 'project' : 'project';
      events.push({
        id: p.id * 10000 + i,
        title: `📁 ${step.title}`,
        start: step.date, end: step.date,
        priority: stepPri, cat: 'โครงการ',
        _isProj: true, _projId: p.id,
        _projStatus: p.status, _projPct: p.pct,
        note: `${p.name}${step.note ? ' · ' + step.note : ''}`,
        _stepStatus: step.status,
      });
    });
  }
  return events;
}

export function eventsOnDate(iso) {
  const regular = calEvents.filter(e => e.start <= iso && iso <= (e.end || e.start));
  const projEvs = getProjectCalEvents().filter(e => e.start <= iso && iso <= (e.end || e.start));
  return [...regular, ...projEvs];
}

export function setCalView(v) {
  _setCalViewState(v);
  document.getElementById('cal-btn-month').classList.toggle('active', v==='month');
  document.getElementById('cal-btn-year').classList.toggle('active', v==='year');
  saveData(); renderCalendar();
}

export function calPrev() {
  if (calView === 'month') { setCalMonth(calMonth - 1); if (calMonth < 0) { setCalMonth(11); setCalYear(calYear - 1); } }
  else setCalYear(calYear - 1);
  renderCalendar();
}
export function calNext() {
  if (calView === 'month') { setCalMonth(calMonth + 1); if (calMonth > 11) { setCalMonth(0); setCalYear(calYear + 1); } }
  else setCalYear(calYear + 1);
  renderCalendar();
}

export function renderCalendar() {
  const lbl = document.getElementById('cal-month-label');
  if (calView === 'month') {
    lbl.textContent = CAL_MONTHS_TH[calMonth] + ' ' + (calYear + 543);
    renderMonthView();
  } else {
    lbl.textContent = 'ปี ' + (calYear + 543);
    renderYearView();
  }
}

export function renderMonthView() {
  const today = new Date();
  const todayISO = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth, 0).getDate();

  let html = `<table class="cal-grid"><thead><tr>`;
  CAL_DOW_TH.forEach((d,i) => {
    html += `<th class="cal-day-header ${CAL_DOW_CLS[i]}">${d}</th>`;
  });
  html += `</tr></thead><tbody>`;

  let day = 1, nextDay = 1, cell = 0;
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let r = 0; r < totalCells / 7; r++) {
    html += '<tr>';
    for (let c = 0; c < 7; c++) {
      cell = r * 7 + c;
      let iso, dateNum, cls = 'cal-cell';
      if (cell < firstDay) {
        const d2 = daysInPrev - firstDay + cell + 1;
        iso = isoDate(calMonth === 0 ? calYear-1 : calYear, calMonth === 0 ? 11 : calMonth-1, d2);
        dateNum = d2; cls += ' other-month';
      } else if (day > daysInMonth) {
        iso = isoDate(calMonth === 11 ? calYear+1 : calYear, calMonth === 11 ? 0 : calMonth+1, nextDay);
        dateNum = nextDay++; cls += ' other-month';
      } else {
        iso = isoDate(calYear, calMonth, day);
        dateNum = day++;
        if (iso === todayISO) cls += ' today';
      }

      const evs = eventsOnDate(iso);
      const dotCls = iso === todayISO ? 'cal-date today-dot' : 'cal-date';
      html += `<td class="${cls}" onclick="calCellClick('${iso}')">`;
      html += `<span class="${dotCls}">${dateNum}</span>`;
      const maxShow = 3;
      evs.slice(0, maxShow).forEach(ev => {
        html += `<div class="cal-event-pill ${ev.priority}" onclick="event.stopPropagation();showCalDetail(${ev.id})">• ${ev.title}</div>`;
      });
      if (evs.length > maxShow) {
        html += `<div class="cal-more" onclick="event.stopPropagation();calCellClick('${iso}')">+${evs.length - maxShow} เพิ่มเติม</div>`;
      }
      html += '</td>';
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  document.getElementById('cal-container').innerHTML = html;
}

export function renderYearView() {
  const today = new Date();
  let html = '<div class="cal-year-grid">';
  for (let m = 0; m < 12; m++) {
    const daysInM = new Date(calYear, m+1, 0).getDate();
    const firstD  = new Date(calYear, m, 1).getDay(); // 0=Sun
    html += `<div class="cal-mini-month">
      <div class="cal-mini-header">${CAL_MONTHS_TH[m]}</div>
      <table class="cal-mini-grid"><thead><tr>`;
    ['อา','จ','อ','พ','พฤ','ศ','ส'].forEach(d => { html += `<th class="cal-mini-th">${d}</th>`; });
    html += '</tr></thead><tbody>';

    const totalCells = Math.ceil((firstD + daysInM) / 7) * 7;
    let day = 1;
    for (let r = 0; r < totalCells / 7; r++) {
      html += '<tr>';
      for (let c = 0; c < 7; c++) {
        const cell = r * 7 + c;
        if (cell < firstD || day > daysInM) {
          // empty cell before month start or after month end
          html += '<td class="cal-mini-td other">&nbsp;</td>';
        } else {
          const iso = isoDate(calYear, m, day);
          const hasEv = eventsOnDate(iso).length > 0;
          const isToday = calYear === today.getFullYear() && m === today.getMonth() && day === today.getDate();
          let tdCls = 'cal-mini-td';
          if (isToday) tdCls += ' today-mini';
          else if (hasEv) tdCls += ' has-event';
          const dayNum = day;
          html += `<td class="${tdCls}" onclick="calYear=${calYear};calMonth=${m};setCalView('month')">${dayNum}</td>`;
          day++;
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
  }
  html += '</div>';
  document.getElementById('cal-container').innerHTML = html;
}

export function calCellClick(iso) {
  // open add event modal pre-filled with date
  openCalEventModal(null, iso);
}

export function openCalEventModal(id, preDate) {
  setEditingCalId(id || null);
  const isEdit = !!id;
  document.getElementById('cal-event-modal-title').textContent = isEdit ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรมใหม่';
  document.getElementById('cal-ev-save-btn').textContent = isEdit ? 'บันทึกการแก้ไข' : 'บันทึกกิจกรรม';
  if (isEdit) {
    const ev = calEvents.find(e => e.id === id);
    if (!ev) return;
    document.getElementById('cal-ev-title').value    = ev.title;
    document.getElementById('cal-ev-start').value    = ev.start;
    document.getElementById('cal-ev-end').value      = ev.end || ev.start;
    document.getElementById('cal-ev-priority').value = ev.priority;
    document.getElementById('cal-ev-cat').value      = ev.cat;
    document.getElementById('cal-ev-note').value     = ev.note || '';
  } else {
    document.getElementById('cal-ev-title').value    = '';
    document.getElementById('cal-ev-start').value    = preDate || dateStr;
    document.getElementById('cal-ev-end').value      = preDate || dateStr;
    document.getElementById('cal-ev-priority').value = 'normal';
    document.getElementById('cal-ev-cat').value      = 'ทั่วไป';
    document.getElementById('cal-ev-note').value     = '';
  }
  closeModal('modal-cal-detail');
  document.getElementById('modal-cal-event').classList.add('open');
}

export function saveCalEvent() {
  const title = document.getElementById('cal-ev-title').value.trim();
  const start = document.getElementById('cal-ev-start').value;
  const end   = document.getElementById('cal-ev-end').value || start;
  const priority = document.getElementById('cal-ev-priority').value;
  const cat   = document.getElementById('cal-ev-cat').value;
  const note  = document.getElementById('cal-ev-note').value.trim();
  if (!title) { showToast('⚠️ กรุณากรอกชื่อกิจกรรม'); return; }
  if (!start) { showToast('⚠️ กรุณาเลือกวันที่'); return; }
  if (editingCalId) {
    const ev = calEvents.find(e => e.id === editingCalId);
    Object.assign(ev, { title, start, end, priority, cat, note });
    showToast('✅ แก้ไขกิจกรรมสำเร็จ');
  } else {
    calEvents.push({ id: _nextCalId, title, start, end, priority, cat, note });
  setNextCalId(_nextCalId + 1);
    showToast('✅ เพิ่มกิจกรรมสำเร็จ');
  }
  closeModal('modal-cal-event');
  saveData(); renderCalendar();
}

export function showCalDetail(id) {
  // ── ตรวจว่าเป็น project event ──
  const projEv = getProjectCalEvents().find(e => e.id === id);
  if (projEv) {
    const p  = projectItems.find(x => x.id === projEv._projId);
    if (!p) return;
    const sm = PROJ_STATUS_MAP[p.status] || PROJ_STATUS_MAP['วางแผน'];
    const budgetPct = p.budget > 0 ? Math.round(p.spent / p.budget * 100) : 0;
    const daysLeft  = p.end ? Math.ceil((new Date(p.end) - new Date()) / 86400000) : null;
    document.getElementById('cal-detail-title').textContent = projEv.title;
    document.getElementById('cal-detail-body').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="badge ${sm.cls}" style="font-size:11px;padding:3px 10px;">${sm.icon} ${p.status}</span>
          <span style="font-size:11px;background:var(--gray-100);color:var(--gray-600);padding:3px 10px;border-radius:20px;">📁 โครงการ</span>
          ${daysLeft !== null ? `<span style="font-size:11px;color:${daysLeft<0?'var(--red-400)':daysLeft<7?'var(--amber-600)':'var(--gray-500)'}">
            ${daysLeft<0 ? '⚠️ เกินกำหนด '+Math.abs(daysLeft)+' วัน' : '⏳ อีก '+daysLeft+' วัน'}</span>` : ''}
        </div>
        <div style="font-size:13px;color:var(--gray-600);">📅 <strong>ช่วงโครงการ:</strong> ${p.start||'—'} → ${p.end||'—'}</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:13px;color:var(--gray-600);">📊 ความคืบหน้า:</span>
          <div style="flex:1;height:8px;background:var(--gray-100);border-radius:4px;overflow:hidden;">
            <div style="width:${p.pct}%;height:100%;background:${p.pct>=100?'var(--green-500)':p.pct>=60?'#3b82f6':'var(--amber-400)'};border-radius:4px;"></div>
          </div>
          <strong style="font-size:13px;color:var(--green-700);">${p.pct}%</strong>
        </div>
        ${p.budget > 0 ? `<div style="font-size:13px;color:var(--gray-600);">💰 งบประมาณ: <strong>${(p.budget).toLocaleString('th-TH')} ฿</strong> · ใช้ไปแล้ว ${budgetPct}%</div>` : ''}
        ${projEv.note ? `<div style="font-size:12px;color:var(--gray-500);background:var(--gray-50);padding:8px 12px;border-radius:8px;border-left:3px solid #a855f7;">📝 ${projEv.note}</div>` : ''}
        <button class="btn btn-outline" style="font-size:12px;color:#6b21a8;border-color:#d8b4fe;"
          onclick="closeModal('modal-cal-detail');navigate('projects',document.querySelector('[onclick*=\\'projects\\']'));setTimeout(()=>openProjectDetail(${p.id}),150);">
          🔗 ดูรายละเอียดโครงการ
        </button>
      </div>`;
    document.getElementById('cal-detail-del-btn').style.display  = 'none';
    document.getElementById('cal-detail-edit-btn').style.display = 'none';
    document.getElementById('modal-cal-detail').classList.add('open');
    return;
  }

  // ── กิจกรรมปกติ ──
  const ev = calEvents.find(e => e.id === id);
  if (!ev) return;
  const pLabel = CAL_PRIORITY_LABEL[ev.priority] || ev.priority;
  const priColor = { high:'var(--red-400)', medium:'var(--amber-400)', normal:'var(--green-400)', farm:'var(--sky-400)', personal:'#7c6fbf' }[ev.priority] || 'var(--gray-400)';
  document.getElementById('cal-detail-title').textContent = ev.title;
  document.getElementById('cal-detail-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:11px;font-weight:500;padding:3px 10px;border-radius:20px;background:var(--gray-100);color:var(--gray-600);">${ev.cat}</span>
        <span class="cal-event-pill ${ev.priority}" style="font-size:11px;">● ${pLabel}</span>
      </div>
      <div style="font-size:13px;color:var(--gray-600);">
        📅 <strong>วันที่:</strong> ${fmtDate(ev.start)}${ev.end && ev.end !== ev.start ? ' – ' + fmtDate(ev.end) : ''}
      </div>
      ${ev.note ? `<div style="font-size:13px;color:var(--gray-600);">📝 <strong>หมายเหตุ:</strong> ${ev.note}</div>` : ''}
    </div>`;
  document.getElementById('cal-detail-del-btn').style.display  = '';
  document.getElementById('cal-detail-edit-btn').style.display = '';
  document.getElementById('cal-detail-del-btn').onclick  = () => deleteCalEvent(id);
  document.getElementById('cal-detail-edit-btn').onclick = () => openCalEventModal(id);
  document.getElementById('modal-cal-detail').classList.add('open');
}

export function deleteCalEvent(id) {
  const idx = calEvents.findIndex(e => e.id === id);
  if (idx > -1) calEvents.splice(idx, 1);
  closeModal('modal-cal-detail');
  renderCalendar();
  showToast('🗑 ลบกิจกรรมแล้ว');
}

// ============================================================
// ===== HARVEST LOG =====
