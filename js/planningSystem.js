import { INPUT_TEMPLATES } from './planning.js';
import { ACT_TYPE_MAP } from './activities.js';
import { saveData } from './firebase.js';
import { renderInv } from './inventory.js';
import { renderNotifications } from './notifications.js';
import { _nextBatchId, _nextCalId, _nextSeasonId, _nextSoilRestId, _nextTemplateId, actItems, actRendered, calEvents, cropItems, cropRendered, farmSettings, inputBatches, invItems, nextActId, nextCropId, nextInvId, planTemplates, plotSeasons, setActRendered, setCalEvents, setCropRendered, setInputBatches, setPlanTemplates, setPlotSeasons, setSoilRests, soilRests, setNextCropId, setNextActId, setNextSoilRestId, setNextTemplateId, setNextInvId, setNextBatchId, setNextSeasonId, setNextCalId } from './state.js';
import { closeModal, showToast } from './ui.js';
import { dateStr, fmtDate } from './utils.js';

// ============================================================

let _planTab = 'seasons';
let _seasonFilter = 'all';

export function switchPlanTab(tab) {
  _planTab = tab;
  ['seasons','templates','inputs','soilrest'].forEach(t => {
    const btn = document.getElementById('plan-tab-btn-' + t);
    const div = document.getElementById('plan-tab-' + t);
    if (btn) { btn.style.borderBottomColor = t===tab?'var(--green-600)':'transparent'; btn.style.color = t===tab?'var(--green-700)':'var(--gray-400)'; }
    if (div) div.style.display = t===tab ? '' : 'none';
  });
  if (tab==='seasons')   renderSeasons();
  if (tab==='templates') renderTemplatesTab();
  if (tab==='inputs')    renderInputBatches();
  if (tab==='soilrest')  renderSoilRests();
}

export function renderPlan() { switchPlanTab(_planTab); }

export function addDays(dateStr, n) {
  const d = new Date(dateStr); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10);
}
export function daysBetween(a,b) { return Math.ceil((new Date(b)-new Date(a))/86400000); }
export function seasonStatus(s) {
  const today = new Date().toISOString().slice(0,10);
  if (s.status==='done'||s.status==='cancelled') return s.status;
  return s.startDate<=today ? 'active' : 'planned';
}
export function taskStatus(task) {
  const today = new Date().toISOString().slice(0,10);
  if (task.done) return 'done';
  if (task.skipped) return 'skipped';
  if (task.plannedDate<today) return 'overdue';
  if (task.plannedDate===today) return 'today';
  return 'upcoming';
}

// ── Seasons ──
export function setSeasonFilter(f) {
  _seasonFilter = f;
  ['all','active','done'].forEach(x => {
    const b = document.getElementById('sf-'+x);
    if (b) { b.className = x===f?'btn btn-primary':'btn btn-outline'; b.style.fontSize='11px'; b.style.padding='4px 10px'; }
  });
  renderSeasons();
}

export function renderSeasons() {
  const listEl=document.getElementById('seasons-list'), emptyEl=document.getElementById('seasons-empty');
  if (!listEl) return;
  const today = new Date().toISOString().slice(0,10);
  let list = [...plotSeasons];
  if (_seasonFilter==='active') list=list.filter(s=>!['done','cancelled'].includes(seasonStatus(s)));
  if (_seasonFilter==='done')   list=list.filter(s=>seasonStatus(s)==='done');
  list.sort((a,b)=>a.startDate.localeCompare(b.startDate));
  if (!list.length) { listEl.innerHTML=''; emptyEl.style.display=''; return; }
  emptyEl.style.display='none';
  listEl.innerHTML=list.map(s=>{
    const tpl=planTemplates.find(t=>t.id===s.templateId);
    const tasks=s.tasks||[];
    const done=tasks.filter(t=>t.done).length, total=tasks.length;
    const pct=total>0?Math.round(done/total*100):0;
    const next=tasks.find(t=>!t.done&&!t.skipped);
    const sts=seasonStatus(s);
    const statusBadge={active:'<span style="background:#dcfce7;color:#16a34a;font-size:10px;padding:2px 8px;border-radius:10px;">🌱 กำลังปลูก</span>',planned:'<span style="background:#dbeafe;color:#1d4ed8;font-size:10px;padding:2px 8px;border-radius:10px;">📅 วางแผน</span>',done:'<span style="background:#f3f4f6;color:#6b7280;font-size:10px;padding:2px 8px;border-radius:10px;">✅ เสร็จแล้ว</span>'}[sts]||'';
    const barColor=pct===100?'#22c55e':sts==='active'?'var(--green-600)':'#94a3b8';
    const overdueCount=tasks.filter(t=>!t.done&&!t.skipped&&t.plannedDate<today).length;
    return `<div class="card" style="margin-bottom:10px;border-left:3px solid ${barColor};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            <span style="font-size:15px;font-weight:700;">${tpl?.icon||'🌱'} ${s.cropName}</span>
            ${statusBadge}
            ${overdueCount>0?`<span style="background:#fef2f2;color:#ef4444;font-size:10px;padding:2px 8px;border-radius:10px;">⚠️ เกิน ${overdueCount} งาน</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--gray-400);">📍 แปลง ${s.plot} · เริ่ม ${fmtDate(s.startDate)} · ${tpl?.name||'สูตรเอง'}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-outline" style="font-size:11px;padding:4px 8px;" onclick="openSeasonDetail(${s.id})">📋 รายละเอียด</button>
          <button class="btn btn-outline" style="font-size:11px;padding:4px 8px;color:#ef4444;" onclick="deleteSeason(${s.id})">🗑</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
        <div style="flex:1;height:8px;background:var(--gray-100);border-radius:4px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width .4s;"></div>
        </div>
        <span style="font-size:12px;font-weight:600;color:${barColor};min-width:36px;">${pct}%</span>
        <span style="font-size:11px;color:var(--gray-400);">${done}/${total} งาน</span>
      </div>
      ${next?`<div style="margin-top:8px;background:var(--gray-50);border-radius:8px;padding:7px 10px;font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="color:var(--gray-500);">งานถัดไป:</span>
        <strong>${next.icon||'📌'} ${next.name}</strong>
        <span style="color:${next.plannedDate<today?'#ef4444':'var(--gray-400)'};">— ${fmtDate(next.plannedDate)}</span>
        <button class="btn btn-primary" style="font-size:10px;padding:2px 8px;" onclick="markTaskDone(${s.id},'${next.id}')">✓ ทำแล้ว</button>
      </div>`:''}
    </div>`;
  }).join('');
}

export function openSeasonModal(id=null) {
  const sel=document.getElementById('season-template-sel');
  if (sel) sel.innerHTML=planTemplates.map(t=>`<option value="${t.id}">${t.icon} ${t.name} (${t.daysToHarvest} วัน)</option>`).join('');
  const plotSel=document.getElementById('season-plot');
  if (plotSel) plotSel.innerHTML=farmSettings.plots.map(p=>`<option value="${p}">${p}</option>`).join('');
  const dateEl=document.getElementById('season-start-date');
  if (dateEl) dateEl.value=new Date().toISOString().slice(0,10);
  onSeasonTemplateChange();
  document.getElementById('modal-season').classList.add('open');
}

export function onSeasonTemplateChange() {
  const tplId=parseInt(document.getElementById('season-template-sel')?.value||'0');
  const tpl=planTemplates.find(t=>t.id===tplId);
  const startDate=document.getElementById('season-start-date')?.value;
  const preview=document.getElementById('season-preview');
  const list=document.getElementById('season-preview-list');
  if (!tpl||!startDate||!preview||!list) { if(preview) preview.style.display='none'; return; }
  preview.style.display='';
  list.innerHTML=tpl.stages.map(s=>`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--gray-100);font-size:12px;">
    <span style="min-width:20px;text-align:center;">${s.icon}</span>
    <span style="color:var(--gray-400);min-width:60px;">${fmtDate(addDays(startDate,s.day))}</span>
    <span style="font-weight:500;">${s.name}</span>
    ${s.materials.length?`<span style="font-size:10px;color:var(--gray-400);margin-left:auto;">${s.materials.join(', ')}</span>`:''}
  </div>`).join('');
}

export function saveSeason() {
  const tplId=parseInt(document.getElementById('season-template-sel')?.value||'0');
  const crop=document.getElementById('season-crop-name')?.value.trim();
  const plot=document.getElementById('season-plot')?.value;
  const start=document.getElementById('season-start-date')?.value;
  const area=parseFloat(document.getElementById('season-area')?.value)||0;
  const notes=document.getElementById('season-notes')?.value.trim()||'';
  if (!crop||!plot||!start) { showToast('⚠️ กรุณากรอกข้อมูลให้ครบ'); return; }
  const tpl=planTemplates.find(t=>t.id===tplId);
  const tasks=(tpl?.stages||[]).map((s,i)=>({
    id:'task_'+Date.now()+'_'+i, name:s.name, icon:s.icon, type:s.type,
    day:s.day, plannedDate:addDays(start,s.day), materials:s.materials, notes:s.notes,
    done:false, skipped:false, doneDate:null
  }));

  // ── auto สร้าง cropItem ──
  const harvestDate = tpl ? addDays(start, tpl.daysToHarvest) : '';
  const harvestLabel = harvestDate
    ? new Date(harvestDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'})
    : '';
  const cropType = tpl?.category || 'พืชผัก';
  const newCrop = {
    id: nextCropId, name: crop, cropType, plot,
    planted: start, harvest: harvestLabel, harvestDate,
    area, status: 'เพาะกล้า', yieldEst: '', yieldActual: '',
    harvestLog: [], _seasonId: null // will set below
  };
  cropItems.unshift(newCrop);
  setCropRendered(false);

  const season={ id:_nextSeasonId, templateId:tplId, cropName:crop, plot,
    startDate:start, area, notes, status:'active', tasks,
    cropId: newCrop.id, // ← link ไป cropItem
    createdAt:new Date().toISOString().slice(0,10) };
  newCrop._seasonId = season.id;
  plotSeasons.push(season);
  setNextCropId(nextCropId + 1);
  setNextActId(nextActId + 1);
  setNextSoilRestId(_nextSoilRestId + 1);
  setNextTemplateId(_nextTemplateId + 1);
  setNextInvId(nextInvId + 1);
  setNextBatchId(_nextBatchId + 1);
  setNextSeasonId(_nextSeasonId + 1);
  _syncSeasonToCalendar(season);
  saveData(); closeModal('modal-season'); renderSeasons(); renderNotifications();
  showToast(`✅ สร้างแผน "${crop}" + ข้อมูลพืชผล · ${tasks.length} งานในปฏิทิน`);
}

export function _syncSeasonToCalendar(season) {
  let currentCalId = _nextCalId;
  season.tasks.forEach(task=>{
    if (!calEvents.find(e=>e._seasonTaskId===task.id)) {
      calEvents.push({ id:currentCalId, title:`🌱 ${season.cropName} — ${task.name}`,
        start:task.plannedDate, end:task.plannedDate,
        priority:task.type==='เก็บเกี่ยว'?'high':'farm', cat:'แผนปลูก',
        note:`แปลง ${season.plot}${task.notes?' · '+task.notes:''}`,
        _seasonTaskId:task.id, _seasonId:season.id });
      currentCalId++;
    }
  });
  setNextCalId(currentCalId);
}

// ── Plan task type → ACT_TYPE_MAP key ──
const PLAN_TASK_TO_ACT = {
  'เตรียมดิน':     'เตรียมดิน',
  'หว่านเมล็ด':    'หว่านเมล็ด',
  'ปลูกต้นกล้า':  'ปลูกต้นกล้า',
  'ไตรโคเดอม่า':  'ใช้ไตรโคเดอม่า',
  'น้ำหมัก':       'รดน้ำหมักชีวภาพ',
  'ชีวภัณฑ์แมลง': 'พ่นบิวเวอเรีย+เมธาไรเซียม',
  'ใส่ปุ๋ยหมัก':  'ใส่ปุ๋ยหมัก',
  'ค้ำยัน':        'ค้ำยัน / มัดขึ้นค้าง',
  'ตัดแต่งกิ่ง':   'ตัดแต่งกิ่ง',
  'ตรวจโรคพืช':   'ตรวจโรคพืช',
  'เก็บเกี่ยว':    'เก็บเกี่ยว',
  'บำรุงรักษา':    'รดน้ำ',
};

// Task type → crop status mapping
const TASK_TO_CROP_STATUS = {
  'เตรียมดิน':     'เพาะกล้า',
  'ปลูกต้นกล้า':  'ย้ายกล้า',
  'ไตรโคเดอม่า':  'เติบโต',
  'น้ำหมัก':       'กำลังโต',
  'ชีวภัณฑ์แมลง': 'กำลังโต',
  'ใส่ปุ๋ยหมัก':  'กำลังโต',
  'ค้ำยัน':        'กำลังโต',
  'ตัดแต่งกิ่ง':   'กำลังโต',
  'ตรวจโรคพืช':   'พร้อมเก็บ',
  'เก็บเกี่ยว':    'เก็บเกี่ยวแล้ว',
};

export function markTaskDone(seasonId, taskId) {
  const s=plotSeasons.find(s=>s.id===seasonId);
  if (!s) return;
  const task=s.tasks.find(t=>t.id===taskId);
  if (!task) return;
  task.done=true; task.doneDate=new Date().toISOString().slice(0,10);

  // ── อัปเดต crop status ──
  const linkedCrop = s.cropId ? cropItems.find(c=>c.id===s.cropId) : null;
  if (linkedCrop) {
    const newStatus = TASK_TO_CROP_STATUS[task.type];
    // เลื่อน status ไปข้างหน้าเท่านั้น ไม่ถอยหลัง
    const ORDER = ['เพาะกล้า','ย้ายกล้า','เติบโต','กำลังโต','พร้อมเก็บ','เก็บเกี่ยวแล้ว'];
    const curIdx = ORDER.indexOf(linkedCrop.status);
    const newIdx = newStatus ? ORDER.indexOf(newStatus) : -1;
    if (newIdx > curIdx) linkedCrop.status = newStatus;
    setCropRendered(false);
  }

  // ── map plan task type → proper activity type ──
  const actType = PLAN_TASK_TO_ACT[task.type] || task.type || 'บันทึกผล / ประเมิน';

  actItems.unshift({ id:nextActId, date:task.doneDate, type:actType,
    plot:s.plot, person:farmSettings.workers?.[0]||'—',
    material:task.materials?.join(', ')||'—',
    note:`[แผน] ${s.cropName} — ${task.name}`, fromCrop:false });
  setActRendered(false);

  if (s.tasks.every(t=>t.done||t.skipped)) {
    s.status='done';
    if (linkedCrop) { linkedCrop.status='เก็บเกี่ยวแล้ว'; setCropRendered(false); }
    showToast(`🎉 แผน "${s.cropName}" เสร็จสมบูรณ์!`);
  } else {
    showToast(`✓ บันทึก: ${task.name}${linkedCrop&&TASK_TO_CROP_STATUS[task.type]?' → '+linkedCrop.status:''}`);
  }
  saveData(); renderSeasons(); renderNotifications();
}

export function openSeasonDetail(id) {
  const s=plotSeasons.find(s=>s.id===id);
  if (!s) return;
  const today=new Date().toISOString().slice(0,10);
  const tpl=planTemplates.find(t=>t.id===s.templateId);
  document.getElementById('sd-title').textContent=`${tpl?.icon||'🌱'} ${s.cropName} — แปลง ${s.plot}`;
  const statusColors={done:'#22c55e',today:'#f59e0b',overdue:'#ef4444',upcoming:'var(--gray-300)',skipped:'#9ca3af'};
  const statusLabel={done:'✓ ทำแล้ว',today:'⭐ วันนี้',overdue:'⚠️ เกิน',upcoming:'รอ',skipped:'ข้าม'};
  document.getElementById('sd-body').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
      <div style="background:var(--gray-50);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--gray-400);">เริ่มปลูก</div><div style="font-size:13px;font-weight:700;">${fmtDate(s.startDate)}</div></div>
      <div style="background:var(--gray-50);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--gray-400);">แปลง/พื้นที่</div><div style="font-size:13px;font-weight:700;">${s.plot}·${s.area||'?'}ไร่</div></div>
      <div style="background:var(--gray-50);border-radius:8px;padding:10px;text-align:center;"><div style="font-size:11px;color:var(--gray-400);">คืบหน้า</div><div style="font-size:13px;font-weight:700;color:var(--green-700);">${s.tasks.filter(t=>t.done).length}/${s.tasks.length}</div></div>
    </div>
    ${s.notes?`<div style="background:#fef9c3;border-radius:8px;padding:8px 12px;font-size:12px;margin-bottom:12px;">📝 ${s.notes}</div>`:''}
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;">📅 Timeline</div>
    <div style="display:flex;flex-direction:column;gap:5px;">
    ${(s.tasks||[]).map(task=>{
      const sts=taskStatus(task);
      const col=statusColors[sts];
      return `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:8px;background:${sts==='today'?'#fffbeb':sts==='overdue'?'#fef2f2':sts==='done'?'#f9fafb':'#fff'};border:1px solid ${sts==='today'?'#fde68a':sts==='overdue'?'#fecaca':'var(--gray-100)'};">
        <div style="width:22px;height:22px;border-radius:50%;background:${col}20;border:2px solid ${col};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;">${task.icon||'📌'}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:12px;font-weight:600;${sts==='done'?'text-decoration:line-through;color:var(--gray-400);':''}">${task.name}</span>
            <span style="font-size:10px;padding:1px 6px;border-radius:10px;background:${col}20;color:${col};">${statusLabel[sts]}</span>
          </div>
          <div style="font-size:11px;color:var(--gray-400);margin-top:1px;">📅 ${fmtDate(task.plannedDate)}${task.materials?.length?' · 🧪 '+task.materials.join(', '):''}${task.notes?' · '+task.notes:''}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          ${!task.done&&!task.skipped?`
            <button class="btn btn-primary" style="font-size:10px;padding:2px 7px;" onclick="markTaskDone(${s.id},'${task.id}');closeModal('modal-season-detail');setTimeout(()=>openSeasonDetail(${s.id}),100)">✓</button>
            <button class="btn btn-outline" style="font-size:10px;padding:2px 7px;" onclick="skipTask(${s.id},'${task.id}')">ข้าม</button>`:''}
          ${task.done?`<span style="font-size:10px;color:var(--gray-400);">${fmtDate(task.doneDate)}</span>`:''}
        </div>
      </div>`;
    }).join('')}
    </div>
    ${s.status!=='done'?`<div style="margin-top:12px;text-align:right;"><button class="btn btn-primary" onclick="markSeasonDone(${s.id});closeModal('modal-season-detail')">✅ สิ้นสุดฤดูปลูก</button></div>`:''}`;
  document.getElementById('modal-season-detail').classList.add('open');
}

export function skipTask(sid,tid) {
  const s=plotSeasons.find(s=>s.id===sid);
  const t=s?.tasks.find(t=>t.id===tid);
  if (!t) return;
  t.skipped=true; saveData(); renderSeasons();
  closeModal('modal-season-detail'); setTimeout(()=>openSeasonDetail(sid),100);
}

export function markSeasonDone(id) {
  const s=plotSeasons.find(s=>s.id===id);
  if (!s) return;
  s.status='done';
  // อัปเดต crop ที่ผูกกัน
  const linkedCrop = s.cropId ? cropItems.find(c=>c.id===s.cropId) : null;
  if (linkedCrop && linkedCrop.status !== 'เก็บเกี่ยวแล้ว') {
    linkedCrop.status = 'เก็บเกี่ยวแล้ว';
    setCropRendered(false);
  }
  saveData(); renderSeasons();
  showToast('✅ สิ้นสุดฤดูปลูกแล้ว' + (linkedCrop ? ` · อัปเดต "${linkedCrop.name}" → เก็บเกี่ยวแล้ว` : ''));
}

export function deleteSeason(id) {
  const s=plotSeasons.find(s=>s.id===id);
  if (!s||!confirm(`ลบแผน "${s.cropName}" ออกไหม?\n(ข้อมูลพืชผลที่สร้างพร้อมกันจะยังคงอยู่)`)) return;
  const taskIds=new Set((s.tasks||[]).map(t=>t.id));
  setCalEvents(calEvents.filter(e=>!taskIds.has(e._seasonTaskId)));
  setPlotSeasons(plotSeasons.filter(s=>s.id!==id));
  saveData(); renderSeasons(); showToast('🗑 ลบแผนแล้ว (ข้อมูลพืชผลยังอยู่)');
}

// ── Templates ──
export function renderTemplatesTab() {
  const el = document.getElementById('templates-list');
  if (!el) return;
  const builtin = planTemplates.filter(t => t.id < 10);
  const custom  = planTemplates.filter(t => t.id >= 10);

  const renderCard = (t, isCustom) => `
    <div class="card" style="margin-bottom:10px;border-left:3px solid ${isCustom?'#6366f1':'var(--green-400)'};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;">${t.icon} ${t.name}
            <span style="font-size:11px;font-weight:400;color:var(--gray-400);margin-left:6px;">${t.category}</span>
            ${isCustom?'<span style=\"font-size:10px;background:#ede9fe;color:#6366f1;padding:1px 7px;border-radius:10px;margin-left:4px;\">สูตรของคุณ</span>':''}
          </div>
          <div style="font-size:11px;color:var(--gray-400);margin-top:2px;">
            ⏱ ${t.daysToHarvest} วัน · ${t.stages.length} ขั้นตอน${t.isContinuous?' · ♻️ ต่อเนื่อง':''}
          </div>
          ${t.notes?`<div style="font-size:11px;color:#f59e0b;">💡 ${t.notes}</div>`:''}
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-primary" style="font-size:11px;padding:4px 8px;"
            onclick="openSeasonModal();setTimeout(()=>{const s=document.getElementById('season-template-sel');if(s){s.value=${t.id};onSeasonTemplateChange();}},80)">▶ ใช้งาน</button>
          ${isCustom?`
            <button class="btn btn-outline" style="font-size:11px;padding:4px 8px;" onclick="openTemplateModal(${t.id})">✏️</button>
            <button class="btn btn-outline" style="font-size:11px;padding:4px 8px;color:#ef4444;" onclick="deleteTemplate(${t.id})">🗑</button>`:''}
        </div>
      </div>
      <div style="margin-top:8px;display:flex;gap:3px;flex-wrap:wrap;">
        ${t.stages.map(s=>`<span style="font-size:10px;background:var(--gray-50);border-radius:4px;padding:2px 6px;color:var(--gray-600);">${s.icon||'📌'} D+${s.day} ${s.name}</span>`).join('')}
      </div>
    </div>`;

  let html = '';
  if (custom.length) {
    html += '<div style="font-size:12px;font-weight:700;color:#6366f1;margin-bottom:8px;">✏️ สูตรของคุณ</div>';
    html += custom.map(t => renderCard(t, true)).join('');
    html += '<div style="font-size:12px;font-weight:700;color:var(--gray-600);margin:12px 0 8px;">📚 สูตร Built-in</div>';
  }
  html += builtin.map(t => renderCard(t, false)).join('');
  el.innerHTML = html;
}

export function deleteTemplate(id) {
  const t = planTemplates.find(t => t.id === id);
  if (!t || !confirm(`ลบสูตร "${t.name}"?`)) return;
  setPlanTemplates(planTemplates.filter(t => t.id !== id));
  saveData(); renderTemplatesTab();
  showToast(`🗑 ลบสูตร "${t.name}" แล้ว`);
}

let _editingTemplateId = null;
let _tplStages = []; // working copy of stages

export function openTemplateModal(id = null) {
  _editingTemplateId = id;
  _tplStages = [];
  const tpl = id ? planTemplates.find(t => t.id === id) : null;

  document.getElementById('tpl-modal-title').textContent = tpl ? `✏️ แก้ไขสูตร: ${tpl.name}` : '📋 สร้างสูตรการปลูกใหม่';
  document.getElementById('tpl-name').value       = tpl?.name            || '';
  document.getElementById('tpl-category').value   = tpl?.category        || 'พืชผัก';
  document.getElementById('tpl-days').value        = tpl?.daysToHarvest   || '';
  document.getElementById('tpl-icon').value        = tpl?.icon            || '';
  document.getElementById('tpl-notes').value       = tpl?.notes           || '';
  document.getElementById('tpl-continuous').checked = tpl?.isContinuous   || false;

  // Clone stages
  _tplStages = (tpl?.stages || []).map((s, i) => ({ ...s, _idx: i }));
  _renderTplStages();
  document.getElementById('modal-create-template').classList.add('open');
}

export function _actTypeOptions(selected = '') {
  const allTypes = Object.keys(ACT_TYPE_MAP);
  return allTypes.map(t =>
    `<option value="${t}" ${t === selected ? 'selected' : ''}>${ACT_TYPE_MAP[t].icon} ${t}</option>`
  ).join('');
}

export function _renderTplStages() {
  const listEl  = document.getElementById('tpl-stages-list');
  const emptyEl = document.getElementById('tpl-stages-empty');
  if (!listEl) return;
  if (!_tplStages.length) { listEl.innerHTML = ''; emptyEl.style.display = ''; return; }
  emptyEl.style.display = 'none';
  listEl.innerHTML = _tplStages.map((s, i) => `
    <div style="display:grid;grid-template-columns:60px 1fr 1fr 1fr auto;gap:6px;align-items:center;background:var(--gray-50);border-radius:8px;padding:8px 10px;">
      <div>
        <label style="font-size:10px;color:var(--gray-400);">D+วัน</label>
        <input type="number" class="form-control" style="padding:4px 6px;font-size:12px;"
          value="${s.day}" min="0" onchange="_tplStages[${i}].day=parseInt(this.value)||0;_sortTplStages()">
      </div>
      <div>
        <label style="font-size:10px;color:var(--gray-400);">ชื่องาน *</label>
        <input type="text" class="form-control" style="padding:4px 6px;font-size:12px;"
          value="${s.name}" placeholder="เช่น ใส่ปุ๋ยหมัก" oninput="_tplStages[${i}].name=this.value">
      </div>
      <div>
        <label style="font-size:10px;color:var(--gray-400);">ประเภทกิจกรรม</label>
        <select class="form-control" style="padding:4px 6px;font-size:11px;"
          onchange="_tplStages[${i}].type=this.value;_tplStages[${i}].icon=ACT_TYPE_MAP[this.value]?.icon||'📌';_renderTplStages()">
          ${_actTypeOptions(s.type)}
        </select>
      </div>
      <div>
        <label style="font-size:10px;color:var(--gray-400);">วัสดุที่ใช้</label>
        <input type="text" class="form-control" style="padding:4px 6px;font-size:12px;"
          value="${(s.materials||[]).join(', ')}" placeholder="ปุ๋ยหมัก, ไตรโคเดอม่า"
          oninput="_tplStages[${i}].materials=this.value.split(',').map(x=>x.trim()).filter(Boolean)">
      </div>
      <button onclick="removeTemplateStage(${i})"
        style="background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
    </div>`).join('');
}

export function _sortTplStages() {
  _tplStages.sort((a, b) => a.day - b.day);
  _renderTplStages();
}

export function addTemplateStage() {
  const lastDay = _tplStages.length > 0 ? Math.max(..._tplStages.map(s => s.day)) : -7;
  _tplStages.push({
    id: 'us_' + Date.now(),
    name: '', day: lastDay + 7,
    type: 'รดน้ำ', icon: '💧',
    materials: [], notes: ''
  });
  _renderTplStages();
  // scroll to bottom of stage list
  setTimeout(() => {
    const list = document.getElementById('tpl-stages-list');
    if (list) list.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 50);
}

export function removeTemplateStage(i) {
  _tplStages.splice(i, 1);
  _renderTplStages();
}

export function saveTemplate() {
  const name  = document.getElementById('tpl-name')?.value.trim();
  const days  = parseInt(document.getElementById('tpl-days')?.value) || 0;
  const icon  = document.getElementById('tpl-icon')?.value.trim() || '🌱';
  if (!name)  { showToast('⚠️ กรุณาใส่ชื่อสูตร'); return; }
  if (!days)  { showToast('⚠️ กรุณาใส่จำนวนวันจนถึงเก็บเกี่ยว'); return; }
  if (!_tplStages.length) { showToast('⚠️ กรุณาเพิ่มขั้นตอนอย่างน้อย 1 ขั้นตอน'); return; }

  const badStage = _tplStages.find(s => !s.name.trim());
  if (badStage) { showToast('⚠️ กรุณาใส่ชื่องานให้ครบทุกขั้นตอน'); return; }

  const sorted = [..._tplStages].sort((a, b) => a.day - b.day);
  const tplData = {
    name, icon,
    category:     document.getElementById('tpl-category')?.value   || 'พืชผัก',
    daysToHarvest: days,
    isContinuous: document.getElementById('tpl-continuous')?.checked || false,
    notes:        document.getElementById('tpl-notes')?.value.trim()  || '',
    stages: sorted.map((s, i) => ({
      id: s.id || ('us_' + i),
      name: s.name.trim(), day: s.day,
      type: s.type, icon: ACT_TYPE_MAP[s.type]?.icon || '📌',
      materials: s.materials || [], notes: s.notes || ''
    }))
  };

  if (_editingTemplateId) {
    const existing = planTemplates.find(t => t.id === _editingTemplateId);
    if (existing) Object.assign(existing, tplData);
    showToast(`✅ แก้ไขสูตร "${name}" แล้ว`);
  } else {
    tplData.id = _nextTemplateId;
    planTemplates.push(tplData);
    showToast(`✅ สร้างสูตร "${name}" แล้ว — ${sorted.length} ขั้นตอน`);
  }

  saveData();
  closeModal('modal-create-template');
  renderTemplatesTab();
}

// ── Input Batches ──
export function renderInputBatches() {
  const listEl=document.getElementById('input-batches-list'), emptyEl=document.getElementById('batches-empty');
  const sumEl=document.getElementById('input-batches-summary');
  if (!listEl) return;
  const today=new Date().toISOString().slice(0,10);
  if (sumEl) {
    const active=inputBatches.filter(b=>b.status==='active').length;
    const ready=inputBatches.filter(b=>b.status==='active'&&b.readyDate<=today).length;
    sumEl.innerHTML=`<div class="stat-card green"><div class="stat-label">กำลังผลิต</div><div class="stat-value">${active}</div></div>
      <div class="stat-card amber"><div class="stat-label">พร้อมใช้แล้ว</div><div class="stat-value">${ready}</div></div>
      <div class="stat-card"><div class="stat-label">ทั้งหมด</div><div class="stat-value">${inputBatches.length}</div></div>`;
  }
  if (!inputBatches.length) { listEl.innerHTML=''; emptyEl.style.display=''; return; }
  emptyEl.style.display='none';
  listEl.innerHTML=[...inputBatches].sort((a,b)=>a.readyDate.localeCompare(b.readyDate)).map(b=>{
    const tmpl=INPUT_TEMPLATES[b.type]||{};
    const daysLeft=daysBetween(today,b.readyDate);
    const elapsed=daysBetween(b.startDate,today);
    const pct=Math.max(0,Math.min(100,Math.round(elapsed/b.totalDays*100)));
    const isReady=daysLeft<=0&&b.status==='active';
    const barCol=isReady?'#22c55e':daysLeft<=3?'#f59e0b':tmpl.color||'var(--green-600)';
    return `<div class="card" style="margin-bottom:10px;border-left:3px solid ${barCol};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">
        <div>
          <div style="font-size:14px;font-weight:700;">${tmpl.icon||'🧪'} ${b.name}
            ${isReady?'<span style="background:#dcfce7;color:#16a34a;font-size:10px;padding:2px 8px;border-radius:10px;margin-left:4px;">✅ พร้อมใช้</span>':
            b.status==='done'?'<span style="background:#f3f4f6;color:#6b7280;font-size:10px;padding:2px 8px;border-radius:10px;margin-left:4px;">ใช้แล้ว</span>':
            `<span style="font-size:10px;padding:2px 8px;border-radius:10px;margin-left:4px;background:${daysLeft<=3?'#fef9c3':'#dbeafe'};color:${daysLeft<=3?'#92400e':'#1d4ed8'};">⏳ อีก ${daysLeft} วัน</span>`}
          </div>
          <div style="font-size:11px;color:var(--gray-400);">${b.type} · เริ่ม ${fmtDate(b.startDate)} · พร้อม ${fmtDate(b.readyDate)} · ${b.qty} ${b.unit}</div>
        </div>
        <div style="display:flex;gap:6px;">
          ${isReady&&b.status!=='done'?`<button class="btn btn-primary" style="font-size:11px;padding:4px 8px;background:#22c55e;" onclick="markBatchDone(${b.id})">📥 เข้าคลัง</button>`:''}
          <button class="btn btn-outline" style="font-size:11px;padding:4px 8px;color:#ef4444;" onclick="deleteBatch(${b.id})">🗑</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
        <div style="flex:1;height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${barCol};border-radius:3px;transition:width .4s;"></div></div>
        <span style="font-size:11px;color:var(--gray-400);">${pct}%</span>
      </div>
      <div style="margin-top:6px;display:flex;gap:3px;flex-wrap:wrap;">
        ${(tmpl.stages||[]).map(st=>{const done=addDays(b.startDate,st.day)<=today;return `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:${done?'#dcfce7':'var(--gray-50)'};color:${done?'#16a34a':'var(--gray-400)'};">${done?'✓ ':''}${st.name}</span>`;}).join('')}
      </div>
    </div>`;
  }).join('');
}

export function onBatchTypeChange() {
  const type=document.getElementById('batch-type-sel')?.value;
  const start=document.getElementById('batch-start-date')?.value;
  const tmpl=INPUT_TEMPLATES[type];
  if (!tmpl) return;
  const nameEl=document.getElementById('batch-name');
  if (nameEl&&!nameEl.value) nameEl.value=`${type} Batch ${inputBatches.filter(b=>b.type===type).length+1}`;
  const prev=document.getElementById('batch-ready-preview');
  if (prev&&start) prev.innerHTML=`${tmpl.icon} พร้อมใช้: <strong>${fmtDate(addDays(start,tmpl.days))}</strong> (อีก ${tmpl.days} วัน)`;
}

export function openInputBatchModal() {
  document.getElementById('batch-start-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('batch-name').value='';
  onBatchTypeChange();
  document.getElementById('modal-input-batch').classList.add('open');
}

export function saveInputBatch() {
  const type=document.getElementById('batch-type-sel')?.value;
  const name=document.getElementById('batch-name')?.value.trim();
  const start=document.getElementById('batch-start-date')?.value;
  const qty=parseFloat(document.getElementById('batch-qty')?.value)||0;
  const unit=document.getElementById('batch-unit')?.value;
  if (!name||!start) { showToast('⚠️ กรุณากรอกข้อมูลให้ครบ'); return; }
  const tmpl=INPUT_TEMPLATES[type]||{days:30,stages:[]};
  const batch={ id:_nextBatchId, type, name, startDate:start,
    readyDate:addDays(start,tmpl.days), totalDays:tmpl.days, qty, unit, status:'active',
    stages:tmpl.stages.map(s=>({...s,date:addDays(start,s.day)})) };
  inputBatches.push(batch);
  calEvents.push({ id:_nextCalId, title:`🧪 ${name} พร้อมใช้งาน`,
    start:batch.readyDate, end:batch.readyDate, priority:'farm', cat:'ผลิตวัสดุ',
    note:`${type} · ${qty} ${unit}`, _batchId:batch.id });
  saveData(); closeModal('modal-input-batch'); renderInputBatches();
  showToast(`✅ เริ่มผลิต "${name}" — พร้อมใช้ ${fmtDate(batch.readyDate)}`);
}

export function markBatchDone(id) {
  const b=inputBatches.find(b=>b.id===id);
  if (!b) return;
  b.status='done';
  invItems.push({ id:nextInvId, name:b.name, cat:'ปุ๋ย', qty:b.qty, unit:b.unit,
    price:0, threshold:0, shelfLife:null, harvestDate:'', lot:'Batch', lastOrder:new Date().toISOString().slice(0,10) });
  saveData(); renderInputBatches(); renderInv();
  showToast(`📥 เพิ่ม "${b.name}" เข้าคลังแล้ว`);
}

export function deleteBatch(id) {
  if (!confirm('ลบ batch นี้?')) return;
  setInputBatches(inputBatches.filter(b=>b.id!==id));
  setCalEvents(calEvents.filter(e=>e._batchId!==id));
  saveData(); renderInputBatches();
}

// ── Soil Rest ──
export function renderSoilRests() {
  const listEl=document.getElementById('soilrest-list'), emptyEl=document.getElementById('soilrest-empty');
  if (!listEl) return;
  if (!soilRests.length) { listEl.innerHTML=''; emptyEl.style.display=''; return; }
  emptyEl.style.display='none';
  const today=new Date().toISOString().slice(0,10);
  listEl.innerHTML=soilRests.map(r=>{
    const active=r.startDate<=today&&r.endDate>=today;
    const done=r.endDate<today;
    const col=active?'#f59e0b':done?'#9ca3af':'#3b82f6';
    return `<div class="card" style="margin-bottom:10px;border-left:3px solid ${col};">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
        <div>
          <div style="font-size:14px;font-weight:700;">💤 แปลง ${r.plot}
            ${active?'<span style="background:#fef9c3;color:#92400e;font-size:10px;padding:2px 8px;border-radius:10px;margin-left:4px;">กำลังพัก</span>':
              done?'<span style="background:#f3f4f6;color:#6b7280;font-size:10px;padding:2px 8px;border-radius:10px;margin-left:4px;">สิ้นสุดแล้ว</span>':
              '<span style="background:#dbeafe;color:#1d4ed8;font-size:10px;padding:2px 8px;border-radius:10px;margin-left:4px;">กำหนดไว้</span>'}
          </div>
          <div style="font-size:11px;color:var(--gray-400);margin-top:2px;">📅 ${fmtDate(r.startDate)} – ${fmtDate(r.endDate)} · ${r.reason}</div>
          ${r.notes?`<div style="font-size:11px;color:var(--gray-500);">💬 ${r.notes}</div>`:''}
        </div>
        <button class="btn btn-outline" style="font-size:11px;padding:4px 8px;color:#ef4444;" onclick="deleteSoilRest(${r.id})">🗑</button>
      </div>
    </div>`;
  }).join('');
}

export function openSoilRestModal() {
  const plotSel=document.getElementById('soilrest-plot');
  if (plotSel) plotSel.innerHTML=farmSettings.plots.map(p=>`<option value="${p}">${p}</option>`).join('');
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('soilrest-start').value=today;
  document.getElementById('soilrest-end').value=addDays(today,30);
  document.getElementById('soilrest-notes').value='';
  document.getElementById('modal-soil-rest').classList.add('open');
}

export function saveSoilRest() {
  const plot=document.getElementById('soilrest-plot')?.value;
  const start=document.getElementById('soilrest-start')?.value;
  const end=document.getElementById('soilrest-end')?.value;
  const reason=document.getElementById('soilrest-reason')?.value;
  const notes=document.getElementById('soilrest-notes')?.value.trim()||'';
  if (!plot||!start||!end) { showToast('⚠️ กรุณากรอกข้อมูลให้ครบ'); return; }
  const rest={ id:_nextSoilRestId, plot, startDate:start, endDate:end, reason, notes };
  soilRests.push(rest);
  calEvents.push({ id:_nextCalId, title:`💤 แปลง ${plot} — ${reason}`,
    start, end, priority:'normal', cat:'พักดิน', note:notes, _soilRestId:rest.id });
  saveData(); closeModal('modal-soil-rest'); renderSoilRests();
  showToast(`✅ กำหนดพักดินแปลง ${plot} แล้ว`);
}

export function deleteSoilRest(id) {
  const r=soilRests.find(r=>r.id===id);
  if (!r||!confirm('ลบแผนพักดินนี้?')) return;
  setSoilRests(soilRests.filter(r=>r.id!==id));
  setCalEvents(calEvents.filter(e=>e._soilRestId!==id));
  saveData(); renderSoilRests();
}

// ============================================================
// ============================================================
export function switchInvTab(tab) {
  const isProduce = tab === 'produce';
  document.getElementById('inv-tab-produce').style.display = isProduce ? '' : 'none';
  document.getElementById('inv-tab-supply').style.display  = isProduce ? 'none' : '';
  const btnP = document.getElementById('inv-tab-btn-produce');
  const btnS = document.getElementById('inv-tab-btn-supply');
  btnP.style.borderBottomColor = isProduce ? 'var(--green-600)' : 'transparent';
  btnP.style.color = isProduce ? 'var(--green-700)' : 'var(--gray-400)';
  btnS.style.borderBottomColor = isProduce ? 'transparent' : 'var(--green-600)';
  btnS.style.color = isProduce ? 'var(--gray-400)' : 'var(--green-700)';
}

// ============================================================
// ===== AI FARM ADVISOR =====
