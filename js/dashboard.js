import { getActStyle } from './activities.js';
import { PROJ_STATUS_MAP } from './projects.js';
import { _autoUpdateCropStatuses } from './ai.js';
import { produceDaysLeft, produceStatus } from './inventory.js';
import { renderNotifications } from './notifications.js';
import { switchInvTab, switchPlanTab } from './planningSystem.js';
import { actItems, cropItems, custItems, inputBatches, invItems, plotSeasons, projectItems, salesData } from './state.js';
import { navigate } from './ui.js';
import { fmtDate } from './utils.js';

// ============================================================
export function renderDashboard() {
  _autoUpdateCropStatuses(); // ← อัปเดตสถานะพืชตามวันเก็บเกี่ยวทุกครั้ง
  const now = new Date();
  const thisMonth = now.toISOString().slice(0,7); // YYYY-MM
  const totalRevenue  = salesData.reduce((s,i) => s + i.total, 0);
  const monthRevenue  = salesData.filter(s => (s.date||'').startsWith(thisMonth)).reduce((s,i) => s + i.total, 0);
  const totalYieldActual = cropItems.reduce((s,i) => {
    const logTotal = (i.harvestLog||[]).reduce((ls,e)=>ls+e.weight,0);
    return s + (logTotal > 0 ? logTotal : ((i.yieldActual!==''&&i.yieldActual!=null) ? Number(i.yieldActual) : 0));
  }, 0);
  const totalYieldEst = cropItems.reduce((s,i) => s + (i.yieldEst || 0), 0);
  const totalArea     = cropItems.reduce((s,i) => s + (i.area || 0), 0);
  const activeArea    = cropItems.filter(i => i.status !== 'เก็บเกี่ยวแล้ว').reduce((s,i) => s + (i.area || 0), 0);

  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  // ── Stats ──
  set('dash-revenue',      (monthRevenue||totalRevenue).toLocaleString('th-TH') + ' <span class="stat-unit">฿</span>');
  set('dash-revenue-sub',  monthRevenue > 0 ? 'เดือนนี้ · รวม ' + totalRevenue.toLocaleString('th-TH') + ' ฿' : 'จากการขาย ' + salesData.length + ' รายการ');
  set('dash-yield',        totalYieldActual.toLocaleString('th-TH') + ' <span class="stat-unit">กก.</span>');
  set('dash-yield-sub',    'คาด ' + totalYieldEst.toLocaleString('th-TH') + ' กก. · ' + cropItems.length + ' ชนิด');
  set('dash-area',         totalArea.toFixed(1) + ' <span class="stat-unit">ไร่</span>');
  set('dash-area-sub',     'ใช้งานอยู่ ' + activeArea.toFixed(1) + ' ไร่');
  set('dash-customers',    custItems.length + ' <span class="stat-unit">ราย</span>');
  set('dash-customers-sub', custItems.map(c=>c.type).filter((v,i,a)=>a.indexOf(v)===i).join(' · ') || '—');

  // ── Today banner ──
  const readyCrops  = cropItems.filter(i=>i.status==='พร้อมเก็บ');
  const overStock   = invItems.filter(i=>i.cat==='ผลผลิต' && produceStatus(i).overstock);
  const activeProj  = projectItems.filter(p=>p.status==='กำลังดำเนินการ');
  const lowSupply   = invItems.filter(i=>i.cat!=='ผลผลิต'&&i.qty<=i.threshold&&i.qty>=0);
  let bannerMsg = 'ฟาร์มของคุณวันนี้';
  let bannerSub = [];
  if (readyCrops.length)  bannerSub.push(`🌾 ${readyCrops.length} ชนิดพร้อมเก็บเกี่ยว`);
  if (activeProj.length)  bannerSub.push(`📋 ${activeProj.length} โครงการกำลังดำเนินการ`);
  if (overStock.length)   bannerSub.push(`⚠️ ผลผลิตค้างสต็อก ${overStock.length} รายการ`);
  if (monthRevenue>0)     bannerSub.push(`💰 รายได้เดือนนี้ ${monthRevenue.toLocaleString('th-TH')} ฿`);
  set('dash-today-msg', bannerMsg);
  set('dash-today-sub', bannerSub.slice(0,3).join('  ·  ') || 'ยังไม่มีข้อมูล เริ่มเพิ่มข้อมูลพืชผลและกิจกรรมได้เลย');

  // ── ควรทำต่อ (smart todo) ──
  const todoEl = document.getElementById('dash-todo-list');
  if (todoEl) {
    const todos = [];
    const todayISO = now.toISOString().slice(0,10);

    // 🗺️ งานแผนปลูกที่ถึงกำหนดหรือเกิน
    const todayISO2 = now.toISOString().slice(0,10);
    plotSeasons.filter(s=>s.status==='active').forEach(s=>{
      const dueTasks = (s.tasks||[]).filter(t=>!t.done&&!t.skipped&&t.plannedDate<=todayISO2);
      dueTasks.slice(0,2).forEach(task=>{
        const isOver = task.plannedDate < todayISO2;
        todos.push({ icon: isOver?'⚠️':'🗓️', color: isOver?'#ef4444':'#f59e0b',
          title:`${task.icon||''} ${task.name}`, sub:`แผน: ${s.cropName} · แปลง ${s.plot} · ${fmtDate(task.plannedDate)}`,
          action:`navigate('plan',document.querySelector('[onclick*=\\'plan\\']'))` });
      });
    });
    // 🧪 วัสดุพร้อมใช้แล้ว
    inputBatches.filter(b=>b.status==='active'&&b.readyDate<=todayISO2).slice(0,2).forEach(b=>{
      todos.push({ icon:'🧪', color:'#22c55e', title:`${b.name} พร้อมใช้งาน`, sub:`${b.qty} ${b.unit} · กด "เข้าคลัง"`,
        action:`navigate('plan',document.querySelector('[onclick*=\\'plan\\']'));setTimeout(()=>switchPlanTab('inputs'),150)` });
    });
    projectItems.filter(p => p.end && p.status !== 'เสร็จสิ้น' && p.status !== 'ยกเลิก' && p.end < todayISO)
      .slice(0,2).forEach(p => {
        const days = Math.ceil((now - new Date(p.end)) / 86400000);
        todos.push({ icon:'🚨', color:'#ef4444', title:`โครงการเกินกำหนด: ${p.name}`, sub:`เกิน ${days} วัน · ${p.pct}%`, action:`navigate('projects',document.querySelector('[onclick*=\\'projects\\']'))` });
      });
    // 🌾 พืชพร้อมเก็บ
    readyCrops.slice(0, 3).forEach(c => todos.push({
      icon:'🌾', color:'#22c55e',
      title:`เก็บเกี่ยว ${c.name}`,
      sub:`แปลง ${c.plot} · ${c.yieldEst||'?'} กก. (คาด)`,
      action:`navigate('crops',document.querySelector('[onclick*=\\'crops\\']'))`
    }));
    // 🌱 พืชใกล้ถึงวันเก็บ (≤ 3 วัน)
    cropItems.filter(i => {
      if (i.status === 'เก็บเกี่ยวแล้ว' || !i.harvestDate) return false;
      const d = Math.ceil((new Date(i.harvestDate) - now) / 86400000);
      return d >= 0 && d <= 3;
    }).slice(0,2).forEach(c => {
      const days = Math.ceil((new Date(c.harvestDate) - now) / 86400000);
      todos.push({ icon:'🌱', color:'#16a34a', title:`${c.name} ใกล้เก็บเกี่ยว`, sub:`อีก ${days} วัน · แปลง ${c.plot}`, action:`navigate('crops',document.querySelector('[onclick*=\\'crops\\']'))` });
    });
    // 📦 วัสดุใกล้หมด / หมดแล้ว
    invItems.filter(i => i.cat !== 'ผลผลิต' && i.qty === 0)
      .slice(0,2).forEach(i => todos.push({ icon:'🚨', color:'#ef4444', title:`${i.name} หมดแล้ว`, sub:'สั่งซื้อด่วน', action:`navigate('inventory',document.querySelector('[onclick*=\\'inventory\\']'));setTimeout(()=>switchInvTab('supply'),150)` }));
    lowSupply.slice(0, 2).forEach(i => todos.push({
      icon:'📦', color:'#eab308',
      title:`สั่งซื้อ ${i.name}`,
      sub:`คงเหลือ ${i.qty} ${i.unit} · ต่ำกว่าเกณฑ์`,
      action:`navigate('inventory',document.querySelector('[onclick*=\\'inventory\\']'));setTimeout(()=>switchInvTab('supply'),150)`
    }));
    // ⚠️ ผลผลิตค้างสต็อก
    overStock.slice(0, 1).forEach(i => todos.push({
      icon:'⚠️', color:'#ef4444',
      title:`จัดการค้างสต็อก: ${i.name}`,
      sub:`เกินอายุ ${Math.abs(produceDaysLeft(i)||0)} วัน · ${i.qty} กก.`,
      action:`navigate('inventory',document.querySelector('[onclick*=\\'inventory\\']'));setTimeout(()=>switchInvTab('produce'),150)`
    }));
    // 📋 โครงการกำลังทำ
    activeProj.slice(0, 2).forEach(p => {
      const cur = (p.timeline||[]).find(s => s.status === 'doing' || s.status === 'todo');
      todos.push({ icon:'📋', color:'#3b82f6', title:`โครงการ: ${p.name}`, sub:cur?`ขั้นตอน: ${cur.title}`:`${p.pct}% · กำลังดำเนินการ`, action:`navigate('projects',document.querySelector('[onclick*=\\'projects\\']'))` });
    });

    if (todos.length === 0) {
      todoEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--gray-400);font-size:13px">✅ ไม่มีงานค้างหรือสิ่งที่ต้องทำเร่งด่วน</div>`;
    } else {
      set('dash-todo-sub', `มี ${todos.length} รายการที่ควรดำเนินการ`);
      todoEl.innerHTML = todos.slice(0, 6).map(t => `
        <div onclick="${t.action}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--gray-50);border-radius:var(--radius-sm);cursor:pointer;border-left:3px solid ${t.color};transition:background .15s" onmouseover="this.style.background='#f0f7ee'" onmouseout="this.style.background='var(--gray-50)'">
          <span style="font-size:18px">${t.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</div>
            <div style="font-size:11px;color:var(--gray-400);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.sub}</div>
          </div>
          <span style="color:var(--gray-300);font-size:14px">›</span>
        </div>`).join('');
    }
  }

  // ── Recent activities — max 5 ──
  const recentActs = [...actItems].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const actEl = document.getElementById('dash-recent-activities');
  if (actEl) actEl.innerHTML = recentActs.length
    ? recentActs.map(item => {
        const st = getActStyle(item.type);
        return `<div class="task-item">
          <div style="width:8px;height:8px;border-radius:50%;background:${st.color};flex-shrink:0;margin-top:4px"></div>
          <div class="task-text" style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
              <span style="font-size:11px;background:${st.bg};color:${st.color};border:1px solid ${st.border};border-radius:4px;padding:1px 6px;font-weight:500">${st.icon} ${item.type}</span>
              ${item.fromCrop?`<span style="font-size:9px;background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:4px;padding:1px 5px">🌱</span>`:''}
            </div>
            <div class="task-meta">${fmtDate(item.date)} · ${item.plot}${item.note?` · ${item.note.slice(0,30)}`+( item.note.length>30?'...':''):''}</div>
          </div>
          <span style="font-size:10px;background:var(--sky-50);color:var(--sky-600);border:1px solid var(--sky-200);border-radius:4px;padding:2px 6px;white-space:nowrap;flex-shrink:0">${item.person||'—'}</span>
        </div>`;
      }).join('')
    : '<div style="color:var(--gray-400);font-size:13px;padding:8px 0">ยังไม่มีกิจกรรม</div>';

  // ── Crop progress — stage breakdown ──
  const CROP_STAGES = ['เพาะกล้า','ย้ายกล้า','เติบโต','กำลังโต','พร้อมเก็บ','เก็บเกี่ยวแล้ว','เสียหาย/ตาย'];
  const STAGE_COLOR = {'เพาะกล้า':'#a07850','ย้ายกล้า':'#3b8fd4','เติบโต':'#22d3ee','กำลังโต':'#f59e0b','พร้อมเก็บ':'#22c55e','เก็บเกี่ยวแล้ว':'#9a9890','เสียหาย/ตาย':'#ef4444'};
  const STAGE_PCT  = {'เพาะกล้า':10,'ย้ายกล้า':25,'เติบโต':45,'กำลังโต':65,'พร้อมเก็บ':90,'เก็บเกี่ยวแล้ว':100,'เสียหาย/ตาย':0};
  const STAGE_ICON = {'เพาะกล้า':'🌰','ย้ายกล้า':'🌿','เติบโต':'🌱','กำลังโต':'🌳','พร้อมเก็บ':'🌾','เก็บเกี่ยวแล้ว':'✅','เสียหาย/ตาย':'💀'};
  const total = cropItems.length;
  const stageCnt = {};
  CROP_STAGES.forEach(s => stageCnt[s] = 0);
  cropItems.forEach(c => { if (stageCnt[c.status] !== undefined) stageCnt[c.status]++; });

  const progEl = document.getElementById('dash-crop-progress');
  if (progEl) {
    if (!total) {
      progEl.innerHTML = '<div style="color:var(--gray-400);font-size:13px;padding:8px">ยังไม่มีข้อมูลพืชผล</div>';
    } else {
      // Stage summary bar
      let summaryBar = `<div style="display:flex;border-radius:6px;overflow:hidden;height:14px;margin-bottom:12px;">`;
      CROP_STAGES.forEach(s => {
        const pct = total ? Math.round(stageCnt[s]/total*100) : 0;
        if (pct > 0) summaryBar += `<div style="width:${pct}%;background:${STAGE_COLOR[s]};transition:width .4s" title="${s}: ${stageCnt[s]} (${pct}%)"></div>`;
      });
      summaryBar += `</div>`;

      // Stage rows
      const stageRows = CROP_STAGES.filter(s => stageCnt[s] > 0).map(s => {
        const cnt = stageCnt[s];
        const pct = Math.round(cnt/total*100);
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:14px;width:20px;text-align:center;">${STAGE_ICON[s]}</span>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
              <span style="font-size:12px;font-weight:500;color:var(--gray-700);">${s}</span>
              <span style="font-size:11px;color:var(--gray-400);">${cnt} แปลง · ${pct}%</span>
            </div>
            <div style="height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${STAGE_COLOR[s]};border-radius:3px;transition:width .4s;"></div>
            </div>
          </div>
        </div>`;
      }).join('');

      progEl.innerHTML = summaryBar + stageRows;
    }
  }

  // ── Alerts ──
  const alertsEl = document.getElementById('dash-alerts');
  if (alertsEl) {
    let alerts = [];
    invItems.filter(i=>i.cat!=='ผลผลิต'&&i.qty===0).forEach(i=>
      alerts.push(`<div class="alert-item danger"><div class="alert-icon">⚠️</div><div class="alert-text"><div class="alert-title">${i.name} หมดแล้ว</div>สั่งซื้อด่วน</div></div>`));
    invItems.filter(i=>i.cat!=='ผลผลิต'&&i.qty>0&&i.qty<=(i.threshold||0)).forEach(i=>
      alerts.push(`<div class="alert-item warn"><div class="alert-icon">📦</div><div class="alert-text"><div class="alert-title">${i.name} ใกล้หมด</div>${i.qty} ${i.unit}</div></div>`));
    readyCrops.slice(0,3).forEach(c=>
      alerts.push(`<div class="alert-item info"><div class="alert-icon">🌾</div><div class="alert-text"><div class="alert-title">${c.name} พร้อมเก็บ</div>แปลง ${c.plot}</div></div>`));
    overStock.slice(0,2).forEach(i=>
      alerts.push(`<div class="alert-item danger"><div class="alert-icon">🗓</div><div class="alert-text"><div class="alert-title">${i.name} ค้างสต็อก</div>เกิน ${Math.abs(produceDaysLeft(i)||0)} วัน</div></div>`));
    if (!alerts.length) alerts.push(`<div class="alert-item info"><div class="alert-icon">✅</div><div class="alert-text"><div class="alert-title">ทุกอย่างเรียบร้อย</div>ไม่มีการแจ้งเตือน</div></div>`);
    alertsEl.innerHTML = alerts.slice(0,8).join('');
  }

  // ── Projects preview — sorted by priority ──
  renderNotifications();
  const projEl = document.getElementById('dash-projects-preview');
  if (projEl) {
    const todayISO = now.toISOString().slice(0,10);
    function _projScore(p) {
      if (p.status==='มีปัญหา')          return 0;
      if (p.status==='กำลังดำเนินการ' && p.end && p.end < todayISO) return 1;
      if (p.status==='กำลังดำเนินการ') return 2;
      if (p.status==='วางแผน')           return 3;
      if (p.status==='เสร็จสิ้น')        return 4;
      return 5;
    }
    const sorted = [...projectItems].sort((a,b) => _projScore(a) - _projScore(b)).slice(0,5);
    if (!sorted.length) {
      projEl.innerHTML = '<div style="color:var(--gray-400);font-size:13px;padding:8px">ยังไม่มีโครงการ</div>';
    } else {
      projEl.innerHTML = sorted.map(p => {
        const sm = PROJ_STATUS_MAP[p.status]||PROJ_STATUS_MAP['วางแผน'];
        const barC = p.status==='เสียหาย/ตาย'?'#ef4444':p.pct>=100?'#22c55e':p.pct>=50?'#3b82f6':'#eab308';
        const daysLeft = p.end ? Math.ceil((new Date(p.end)-now)/86400000) : null;
        const deadlineTag = daysLeft !== null
          ? `<span style="font-size:10px;color:${daysLeft<0?'#ef4444':daysLeft<7?'#f59e0b':'var(--gray-400)'};">
              ${daysLeft<0?'⚠️ เกิน '+Math.abs(daysLeft)+' วัน':'⏳ อีก '+daysLeft+' วัน'}</span>` : '';
        return `<div style="padding:6px 0;border-bottom:1px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
            <span style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%">${p.name}</span>
            <div style="display:flex;gap:4px;align-items:center;">${deadlineTag}<span class="badge ${sm.cls}" style="font-size:10px">${sm.icon} ${p.status}</span></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:5px;background:var(--gray-100);border-radius:3px;overflow:hidden">
              <div style="width:${p.pct}%;height:100%;background:${barC};transition:width .4s"></div>
            </div>
            <span style="font-size:11px;font-weight:600;color:${barC}">${p.pct}%</span>
          </div>
        </div>`;
      }).join('');
    }
  }
} // end renderDashboard

// ============================================================
// ===== NOTIFICATION SYSTEM =====
