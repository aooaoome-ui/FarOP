import { CHART_COLORS, GREEN } from './charts.js';
import { farmSettings, reqItems, salesData } from './state.js';
import { fmtDate } from './utils.js';

// ============================================================
let _rptTab       = 'month'; // 'month' | 'year'
let _rptChartType = 'bar';
let _rptMainChartInst    = null;
let _rptChannelChartInst = null;
let _rptYoyChartInst     = null;

export function setRptTab(tab) {
  _rptTab = tab;
  const mb = document.getElementById('rpt-tab-month');
  const yb = document.getElementById('rpt-tab-year');
  if (mb) { mb.style.background = tab==='month'?'var(--green-600)':'#fff'; mb.style.color = tab==='month'?'#fff':'var(--gray-500)'; }
  if (yb) { yb.style.background = tab==='year' ?'var(--green-600)':'#fff'; yb.style.color = tab==='year' ?'#fff':'var(--gray-500)'; }
  _rptBuildPeriodOptions();
  renderReports();
}

export function setRptChartType(t) {
  _rptChartType = t;
  const bb = document.getElementById('rpt-ct-bar');
  const lb = document.getElementById('rpt-ct-line');
  if (bb) { bb.className = t==='bar'  ? 'btn btn-primary'  : 'btn btn-outline'; bb.style.fontSize='10px'; bb.style.padding='3px 8px'; }
  if (lb) { lb.className = t==='line' ? 'btn btn-primary'  : 'btn btn-outline'; lb.style.fontSize='10px'; lb.style.padding='3px 8px'; }
  renderReports();
}

export function _rptBuildPeriodOptions() {
  const sel = document.getElementById('rpt-period-sel');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  if (_rptTab === 'month') {
    // unique months in sales data + last 12 months
    const months = new Set();
    salesData.forEach(s => { if (s.date) months.add(s.date.slice(0,7)); });
    // also add current month and last 11
    const now = new Date();
    for (let i=0; i<12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.add(d.toISOString().slice(0,7));
    }
    [...months].sort().reverse().forEach(m => {
      const [y,mo] = m.split('-');
      const label = new Date(y,mo-1,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
      sel.innerHTML += `<option value="${m}">${label}</option>`;
    });
  } else {
    const years = new Set();
    salesData.forEach(s => { if (s.date) years.add(s.date.slice(0,4)); });
    const thisYear = String(new Date().getFullYear());
    years.add(thisYear);
    [...years].sort().reverse().forEach(y => {
      sel.innerHTML += `<option value="${y}">ปี พ.ศ. ${parseInt(y)+543}</option>`;
    });
  }
  if (prev && [...sel.options].some(o => o.value===prev)) sel.value = prev;
}

// ── Filter sales + costs by period ──
export function _rptFilterData(period) {
  const sales   = salesData.filter(s => s.date && s.date.startsWith(period));
  const costs   = reqItems.filter(r => r.date && r.date.startsWith(period));
  return { sales, costs };
}

// ── Get sorted sub-labels for comparison chart ──
export function _rptMonthLabels(year) {
  return Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
}

export function _rptMonthShort(iso) { // 'YYYY-MM' → 'ม.ค.' etc
  const [y,m] = iso.split('-');
  return new Date(y,m-1,1).toLocaleDateString('th-TH',{month:'short'});
}

export function renderReports() {
  // Build period options first if empty
  _rptBuildPeriodOptions();
  const sel    = document.getElementById('rpt-period-sel');
  if (!sel || !sel.options.length) return; // no data at all
  const period = sel.value;
  const isYear = _rptTab === 'year';
  const yoy    = document.getElementById('rpt-yoy')?.checked;
  const { sales, costs } = _rptFilterData(period);

  // ── KPIs ──
  const revenue   = sales.reduce((s,i) => s+i.total, 0);
  const cost      = costs.reduce((s,i) => s+(i.totalCost||0), 0);
  const profit    = revenue - cost;
  const weight    = sales.reduce((s,i) => s+(i.weight||0), 0);
  const margin    = revenue > 0 ? Math.round(profit/revenue*100) : 0;
  const costPerKg = weight > 0 ? (cost/weight).toFixed(2) : '—';

  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('rpt-revenue', revenue.toLocaleString('th-TH') + ' ฿');
  set('rpt-cost',    cost.toLocaleString('th-TH') + ' ฿');
  set('rpt-profit',  profit.toLocaleString('th-TH') + ' ฿');
  set('rpt-weight',  weight.toLocaleString('th-TH') + ' กก.');
  set('rpt-revenue-sub', sales.length + ' รายการขาย');
  set('rpt-cost-sub',    costs.length + ' รายการเบิก · ฿' + costPerKg + '/กก.');
  set('rpt-profit-sub',  'Margin ' + margin + '%');
  set('rpt-weight-sub',  [...new Set(sales.map(s=>s.product))].length + ' ชนิดพืช');
  const profitEl = document.getElementById('rpt-profit');
  if (profitEl) profitEl.style.color = profit >= 0 ? 'var(--green-700)' : '#ef4444';

  // ── Main chart: Revenue vs Cost ──
  let chartLabels, revData, costData;
  if (isYear) {
    chartLabels = _rptMonthLabels(period);
    revData  = chartLabels.map(m => salesData.filter(s=>s.date&&s.date.startsWith(m)).reduce((s,i)=>s+i.total,0));
    costData = chartLabels.map(m => reqItems.filter(r=>r.date&&r.date.startsWith(m)).reduce((s,i)=>s+(i.totalCost||0),0));
    chartLabels = chartLabels.map(_rptMonthShort);
  } else {
    // group by day within month
    const days = [...new Set(sales.map(s=>s.date))].sort();
    chartLabels = days.map(d => d.slice(8)); // day number
    revData  = days.map(d => sales.filter(s=>s.date===d).reduce((s,i)=>s+i.total,0));
    costData = days.map(d => costs.filter(r=>r.date===d).reduce((s,i)=>s+(i.totalCost||0),0));
  }
  const periodLabel = isYear
    ? `ปี พ.ศ. ${parseInt(period)+543}`
    : new Date(period+'-01').toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  set('rpt-chart-title', '📈 รายได้ vs ต้นทุน — ' + periodLabel);
  set('rpt-chart-sub',   `รายได้รวม ${revenue.toLocaleString('th-TH')} ฿ · ต้นทุน ${cost.toLocaleString('th-TH')} ฿`);

  const legEl = document.getElementById('rpt-main-legend');
  if (legEl) legEl.innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:${GREEN}"></div>รายได้</div>
    <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>ต้นทุนวัสดุ</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>กำไรสุทธิ</div>`;

  if (_rptMainChartInst) _rptMainChartInst.destroy();
  const mc = document.getElementById('rptMainChart');
  if (mc) {
    const isLine = _rptChartType === 'line';
    const profitData = revData.map((r,i) => r - costData[i]);
    _rptMainChartInst = new Chart(mc, {
      type: isLine ? 'line' : 'bar',
      data: { labels: chartLabels, datasets: [
        { label:'รายได้', data:revData,   backgroundColor:isLine?GREEN+'33':GREEN+'cc',   borderColor:GREEN,      borderWidth:isLine?2:0, borderRadius:3, pointBackgroundColor:GREEN,      pointRadius:isLine?3:0, fill:false, tension:.35 },
        { label:'ต้นทุน', data:costData,  backgroundColor:isLine?'#ef444433':'#ef4444cc', borderColor:'#ef4444',  borderWidth:isLine?2:0, borderRadius:3, pointBackgroundColor:'#ef4444',  pointRadius:isLine?3:0, fill:false, tension:.35 },
        { label:'กำไร',   data:profitData,backgroundColor:isLine?'#f59e0b33':'#f59e0bcc', borderColor:'#f59e0b',  borderWidth:isLine?2:0, borderRadius:3, pointBackgroundColor:'#f59e0b',  pointRadius:isLine?3:0, fill:false, tension:.35, type:isLine?'line':'bar' },
      ]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} },
        scales:{ x:{grid:{display:false},ticks:{font:{family:'Sarabun'}}},
                 y:{grid:{color:'#eee'},ticks:{callback:v=>v>=1000?(v/1000).toFixed(0)+'k':v,font:{family:'Sarabun'}}} }}
    });
  }

  // ── Top crops ──
  const byProduct = {};
  sales.forEach(s => {
    if (!byProduct[s.product]) byProduct[s.product] = { rev:0, weight:0 };
    byProduct[s.product].rev    += s.total;
    byProduct[s.product].weight += (s.weight||0);
  });
  const topList = Object.entries(byProduct).sort((a,b)=>b[1].rev-a[1].rev);
  set('rpt-top-sub', topList.length + ' ชนิด · เรียงตามรายได้');
  const tbody = document.getElementById('rpt-top-crops-body');
  if (tbody) {
    const maxRev = topList[0]?.[1].rev || 1;
    tbody.innerHTML = topList.map(([prod,d],i) => {
      const ppk = d.weight>0 ? (d.rev/d.weight).toFixed(0) : '—';
      const bar = `<div style="width:${Math.round(d.rev/maxRev*100)}%;height:3px;background:${CHART_COLORS[i%CHART_COLORS.length]};border-radius:2px;margin-top:2px;"></div>`;
      return `<tr>
        <td style="color:var(--gray-400);font-size:11px;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
        <td><div style="font-size:12px;font-weight:600;">${prod}</div>${bar}</td>
        <td style="text-align:right;font-size:12px;">${d.weight.toLocaleString('th-TH')}</td>
        <td style="text-align:right;font-size:12px;font-weight:600;color:var(--green-700);">${d.rev.toLocaleString('th-TH')}</td>
        <td style="text-align:right;font-size:12px;color:var(--gray-500);">${ppk}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:16px;">ไม่มีข้อมูล</td></tr>';
  }

  // ── Channel chart ──
  const byChannel = {};
  sales.forEach(s => { byChannel[s.channel]=(byChannel[s.channel]||0)+s.total; });
  const chLabels = Object.keys(byChannel), chData = Object.values(byChannel);
  const chColors = chLabels.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]);
  const chTotal  = chData.reduce((s,v)=>s+v,0);
  const chLeg = document.getElementById('rpt-channel-legend');
  if (chLeg) chLeg.innerHTML = chLabels.map((l,i)=>{
    const pct = chTotal?Math.round(chData[i]/chTotal*100):0;
    return `<div class="legend-item"><div class="legend-dot" style="background:${chColors[i]}"></div>${l} ${pct}%</div>`;
  }).join('');
  set('rpt-channel-sub', chTotal.toLocaleString('th-TH') + ' ฿ · ' + chLabels.length + ' ช่องทาง');
  if (_rptChannelChartInst) _rptChannelChartInst.destroy();
  const cc = document.getElementById('rptChannelChart');
  if (cc) _rptChannelChartInst = new Chart(cc,{
    type:'doughnut',
    data:{labels:chLabels,datasets:[{data:chData,backgroundColor:chColors.map(c=>c+'cc'),borderColor:chColors,borderWidth:1}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'60%'}
  });
  const chTbl = document.getElementById('rpt-channel-table');
  if (chTbl) chTbl.innerHTML = chLabels.map((l,i)=>`
    <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--gray-50);">
      <span style="color:var(--gray-600);">${l}</span>
      <span style="font-weight:600;">${chData[i].toLocaleString('th-TH')} ฿</span>
    </div>`).join('');

  // ── YoY comparison ──
  const yoyCard = document.getElementById('rpt-yoy-card');
  if (yoyCard) yoyCard.style.display = yoy ? '' : 'none';
  if (yoy) _renderYoyChart(period, isYear);

  // ── Breakdown table ──
  set('rpt-table-title', isYear ? '📋 รายละเอียดรายเดือน' : '📋 รายการขายในช่วงนี้');
  _renderBreakdownTable(sales, costs, isYear);
}

export function _renderYoyChart(period, isYear) {
  const curYear  = parseInt(period.slice(0,4));
  const prevYear = curYear - 1;
  const months   = Array.from({length:12},(_,i)=>i+1);
  const mLabels  = months.map(m => new Date(curYear,m-1,1).toLocaleDateString('th-TH',{month:'short'}));

  const revCur  = months.map(m => salesData.filter(s=>s.date&&s.date.startsWith(`${curYear}-${String(m).padStart(2,'0')}`)).reduce((s,i)=>s+i.total,0));
  const revPrev = months.map(m => salesData.filter(s=>s.date&&s.date.startsWith(`${prevYear}-${String(m).padStart(2,'0')}`)).reduce((s,i)=>s+i.total,0));

  const totalCur  = revCur.reduce((s,v)=>s+v,0);
  const totalPrev = revPrev.reduce((s,v)=>s+v,0);
  const pctChange = totalPrev > 0 ? Math.round((totalCur-totalPrev)/totalPrev*100) : null;

  const legEl = document.getElementById('rpt-yoy-legend');
  if (legEl) legEl.innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:${GREEN}"></div>พ.ศ. ${curYear+543} (${totalCur.toLocaleString('th-TH')} ฿)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#94a3b8"></div>พ.ศ. ${prevYear+543} (${totalPrev.toLocaleString('th-TH')} ฿)</div>
    ${pctChange!==null?`<div class="legend-item" style="margin-left:auto;font-size:12px;font-weight:600;color:${pctChange>=0?'var(--green-700)':'#ef4444'}">${pctChange>=0?'▲':'▼'} ${Math.abs(pctChange)}% vs ปีก่อน</div>`:''}`;

  const sub = `ปี พ.ศ. ${curYear+543} vs ${prevYear+543}`;
  document.getElementById('rpt-yoy-sub').textContent = sub;

  if (_rptYoyChartInst) _rptYoyChartInst.destroy();
  const yc = document.getElementById('rptYoyChart');
  if (!yc) return;
  _rptYoyChartInst = new Chart(yc,{
    type:'bar',
    data:{labels:mLabels, datasets:[
      { label:`พ.ศ. ${curYear+543}`,  data:revCur,  backgroundColor:GREEN+'cc',  borderRadius:3 },
      { label:`พ.ศ. ${prevYear+543}`, data:revPrev, backgroundColor:'#94a3b8cc', borderRadius:3 },
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{grid:{display:false},ticks:{font:{family:'Sarabun'}}},
              y:{grid:{color:'#eee'},ticks:{callback:v=>v>=1000?(v/1000).toFixed(0)+'k':v,font:{family:'Sarabun'}}}}}
  });
}

export function _renderBreakdownTable(sales, costs, isYear) {
  const head = document.getElementById('rpt-breakdown-head');
  const body = document.getElementById('rpt-breakdown-body');
  if (!head || !body) return;

  if (isYear) {
    head.innerHTML = '<tr><th>เดือน</th><th style="text-align:right">รายได้ (฿)</th><th style="text-align:right">ต้นทุน (฿)</th><th style="text-align:right">กำไร (฿)</th><th style="text-align:right">น้ำหนัก (กก.)</th><th style="text-align:right">รายการ</th></tr>';
    const year = document.getElementById('rpt-period-sel')?.value || '';
    const rows = _rptMonthLabels(year).map(m => {
      const ms = salesData.filter(s=>s.date&&s.date.startsWith(m));
      const mc = reqItems.filter(r=>r.date&&r.date.startsWith(m));
      const rev = ms.reduce((s,i)=>s+i.total,0);
      const cst = mc.reduce((s,i)=>s+(i.totalCost||0),0);
      const wt  = ms.reduce((s,i)=>s+(i.weight||0),0);
      return {m, rev, cst, profit:rev-cst, wt, cnt:ms.length};
    }).filter(r => r.rev > 0 || r.cst > 0);
    body.innerHTML = rows.map(r => {
      const label = new Date(r.m+'-01').toLocaleDateString('th-TH',{month:'long'});
      const pc = r.profit >= 0 ? 'var(--green-700)' : '#ef4444';
      return `<tr>
        <td style="font-size:12px;">${label}</td>
        <td style="text-align:right;font-size:12px;font-weight:600;">${r.rev.toLocaleString('th-TH')}</td>
        <td style="text-align:right;font-size:12px;color:#ef4444;">${r.cst.toLocaleString('th-TH')}</td>
        <td style="text-align:right;font-size:12px;font-weight:600;color:${pc};">${r.profit.toLocaleString('th-TH')}</td>
        <td style="text-align:right;font-size:12px;">${r.wt.toLocaleString('th-TH')}</td>
        <td style="text-align:right;font-size:12px;color:var(--gray-400);">${r.cnt}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:16px;">ไม่มีข้อมูล</td></tr>';
  } else {
    head.innerHTML = '<tr><th>วันที่</th><th>สินค้า</th><th>ลูกค้า</th><th>ช่องทาง</th><th style="text-align:right">กก.</th><th style="text-align:right">฿/กก.</th><th style="text-align:right">รวม (฿)</th></tr>';
    body.innerHTML = [...sales].sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`
      <tr>
        <td style="font-size:12px;">${fmtDate(s.date)}</td>
        <td style="font-size:12px;font-weight:500;">${s.product}</td>
        <td style="font-size:12px;">${s.customer}</td>
        <td style="font-size:12px;">${s.channel}</td>
        <td style="text-align:right;font-size:12px;">${s.weight}</td>
        <td style="text-align:right;font-size:12px;color:var(--gray-400);">${s.price}</td>
        <td style="text-align:right;font-size:12px;font-weight:600;">${s.total.toLocaleString('th-TH')}</td>
      </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:16px;">ไม่มีข้อมูล</td></tr>';
  }
}

// ── Export PDF ──
export function exportReportPDF() {
  const sel     = document.getElementById('rpt-period-sel');
  const period  = sel?.value || '';
  const isYear  = _rptTab === 'year';
  const { sales, costs } = _rptFilterData(period);
  const revenue = sales.reduce((s,i)=>s+i.total,0);
  const cost    = costs.reduce((s,i)=>s+(i.totalCost||0),0);
  const profit  = revenue - cost;
  const weight  = sales.reduce((s,i)=>s+(i.weight||0),0);
  const margin  = revenue>0 ? Math.round(profit/revenue*100) : 0;

  const byProduct = {};
  sales.forEach(s => {
    if (!byProduct[s.product]) byProduct[s.product]={rev:0,weight:0};
    byProduct[s.product].rev    += s.total;
    byProduct[s.product].weight += (s.weight||0);
  });
  const topList = Object.entries(byProduct).sort((a,b)=>b[1].rev-a[1].rev);

  const periodLabel = isYear
    ? `ปี พ.ศ. ${parseInt(period)+543}`
    : new Date(period+'-01').toLocaleDateString('th-TH',{month:'long',year:'numeric'});

  const monthRows = isYear ? _rptMonthLabels(period).map(m=>{
    const ms=salesData.filter(s=>s.date&&s.date.startsWith(m));
    const mc=reqItems.filter(r=>r.date&&r.date.startsWith(m));
    const rev=ms.reduce((s,i)=>s+i.total,0);
    const cst=mc.reduce((s,i)=>s+(i.totalCost||0),0);
    const wt=ms.reduce((s,i)=>s+(i.weight||0),0);
    if(!rev&&!cst) return '';
    return `<tr><td>${new Date(m+'-01').toLocaleDateString('th-TH',{month:'long'})}</td><td class="num">${rev.toLocaleString('th-TH')}</td><td class="num" style="color:#e04040">${cst.toLocaleString('th-TH')}</td><td class="num" style="color:${rev-cst>=0?'#16a34a':'#e04040'};font-weight:700">${(rev-cst).toLocaleString('th-TH')}</td><td class="num">${wt.toLocaleString('th-TH')}</td></tr>`;
  }).join('') : '';

  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">
<title>รายงาน ${periodLabel} — ${farmSettings.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'Sarabun',sans-serif; font-size:13px; color:#1a2e1a; padding:28px; }
h1  { font-size:20px; font-weight:700; color:#2d5a27; }
h2  { font-size:14px; font-weight:700; color:#2d5a27; margin:18px 0 8px; border-bottom:2px solid #e8f0e8; padding-bottom:4px; }
.meta { font-size:11px; color:#6b7280; margin-top:2px; }
.kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:14px 0; }
.kpi { background:#f0f7ee; border-radius:8px; padding:12px; border-left:3px solid #2d5a27; }
.kpi-label { font-size:10px; color:#6b7280; }
.kpi-value { font-size:18px; font-weight:700; color:#2d5a27; margin-top:2px; }
table { width:100%; border-collapse:collapse; font-size:12px; }
th    { background:#f0f7ee; color:#2d5a27; font-weight:700; padding:7px 10px; text-align:left; border-bottom:2px solid #c8e6c0; }
td    { padding:6px 10px; border-bottom:1px solid #eee; }
tr:nth-child(even) td { background:#f9fafb; }
.num  { text-align:right; }
.medal { font-size:14px; }
.footer { margin-top:24px; font-size:10px; color:#9ca3af; text-align:center; border-top:1px solid #eee; padding-top:10px; }
@media print {
  body { padding:12px; }
  .no-print { display:none; }
}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
<div>
  <h1>📊 รายงานสรุป${isYear?'รายปี':'รายเดือน'}</h1>
  <div class="meta">ฟาร์ม: ${farmSettings.name} · ${farmSettings.location} · ช่วง: ${periodLabel}</div>
  <div class="meta">พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})}</div>
</div>
</div>

<div class="kpi-grid">
<div class="kpi"><div class="kpi-label">รายได้รวม</div><div class="kpi-value">${revenue.toLocaleString('th-TH')} ฿</div></div>
<div class="kpi" style="border-color:#ef4444"><div class="kpi-label">ต้นทุนวัสดุ</div><div class="kpi-value" style="color:#ef4444">${cost.toLocaleString('th-TH')} ฿</div></div>
<div class="kpi" style="border-color:${profit>=0?'#16a34a':'#ef4444'}"><div class="kpi-label">กำไรสุทธิ</div><div class="kpi-value" style="color:${profit>=0?'#16a34a':'#ef4444'}">${profit.toLocaleString('th-TH')} ฿</div></div>
<div class="kpi" style="border-color:#3b82f6"><div class="kpi-label">Margin / น้ำหนักรวม</div><div class="kpi-value" style="color:#3b82f6">${margin}% · ${weight.toLocaleString('th-TH')} กก.</div></div>
</div>

<h2>🏆 พืชทำเงินสูงสุด</h2>
<table>
<thead><tr><th>#</th><th>ชนิดพืช</th><th class="num">น้ำหนัก (กก.)</th><th class="num">รายได้ (฿)</th><th class="num">ต้นทุนต่อกิโล (฿)</th><th class="num">% ของรายได้รวม</th></tr></thead>
<tbody>
${topList.map(([prod,d],i)=>{
const ppk = d.weight>0?(d.rev/d.weight).toFixed(0):'—';
const pct = revenue>0?Math.round(d.rev/revenue*100):0;
const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
return `<tr><td class="medal">${medal}</td><td><strong>${prod}</strong></td><td class="num">${d.weight.toLocaleString('th-TH')}</td><td class="num" style="font-weight:700;color:#2d5a27">${d.rev.toLocaleString('th-TH')}</td><td class="num">${ppk}</td><td class="num">${pct}%</td></tr>`;
}).join('')}
</tbody>
</table>

${isYear ? `<h2>📅 สรุปรายเดือน</h2>
<table>
<thead><tr><th>เดือน</th><th class="num">รายได้ (฿)</th><th class="num">ต้นทุน (฿)</th><th class="num">กำไร (฿)</th><th class="num">น้ำหนัก (กก.)</th></tr></thead>
<tbody>${monthRows}</tbody>
</table>` : ''}

<h2>📋 รายการขายทั้งหมด (${sales.length} รายการ)</h2>
<table>
<thead><tr><th>วันที่</th><th>สินค้า</th><th>ลูกค้า</th><th>ช่องทาง</th><th class="num">กก.</th><th class="num">฿/กก.</th><th class="num">รวม (฿)</th></tr></thead>
<tbody>
${[...sales].sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<tr><td>${fmtDate(s.date)}</td><td>${s.product}</td><td>${s.customer}</td><td>${s.channel}</td><td class="num">${s.weight}</td><td class="num">${s.price}</td><td class="num" style="font-weight:600">${s.total.toLocaleString('th-TH')}</td></tr>`).join('')}
<tr style="background:#f0f7ee;font-weight:700"><td colspan="4">รวม</td><td class="num">${weight.toLocaleString('th-TH')}</td><td></td><td class="num">${revenue.toLocaleString('th-TH')}</td></tr>
</tbody>
</table>

<div class="footer">รายงานนี้สร้างโดยระบบจัดการฟาร์ม "${farmSettings.name}" · ${new Date().toLocaleString('th-TH')}</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`;

  const w = window.open('','_blank','width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); }
}

// ── Export Excel ──
export function exportReportExcel() {
  const sel = document.getElementById('rpt-period-sel');
  const period = sel?.value || '';
  const isYear = _rptTab === 'year';
  const { sales } = _rptFilterData(period);
  const wb = XLSX.utils.book_new();
  const rows = [['วันที่','สินค้า','ลูกค้า','ช่องทาง','น้ำหนัก (กก.)','ราคา/กก.','รวม (฿)','ชำระ']];
  sales.forEach(s => rows.push([s.date,s.product,s.customer,s.channel,s.weight,s.price,s.total,s.payment]));
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'ยอดขาย');
  XLSX.writeFile(wb, `รายงาน_${period}_${farmSettings.name}.xlsx`);
}

// ============================================================
// ===== PLANNING SYSTEM =====
