import { saveData } from './firebase.js';
import { renderNotifications } from './notifications.js';
import { _editingProjId, _nextProjId, _projView, _viewingProjId, projectItems, setEditingProjId, setProjView as _setProjViewState, setProjectItems, setViewingProjId } from './state.js';
import { closeModal, showToast } from './ui.js';
import { dateStr } from './utils.js';

// ============================================================

let _projDonutInst = null, _projBudgetInst = null;

export const PROJ_STATUS_MAP = {
  'กำลังดำเนินการ': { cls:'badge-sky',    color:'#3b82f6', icon:'▶️' },
  'วางแผน':         { cls:'badge-gray',   color:'#6b7280', icon:'📋' },
  'เสร็จสิ้น':      { cls:'badge-green',  color:'#22c55e', icon:'✅' },
  'มีปัญหา':        { cls:'badge-red',    color:'#ef4444', icon:'⚠️' },
  'ยกเลิก':         { cls:'badge-gray',   color:'#9ca3af', icon:'❌' },
};

export function openProjectModal(id) {
  setEditingProjId(id || null);
  const logBtn = document.getElementById('proj-modal-title');
  if (id) {
    const p = projectItems.find(x => x.id === id);
    if (!p) return;
    document.getElementById('proj-modal-title').textContent = '✏️ แก้ไขโครงการ';
    document.getElementById('proj-save-btn').textContent = 'บันทึกการแก้ไข';
    document.getElementById('proj-name').value    = p.name;
    document.getElementById('proj-desc').value    = p.desc || '';
    document.getElementById('proj-status').value  = p.status;
    document.getElementById('proj-pct').value     = p.pct || 0;
    document.getElementById('proj-start').value   = p.start || '';
    document.getElementById('proj-end').value     = p.end || '';
    document.getElementById('proj-budget').value  = p.budget || 0;
    document.getElementById('proj-spent').value   = p.spent || 0;
    document.getElementById('proj-team').value    = (p.team||[]).join(', ');
    document.getElementById('proj-issues').value  = p.issues || '';
    document.getElementById('proj-result').value  = p.result || '';
  } else {
    document.getElementById('proj-modal-title').textContent = '+ เพิ่มโครงการใหม่';
    document.getElementById('proj-save-btn').textContent = 'บันทึกโครงการ';
    ['proj-name','proj-desc','proj-issues','proj-result','proj-team'].forEach(x => document.getElementById(x).value = '');
    document.getElementById('proj-status').value  = 'วางแผน';
    document.getElementById('proj-pct').value     = 0;
    document.getElementById('proj-start').value   = dateStr;
    document.getElementById('proj-end').value     = '';
    document.getElementById('proj-budget').value  = 0;
    document.getElementById('proj-spent').value   = 0;
  }
  closeModal('modal-project-detail');
  document.getElementById('modal-project').classList.add('open');
}

export function saveProject() {
  const name    = document.getElementById('proj-name').value.trim();
  if (!name) { showToast('⚠️ กรุณากรอกชื่อโครงการ'); return; }
  const data = {
    name,
    desc:   document.getElementById('proj-desc').value.trim(),
    status: document.getElementById('proj-status').value,
    pct:    Math.min(100, Math.max(0, parseInt(document.getElementById('proj-pct').value)||0)),
    start:  document.getElementById('proj-start').value,
    end:    document.getElementById('proj-end').value,
    budget: parseFloat(document.getElementById('proj-budget').value)||0,
    spent:  parseFloat(document.getElementById('proj-spent').value)||0,
    team:   document.getElementById('proj-team').value.split(',').map(s=>s.trim()).filter(Boolean),
    issues: document.getElementById('proj-issues').value.trim(),
    result: document.getElementById('proj-result').value.trim(),
    updatedAt: dateStr,
  };
  if (_editingProjId) {
    const p = projectItems.find(x => x.id === _editingProjId);
    Object.assign(p, data);
    showToast('✅ แก้ไขโครงการสำเร็จ');
  } else {
    data.id = _nextProjId;
    data.createdAt = dateStr;
    projectItems.unshift(data);
    showToast('✅ เพิ่มโครงการสำเร็จ');
  }
  closeModal('modal-project');
  renderProjects();
  renderNotifications();
  saveData();
}

export function deleteProject(id) {
  const p = projectItems.find(x => x.id === id);
  if (!p || !confirm(`ลบโครงการ "${p.name}"?`)) return;
  setProjectItems(projectItems.filter(x => x.id !== id));
  closeModal('modal-project-detail');
  renderProjects();
  saveData();
  showToast('🗑 ลบโครงการแล้ว');
}

export function setProjView(v) {
  _setProjViewState(v);
  document.getElementById('proj-view-card').className = v==='card' ? 'btn btn-primary' : 'btn btn-outline';
  document.getElementById('proj-view-list').className = v==='list' ? 'btn btn-primary' : 'btn btn-outline';
  renderProjects();
}

export function openProjectDetail(id) {
  setViewingProjId(id);
  const p = projectItems.find(x => x.id === id);
  if (!p) return;
  const sm = PROJ_STATUS_MAP[p.status] || PROJ_STATUS_MAP['วางแผน'];
  const budgetPct = p.budget > 0 ? Math.min(100, Math.round(p.spent/p.budget*100)) : 0;
  const daysLeft  = p.end ? Math.ceil((new Date(p.end)-new Date())/86400000) : null;
  document.getElementById('proj-detail-title').textContent = p.name;
  document.getElementById('proj-detail-body').innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
      <span class="badge ${sm.cls}" style="font-size:13px;padding:5px 12px">${sm.icon} ${p.status}</span>
      ${daysLeft!==null ? `<span style="font-size:12px;color:${daysLeft<0?'var(--red-400)':daysLeft<7?'var(--amber-600)':'var(--gray-500)'}">
        ${daysLeft<0?'เกินกำหนด '+Math.abs(daysLeft)+' วัน':'อีก '+daysLeft+' วัน'}</span>` : ''}
      <span style="font-size:12px;color:var(--gray-400)">📅 ${p.start||'—'} → ${p.end||'—'}</span>
    </div>

    ${p.desc ? `<div style="font-size:13px;color:var(--gray-700);margin-bottom:14px;line-height:1.6;background:var(--gray-50);padding:10px 14px;border-radius:var(--radius-md)">${p.desc}</div>` : ''}

    <!-- ความคืบหน้า -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:13px;font-weight:600;color:var(--gray-700)">ความคืบหน้า</span>
        <span style="font-size:18px;font-weight:700;color:var(--green-700);font-family:'Mitr',sans-serif">${p.pct}%</span>
      </div>
      <div style="height:10px;background:var(--gray-100);border-radius:5px;overflow:hidden">
        <div style="width:${p.pct}%;height:100%;background:${p.pct>=100?'var(--green-600)':p.pct>=60?'#3b82f6':'var(--amber-400)'};border-radius:5px;transition:width .4s"></div>
      </div>
    </div>

    <!-- งบประมาณ -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div style="background:var(--green-50);border:1px solid var(--green-200);border-radius:var(--radius-md);padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--gray-500);margin-bottom:4px">งบประมาณ</div>
        <div style="font-size:18px;font-weight:700;color:var(--green-700);font-family:'Mitr',sans-serif">${(p.budget||0).toLocaleString('th-TH')} ฿</div>
      </div>
      <div style="background:${budgetPct>90?'#fef2f2':'var(--sky-50)'};border:1px solid ${budgetPct>90?'var(--red-200)':'var(--sky-200)'};border-radius:var(--radius-md);padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--gray-500);margin-bottom:4px">ใช้ไปแล้ว (${budgetPct}%)</div>
        <div style="font-size:18px;font-weight:700;color:${budgetPct>90?'var(--red-400)':'var(--sky-600)'};font-family:'Mitr',sans-serif">${(p.spent||0).toLocaleString('th-TH')} ฿</div>
      </div>
    </div>

    <!-- ทีมงาน -->
    ${p.team?.length ? `<div style="margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--gray-500);margin-bottom:6px">👥 ทีมงาน (${p.team.length} คน)</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${p.team.map(t=>`<span style="background:var(--green-50);border:1px solid var(--green-200);border-radius:20px;padding:3px 10px;font-size:12px">👷 ${t}</span>`).join('')}
      </div>
    </div>` : ''}

    <!-- Timeline preview -->
    ${(p.timeline||[]).length > 0 ? (() => {
      const steps = p.timeline;
      const done  = steps.filter(s=>s.status==='done').length;
      const pct   = Math.round(done/steps.length*100);
      const barC  = pct>=100?'#22c55e':pct>=50?'#3b82f6':'#eab308';
      return `<div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:12px;font-weight:600;color:var(--gray-500)">📅 Timeline (${steps.length} ขั้นตอน)</div>
          <span style="font-size:12px;font-weight:700;color:${barC}">${done}/${steps.length} เสร็จแล้ว</span>
        </div>
        <div style="height:5px;background:var(--gray-100);border-radius:3px;overflow:hidden;margin-bottom:10px">
          <div style="width:${pct}%;height:100%;background:${barC};border-radius:3px"></div>
        </div>
        <div class="tl-wrap" style="max-height:220px;overflow-y:auto">
          ${steps.map(step => {
            const st = ({"done":TL_STATUS.done,"doing":TL_STATUS.doing,"todo":TL_STATUS.todo,"issue":TL_STATUS.issue,"skip":TL_STATUS.skip})[step.status] || TL_STATUS.todo;
            return `<div class="tl-item ${st.cls}">
              <div class="tl-dot">${st.icon}</div>
              <div class="tl-card" style="padding:6px 10px">
                <div style="font-size:12px;font-weight:600">${step.title}</div>
                <div style="display:flex;gap:8px;margin-top:2px">
                  ${step.date?`<span style="font-size:10px;color:var(--gray-400)">📅 ${step.date}</span>`:''}
                  ${step.note?`<span style="font-size:10px;color:var(--gray-500)">${step.note}</span>`:''}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    })() : ''}

    <!-- ปัญหา -->
    ${p.issues ? `<div style="margin-bottom:12px;background:#fef2f2;border:1px solid var(--red-200);border-radius:var(--radius-md);padding:10px 14px">
      <div style="font-size:12px;font-weight:600;color:var(--red-400);margin-bottom:4px">⚠️ ปัญหา / ความเสี่ยง</div>
      <div style="font-size:13px;color:var(--gray-700)">${p.issues}</div>
    </div>` : ''}

    <!-- ผลสรุป -->
    ${p.result ? `<div style="margin-bottom:12px;background:var(--green-50);border:1px solid var(--green-200);border-radius:var(--radius-md);padding:10px 14px">
      <div style="font-size:12px;font-weight:600;color:var(--green-700);margin-bottom:4px">🏆 ผลสรุป / ความสำเร็จ</div>
      <div style="font-size:13px;color:var(--gray-700)">${p.result}</div>
    </div>` : ''}

    <div style="font-size:11px;color:var(--gray-400);margin-top:8px">สร้างเมื่อ ${p.createdAt||'—'} · อัปเดต ${p.updatedAt||'—'}</div>
    <div style="margin-top:14px;display:flex;gap:8px">
      <button class="btn" style="background:var(--red-400);color:#fff;font-size:12px;padding:5px 14px" onclick="deleteProject(${p.id})">🗑 ลบโครงการ</button>
    </div>
  `;
  document.getElementById('modal-project-detail').classList.add('open');
}

export function editCurrentProject() {
  if (_viewingProjId) openProjectModal(_viewingProjId);
}

export function _projPriScore(p) {
  const todayISO = new Date().toISOString().slice(0,10);
  if (p.status==='มีปัญหา')          return 0;
  if (p.status==='กำลังดำเนินการ' && p.end && p.end < todayISO) return 1;
  if (p.status==='กำลังดำเนินการ') return 2;
  if (p.status==='วางแผน')           return 3;
  if (p.status==='เสร็จสิ้น')        return 4;
  return 5;
}

export function renderProjects() {
  const q       = (document.getElementById('search-projects')?.value||'').toLowerCase();
  const filter  = document.getElementById('proj-filter-status')?.value || '';
  let list = [...projectItems]
    .filter(p => !q || p.name.toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q))
    .filter(p => !filter || p.status === filter)
    .sort((a,b) => _projPriScore(a) - _projPriScore(b));

  // Stats
  const all    = projectItems.length;
  const active = projectItems.filter(p=>p.status==='กำลังดำเนินการ').length;
  const done   = projectItems.filter(p=>p.status==='เสร็จสิ้น').length;
  const issue  = projectItems.filter(p=>p.status==='มีปัญหา').length;
  document.getElementById('proj-stat-total').textContent  = all;
  document.getElementById('proj-stat-active').textContent = active;
  document.getElementById('proj-stat-done').textContent   = done;
  document.getElementById('proj-stat-issue').textContent  = issue;

  const wrap = document.getElementById('proj-list-wrap');
  if (!wrap) return;

  if (list.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:48px;color:var(--gray-400);font-size:14px">
      ${projectItems.length===0 ? '📋 ยังไม่มีโครงการ — กด "+ เพิ่มโครงการใหม่"' : 'ไม่พบโครงการที่ค้นหา'}
    </div>`;
  } else if (_projView === 'card') {
    wrap.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">
      ${list.map(p => _renderProjectCard(p)).join('')}
    </div>`;
  } else {
    wrap.innerHTML = `<div class="card" style="padding:0;overflow:hidden">
      ${list.map(p => _renderProjectListRow(p)).join('')}
    </div>`;
  }

  _renderProjCharts();
  _renderProjTimeline();
}

export function _renderProjectCard(p) {
  const sm = PROJ_STATUS_MAP[p.status] || PROJ_STATUS_MAP['วางแผน'];
  const daysLeft = p.end ? Math.ceil((new Date(p.end)-new Date())/86400000) : null;
  const barColor = p.pct>=100?'#22c55e':p.pct>=60?'#3b82f6':'#eab308';
  const budgetPct = p.budget>0 ? Math.round(p.spent/p.budget*100) : 0;
  return `<div class="card" style="cursor:pointer;transition:box-shadow .2s;border-top:3px solid ${sm.color}" onclick="openProjectDetail(${p.id})">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:15px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div>
        <span class="badge ${sm.cls}" style="font-size:11px">${sm.icon} ${p.status}</span>
      </div>
      <button onclick="event.stopPropagation();openProjectModal(${p.id})" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--gray-400);padding:0 0 0 4px" title="แก้ไข">✏️</button>
      <button onclick="event.stopPropagation();openTimelineModal(${p.id})" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--sky-400);padding:0 0 0 2px" title="Timeline">📅</button>
    </div>
    ${p.desc ? `<div style="font-size:12px;color:var(--gray-500);margin-bottom:10px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${p.desc}</div>` : ''}
    <!-- Progress -->
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:var(--gray-500)">ความคืบหน้า</span>
        <span style="font-weight:700;color:${barColor}">${p.pct}%</span>
      </div>
      <div style="height:7px;background:var(--gray-100);border-radius:4px;overflow:hidden">
        <div style="width:${p.pct}%;height:100%;background:${barColor};border-radius:4px"></div>
      </div>
    </div>
    <!-- Budget -->
    ${p.budget>0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px;color:var(--gray-600)">
      <span>💰 ${(p.spent||0).toLocaleString('th-TH')} / ${p.budget.toLocaleString('th-TH')} ฿</span>
      <span style="color:${budgetPct>90?'var(--red-400)':'var(--gray-500)'}">${budgetPct}%</span>
    </div>` : ''}
    <!-- Meta -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--gray-400)">
      ${p.start ? `<span>📅 ${p.start}</span>` : ''}
      ${p.end   ? `<span>🏁 ${p.end}</span>` : ''}
      ${p.team?.length ? `<span>👥 ${p.team.length} คน</span>` : ''}
      ${daysLeft!==null ? `<span style="color:${daysLeft<0?'var(--red-400)':daysLeft<7?'var(--amber-600)':'var(--gray-400)'}">${daysLeft<0?'เกิน '+Math.abs(daysLeft)+' วัน':'อีก '+daysLeft+' วัน'}</span>` : ''}
    </div>
    ${(p.timeline||[]).length > 0 ? (() => {
      const steps   = p.timeline;
      const done    = steps.filter(s=>s.status==='done').length;
      const doing   = steps.find(s=>s.status==='doing');
      const issue   = steps.find(s=>s.status==='issue');
      const current = issue || doing || steps.find(s=>s.status==='todo');
      const pct     = Math.round(done/steps.length*100);
      const barC    = pct>=100?'#22c55e':pct>=50?'#3b82f6':'#eab308';
      return `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--gray-100)">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--gray-400);margin-bottom:3px">
          <span>📅 ${steps.length} ขั้นตอน · เสร็จ ${done}</span>
          <span style="color:${barC};font-weight:600">${pct}%</span>
        </div>
        <div style="height:4px;background:var(--gray-100);border-radius:2px;overflow:hidden;margin-bottom:4px">
          <div style="width:${pct}%;height:100%;background:${barC};border-radius:2px"></div>
        </div>
        ${current ? `<div style="font-size:11px;color:var(--gray-500);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${ (TL_STATUS[current.status]||TL_STATUS.todo).icon } ขั้นตอนปัจจุบัน: <strong>${current.title}</strong>
        </div>` : ''}
      </div>`;
    })() : ''}
  </div>`;
}

export function _renderProjectListRow(p) {
  const sm = PROJ_STATUS_MAP[p.status] || PROJ_STATUS_MAP['วางแผน'];
  const daysLeft = p.end ? Math.ceil((new Date(p.end)-new Date())/86400000) : null;
  const barColor = p.pct>=100?'#22c55e':p.pct>=60?'#3b82f6':'#eab308';
  return `<div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid var(--gray-100);cursor:pointer" onclick="openProjectDetail(${p.id})">
    <div style="flex:2;min-width:0">
      <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div>
      ${p.desc ? `<div style="font-size:11px;color:var(--gray-400);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.desc}</div>` : ''}
    </div>
    <span class="badge ${sm.cls}" style="flex-shrink:0;font-size:11px">${sm.icon} ${p.status}</span>
    <div style="flex:1;min-width:100px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
        <span style="color:var(--gray-500)">คืบหน้า</span><span style="font-weight:600;color:${barColor}">${p.pct}%</span>
      </div>
      <div style="height:5px;background:var(--gray-100);border-radius:3px;overflow:hidden">
        <div style="width:${p.pct}%;height:100%;background:${barColor}"></div>
      </div>
    </div>
    ${p.budget>0 ? `<div style="flex-shrink:0;font-size:12px;color:var(--gray-600);min-width:140px;text-align:right">${(p.spent||0).toLocaleString('th-TH')} / ${p.budget.toLocaleString('th-TH')} ฿</div>` : '<div style="min-width:140px"></div>'}
    ${daysLeft!==null ? `<div style="flex-shrink:0;font-size:11px;color:${daysLeft<0?'var(--red-400)':daysLeft<7?'var(--amber-600)':'var(--gray-400)'};min-width:80px;text-align:right">${daysLeft<0?'เกิน '+Math.abs(daysLeft)+' วัน':'อีก '+daysLeft+' วัน'}</div>` : '<div style="min-width:80px"></div>'}
    <button onclick="event.stopPropagation();openProjectModal(${p.id})" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--gray-400)">✏️</button>
    <button onclick="event.stopPropagation();openTimelineModal(${p.id})" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--sky-400)" title="Timeline">📅</button>
  </div>`;
}

export function _renderProjTimeline() {
  const el = document.getElementById('proj-timeline');
  if (!el) return;
  const sorted = [...projectItems]
    .filter(p => p.end && p.status !== 'ยกเลิก')
    .sort((a,b) => a.end.localeCompare(b.end));
  el.innerHTML = sorted.slice(0,6).map(p => {
    const daysLeft = Math.ceil((new Date(p.end)-new Date())/86400000);
    const sm = PROJ_STATUS_MAP[p.status] || PROJ_STATUS_MAP['วางแผน'];
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--gray-50);border-radius:var(--radius-sm)">
      <div style="width:10px;height:10px;border-radius:50%;background:${sm.color};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div>
        <div style="font-size:11px;color:var(--gray-400)">กำหนดเสร็จ ${p.end}</div>
      </div>
      <div style="font-size:12px;font-weight:600;color:${daysLeft<0?'var(--red-400)':daysLeft<7?'var(--amber-600)':'var(--green-600)'};flex-shrink:0">${daysLeft<0?'เกิน '+Math.abs(daysLeft)+' ว.':'อีก '+daysLeft+' ว.'}</div>
    </div>`;
  }).join('') || '<div style="color:var(--gray-400);font-size:13px;padding:8px">ยังไม่มีโครงการที่กำหนดวันเสร็จ</div>';
}

export function _renderProjCharts() {
  // Donut chart — status breakdown
  const statusCounts = {};
  projectItems.forEach(p => { statusCounts[p.status] = (statusCounts[p.status]||0)+1; });
  const avgPct = projectItems.length ? Math.round(projectItems.reduce((s,p)=>s+p.pct,0)/projectItems.length) : 0;
  const el = document.getElementById('proj-avg-pct');
  if (el) el.textContent = avgPct + '%';
  const legEl = document.getElementById('proj-donut-legend');
  if (legEl) legEl.innerHTML = Object.entries(statusCounts).map(([st,cnt]) => {
    const sm = PROJ_STATUS_MAP[st]||PROJ_STATUS_MAP['วางแผน'];
    return `<div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:50%;background:${sm.color}"></div><span style="font-size:12px">${st}</span><span style="font-size:12px;color:var(--gray-500)">${cnt} (${Math.round(cnt/projectItems.length*100)}%)</span></div>`;
  }).join('');

  const donutCtx = document.getElementById('projDonutChart');
  if (donutCtx && projectItems.length > 0) {
    if (_projDonutInst) _projDonutInst.destroy();
    _projDonutInst = new Chart(donutCtx, { type:'doughnut',
      data:{ labels: Object.keys(statusCounts), datasets:[{ data: Object.values(statusCounts),
        backgroundColor: Object.keys(statusCounts).map(s=>(PROJ_STATUS_MAP[s]||PROJ_STATUS_MAP['วางแผน']).color+'cc'),
        borderWidth:0 }]},
      options:{ responsive:false, plugins:{ legend:{display:false} }, cutout:'65%' }
    });
  }

  // Budget donut
  const totalBudget = projectItems.reduce((s,p)=>s+p.budget,0);
  const totalSpent  = projectItems.reduce((s,p)=>s+p.spent,0);
  const totalEl = document.getElementById('proj-budget-total');
  if (totalEl) totalEl.innerHTML = totalBudget.toLocaleString('th-TH')+'<br>บาท';
  const bLegEl = document.getElementById('proj-budget-legend');
  if (bLegEl) bLegEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:50%;background:#22c55e"></div><span style="font-size:12px">ใช้ไปแล้ว ${totalSpent.toLocaleString('th-TH')} ฿ (${totalBudget?Math.round(totalSpent/totalBudget*100):0}%)</span></div>
    <div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:50%;background:#3b82f6"></div><span style="font-size:12px">คงเหลือ ${Math.max(0,totalBudget-totalSpent).toLocaleString('th-TH')} ฿ (${totalBudget?Math.round(Math.max(0,totalBudget-totalSpent)/totalBudget*100):0}%)</span></div>`;

  const budgetCtx = document.getElementById('projBudgetChart');
  if (budgetCtx && totalBudget>0) {
    if (_projBudgetInst) _projBudgetInst.destroy();
    _projBudgetInst = new Chart(budgetCtx, { type:'doughnut',
      data:{ labels:['ใช้ไปแล้ว','คงเหลือ'], datasets:[{ data:[totalSpent, Math.max(0,totalBudget-totalSpent)],
        backgroundColor:['#22c55ecc','#3b82f6cc'], borderWidth:0 }]},
      options:{ responsive:false, plugins:{ legend:{display:false} }, cutout:'60%' }
    });
  }
}

// ============================================================
// ===== PROJECT TIMELINE =====
// ============================================================
let _tlProjId = null;

const TL_STATUS = {
  done:  { label:'เสร็จแล้ว',         icon:'✅', color:'#22c55e', cls:'tl-done'  },
  doing: { label:'กำลังดำเนินการ',     icon:'🔄', color:'#3b82f6', cls:'tl-doing' },
  todo:  { label:'รอดำเนินการ',        icon:'📋', color:'#9ca3af', cls:'tl-todo'  },
  issue: { label:'มีปัญหา',            icon:'⚠️', color:'#ef4444', cls:'tl-issue' },
  skip:  { label:'ข้าม',              icon:'⏭',  color:'#d1d5db', cls:'tl-skip'  },
};

export function openTimelineModal(projId) {
  _tlProjId = projId;
  const p = projectItems.find(x => x.id === projId);
  if (!p) return;
  if (!p.timeline) p.timeline = [];
  document.getElementById('tl-modal-title').textContent = '📅 Timeline — ' + p.name;
  document.getElementById('tl-proj-name').textContent   = p.status + ' · ' + (p.pct||0) + '% · ' + (p.timeline.length) + ' ขั้นตอน';
  document.getElementById('tl-step-date').value   = dateStr;
  document.getElementById('tl-step-title').value  = '';
  document.getElementById('tl-step-note').value   = '';
  document.getElementById('tl-step-status').value = 'todo';
  _renderTimelineSteps(p);
  document.getElementById('modal-proj-timeline').classList.add('open');
}

export function _renderTimelineSteps(p) {
  const el = document.getElementById('tl-steps-list');
  if (!el) return;
  const steps = p.timeline || [];
  if (steps.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:28px;color:var(--gray-400);font-size:13px">
      ยังไม่มีขั้นตอน — เพิ่มขั้นตอนแรกด้านบน</div>`;
    return;
  }
  const done  = steps.filter(s=>s.status==='done').length;
  const pct   = Math.round(done/steps.length*100);
  const barW  = pct;
  const barC  = pct>=100?'#22c55e':pct>=50?'#3b82f6':'#eab308';

  // Progress summary
  let html = `<div style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
      <span style="color:var(--gray-500)">ความคืบหน้าขั้นตอน</span>
      <span style="font-weight:700;color:${barC}">${done}/${steps.length} (${pct}%)</span>
    </div>
    <div style="height:7px;background:var(--gray-100);border-radius:4px;overflow:hidden">
      <div style="width:${barW}%;height:100%;background:${barC};border-radius:4px;transition:width .4s"></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">
      ${Object.entries(TL_STATUS).map(([k,v]) => {
        const cnt = steps.filter(s=>s.status===k).length;
        return cnt > 0 ? `<span style="font-size:11px;color:${v.color}">${v.icon} ${v.label}: ${cnt}</span>` : '';
      }).join('')}
    </div>
  </div>
  <div class="tl-wrap">`;

  steps.forEach((step, i) => {
    const st = TL_STATUS[step.status] || TL_STATUS.todo;
    html += `<div class="tl-item ${st.cls}" data-idx="${i}">
      <div class="tl-dot">${st.icon}</div>
      <div class="tl-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">${step.title}</div>
            ${step.note ? `<div style="font-size:12px;color:var(--gray-500);margin-bottom:3px">${step.note}</div>` : ''}
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${step.date ? `<span style="font-size:11px;color:var(--gray-400)">📅 ${step.date}</span>` : ''}
              <span class="badge" style="font-size:10px;background:${st.color}22;color:${st.color};border:1px solid ${st.color}44">${st.icon} ${st.label}</span>
            </div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <!-- Quick status toggle -->
            <select onchange="quickUpdateStep(${i},this.value)" style="font-size:10px;padding:2px 4px;border:1px solid var(--gray-200);border-radius:4px;background:#fff" title="เปลี่ยนสถานะ">
              ${Object.entries(TL_STATUS).map(([k,v])=>`<option value="${k}" ${step.status===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
            <button onclick="deleteTimelineStep(${i})" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--gray-300);padding:2px" title="ลบ">🗑</button>
          </div>
        </div>
      </div>
    </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

export function addTimelineStep() {
  const p = projectItems.find(x => x.id === _tlProjId);
  if (!p) return;
  const title = document.getElementById('tl-step-title').value.trim();
  if (!title) { showToast('⚠️ กรุณากรอกชื่อขั้นตอน'); return; }
  if (!p.timeline) p.timeline = [];
  p.timeline.push({
    title,
    date:   document.getElementById('tl-step-date').value || dateStr,
    status: document.getElementById('tl-step-status').value || 'todo',
    note:   document.getElementById('tl-step-note').value.trim(),
  });
  // Reset form
  document.getElementById('tl-step-title').value  = '';
  document.getElementById('tl-step-note').value   = '';
  document.getElementById('tl-step-status').value = 'todo';
  document.getElementById('tl-proj-name').textContent = p.status + ' · ' + (p.pct||0) + '% · ' + p.timeline.length + ' ขั้นตอน';
  _renderTimelineSteps(p);
  // Auto-update project progress from timeline
  _syncProjPctFromTimeline(p);
  saveData();
  showToast('✅ เพิ่มขั้นตอนแล้ว: ' + title);
}

export function quickUpdateStep(idx, newStatus) {
  const p = projectItems.find(x => x.id === _tlProjId);
  if (!p || !p.timeline[idx]) return;
  p.timeline[idx].status = newStatus;
  _renderTimelineSteps(p);
  _syncProjPctFromTimeline(p);
  saveData();
  showToast(`✅ อัปเดต: ${p.timeline[idx].title} → ${TL_STATUS[newStatus]?.label}`);
}

export function deleteTimelineStep(idx) {
  const p = projectItems.find(x => x.id === _tlProjId);
  if (!p) return;
  const title = p.timeline[idx]?.title || '';
  if (!confirm(`ลบขั้นตอน "${title}"?`)) return;
  p.timeline.splice(idx, 1);
  document.getElementById('tl-proj-name').textContent = p.status + ' · ' + (p.pct||0) + '% · ' + p.timeline.length + ' ขั้นตอน';
  _renderTimelineSteps(p);
  _syncProjPctFromTimeline(p);
  saveData();
  showToast('🗑 ลบขั้นตอนแล้ว');
}

// Sync project overall pct from timeline steps
export function _syncProjPctFromTimeline(p) {
  if (!p.timeline || p.timeline.length === 0) return;
  const done = p.timeline.filter(s => s.status === 'done').length;
  const pct  = Math.round(done / p.timeline.length * 100);
  p.pct = pct;
  // Also update project status if all done
  if (pct === 100 && p.status !== 'เสร็จสิ้น') {
    p.status = 'เสร็จสิ้น';
    showToast('🎉 โครงการเสร็จสิ้น 100%!');
  } else if (pct > 0 && p.status === 'วางแผน') {
    p.status = 'กำลังดำเนินการ';
  }
  renderProjects();
}

// ============================================================
// ===== EXPORT SYSTEM =====
