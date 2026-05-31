import { actItems, chartsInit, cropItems, db, salesData, setChartsInit } from './state.js';
import { dateStr } from './utils.js';

// ============================================================
export const GREEN='#5cb85c', AMBER='#e8a820', SKY='#3b8fd4',
      EARTH='#a07850', RED='#e04040',   PURPLE='#7c6fbf',
      TEAL='#2eae8a',  GRAY='#b4b2a9';
export const CHART_COLORS=[GREEN,AMBER,SKY,EARTH,RED,PURPLE,TEAL,'#e07cb0','#5cc8c8'];

export function groupSalesBy(key){const map={};salesData.forEach(s=>{const k=s[key]||'อื่นๆ';map[k]=(map[k]||0)+s.total;});return map;}
export function salesByMonth(){const map={};salesData.forEach(s=>{const lbl=new Date(s.date).toLocaleDateString('th-TH',{month:'short',year:'2-digit'});map[lbl]=(map[lbl]||0)+s.total;});return map;}

// ============================================================
// ===== DASHBOARD CHART (real data) =====
// ============================================================
let revChart;
// ============================================================
// ===== UNIFIED DASHBOARD CHART =====
// ============================================================
let _dashMetric    = 'revenue';
let _dashPeriod    = 'month';
let _dashChartType = 'bar';
let dashMainChartInst = null;

// kept for sales page compatibility
let pieChartInst, weightChartInst, channelChartInst;
let salesMonthChartInst, salesWeightChartInst;
export function initCharts(){ renderDashChart(); setChartsInit(true); }

export function initDashboardChart(){ renderDashChart(); }

export function buildReportCharts(){ renderDashChart(); }

export function setDashPeriod(p) {
  _dashPeriod = p;
  ['day','month','year'].forEach(x => {
    const b = document.getElementById('dcp-' + x);
    if (!b) return;
    b.className  = p === x ? 'btn btn-primary' : 'btn btn-outline';
    b.style.fontSize = '10px'; b.style.padding = '3px 7px';
  });
  renderDashChart();
}

export function setDashChartType(t) {
  _dashChartType = t;
  ['bar','line'].forEach(x => {
    const b = document.getElementById('dct-' + x);
    if (!b) return;
    b.className  = t === x ? 'btn btn-primary' : 'btn btn-outline';
    b.style.fontSize = '10px'; b.style.padding = '3px 7px';
  });
  renderDashChart();
}

export function renderDashChart() {
  const metric  = document.getElementById('dash-chart-metric')?.value || _dashMetric;
  _dashMetric   = metric;
  const isPie   = metric === 'product_pie' || metric === 'channel_pie' || metric === 'crop_status';
  const subEl   = document.getElementById('dash-chart-sub');
  const legEl   = document.getElementById('dash-chart-legend');
  const periodW = document.getElementById('dcp-wrap');
  const typeW   = document.getElementById('dct-wrap');
  if (periodW) periodW.style.display = isPie ? 'none' : '';
  if (typeW)   typeW.style.display   = isPie ? 'none' : '';

  if (dashMainChartInst) { dashMainChartInst.destroy(); dashMainChartInst = null; }
  const ctx = document.getElementById('dashMainChart');
  if (!ctx) return;
  if (legEl) legEl.innerHTML = '';

  // ── PIE / DONUT metrics ──
  if (isPie) {
    let labelsArr, dataArr, title;
    if (metric === 'product_pie') {
      const m = {}; salesData.forEach(s => { m[s.product] = (m[s.product]||0) + s.total; });
      labelsArr = Object.keys(m).sort((a,b)=>m[b]-m[a]).slice(0,8);
      dataArr   = labelsArr.map(k => m[k]);
      title     = 'สินค้าขายดี — รวม ' + dataArr.reduce((s,v)=>s+v,0).toLocaleString('th-TH') + ' ฿';
    } else if (metric === 'channel_pie') {
      const m = {}; salesData.forEach(s => { m[s.channel] = (m[s.channel]||0) + s.total; });
      labelsArr = Object.keys(m);
      dataArr   = labelsArr.map(k => m[k]);
      title     = 'ช่องทางการขาย — รวม ' + dataArr.reduce((s,v)=>s+v,0).toLocaleString('th-TH') + ' ฿';
    } else {
      const m = {}; cropItems.forEach(c => { m[c.status] = (m[c.status]||0) + 1; });
      labelsArr = Object.keys(m);
      dataArr   = labelsArr.map(k => m[k]);
      title     = 'สถานะพืชผล — ' + cropItems.length + ' รายการ';
    }
    const colors = labelsArr.map((_,i) => CHART_COLORS[i % CHART_COLORS.length]);
    if (subEl) subEl.textContent = title;
    if (legEl) legEl.innerHTML   = labelsArr.map((l,i) => `<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div>${l} (${dataArr[i]})</div>`).join('');
    dashMainChartInst = new Chart(ctx, {
      type: _dashChartType === 'line' ? 'doughnut' : (_dashChartType === 'bar' ? 'bar' : 'doughnut'),
      data: { labels: labelsArr, datasets:[{ data: dataArr, backgroundColor: colors.map(c=>c+'cc'), borderColor: colors, borderWidth: 1, borderRadius: 4 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
        scales: _dashChartType === 'bar' ? {
          x:{ grid:{display:false}, ticks:{font:{family:'Sarabun'}} },
          y:{ grid:{color:'#eee'}, ticks:{font:{family:'Sarabun'}} }
        } : {},
        cutout: _dashChartType !== 'bar' ? '60%' : undefined }
    });
    return;
  }

  // ── TIME-SERIES metrics ──
  const labels = _salesSortedLabels(_dashPeriod);
  let datasets = [], yLabel = '';

  if (metric === 'revenue') {
    const m = {}; salesData.forEach(s => { const l = _saleLabel(s.date,_dashPeriod); m[l]=(m[l]||0)+s.total; });
    const data = labels.map(l => m[l]||0);
    const total = data.reduce((s,v)=>s+v,0);
    if (subEl) subEl.textContent = 'รายได้รวม ' + total.toLocaleString('th-TH') + ' ฿';
    yLabel = '฿';
    const isLine = _dashChartType==='line';
    datasets = [{ label:'ยอดขาย', data, backgroundColor: isLine ? GREEN+'33' : GREEN+'cc',
      borderColor: GREEN, borderWidth: isLine?2:0, borderRadius:4,
      pointBackgroundColor:GREEN, pointRadius:isLine?4:0, fill:isLine, tension:.35 }];
  } else if (metric === 'weight') {
    const m = {}; salesData.forEach(s => { const l = _saleLabel(s.date,_dashPeriod); m[l]=(m[l]||0)+(s.weight||0); });
    const data = labels.map(l => m[l]||0);
    const total = data.reduce((s,v)=>s+v,0);
    if (subEl) subEl.textContent = 'น้ำหนักรวม ' + total.toLocaleString('th-TH') + ' กก.';
    yLabel = 'กก.';
    const isLine = _dashChartType==='line';
    datasets = [{ label:'น้ำหนัก', data, backgroundColor: isLine ? '#f59e0b33' : '#f59e0bcc',
      borderColor:'#f59e0b', borderWidth:isLine?2:0, borderRadius:4,
      pointBackgroundColor:'#f59e0b', pointRadius:isLine?4:0, fill:isLine, tension:.35 }];
  } else if (metric === 'activities') {
    const m = {}; actItems.forEach(a => { const l = _saleLabel(a.date,_dashPeriod); m[l]=(m[l]||0)+1; });
    const allLabels = _salesSortedLabels(_dashPeriod); // reuse for acts: build own sorted labels
    const actFirst = {};
    actItems.forEach(a => { const l = _saleLabel(a.date,_dashPeriod); if (!actFirst[l]||a.date<actFirst[l]) actFirst[l]=a.date; });
    const actLabels = Object.keys(actFirst).sort((a,b)=>actFirst[a].localeCompare(actFirst[b]));
    const data = actLabels.map(l => m[l]||0);
    if (subEl) subEl.textContent = actItems.length + ' กิจกรรม · ' + actLabels.length + ' ' + ({day:'วัน',month:'เดือน',year:'ปี'}[_dashPeriod]);
    yLabel = 'ครั้ง';
    const isLine = _dashChartType==='line';
    datasets = [{ label:'กิจกรรม', data, backgroundColor: isLine?'#8b5cf633':'#8b5cf6cc',
      borderColor:'#8b5cf6', borderWidth:isLine?2:0, borderRadius:4,
      pointBackgroundColor:'#8b5cf6', pointRadius:isLine?4:0, fill:isLine, tension:.35 }];
    dashMainChartInst = new Chart(ctx, {
      type: _dashChartType==='line'?'line':'bar',
      data: { labels: actLabels, datasets },
      options:{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{ x:{grid:{display:false},ticks:{font:{family:'Sarabun'},maxRotation:45}},
                 y:{grid:{color:'#eee'},ticks:{callback:v=>v+yLabel,font:{family:'Sarabun'}}} }}
    });
    return;
  }

  dashMainChartInst = new Chart(ctx, {
    type: _dashChartType==='line'?'line':'bar',
    data: { labels, datasets },
    options:{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{ x:{grid:{display:false},ticks:{font:{family:'Sarabun'},maxRotation:45}},
               y:{grid:{color:'#eee'},ticks:{callback:v=>v>=1000?(v/1000).toFixed(1)+'k'+yLabel:v+yLabel,font:{family:'Sarabun'}}} }}
  });
}

// ── Weight-by-crop stacked bar chart (shared by dashboard + sales page) ──
export function _buildWeightChart(canvasId, legendId, subtitleId) {
  // Get all months in sales data (sorted)
  const monthSet = new Set();
  salesData.forEach(s => {
    const lbl = new Date(s.date).toLocaleDateString('th-TH',{month:'short',year:'2-digit'});
    monthSet.add(lbl);
  });
  const months = [...monthSet].sort((a,b) => {
    // Sort by actual date of first sale in that month
    const da = salesData.find(s=>new Date(s.date).toLocaleDateString('th-TH',{month:'short',year:'2-digit'})===a)?.date||'';
    const db = salesData.find(s=>new Date(s.date).toLocaleDateString('th-TH',{month:'short',year:'2-digit'})===b)?.date||'';
    return da.localeCompare(db);
  });

  // Get unique products from sales
  const products = [...new Set(salesData.map(s=>s.product))];

  // Build dataset per product
  const datasets = products.map((prod,i) => {
    const data = months.map(m =>
      salesData.filter(s=>s.product===prod &&
        new Date(s.date).toLocaleDateString('th-TH',{month:'short',year:'2-digit'})===m)
        .reduce((sum,s)=>sum+(s.weight||0),0)
    );
    return { label:prod, data, backgroundColor:CHART_COLORS[i%CHART_COLORS.length]+'cc', borderRadius:2 };
  });

  const totalWeight = salesData.reduce((s,i)=>s+(i.weight||0),0);
  const subEl = document.getElementById(subtitleId);
  if (subEl) subEl.textContent = 'น้ำหนักรวม '+totalWeight.toLocaleString('th-TH')+' กก. · '+products.length+' ชนิด';

  const legEl = document.getElementById(legendId);
  if (legEl) {
    legEl.innerHTML = '';
    products.forEach((p,i) => {
      legEl.innerHTML += `<div class="legend-item"><div class="legend-dot" style="background:${CHART_COLORS[i%CHART_COLORS.length]}"></div>${p}</div>`;
    });
  }

  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  // destroy previous if stored
  if (ctx._chartInst) ctx._chartInst.destroy();
  const inst = new Chart(ctx, {
    type:'bar',
    data:{ labels:months, datasets },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{
        x:{ stacked:true, grid:{display:false}, ticks:{font:{family:'Sarabun'}} },
        y:{ stacked:true, grid:{color:'#eee'}, ticks:{font:{family:'Sarabun'},callback:v=>v+'กก.'} }
      }
    }
  });
  ctx._chartInst = inst;
  return inst;
}

// ── Sales chart state ──
let _scPeriod  = 'month';  // 'day' | 'month' | 'year'
let _scType    = 'bar';    // 'bar' | 'line'
let _scwPeriod = 'month';
let _scwType   = 'bar';

export function setSalesPeriod(p) {
  _scPeriod = p;
  ['day','month','year'].forEach(x => {
    const b = document.getElementById('sc-p-'+x);
    if (b) { b.className = p===x ? 'btn btn-primary' : 'btn btn-outline'; b.style.fontSize='11px'; b.style.padding='4px 9px'; }
  });
  renderSalesCharts();
}
export function setSalesChartType(t) {
  _scType = t;
  ['bar','line'].forEach(x => {
    const b = document.getElementById('sc-t-'+x);
    if (b) { b.className = t===x ? 'btn btn-primary' : 'btn btn-outline'; b.style.fontSize='11px'; b.style.padding='4px 9px'; }
  });
  renderSalesCharts();
}
export function setSalesWPeriod(p) {
  _scwPeriod = p;
  ['day','month','year'].forEach(x => {
    const b = document.getElementById('scw-p-'+x);
    if (b) { b.className = p===x ? 'btn btn-primary' : 'btn btn-outline'; b.style.fontSize='11px'; b.style.padding='4px 9px'; }
  });
  renderSalesCharts();
}
export function setSalesWChartType(t) {
  _scwType = t;
  ['bar','line'].forEach(x => {
    const b = document.getElementById('scw-t-'+x);
    if (b) { b.className = t===x ? 'btn btn-primary' : 'btn btn-outline'; b.style.fontSize='11px'; b.style.padding='4px 9px'; }
  });
  renderSalesCharts();
}

// ── helper: get label for a sale date by period ──
export function _saleLabel(dateStr, period) {
  const d = new Date(dateStr);
  if (period === 'day')   return dateStr;
  if (period === 'year')  return 'ปี ' + (d.getFullYear() + 543);
  return d.toLocaleDateString('th-TH', { month:'short', year:'2-digit' });
}

// ── helper: sorted labels for a period ──
export function _salesSortedLabels(period) {
  const first = {}; // label → first raw date (for sorting)
  salesData.forEach(s => {
    const lbl = _saleLabel(s.date, period);
    if (!first[lbl] || s.date < first[lbl]) first[lbl] = s.date;
  });
  return Object.keys(first).sort((a,b) => first[a].localeCompare(first[b]));
}

export function renderSalesCharts() {
  // ── 1. Populate product selector ──
  const sel = document.getElementById('scw-product');
  if (sel) {
    const currentVal = sel.value;
    const products = [...new Set(salesData.map(s => s.product))].sort();
    sel.innerHTML = '<option value="__all__">🌿 ทุกชนิด</option>' +
      products.map(p => `<option value="${p}">${p}</option>`).join('');
    // restore selection if still valid
    if (products.includes(currentVal)) sel.value = currentVal;
    // disable line toggle when "all" (stacked bar only)
    const isAll = sel.value === '__all__';
    const lineBtn = document.getElementById('scw-t-line');
    if (lineBtn) { lineBtn.disabled = isAll; lineBtn.style.opacity = isAll ? '.4' : '1'; }
    if (isAll && _scwType === 'line') { _scwType = 'bar'; setSalesWChartType('bar'); return; }
  }

  // ── 2. Revenue chart ──
  const labels = _salesSortedLabels(_scPeriod);
  const revenueMap = {};
  salesData.forEach(s => { const l = _saleLabel(s.date, _scPeriod); revenueMap[l] = (revenueMap[l]||0) + s.total; });
  const revData = labels.map(l => revenueMap[l] || 0);
  const totalRev = salesData.reduce((s,i) => s + i.total, 0);
  const subRev = document.getElementById('sales-month-subtitle');
  if (subRev) subRev.textContent = labels.length + ' ' + ({day:'วัน',month:'เดือน',year:'ปี'}[_scPeriod]) + ' · รวม ' + totalRev.toLocaleString('th-TH') + ' ฿';

  if (salesMonthChartInst) salesMonthChartInst.destroy();
  const mc = document.getElementById('salesMonthChart');
  if (mc) {
    const isLine = _scType === 'line';
    salesMonthChartInst = new Chart(mc, {
      type: _scType,
      data: { labels, datasets: [{
        label: 'ยอดขาย (฿)',
        data: revData,
        backgroundColor: isLine ? GREEN + '33' : GREEN + 'cc',
        borderColor: GREEN,
        borderWidth: isLine ? 2 : 0,
        borderRadius: isLine ? 0 : 4,
        pointBackgroundColor: GREEN,
        pointRadius: isLine ? 4 : 0,
        fill: isLine,
        tension: 0.35,
      }]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family:'Sarabun' }, maxRotation: 45 } },
          y: { grid: { color:'#eee' }, ticks: { callback: v => v>=1000?(v/1000).toFixed(1)+'k':v, font:{ family:'Sarabun' } } }
        }
      }
    });
  }

  // ── 3. Weight chart ──
  const wLabels  = _salesSortedLabels(_scwPeriod);
  const selProd  = document.getElementById('scw-product')?.value || '__all__';
  const isAll    = selProd === '__all__';
  const products = isAll ? [...new Set(salesData.map(s => s.product))] : [selProd];
  const legEl    = document.getElementById('sales-weight-legend');
  const subW     = document.getElementById('sales-weight-subtitle');

  const weightMap = {}; // product → { label → weight }
  salesData.forEach(s => {
    const l = _saleLabel(s.date, _scwPeriod);
    if (!weightMap[s.product]) weightMap[s.product] = {};
    weightMap[s.product][l] = (weightMap[s.product][l] || 0) + (s.weight || 0);
  });

  const datasets = products.map((prod, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const data  = wLabels.map(l => weightMap[prod]?.[l] || 0);
    const isLine2 = _scwType === 'line';
    return {
      label: prod, data,
      backgroundColor: isLine2 ? color + '33' : color + 'cc',
      borderColor: color,
      borderWidth: isLine2 ? 2 : 0,
      borderRadius: isLine2 ? 0 : 4,
      pointBackgroundColor: color,
      pointRadius: isLine2 ? 3 : 0,
      fill: isLine2 && !isAll,
      tension: 0.35,
      stack: isAll ? 'stack' : undefined,
    };
  });

  const totalWeight = salesData
    .filter(s => isAll || s.product === selProd)
    .reduce((s,i) => s + (i.weight||0), 0);
  if (subW) subW.textContent = (isAll ? products.length + ' ชนิด' : selProd) + ' · น้ำหนักรวม ' + totalWeight.toLocaleString('th-TH') + ' กก.';

  if (legEl) {
    legEl.innerHTML = isAll
      ? products.map((p,i) => `<div class="legend-item"><div class="legend-dot" style="background:${CHART_COLORS[i%CHART_COLORS.length]}"></div>${p}</div>`).join('')
      : '';
  }

  if (salesWeightChartInst) salesWeightChartInst.destroy();
  const wc = document.getElementById('salesWeightChart');
  if (wc) {
    salesWeightChartInst = new Chart(wc, {
      type: _scwType,
      data: { labels: wLabels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { stacked: isAll, grid: { display: false }, ticks: { font: { family:'Sarabun' }, maxRotation: 45 } },
          y: { stacked: isAll, grid: { color:'#eee' }, ticks: { callback: v => v+'กก.', font:{ family:'Sarabun' } } }
        }
      }
    });
  }
}

// ============================================================
