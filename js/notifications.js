import { saveData } from './firebase.js';
import { openHarvestLogModal } from './harvestLog.js';
import { produceDaysLeft, produceStatus, renderInv } from './inventory.js';
import { openRequisitionModal } from './planning.js';
import { markBatchDone, markTaskDone, openSeasonDetail, skipTask, switchInvTab } from './planningSystem.js';
import { openProjectDetail } from './projects.js';
import { openSaleModal } from './sales.js';
import { cropItems, inputBatches, invItems, plotSeasons, projectItems } from './state.js';
import { navigate, showToast } from './ui.js';
import { fmtDate } from './utils.js';

// ── alert action registry ──
let _alertActions = {};
export function _regAct(key, fn) { _alertActions[key] = fn; return key; }
export function _doAct(key) {
  if (_alertActions[key]) _alertActions[key]();
  setTimeout(renderNotifications, 100);
}

export function getAlerts() {
  _alertActions = {}; // reset on each call
  const today    = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const alerts   = [];

  // ── 1. วัสดุหมดแล้ว ──
  invItems.filter(i => i.cat !== 'ผลผลิต' && i.qty === 0).forEach(i =>
    alerts.push({ level:'danger', icon:'🚨', title:`${i.name} หมดแล้ว`, sub:'สั่งซื้อด่วน', page:'inventory', tab:'supply',
      actions:[{ label:'🛒 เบิกวัสดุ', color:'#ef4444',
        key: _regAct(`req_${i.id}`, () => { toggleNotifPanel(); navigate('plan', document.querySelector('[onclick*="\'plan\'"]')); setTimeout(() => openRequisitionModal(i.id), 200); }) }]
    })
  );
  // ── 2. วัสดุใกล้หมด ──
  invItems.filter(i => i.cat !== 'ผลผลิต' && i.qty > 0 && i.qty <= (i.threshold || 0)).forEach(i =>
    alerts.push({ level:'warn', icon:'📦', title:`${i.name} ใกล้หมด`, sub:`เหลือ ${i.qty} ${i.unit}`, page:'inventory', tab:'supply',
      actions:[{ label:'🛒 เบิกวัสดุ', color:'#f59e0b',
        key: _regAct(`req_low_${i.id}`, () => { toggleNotifPanel(); navigate('plan', document.querySelector('[onclick*="\'plan\'"]')); setTimeout(() => openRequisitionModal(i.id), 200); }) }]
    })
  );
  // ── 3. ผลผลิตค้างสต็อก ──
  invItems.filter(i => i.cat === 'ผลผลิต' && produceStatus(i).overstock).forEach(i =>
    alerts.push({ level:'danger', icon:'⏰', title:`${i.name} เกินอายุไข`, sub:`${i.qty} กก. ควรจัดการ`, page:'inventory', tab:'produce',
      actions:[
        { label:'💰 บันทึกขาย', color:'#22c55e',
          key: _regAct(`sell_over_${i.id}`, () => { toggleNotifPanel(); openSaleModal(); }) },
        { label:'🗑 ทิ้งออก', color:'#ef4444',
          key: _regAct(`dispose_${i.id}`, () => { i.qty=0; renderInv(); saveData(); showToast(`🗑 ทิ้ง ${i.name} แล้ว`); }) }
      ]
    })
  );
  // ── 4. ผลผลิตใกล้หมดอายุ ──
  invItems.filter(i => {
    if (i.cat !== 'ผลผลิต') return false;
    const days = produceDaysLeft(i);
    return days !== null && days >= 0 && days <= 2 && !produceStatus(i).overstock;
  }).forEach(i => {
    const days = produceDaysLeft(i);
    alerts.push({ level:'warn', icon:'🕐', title:`${i.name} ใกล้หมดอายุ`, sub:`อีก ${days} วัน · ${i.qty} กก.`, page:'inventory', tab:'produce',
      actions:[{ label:'💰 บันทึกขาย', color:'#f59e0b',
        key: _regAct(`sell_exp_${i.id}`, () => { toggleNotifPanel(); openSaleModal(); }) }]
    });
  });
  // ── 5. พืชพร้อมเก็บ ──
  cropItems.filter(i => i.status === 'พร้อมเก็บ').forEach(c =>
    alerts.push({ level:'info', icon:'🌾', title:`${c.name} พร้อมเก็บ`, sub:`แปลง ${c.plot}`, page:'crops', tab:'',
      actions:[{ label:'📋 บันทึกเก็บเกี่ยว', color:'var(--green-600)',
        key: _regAct(`harvest_${c.id}`, () => { toggleNotifPanel(); openHarvestLogModal(c.id); }) }]
    })
  );
  // ── 6. พืชใกล้เก็บเกี่ยว ──
  cropItems.filter(i => {
    if (i.status === 'เก็บเกี่ยวแล้ว' || !i.harvestDate) return false;
    const days = Math.ceil((new Date(i.harvestDate) - today) / 86400000);
    return days >= 0 && days <= 3;
  }).forEach(c => {
    const days = Math.ceil((new Date(c.harvestDate) - today) / 86400000);
    alerts.push({ level:'warn', icon:'🌱', title:`${c.name} ใกล้เก็บเกี่ยว`, sub:`อีก ${days} วัน · แปลง ${c.plot}`, page:'crops', tab:'',
      actions:[{ label:'📋 เตรียมบันทึก', color:'#f59e0b',
        key: _regAct(`pre_harvest_${c.id}`, () => { toggleNotifPanel(); openHarvestLogModal(c.id); }) }]
    });
  });
  // ── 7. งานแผนปลูกถึงกำหนด / เกินกำหนด ──
  plotSeasons.filter(s => s.status === 'active').forEach(s => {
    const dueTasks = (s.tasks||[]).filter(t => !t.done && !t.skipped && t.plannedDate <= todayISO);
    dueTasks.slice(0, 3).forEach(task => {
      const isOver = task.plannedDate < todayISO;
      alerts.push({ level: isOver?'danger':'warn', icon: task.icon||'🗓️',
        title:`${s.cropName} — ${task.name}`,
        sub:`แปลง ${s.plot} · ${fmtDate(task.plannedDate)}${isOver?' (เกินกำหนด)':''}`,
        page:'plan', tab:'',
        actions:[
          { label:'✓ ทำแล้ว', color:'var(--green-600)',
            key: _regAct(`task_done_${s.id}_${task.id}`, () => markTaskDone(s.id, task.id)) },
          { label:'ดูฤดูกาล', color:'#94a3b8',
            key: _regAct(`view_season_${s.id}`, () => { toggleNotifPanel(); navigate('plan', document.querySelector('[onclick*="\'plan\'"]')); setTimeout(() => openSeasonDetail(s.id), 200); }) },
          { label:'ข้าม', color:'#cbd5e1',
            key: _regAct(`task_skip_${s.id}_${task.id}`, () => skipTask(s.id, task.id)) }
        ]
      });
    });
  });
  // ── 8. วัสดุผลิตพร้อมใช้ ──
  inputBatches.filter(b => b.status === 'active' && b.readyDate <= todayISO).forEach(b =>
    alerts.push({ level:'info', icon:'🧪', title:`${b.name} พร้อมใช้งาน`, sub:`${b.qty} ${b.unit} · ${b.type}`, page:'plan', tab:'inputs',
      actions:[{ label:'📥 เข้าคลัง', color:'#22c55e',
        key: _regAct(`batch_done_${b.id}`, () => markBatchDone(b.id)) }]
    })
  );
  // ── 9. โครงการเกินกำหนด ──
  projectItems.filter(p => p.end && p.status !== 'เสร็จสิ้น' && p.status !== 'ยกเลิก' && p.end < todayISO).forEach(p => {
    const days = Math.ceil((today - new Date(p.end)) / 86400000);
    alerts.push({ level:'danger', icon:'📋', title:`${p.name} เกินกำหนด`, sub:`เกิน ${days} วัน · ${p.pct}%`, page:'projects', tab:'',
      actions:[{ label:'📂 ดูโครงการ', color:'#ef4444',
        key: _regAct(`proj_over_${p.id}`, () => { toggleNotifPanel(); navigate('projects', document.querySelector('[onclick*="\'projects\'"]')); setTimeout(() => openProjectDetail(p.id), 200); }) }]
    });
  });
  // ── 10. โครงการมีปัญหา ──
  projectItems.filter(p => p.status === 'มีปัญหา').forEach(p =>
    alerts.push({ level:'warn', icon:'⚠️', title:`${p.name} มีปัญหา`, sub:`${p.pct}% · ต้องการความสนใจ`, page:'projects', tab:'',
      actions:[{ label:'📂 ดูโครงการ', color:'#f59e0b',
        key: _regAct(`proj_issue_${p.id}`, () => { toggleNotifPanel(); navigate('projects', document.querySelector('[onclick*="\'projects\'"]')); setTimeout(() => openProjectDetail(p.id), 200); }) }]
    })
  );
  return alerts;
}

export function renderNotifications() {
  const alerts  = getAlerts();
  const badge   = document.getElementById('notif-badge');
  const listEl  = document.getElementById('notif-list');
  const emptyEl = document.getElementById('notif-empty');

  const count = alerts.length;
  if (badge) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  // nav dots
  const pageAlerts = { crops: false, inventory: false, projects: false };
  alerts.forEach(a => { if (pageAlerts[a.page] !== undefined) pageAlerts[a.page] = true; });
  ['crops','inventory','projects'].forEach(p => {
    const dot = document.getElementById('nav-dot-' + p);
    if (dot) dot.style.display = pageAlerts[p] ? 'inline-block' : 'none';
  });

  if (!listEl) return;
  if (count === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  listEl.innerHTML = alerts.map(a => {
    const actionBtns = (a.actions||[]).map(act =>
      `<button onclick="_doAct('${act.key}')"
        style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid ${act.color};color:${act.color};background:none;cursor:pointer;white-space:nowrap;font-family:'Sarabun',sans-serif;transition:background .15s;"
        onmouseover="this.style.background='${act.color}22'" onmouseout="this.style.background='none'">
        ${act.label}
      </button>`
    ).join('');
    const navBtn = `<button onclick="_gotoAlert('${a.page}','${a.tab||''}')"
      style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid var(--gray-200);color:var(--gray-500);background:none;cursor:pointer;font-family:'Sarabun',sans-serif;white-space:nowrap;">
      ดู →
    </button>`;
    return `
      <div class="notif-item ${a.level}">
        <div class="notif-icon">${a.icon}</div>
        <div style="flex:1;min-width:0;">
          <div class="notif-title">${a.title}</div>
          <div class="notif-sub">${a.sub}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;">
            ${actionBtns}${navBtn}
          </div>
        </div>
      </div>`;
  }).join('');
}

export function _gotoAlert(page, tab) {
  toggleNotifPanel();
  navigate(page, document.querySelector(`[onclick*="'${page}'"]`));
  if (tab === 'supply')  setTimeout(() => switchInvTab('supply'),  150);
  if (tab === 'produce') setTimeout(() => switchInvTab('produce'), 150);
  if (tab === 'inputs')  setTimeout(() => { document.getElementById('inv-tab-btn-supply')?.click(); }, 150);
}

let _notifOpen = false;
export function toggleNotifPanel() {
  _notifOpen = !_notifOpen;
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.toggle('open', _notifOpen);
  if (_notifOpen) renderNotifications();
}
document.addEventListener('click', e => {
  if (!_notifOpen) return;
  const panel = document.getElementById('notif-panel');
  const bell  = document.getElementById('notif-bell');
  if (panel && !panel.contains(e.target) && bell && !bell.contains(e.target)) {
    _notifOpen = false;
    panel.classList.remove('open');
  }
});
