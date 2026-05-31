import { renderCalendar } from './calendar.js';
import { buildReportCharts, initDashboardChart, renderSalesCharts } from './charts.js';
import { renderActivities, renderCrops } from './crops.js';
import { renderCustomers } from './customers.js';
import { renderDashboard } from './dashboard.js';
import { renderInv } from './inventory.js';
import { renderReqHistory } from './planning.js';
import { renderPlan } from './planningSystem.js';
import { renderProjects } from './projects.js';
import { renderReports } from './reports.js';
import { renderSales } from './salesLink.js';
import { renderSettings } from './settings.js';
import { _currentPage, actRendered, chartsInit, cropRendered, custRendered, invRendered, salesRendered, setActRendered, setChartsInit, setCropRendered, setCurrentPage, setCustRendered, setInvRendered, setSalesRendered } from './state.js';

// ===== INIT DATE =====
const _d = new Date();
document.getElementById('today-date').textContent =
  _d.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

// ===== NAVIGATION =====
export function navigate(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (el) el.classList.add('active');
  const titles = {
    dashboard:'แดชบอร์ด', crops:'ข้อมูลพืชผล',
    activities:'บันทึกกิจกรรม', inventory:'คลังวัสดุ-ผลผลิต',
    sales:'บันทึกการขาย', customers:'ลูกค้า', reports:'รายงาน & วิเคราะห์',
    plan:'วางแผน', projects:'จัดการโครงการ', calendar:'ปฏิทินกิจกรรม', settings:'ตั้งค่า'
  };
  document.getElementById('page-title').textContent = titles[page] || '';
  // ── FAB context ──
  setCurrentPage(page);
  const fab = document.getElementById('fab-btn');
  if (fab) fab.style.display = page === 'settings' ? 'none' : '';
  closeSidebar();
  setBottomNav(page);
  if (page === 'dashboard') { renderDashboard(); setTimeout(() => { initDashboardChart(); buildReportCharts(); setChartsInit(true); }, 150); }
  if (page === 'reports')  { renderReports(); }
  if (page === 'plan')     { renderPlan(); }
  if (page === 'crops'      && !cropRendered)   { renderCrops();      setCropRendered(true); }
  if (page === 'activities' && !actRendered)    { renderActivities(); setActRendered(true); }
  if (page === 'sales'      && !salesRendered)  { renderSales(); setSalesRendered(true); }
  if (page === 'sales')                          { setTimeout(renderSalesCharts, 100); }
  if (page === 'inventory'  && !invRendered)    { renderInv();        setInvRendered(true); }
  if (page === 'inventory')                      { renderReqHistory(); }
  if (page === 'customers'  && !custRendered)   { renderCustomers();  setCustRendered(true); }
  if (page === 'projects')                         { renderProjects(); }
  if (page === 'calendar')                         { renderCalendar(); }
  if (page === 'settings')                         { renderSettings(); }
}

// ===== MOBILE SIDEBAR =====
export function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('open');
}
export function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ===== BOTTOM NAV ACTIVE STATE =====
const bnMap = {
  dashboard:'bn-dashboard', crops:'bn-crops', sales:'bn-sales',
  inventory:'bn-inventory', activities:'bn-crops', customers:'bn-sales',
  projects:'bn-more', calendar:'bn-more'
};
export function setBottomNav(page) {
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  const target = bnMap[page];
  if (target) document.getElementById(target)?.classList.add('active');
}

// ===== MODALS =====
export function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

// ===== TOAST =====
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg || '✅ บันทึกข้อมูลสำเร็จ';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ===== SALE MODAL =====
