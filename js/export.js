import { invStatus, produceStatus } from './inventory.js';
import { exportData } from './settings.js';
import { actItems, calEvents, cropItems, custItems, farmSettings, invItems, projectItems, reqItems, salesData } from './state.js';
import { closeModal, showToast } from './ui.js';
import { dateStr } from './utils.js';

// ============================================================

const _exportMeta = {
  crops: {
    title: 'ข้อมูลพืชผล',
    headers: ['ชื่อพืชผล','ชนิด','แปลง','วันปลูก','วันเก็บเกี่ยว','พื้นที่ (ไร่)','สถานะ','ผลผลิตคาด (กก.)','ผลผลิตรวม (กก.)'],
    rows: () => cropItems.map(c => [
      c.name, c.cropType||'', c.plot, c.planted, c.harvest, c.area, c.status,
      c.yieldEst||0,
      (c.harvestLog||[]).reduce((s,e)=>s+e.weight,0) || (c.yieldActual||0)
    ])
  },
  activities: {
    title: 'บันทึกกิจกรรม',
    headers: ['วันที่','ประเภทกิจกรรม','แปลง','ผู้ดำเนินการ','วัสดุที่ใช้','หมายเหตุ'],
    rows: () => [...actItems].sort((a,b)=>b.date.localeCompare(a.date))
      .map(a => [a.date, a.type, a.plot, a.person, a.material||'', a.note||''])
  },
  sales: {
    title: 'บันทึกการขาย',
    headers: ['วันที่','สินค้า','ลูกค้า','ช่องทาง','น้ำหนัก (กก.)','ราคา/กก. (฿)','รวม (฿)','การชำระ'],
    rows: () => [...salesData].sort((a,b)=>b.date.localeCompare(a.date))
      .map(s => [s.date, s.product, s.customer, s.channel, s.weight, s.price, s.total, s.payment])
  },
  customers: {
    title: 'รายชื่อลูกค้า',
    headers: ['ชื่อ/ร้าน','ประเภท','ติดต่อ','สินค้าที่สั่ง','ยอดซื้อรวม (฿)','สั่งล่าสุด'],
    rows: () => custItems.map(c => [c.name, c.type, c.contact, c.products, c.total, c.lastOrder])
  },
  produce: {
    title: 'ผลผลิตในคลัง',
    headers: ['ชื่อผลผลิต','Crop','คงเหลือ (กก.)','ราคา/กก. (฿)','วันเข้าคลัง','อายุไข (วัน)','สถานะ'],
    rows: () => invItems.filter(i=>i.cat==='ผลผลิต')
      .sort((a,b)=>(b.harvestDate||'').localeCompare(a.harvestDate||''))
      .map(i => {
        const st = produceStatus(i);
        return [i.name, i.lot||'', i.qty, i.price||0, i.harvestDate||'', i.shelfLife||'', st.label];
      })
  },
  supply: {
    title: 'คลังวัสดุ',
    headers: ['รายการ','หมวดหมู่','คงเหลือ','หน่วย','ราคาต่อหน่วย (฿)','ราคารวม (฿)','สั่งซื้อล่าสุด','สถานะ'],
    rows: () => invItems.filter(i=>i.cat!=='ผลผลิต')
      .map(i => { const st=invStatus(i); return [i.name, i.cat, i.qty, i.unit, i.price, i.qty*(i.price||0), i.lastOrder, st.label]; })
  },
  calendar: {
    title: 'ปฏิทินกิจกรรม',
    headers: ['หัวข้อ','วันเริ่ม','วันสิ้นสุด','หมวดหมู่','ความสำคัญ','รายละเอียด'],
    rows: () => [...calEvents].sort((a,b)=>b.start.localeCompare(a.start))
      .map(e => [e.title, e.start, e.end||e.start, e.cat||'', e.priority||'', e.note||''])
  },
  requisitions: {
    title: 'ประวัติการเบิกวัสดุ',
    headers: ['วันที่เบิก','รายการวัสดุ','จำนวน','หน่วย','ผู้เบิก','วัตถุประสงค์','หมายเหตุ','มูลค่า (฿)'],
    rows: () => [...reqItems].sort((a,b)=>b.date.localeCompare(a.date))
      .map(r => [r.date, r.itemName, r.qty, r.unit, r.person, r.purpose||'', r.note||'', r.totalCost||0])
  },
  projects: {
    title: 'จัดการโครงการ',
    headers: ['ชื่อโครงการ','สถานะ','ความคืบหน้า (%)','วันเริ่ม','วันเสร็จ','งบประมาณ (฿)','ใช้ไป (฿)','ทีมงาน','ผลสรุป'],
    rows: () => projectItems.map(p => [
      p.name, p.status, p.pct, p.start||'', p.end||'',
      p.budget||0, p.spent||0, (p.team||[]).join(', '), p.result||''
    ])
  }
};

// ============================================================
// ===== EXPORT SYSTEM — row checkbox selection =====
// ============================================================
let _exportTarget   = '';
let _exportAllRows  = []; // all rows after date filter
let _exportSelRows  = []; // indices of selected rows (empty = all selected)

export function openExportModal(target) {
  _exportTarget  = target;
  _exportSelRows = [];
  const meta = _exportMeta[target];
  if (!meta) return;
  document.getElementById('export-modal-title').textContent = '📤 Export ' + meta.title;
  // Show/hide calendar print button
  const calBtn = document.getElementById('export-btn-calendar');
  if (calBtn) calBtn.style.display = target === 'calendar' ? 'flex' : 'none';
  // Reset date range
  document.getElementById('export-date-from').value = '';
  document.getElementById('export-date-to').value   = '';
  _rebuildExportRows();
  document.getElementById('modal-export').classList.add('open');
}

export function _rebuildExportRows() {
  const meta = _exportMeta[_exportTarget];
  if (!meta) return;
  const from = document.getElementById('export-date-from')?.value || '';
  const to   = document.getElementById('export-date-to')?.value   || '';
  let rows   = meta.rows();
  const dateTargets = ['activities','sales','calendar','crops'];
  if ((from || to) && dateTargets.includes(_exportTarget)) {
    rows = rows.filter(r => {
      const d = String(r[0] || '');
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  }
  _exportAllRows = rows;

  // Render row list with checkboxes
  const listEl = document.getElementById('export-row-list');
  if (!listEl) return;
  if (rows.length === 0) {
    listEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--gray-400);font-size:13px;">ไม่มีข้อมูล</div>';
    _updateExportCountLabel();
    return;
  }

  // Determine key columns to display per section
  const colMap = {
    crops:       [0,1,5],   // ชื่อ, ชนิด, สถานะ
    activities:  [0,1,2],   // วันที่, ประเภท, แปลง
    sales:       [0,1,2,6], // วันที่, สินค้า, ลูกค้า, รวม
    customers:   [0,1,4],   // ชื่อ, ประเภท, ยอด
    produce:     [0,1,2],   // ชื่อ, Crop, คงเหลือ
    supply:      [0,1,2,5], // ชื่อ, หมวด, คงเหลือ, ราคารวม
    calendar:    [0,1,2],   // หัวข้อ, วันเริ่ม, วันสิ้นสุด
    requisitions:[0,1,2,4], // วันที่, รายการ, จำนวน, ผู้เบิก
  };
  const cols = colMap[_exportTarget] || [0, 1];
  const headers = meta.headers;

  listEl.innerHTML = rows.map((r, i) => {
    const preview = cols.map(ci => `<span style="font-size:11px;color:var(--gray-500)">${headers[ci]}:</span> <span style="font-size:12px">${r[ci]??'—'}</span>`).join('  ·  ');
    return `<label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;border-bottom:1px solid var(--gray-100);${i%2===1?'background:var(--gray-50)':''}">
      <input type="checkbox" class="exp-row-chk" data-idx="${i}" checked onchange="_onExportRowChk()">
      <span style="min-width:20px;font-size:11px;color:var(--gray-400);font-weight:600">#${i+1}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${preview}</span>
    </label>`;
  }).join('');

  _updateExportCountLabel();
  document.getElementById('export-chk-all').checked = true;
}

export function _onExportRowChk() {
  const all = [...document.querySelectorAll('.exp-row-chk')];
  const chk = all.filter(c => c.checked);
  document.getElementById('export-chk-all').checked = chk.length === all.length;
  _updateExportCountLabel();
}

export function _exportToggleAll(checked) {
  document.querySelectorAll('.exp-row-chk').forEach(c => c.checked = checked);
  _updateExportCountLabel();
}

export function _updateExportCountLabel() {
  const all = [...document.querySelectorAll('.exp-row-chk')];
  const chk = all.filter(c => c.checked);
  const el  = document.getElementById('export-count-label');
  if (el) el.textContent = `✅ เลือก ${chk.length} / ${all.length} รายการ`;
}

// Get only checked rows for export
export function _getSelectedExportRows() {
  const checked = [...document.querySelectorAll('.exp-row-chk:checked')].map(c => parseInt(c.dataset.idx));
  // If none checked, export all
  if (checked.length === 0) return _exportAllRows;
  return checked.map(i => _exportAllRows[i]);
}

// Legacy compatibility
export function _updateExportCount() { _updateExportCountLabel(); }
export function _getFilteredExportRows(meta) { return _exportAllRows.length ? _exportAllRows : meta.rows(); }

export function _doExport(format) {
  const meta = _exportMeta[_exportTarget];
  if (!meta && format !== 'all') return;
  closeModal('modal-export');
  if (format === 'all') { exportData(); return; }
  // Build meta with only selected rows
  const selRows    = _getSelectedExportRows();
  const selMeta    = { ...meta, rows: () => selRows };
  if (format === 'excel')          _exportExcel(selMeta);
  if (format === 'csv')            _exportCSV(selMeta);
  if (format === 'json')           _exportJSON(selMeta);
  if (format === 'print')          _exportPrint(selMeta);
  if (format === 'blank')          _exportBlank(meta);
  if (format === 'calendar-print') _exportCalendarPrint();
}

// ── Blank Table Export (for manual recording) ──
export function _exportBlank(meta) {
  const now = new Date();
  const dateLabel = now.toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});

  const logoEl  = document.querySelector('.sidebar-logo img');
  const logoSrc = logoEl ? logoEl.src : '';

  const PRIMARY   = '#2d5a27';
  const BORDER    = '#b8d4b4';
  const BG_HEADER = '#f0f7ee';

  // How many blank rows to generate — 20 default, can be more for print
  const BLANK_ROWS = 25;

  const thHTML = meta.headers.map(h =>
    `<th style="background:${PRIMARY};color:#fff;padding:10px 12px;text-align:left;font-size:12px;font-weight:600;white-space:nowrap;border:1px solid #1d4a1a;min-width:80px">${h}</th>`
  ).join('');

  const trHTML = Array.from({length: BLANK_ROWS}, (_, i) =>
    `<tr style="height:32px">
      ${meta.headers.map(() =>
        `<td style="border:1px solid ${BORDER};padding:4px 8px;"></td>`
      ).join('')}
    </tr>`
  ).join('');

  const win = window.open('','_blank','width=1000,height=750');
  win.document.write(`<!DOCTYPE html>
<html lang="th"><head>
<meta charset="UTF-8">
<title>ตารางเปล่า — ${meta.title} — ${farmSettings.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&family=Mitr:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;background:#fff;color:#333;padding:28px 36px;}
@media print{body{padding:12px 18px}.no-print{display:none!important}@page{margin:1.5cm 2cm}}

.rpt-header{display:flex;align-items:center;justify-content:space-between;
  border-bottom:3px solid ${PRIMARY};padding-bottom:12px;margin-bottom:18px}
.hdr-left{display:flex;align-items:center;gap:14px}
.hdr-logo{width:54px;height:54px;border-radius:50%;border:3px solid #5cb85c;object-fit:cover}
.farm-name{font-family:'Mitr',sans-serif;font-size:17px;font-weight:600;color:${PRIMARY}}
.farm-sub{font-size:11px;color:#888;margin-top:2px}
.rpt-title{font-family:'Mitr',sans-serif;font-size:16px;font-weight:600;color:${PRIMARY};
  border-left:4px solid #5cb85c;padding-left:10px;text-align:right}
.rpt-date{font-size:11px;color:#aaa;text-align:right;margin-top:3px}

.meta-row{display:flex;gap:24px;margin-bottom:14px;flex-wrap:wrap}
.meta-field{display:flex;flex-direction:column;gap:4px;min-width:160px}
.meta-label{font-size:10px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.meta-input{border:none;border-bottom:1.5px solid #ccc;padding:3px 0;font-size:13px;
  font-family:'Sarabun',sans-serif;min-width:160px;outline:none}

.table-wrap{overflow-x:auto;border-radius:6px;border:1px solid ${BORDER}}
table{border-collapse:collapse;width:100%}
tbody tr:hover{background:${BG_HEADER}!important}

.print-btn{background:${PRIMARY};color:#fff;border:none;padding:9px 22px;
  border-radius:8px;cursor:pointer;font-family:'Sarabun',sans-serif;font-size:13px;
  font-weight:600;margin-right:8px}
.close-btn{background:#f0f0f0;color:#555;border:none;padding:9px 18px;
  border-radius:8px;cursor:pointer;font-size:13px;font-family:'Sarabun',sans-serif}

.add-rows-btn{background:#f0f7ee;color:${PRIMARY};border:1px solid #c8e0c4;
  padding:7px 16px;border-radius:6px;cursor:pointer;font-size:12px;
  font-family:'Sarabun',sans-serif;margin-top:10px}

.footer{margin-top:20px;padding-top:12px;border-top:1px dashed ${BORDER};
  display:flex;justify-content:space-between;font-size:11px;color:#ccc}

.sign-row{display:flex;gap:40px;margin-top:28px;flex-wrap:wrap}
.sign-box{flex:1;min-width:160px;text-align:center}
.sign-line{border-top:1px solid #999;padding-top:6px;margin-top:40px;font-size:12px;color:#666}
</style>
</head><body>

<div class="no-print" style="margin-bottom:16px">
<button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
<button class="close-btn" onclick="window.close()">✕ ปิด</button>
<button class="add-rows-btn no-print" onclick="addBlankRows(10)">+ เพิ่มแถว 10 แถว</button>
</div>

<!-- Header -->
<div class="rpt-header">
<div class="hdr-left">
  ${logoSrc ? `<img src="${logoSrc}" class="hdr-logo">` : '<div class="hdr-logo" style="background:#f0f7ee;display:flex;align-items:center;justify-content:center;font-size:24px">🌾</div>'}
  <div>
    <div class="farm-name">${farmSettings.name}</div>
    <div class="farm-sub">${farmSettings.location}${farmSettings.area?' · '+farmSettings.area+' ไร่':''}${farmSettings.owner?' · '+farmSettings.owner:''}</div>
  </div>
</div>
<div>
  <div class="rpt-title">📝 ${meta.title} (ตารางบันทึก)</div>
  <div class="rpt-date">วันที่พิมพ์: ${dateLabel}</div>
</div>
</div>

<!-- Meta fields to fill in -->
<div class="meta-row">
<div class="meta-field">
  <span class="meta-label">วันที่บันทึก</span>
  <input class="meta-input no-print" type="date" value="${now.toISOString().split('T')[0]}">
  <div class="print-only" style="border-bottom:1.5px solid #ccc;min-width:160px;height:24px"></div>
</div>
<div class="meta-field">
  <span class="meta-label">ผู้บันทึก</span>
  <input class="meta-input no-print" type="text" placeholder="ชื่อผู้บันทึก">
  <div class="print-only" style="border-bottom:1.5px solid #ccc;min-width:160px;height:24px"></div>
</div>
<div class="meta-field">
  <span class="meta-label">หมายเหตุ</span>
  <input class="meta-input no-print" type="text" placeholder="หมายเหตุเพิ่มเติม">
  <div class="print-only" style="border-bottom:1.5px solid #ccc;min-width:240px;height:24px"></div>
</div>
</div>

<!-- Blank Table -->
<div class="table-wrap">
<table id="blank-table">
  <thead><tr>${thHTML}<th style="background:${PRIMARY};color:#fff;padding:10px 12px;font-size:12px;border:1px solid #1d4a1a;min-width:80px">หมายเหตุ</th></tr></thead>
  <tbody id="blank-tbody">${trHTML}${
    // add note column to each row
    ''
  }</tbody>
</table>
</div>

<button class="add-rows-btn no-print" onclick="addBlankRows(10)" style="margin-top:10px">+ เพิ่มแถว 10 แถว</button>

<!-- Signature row -->
<div class="sign-row" style="margin-top:32px">
<div class="sign-box">
  <div class="sign-line">ผู้บันทึก / Recorder</div>
  <div style="font-size:11px;color:#aaa;margin-top:4px">วันที่ ...................</div>
</div>
<div class="sign-box">
  <div class="sign-line">ผู้ตรวจสอบ / Checker</div>
  <div style="font-size:11px;color:#aaa;margin-top:4px">วันที่ ...................</div>
</div>
<div class="sign-box">
  <div class="sign-line">ผู้อนุมัติ / Approver</div>
  <div style="font-size:11px;color:#aaa;margin-top:4px">วันที่ ...................</div>
</div>
</div>

<!-- Footer -->
<div class="footer">
<span>ระบบจัดการฟาร์ม ${farmSettings.name} · V0.4.5</span>
<span>หน้า 1</span>
</div>

</body></html>`);
  win.document.close();

  // Inject JS via createElement to avoid script-tag-in-template-literal issues
  const s = win.document.createElement('script');
  s.textContent = `
    const BORDER_C   = '${BORDER}';
    const COL_COUNT  = ${meta.headers.length + 1};

    function addBlankRows(n) {
      const tbody = document.getElementById('blank-tbody');
      for (let i = 0; i < n; i++) {
        const tr = document.createElement('tr');
        tr.style.height = '32px';
        for (let c = 0; c < COL_COUNT; c++) {
          const td = document.createElement('td');
          td.style.cssText = 'border:1px solid '+BORDER_C+';padding:4px 8px;';
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
    }

    // Add note column to existing blank rows
    document.querySelectorAll('#blank-tbody tr').forEach(tr => {
      const td = document.createElement('td');
      td.style.cssText = 'border:1px solid '+BORDER_C+';padding:4px 8px;';
      tr.appendChild(td);
    });
  `;
  win.document.body.appendChild(s);
  showToast('📝 เปิดตารางเปล่าสำเร็จ');
}

// ── Excel Export (.xlsx) with formatting ──
export function _exportExcel(meta) {
  if (typeof XLSX === 'undefined') { showToast('⚠️ กำลังโหลด Excel library...'); return; }

  const rows     = meta.rows();
  const now      = new Date();
  const dateStr2 = now.toLocaleDateString('th-TH', {day:'numeric', month:'long', year:'numeric'});
  const wb       = XLSX.utils.book_new();

  // ── Build sheet data ──
  const sheetData = [];

  // Row 1: Farm name (merged)
  sheetData.push([farmSettings.name || 'ฟาร์ม']);
  // Row 2: Location + date
  sheetData.push([`${farmSettings.location || ''}${farmSettings.area ? '  ·  ' + farmSettings.area + ' ไร่' : ''}${farmSettings.owner ? '  ·  ' + farmSettings.owner : ''}`, '', '', '', '', `พิมพ์: ${dateStr2}`]);
  // Row 3: Report title
  sheetData.push([meta.title]);
  // Row 4: Date range (if filtered)
  const fromDate = document.getElementById('export-date-from')?.value;
  const toDate   = document.getElementById('export-date-to')?.value;
  if (fromDate || toDate) {
    sheetData.push([`ช่วงวันที่: ${fromDate||'—'} ถึง ${toDate||'—'}`]);
  } else {
    sheetData.push(['']);
  }
  // Row 5: blank
  sheetData.push(['']);
  // Row 6: headers
  sheetData.push(meta.headers);
  // Rows 7+: data
  rows.forEach(r => sheetData.push(r.map(v => v ?? '')));
  // Blank row after data
  sheetData.push(['']);
  // Summary rows
  if (_exportTarget === 'sales') {
    const totalAmt = rows.reduce((s,r)=>s+(Number(r[6])||0),0);
    const totalKg  = rows.reduce((s,r)=>s+(Number(r[4])||0),0);
    sheetData.push(['', '', '', 'น้ำหนักรวม (กก.)', totalKg, '', '', '']);
    sheetData.push(['', '', '', 'ยอดรวม (฿)', totalAmt, '', '', '']);
  }
  if (_exportTarget === 'supply') {
    const totalVal = rows.reduce((s,r)=>s+(Number(r[5])||0),0); // col 5 = ราคารวม
    sheetData.push(['', '', '', '', '', 'มูลค่าสินค้ารวม (฿)', totalVal, '']);
  }
  sheetData.push(['', `จำนวนทั้งหมด: ${rows.length} รายการ`]);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const colCount = meta.headers.length;

  // ── Column widths ──
  const colWidths = meta.headers.map((h, ci) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[ci] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  ws['!cols'] = colWidths;

  // ── Row heights ──
  ws['!rows'] = [
    { hpt: 28 }, // farm name
    { hpt: 16 }, // subtitle
    { hpt: 22 }, // report title
    { hpt: 14 }, // date range
    { hpt: 8  }, // blank
    { hpt: 20 }, // header row
  ];

  // ── Cell styling helper ──
  const headerRowIdx = (fromDate || toDate) ? 5 : 5; // 0-based row index of header row
  const dataStartRow = headerRowIdx + 1;

  // Style cells using XLSX cell object format
  const GREEN_DARK  = 'FF2D5A27';
  const GREEN_MED   = 'FF3D7A35';
  const GREEN_LIGHT = 'FFD4EDDA';
  const GREEN_ALT   = 'FFF0F7EE';
  const WHITE       = 'FFFFFFFF';
  const GRAY_BG     = 'FFF5F5F5';
  const BORDER_CLR  = 'FFC8E0C4';

  const border = {
    top:    { style:'thin', color:{ rgb: BORDER_CLR } },
    bottom: { style:'thin', color:{ rgb: BORDER_CLR } },
    left:   { style:'thin', color:{ rgb: BORDER_CLR } },
    right:  { style:'thin', color:{ rgb: BORDER_CLR } },
  };

  // Helper: encode cell address
  const cellAddr = (r, c) => XLSX.utils.encode_cell({ r, c });

  // Row 0: Farm name
  const c0 = ws[cellAddr(0, 0)];
  if (c0) Object.assign(c0, {
    s: {
      font:      { bold:true, sz:16, color:{ rgb: GREEN_DARK }, name:'Sarabun' },
      fill:      { fgColor:{ rgb: GREEN_LIGHT } },
      alignment: { horizontal:'left', vertical:'center' },
    }
  });

  // Row 2: Report title
  const c2 = ws[cellAddr(2, 0)];
  if (c2) Object.assign(c2, {
    s: {
      font:      { bold:true, sz:13, color:{ rgb: GREEN_DARK }, name:'Sarabun' },
      fill:      { fgColor:{ rgb: WHITE } },
      alignment: { horizontal:'left', vertical:'center' },
    }
  });

  // Header row
  for (let ci = 0; ci < colCount; ci++) {
    const addr = cellAddr(5, ci);
    const cell = ws[addr];
    if (!cell) continue;
    Object.assign(cell, {
      s: {
        font:      { bold:true, sz:11, color:{ rgb: WHITE }, name:'Sarabun' },
        fill:      { fgColor:{ rgb: GREEN_DARK } },
        alignment: { horizontal:'center', vertical:'center', wrapText:true },
        border,
      }
    });
  }

  // Data rows
  rows.forEach((r, ri) => {
    const rowIdx = dataStartRow + ri;
    const isAlt  = ri % 2 === 1;
    for (let ci = 0; ci < colCount; ci++) {
      const addr = cellAddr(rowIdx, ci);
      const cell = ws[addr];
      if (!cell) { ws[addr] = { v:'', t:'s' }; }
      const c = ws[addr];
      Object.assign(c, {
        s: {
          font:      { sz:11, name:'Sarabun', bold: ci === 0 },
          fill:      { fgColor:{ rgb: isAlt ? GREEN_ALT : WHITE } },
          alignment: { vertical:'center', wrapText:true },
          border,
        }
      });
    }
  });

  // Merges: farm name + subtitle span full width
  const mergeWidth = Math.max(colCount - 1, 0);
  ws['!merges'] = [
    { s:{ r:0, c:0 }, e:{ r:0, c:mergeWidth } }, // farm name
    { s:{ r:2, c:0 }, e:{ r:2, c:mergeWidth } }, // report title
    { s:{ r:3, c:0 }, e:{ r:3, c:mergeWidth } }, // date range
  ];

  XLSX.utils.book_append_sheet(wb, ws, meta.title.substring(0, 31));
  XLSX.writeFile(wb, meta.title + '_' + dateStr + '.xlsx');
  showToast('📗 Export Excel สำเร็จ · ' + rows.length + ' รายการ');
}

// ── Calendar Print Export ──
export function _exportCalendarPrint() {    const fromStr = document.getElementById('export-date-from')?.value;
  const toStr   = document.getElementById('export-date-to')?.value;

  // Determine which months to show
  let events = [...calEvents].sort((a,b)=>a.start.localeCompare(b.start));
  if (fromStr) events = events.filter(e => e.end ? e.end >= fromStr : e.start >= fromStr);
  if (toStr)   events = events.filter(e => e.start <= toStr);

  // Collect all year-months that have events
  const monthSet = new Set();
  events.forEach(e => {
    const d = new Date(e.start);
    monthSet.add(d.getFullYear() + '-' + d.getMonth());
    if (e.end && e.end !== e.start) {
      const d2 = new Date(e.end);
      monthSet.add(d2.getFullYear() + '-' + d2.getMonth());
    }
  });

  // If no events filtered, show current month
  if (monthSet.size === 0) {
    const now = new Date();
    monthSet.add(now.getFullYear() + '-' + now.getMonth());
  }

  // Sort months
  const months = [...monthSet].sort().map(s => {
    const [y, m] = s.split('-').map(Number);
    return { year:y, month:m };
  });

  // Color map for priority/cat
  const COLORS = {
    high:    { bg:'#fee2e2', border:'#ef4444', text:'#991b1b', dot:'#ef4444' },
    medium:  { bg:'#fef9c3', border:'#eab308', text:'#854d0e', dot:'#eab308' },
    normal:  { bg:'#dbeafe', border:'#3b82f6', text:'#1e3a8a', dot:'#3b82f6' },
    farm:    { bg:'#dcfce7', border:'#22c55e', text:'#14532d', dot:'#22c55e' },
    default: { bg:'#f0f7ee', border:'#5cb85c', text:'#2d5a27', dot:'#5cb85c' },
  };
  const getCl = (ev) => COLORS[ev.priority] || COLORS.default;

  const CAT_ICON = {
    'เก็บเกี่ยว':'🌾', 'การปลูก':'🌱', 'บำรุงรักษา':'💧',
    'การขาย':'💰', 'ตรวจสอบ':'🔍', 'ทั่วไป':'📌', 'อื่นๆ':'📅'
  };

  const TH_DAYS = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
  const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

  // Build HTML for each month
  let calendarHTML = '';
  const logoEl  = document.querySelector('.sidebar-logo img');
  const logoSrc = logoEl ? logoEl.src : '';
  const now     = new Date();

  months.forEach(({ year, month }) => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const thYear = year + 543;
    const monthLabel = TH_MONTHS[month] + ' ' + thYear;

    // Build day cells
    let cells = '';
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells += `<td class="cal-cell empty"></td>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents = events.filter(e => e.start <= iso && iso <= (e.end || e.start));
      const isToday = iso === now.toISOString().split('T')[0];
      const isSun = new Date(year, month, d).getDay() === 0;
      const isSat = new Date(year, month, d).getDay() === 6;

      let evHTML = dayEvents.slice(0,3).map(ev => {
        const cl = getCl(ev);
        const icon = CAT_ICON[ev.cat] || '📅';
        return `<div class="cal-event" style="background:${cl.bg};border-left:3px solid ${cl.border};color:${cl.text}">
          ${icon} ${ev.title}
        </div>`;
      }).join('');
      if (dayEvents.length > 3) {
        evHTML += `<div style="font-size:9px;color:#888;text-align:right;margin-top:1px">+${dayEvents.length-3} เพิ่มเติม</div>`;
      }

      cells += `<td class="cal-cell${isToday?' today':''}${isSun?' sunday':''}${isSat?' saturday':''}">
        <div class="cal-day-num">${d}</div>
        <div class="cal-events-wrap">${evHTML}</div>
      </td>`;
    }
    // Fill remaining cells
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remaining; i++) cells += `<td class="cal-cell empty"></td>`;

    // Wrap into weeks
    const allCells = cells.split('</td>').filter(c => c.trim());
    let rows = '';
    for (let i = 0; i < allCells.length; i += 7) {
      const week = allCells.slice(i, i+7).map(c => c + '</td>').join('');
      rows += `<tr>${week}</tr>`;
    }

    // Month event list
    const monthEvents = events.filter(e => {
      const d = new Date(e.start);
      return d.getFullYear()===year && d.getMonth()===month;
    });
    const eventListHTML = monthEvents.map(ev => {
      const cl = getCl(ev);
      const icon = CAT_ICON[ev.cat] || '📅';
      const dateRange = ev.end && ev.end !== ev.start
        ? `${ev.start} – ${ev.end}` : ev.start;
      return `<div class="ev-list-item" style="border-left:4px solid ${cl.border};background:${cl.bg}">
        <div class="ev-list-title">${icon} ${ev.title}</div>
        <div class="ev-list-meta">📅 ${dateRange}${ev.note ? '  ·  ' + ev.note : ''}</div>
      </div>`;
    }).join('');

    calendarHTML += `
      <div class="month-block">
        <div class="month-title">${monthLabel}</div>
        <table class="cal-table">
          <thead><tr>${TH_DAYS.map((d,i) =>
            `<th class="${i===0?'day-sun':i===6?'day-sat':''}">${d}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${monthEvents.length > 0 ? `
        <div class="ev-list-section">
          <div class="ev-list-header">กิจกรรมในเดือนนี้ (${monthEvents.length} รายการ)</div>
          ${eventListHTML}
        </div>` : ''}
      </div>`;
  });

  const win = window.open('','_blank','width=1100,height=850');
  win.document.write(`<!DOCTYPE html>
<html lang="th"><head>
<meta charset="UTF-8">
<title>ปฏิทินกิจกรรม — ${farmSettings.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&family=Mitr:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;background:#fff;color:#333;padding:28px 36px;}
@media print{body{padding:12px 18px}.no-print{display:none!important}@page{margin:1.5cm 2cm}}

/* Header */
.rpt-header{display:flex;align-items:center;justify-content:space-between;
  border-bottom:3px solid #2d5a27;padding-bottom:14px;margin-bottom:20px}
.hdr-left{display:flex;align-items:center;gap:14px}
.hdr-logo{width:58px;height:58px;border-radius:50%;border:3px solid #5cb85c;object-fit:cover}
.farm-name{font-family:'Mitr',sans-serif;font-size:18px;font-weight:600;color:#2d5a27}
.farm-sub{font-size:12px;color:#777;margin-top:2px}
.rpt-title-wrap{text-align:right}
.rpt-title{font-family:'Mitr',sans-serif;font-size:17px;font-weight:600;color:#2d5a27;
  border-left:4px solid #5cb85c;padding-left:10px;margin-bottom:3px}
.rpt-date{font-size:11px;color:#999}

/* Print button */
.print-btn{background:#2d5a27;color:#fff;border:none;padding:9px 22px;
  border-radius:8px;cursor:pointer;font-family:'Sarabun',sans-serif;font-size:13px;
  font-weight:600;margin-bottom:20px;margin-right:8px}
.close-btn{background:#f0f0f0;color:#555;border:none;padding:9px 18px;
  border-radius:8px;cursor:pointer;font-size:13px;font-family:'Sarabun',sans-serif}

/* Month block */
.month-block{margin-bottom:36px;page-break-inside:avoid}
.month-title{font-family:'Mitr',sans-serif;font-size:16px;font-weight:600;
  color:#fff;background:linear-gradient(135deg,#2d5a27,#3d7a35);
  padding:10px 18px;border-radius:8px 8px 0 0;margin-bottom:0}

/* Calendar table */
.cal-table{width:100%;border-collapse:collapse;table-layout:fixed}
.cal-table thead th{background:#f0f7ee;color:#2d5a27;font-size:12px;font-weight:600;
  padding:7px 4px;text-align:center;border:1px solid #c8e0c4}
.day-sun{color:#ef4444!important}
.day-sat{color:#3b82f6!important}
.cal-cell{vertical-align:top;border:1px solid #c8e0c4;padding:4px;
  min-height:80px;background:#fff;width:14.28%}
.cal-cell.empty{background:#fafafa}
.cal-cell.today .cal-day-num{background:#2d5a27;color:#fff;border-radius:50%;
  width:22px;height:22px;display:flex;align-items:center;justify-content:center}
.cal-cell.sunday .cal-day-num{color:#ef4444}
.cal-cell.saturday .cal-day-num{color:#3b82f6}
.cal-day-num{font-size:12px;font-weight:600;margin-bottom:3px;color:#333}
.cal-events-wrap{display:flex;flex-direction:column;gap:2px}
.cal-event{font-size:9.5px;padding:2px 4px;border-radius:3px;
  line-height:1.3;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}

/* Event list */
.ev-list-section{margin-top:12px}
.ev-list-header{font-size:12px;font-weight:600;color:#2d5a27;margin-bottom:8px;
  padding:6px 10px;background:#f0f7ee;border-radius:6px}
.ev-list-item{padding:7px 10px;border-radius:6px;margin-bottom:6px}
.ev-list-title{font-size:13px;font-weight:600;color:#1a1a1a}
.ev-list-meta{font-size:11px;color:#666;margin-top:2px}

/* Legend */
.legend-bar{display:flex;gap:14px;flex-wrap:wrap;padding:10px 14px;
  background:#f0f7ee;border-radius:8px;margin-bottom:20px}
.legend-item{display:flex;align-items:center;gap:6px;font-size:11px}
.legend-dot{width:12px;height:12px;border-radius:50%}
</style>
</head><body>

<div class="no-print" style="margin-bottom:16px">
<button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
<button class="close-btn" onclick="window.close()">✕ ปิด</button>
</div>

<!-- Header -->
<div class="rpt-header">
<div class="hdr-left">
  ${logoSrc ? `<img src="${logoSrc}" class="hdr-logo">` : '<div class="hdr-logo" style="background:#f0f7ee;display:flex;align-items:center;justify-content:center;font-size:26px">🌾</div>'}
  <div>
    <div class="farm-name">${farmSettings.name}</div>
    <div class="farm-sub">${farmSettings.location}${farmSettings.area?' · '+farmSettings.area+' ไร่':''}${farmSettings.owner?' · '+farmSettings.owner:''}</div>
  </div>
</div>
<div class="rpt-title-wrap">
  <div class="rpt-title">📅 ปฏิทินกิจกรรม</div>
  <div class="rpt-date">พิมพ์วันที่ ${now.toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'})} · ${events.length} กิจกรรม</div>
</div>
</div>

<!-- Legend -->
<div class="legend-bar">
<span style="font-size:11px;font-weight:600;color:#555;margin-right:4px">ความสำคัญ:</span>
<div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>สำคัญมาก</div>
<div class="legend-item"><div class="legend-dot" style="background:#eab308"></div>ปานกลาง</div>
<div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>ปกติ</div>
<div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div>งานฟาร์ม</div>
</div>

<!-- Calendar months -->
${calendarHTML}

</body></html>`);
  win.document.close();
  closeModal('modal-export');
}
export function _exportCSV(meta) {
  const escape = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  const rows  = meta.rows();
  const lines = [meta.headers.map(escape).join(',')];
  rows.forEach(r => lines.push(r.map(escape).join(',')));
  // Add BOM for Thai characters in Excel
  const bom  = '\uFEFF';
  const blob = new Blob([bom + lines.join('\r\n')], { type:'text/csv;charset=utf-8;' });
  _downloadBlob(blob, meta.title + '_' + dateStr + '.csv');
  showToast('📊 Export CSV สำเร็จ · ' + rows.length + ' รายการ');
}

// ── JSON Export (single section) ──
export function _exportJSON(meta) {
  const rows   = meta.rows();
  const data   = rows.map(r => Object.fromEntries(meta.headers.map((h,i) => [h, r[i]])));
  const payload = { section: meta.title, exportedAt: new Date().toISOString(), count: rows.length, data };
  const blob   = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  _downloadBlob(blob, meta.title + '_' + dateStr + '.json');
  showToast('🗄️ Export JSON สำเร็จ · ' + rows.length + ' รายการ');
}

// ── Print/PDF Export ──
export function _exportPrint(meta) {
  const rows = meta.rows();
  const now  = new Date();
  const dateLabel = now.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const timeLabel = now.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});

  // Get logo from sidebar img
  const logoEl  = document.querySelector('.sidebar-logo img');
  const logoSrc = logoEl ? logoEl.src : '';

  // Color theme
  const PRIMARY   = '#2d5a27';
  const PRIMARY_L = '#3d7a35';
  const ACCENT    = '#5cb85c';
  const BG_HEADER = '#f0f7ee';
  const ROW_ALT   = '#f7faf5';
  const BORDER    = '#c8e0c4';

  // Table header html
  const thHTML = meta.headers.map(h =>
    `<th style="background:${PRIMARY};color:#fff;padding:10px 12px;text-align:left;font-size:12px;font-weight:600;white-space:nowrap;border:1px solid ${PRIMARY_L}">${h}</th>`
  ).join('');

  // Table row html
  const trHTML = rows.map((r, ri) =>
    `<tr style="background:${ri%2===0?'#fff':ROW_ALT}">
      ${r.map((c,ci) => `<td style="padding:8px 12px;font-size:12px;border:1px solid ${BORDER};color:#333;${ci===0?'font-weight:600':''}">${c??'—'}</td>`).join('')}
    </tr>`
  ).join('');

  // Summary stats
  const totalRows = rows.length;
  let summaryHTML = '';
  if (_exportTarget === 'sales') {
    const totalAmt = rows.reduce((s,r) => s + (Number(r[6])||0), 0);
    const totalKg  = rows.reduce((s,r) => s + (Number(r[4])||0), 0);
    summaryHTML = `
      <div style="display:flex;gap:16px;margin-top:16px;margin-bottom:20px;flex-wrap:wrap;">
        <div style="background:${BG_HEADER};border:1px solid ${BORDER};border-radius:8px;padding:12px 20px;min-width:140px;text-align:center;">
          <div style="font-size:11px;color:#666;margin-bottom:4px">จำนวนรายการ</div>
          <div style="font-size:22px;font-weight:700;color:${PRIMARY};font-family:Mitr,sans-serif">${totalRows}</div>
        </div>
        <div style="background:${BG_HEADER};border:1px solid ${BORDER};border-radius:8px;padding:12px 20px;min-width:140px;text-align:center;">
          <div style="font-size:11px;color:#666;margin-bottom:4px">น้ำหนักรวม (กก.)</div>
          <div style="font-size:22px;font-weight:700;color:${PRIMARY};font-family:Mitr,sans-serif">${totalKg.toLocaleString('th-TH')}</div>
        </div>
        <div style="background:${BG_HEADER};border:1px solid ${BORDER};border-radius:8px;padding:12px 20px;min-width:140px;text-align:center;">
          <div style="font-size:11px;color:#666;margin-bottom:4px">ยอดรวม (฿)</div>
          <div style="font-size:22px;font-weight:700;color:${ACCENT};font-family:Mitr,sans-serif">${totalAmt.toLocaleString('th-TH')}</div>
        </div>
      </div>`;
  } else if (_exportTarget === 'produce' || _exportTarget === 'supply') {
    const totalVal = _exportTarget === 'supply'
      ? rows.reduce((s,r) => s + (Number(r[5])||0), 0)   // col 5 = ราคารวม
      : rows.reduce((s,r) => s + (Number(r[2])||0), 0);   // produce: col 2 = qty
    const valLabel = _exportTarget === 'supply' ? 'มูลค่าสินค้ารวม (฿)' : 'ปริมาณรวม (กก.)';
    summaryHTML = `
      <div style="display:flex;gap:16px;margin-top:16px;margin-bottom:20px;">
        <div style="background:${BG_HEADER};border:1px solid ${BORDER};border-radius:8px;padding:12px 20px;min-width:140px;text-align:center;">
          <div style="font-size:11px;color:#666;margin-bottom:4px">จำนวนรายการ</div>
          <div style="font-size:22px;font-weight:700;color:${PRIMARY};font-family:Mitr,sans-serif">${totalRows}</div>
        </div>
        <div style="background:${BG_HEADER};border:1px solid ${BORDER};border-radius:8px;padding:12px 20px;min-width:140px;text-align:center;">
          <div style="font-size:11px;color:#666;margin-bottom:4px">${valLabel}</div>
          <div style="font-size:22px;font-weight:700;color:${ACCENT};font-family:Mitr,sans-serif">${totalVal.toLocaleString('th-TH')}</div>
        </div>
      </div>`;
  }

  // Date filter label
  const fromDate = document.getElementById('export-date-from')?.value;
  const toDate   = document.getElementById('export-date-to')?.value;
  const dateRangeLabel = (fromDate || toDate)
    ? `<span style="background:${BG_HEADER};border:1px solid ${BORDER};border-radius:20px;padding:3px 12px;font-size:11px;color:${PRIMARY}">
        📅 ${fromDate ? new Date(fromDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—'}
        ถึง
        ${toDate ? new Date(toDate).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '—'}
      </span>` : '';

  const win = window.open('','_blank','width=1000,height=750');
  win.document.write(`<!DOCTYPE html>
<html lang="th"><head>
<meta charset="UTF-8">
<title>${meta.title} — ${farmSettings.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&family=Mitr:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Sarabun',sans-serif; background:#fff; color:#333; padding:32px 40px; }
  @media print {
    body { padding: 16px 24px; }
    .no-print { display:none!important; }
    @page { margin:1.5cm 2cm; }
  }

  /* Header */
  .report-header {
    display:flex; align-items:center; justify-content:space-between;
    border-bottom:3px solid ${PRIMARY}; padding-bottom:16px; margin-bottom:20px;
  }
  .header-left { display:flex; align-items:center; gap:16px; }
  .header-logo {
    width:64px; height:64px; border-radius:50%;
    border:3px solid ${ACCENT}; object-fit:cover;
  }
  .header-logo-placeholder {
    width:64px; height:64px; border-radius:50%;
    background:${BG_HEADER}; border:3px solid ${ACCENT};
    display:flex; align-items:center; justify-content:center;
    font-size:28px;
  }
  .farm-name { font-family:'Mitr',sans-serif; font-size:20px; font-weight:600; color:${PRIMARY}; line-height:1.2; }
  .farm-sub  { font-size:12px; color:#777; margin-top:3px; }
  .header-right { text-align:right; }
  .report-title {
    font-family:'Mitr',sans-serif; font-size:18px; font-weight:600;
    color:${PRIMARY}; border-left:4px solid ${ACCENT}; padding-left:12px; margin-bottom:4px;
  }
  .report-date { font-size:11px; color:#888; }

  /* Info bar */
  .info-bar {
    background:${BG_HEADER}; border:1px solid ${BORDER}; border-radius:8px;
    padding:10px 16px; margin-bottom:8px;
    display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:12px; color:#555;
  }
  .info-bar strong { color:${PRIMARY}; }

  /* Table */
  .table-wrap { overflow-x:auto; margin-top:16px; border-radius:8px; border:1px solid ${BORDER}; }
  table { border-collapse:collapse; width:100%; }
  thead tr th:first-child { border-radius:0; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover { background:${BG_HEADER}!important; }

  /* Total row */
  .total-row td { background:${BG_HEADER}!important; font-weight:600!important; color:${PRIMARY}!important; border-top:2px solid ${BORDER}!important; }

  /* Footer */
  .report-footer {
    margin-top:24px; padding-top:14px; border-top:1px dashed ${BORDER};
    display:flex; justify-content:space-between; align-items:flex-end;
    font-size:11px; color:#aaa;
  }
  .print-btn {
    background:${PRIMARY}; color:#fff; border:none;
    padding:10px 24px; border-radius:8px; cursor:pointer;
    font-family:'Sarabun',sans-serif; font-size:14px; font-weight:600;
    display:flex; align-items:center; gap:8px; box-shadow:0 2px 8px rgba(45,90,39,.3);
  }
  .print-btn:hover { background:${PRIMARY_L}; }
  .print-actions { display:flex; gap:10px; margin-bottom:20px; }
</style>
</head>
<body>

<!-- Print button (hidden on print) -->
<div class="print-actions no-print">
  <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
  <button onclick="window.close()" style="background:#f0f0f0;color:#555;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;font-family:Sarabun,sans-serif">✕ ปิด</button>
</div>

<!-- Header -->
<div class="report-header">
  <div class="header-left">
    ${logoSrc
      ? `<img src="${logoSrc}" class="header-logo" alt="logo">`
      : `<div class="header-logo-placeholder">🌾</div>`}
    <div>
      <div class="farm-name">${farmSettings.name}</div>
      <div class="farm-sub">${farmSettings.location}${farmSettings.area ? ' · ' + farmSettings.area + ' ไร่' : ''}${farmSettings.owner ? ' · ' + farmSettings.owner : ''}</div>
    </div>
  </div>
  <div class="header-right">
    <div class="report-title">${meta.title}</div>
    <div class="report-date">พิมพ์วันที่ ${dateLabel} เวลา ${timeLabel}</div>
  </div>
</div>

<!-- Info bar -->
<div class="info-bar">
  <span>📋 <strong>${totalRows}</strong> รายการ</span>
  ${dateRangeLabel}
  ${farmSettings.desc ? `<span>ℹ️ ${farmSettings.desc}</span>` : ''}
</div>

<!-- Summary stats -->
${summaryHTML}

<!-- Table -->
<div class="table-wrap">
  <table>
    <thead><tr>${thHTML}</tr></thead>
    <tbody>
      ${trHTML}
    </tbody>
  </table>
</div>

<!-- Footer -->
<div class="report-footer">
  <div>ระบบจัดการฟาร์ม ${farmSettings.name} · พิมพ์โดย V0.4.5</div>
  <div>หน้า 1</div>
</div>

</body></html>`);
  win.document.close();
}

export function _downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ============================================================
// ===== SETTINGS =====
