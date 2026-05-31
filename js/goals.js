import { CHART_COLORS, GREEN, AMBER, RED, GRAY, groupSalesBy } from './charts.js';
import { saveData } from './firebase.js';
import { cropItems, goalBarInst, goalItems, goalRevenueTarget, salesData, setGoalBarInst, setGoalRevenueTarget } from './state.js';
import { closeModal, showToast } from './ui.js';

// ============================================================

export function openGoalModal(cropId){
  const sel=document.getElementById('goal-crop-select');
  sel.innerHTML=cropItems.map(c=>`<option value="${c.id}" ${cropId==c.id?'selected':''}>${c.name}</option>`).join('');
  prefillGoalCrop();
  document.getElementById('modal-goal').classList.add('open');
}

export function prefillGoalCrop(){
  const id=parseInt(document.getElementById('goal-crop-select').value);
  const crop=cropItems.find(c=>c.id===id);
  const exist=goalItems[id]||{};
  document.getElementById('goal-actual').value=(crop&&crop.yieldActual!==''&&crop.yieldActual!=null)?crop.yieldActual:'0';
  document.getElementById('goal-target').value=exist.target||'';
  document.getElementById('goal-note').value=exist.note||'';
}

export function saveGoalItem(){
  const id=parseInt(document.getElementById('goal-crop-select').value);
  const target=parseFloat(document.getElementById('goal-target').value)||0;
  const note=document.getElementById('goal-note').value.trim();
  if(!target){showToast('⚠️ กรุณากรอกเป้าหมาย');return;}
  goalItems[id]={target,note};
  closeModal('modal-goal');saveData(); renderGoals();
  showToast('🎯 บันทึกเป้าหมายสำเร็จ');
}

export function updateRevenueGoal(){
  setGoalRevenueTarget(parseFloat(document.getElementById('goal-revenue-target').value)||0);
  renderGoalRevBar();
}

export function renderGoalRevBar(){
  const actual=salesData.reduce((s,i)=>s+i.total,0);
  const pct=goalRevenueTarget>0?Math.min(100,Math.round(actual/goalRevenueTarget*100)):0;
  const bar=document.getElementById('goal-revenue-bar'),pctEl=document.getElementById('goal-revenue-pct'),actEl=document.getElementById('goal-revenue-actual');
  if(bar)bar.style.width=pct+'%';
  if(pctEl)pctEl.textContent=pct+'% ของเป้าหมาย'+(goalRevenueTarget>0?' ('+goalRevenueTarget.toLocaleString('th-TH')+' ฿)':'');
  if(actEl)actEl.textContent=actual.toLocaleString('th-TH')+' ฿';
}

export function renderGoals(){
  const tbody=document.getElementById('goals-table-body');
  if(!tbody)return;
  tbody.innerHTML='';

  // Deduplicate: group by name, keep the one with highest yieldActual (or highest yieldEst if tied)
  const seen = new Map();
  cropItems.forEach(crop => {
    const actual = (crop.yieldActual!==''&&crop.yieldActual!=null) ? Number(crop.yieldActual) : 0;
    if (!seen.has(crop.name)) {
      seen.set(crop.name, crop);
    } else {
      const prev = seen.get(crop.name);
      const prevActual = (prev.yieldActual!==''&&prev.yieldActual!=null) ? Number(prev.yieldActual) : 0;
      // Keep the one with higher actual; if equal, keep higher est
      if (actual > prevActual || (actual === prevActual && (crop.yieldEst||0) > (prev.yieldEst||0))) {
        seen.set(crop.name, crop);
      }
    }
  });

  // Sort by yieldActual desc, then yieldEst desc
  const uniqueCrops = [...seen.values()].sort((a,b) => {
    const aA = (a.yieldActual!==''&&a.yieldActual!=null) ? Number(a.yieldActual) : 0;
    const bA = (b.yieldActual!==''&&b.yieldActual!=null) ? Number(b.yieldActual) : 0;
    if (bA !== aA) return bA - aA;
    return (b.yieldEst||0) - (a.yieldEst||0);
  });

  uniqueCrops.forEach(crop=>{
    const g=goalItems[crop.id]||{};
    const actual=(crop.yieldActual!==''&&crop.yieldActual!=null)?Number(crop.yieldActual):0;
    const target=g.target||0;
    const pct=target>0?Math.min(100,Math.round(actual/target*100)):0;
    const barCol=pct>=100?GREEN:pct>=60?AMBER:RED;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${crop.name}</strong>${g.note?`<div style="font-size:11px;color:var(--gray-400)">${g.note}</div>`:''}</td><td>${actual>0?actual:'—'}</td><td>${target>0?target:'<span style="color:var(--gray-400);font-size:12px">ยังไม่ได้ตั้ง</span>'}</td><td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:7px;background:var(--gray-100);border-radius:4px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${barCol};border-radius:4px;"></div></div><span style="font-size:12px;font-weight:500;min-width:36px;text-align:right">${target>0?pct+'%':'—'}</span></div></td><td><button class="btn-icon edit" onclick="openGoalModal(${crop.id})">✏️</button></td>`;
    tbody.appendChild(tr);
  });

  const totalEst=cropItems.reduce((s,c)=>s+(c.yieldEst||0),0);
  const totalAct=cropItems.reduce((s,c)=>s+((c.yieldActual!==''&&c.yieldActual!=null)?Number(c.yieldActual):0),0);
  const withGoal=Object.keys(goalItems).length;
  const rowEl=document.getElementById('goals-summary-row');
  if(rowEl)rowEl.innerHTML=`<div class="quick-pill">🌾 ผลผลิตที่ได้รวม <strong>${totalAct.toLocaleString('th-TH')} กก.</strong></div><div class="quick-pill">📋 ผลผลิตคาดรวม <strong>${totalEst.toLocaleString('th-TH')} กก.</strong></div><div class="quick-pill">🎯 ตั้งเป้าแล้ว <strong>${withGoal} / ${seen.size} ชนิด</strong></div>`;
  const byChannel=groupSalesBy('channel'),chTotal=Object.values(byChannel).reduce((s,v)=>s+v,0);
  const chEl=document.getElementById('goals-channel-bars');
  if(chEl)chEl.innerHTML=Object.entries(byChannel).sort((a,b)=>b[1]-a[1]).map(([ch,val],i)=>{const pct=chTotal?Math.round(val/chTotal*100):0;return`<div class="progress-item" style="margin-bottom:8px"><div class="progress-label" style="font-size:12px;flex:0 0 90px">${ch}</div><div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%;background:${CHART_COLORS[i%CHART_COLORS.length]}"></div></div><div class="progress-val" style="font-size:12px">${val.toLocaleString('th-TH')} ฿</div></div>`;}).join('');
  const top3El=document.getElementById('goals-top-products');
  if(top3El)top3El.innerHTML=Object.entries(groupSalesBy('product')).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([name,val],i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--gray-100);"><span style="font-size:13px">${['🥇','🥈','🥉'][i]} ${name}</span><span style="font-size:13px;font-weight:500;color:var(--green-600)">${val.toLocaleString('th-TH')} ฿</span></div>`).join('');
  renderGoalRevBar();

  // Goals chart — unique crops, sorted by actual desc
  const gcLabels=uniqueCrops.map(c=>c.name);
  const gcActual=uniqueCrops.map(c=>(c.yieldActual!==''&&c.yieldActual!=null)?Number(c.yieldActual):0);
  const gcTarget=uniqueCrops.map(c=>goalItems[c.id]?.target||0);
  const gcWrap=document.getElementById('goal-bar-wrap');
  if(gcWrap)gcWrap.style.height=Math.max(260,gcLabels.length*44+60)+'px';
  if(goalBarInst)goalBarInst.destroy();
  const gcCtx=document.getElementById('goalBarChart');
  if(gcCtx)setGoalBarInst(new Chart(gcCtx,{type:'bar',
    data:{labels:gcLabels,datasets:[{label:'ได้จริง',data:gcActual,backgroundColor:GREEN+'cc',borderRadius:3},{label:'เป้าหมาย',data:gcTarget,backgroundColor:GRAY+'88',borderRadius:3}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{grid:{color:'#eee'},ticks:{font:{family:'Sarabun'}}},y:{grid:{display:false},ticks:{font:{family:'Sarabun',size:12},autoSkip:false}}}}}));
}

// ============================================================
// ===== DASHBOARD RENDER (from real data) =====
