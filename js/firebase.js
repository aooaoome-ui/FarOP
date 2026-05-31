import { renderActivities, renderCrops } from './crops.js';
import { renderCustomers } from './customers.js';
import { renderDashboard } from './dashboard.js';
import { buildReportCharts } from './charts.js';
import { renderInv } from './inventory.js';
import { renderProjects } from './projects.js';
import { renderSales } from './salesLink.js';
import { _fbReady, _nextBatchId, _nextCalId, _nextProjId, _nextReqId, _nextSaleId, _nextSeasonId, _nextSoilRestId, _nextTemplateId, _saveTimer, actItems, calEvents, cropItems, custItems, db, farmSettings, goalItems, inputBatches, invItems, nextActId, nextCropId, nextCustId, nextInvId, planTemplates, plotSeasons, projectItems, reqItems, salesData, setDb, setFbReady, setNextActId, setNextBatchId, setNextCalId, setNextCropId, setNextCustId, setNextInvId, setNextProjId, setNextReqId, setNextSaleId, setNextSeasonId, setNextSoilRestId, setNextTemplateId, setPlanTemplates, setSaveTimer, soilRests } from './state.js';

// ============================================================
// วิธีดู config: Firebase Console → Project Settings → Your apps → SDK setup
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCXvbUD9TlLkG99-DiGOeBc6k8AELuMuqs",
  authDomain:        "facefarm-318ee.firebaseapp.com",
  projectId:         "facefarm-318ee",
  storageBucket:     "facefarm-318ee.firebasestorage.app",
  messagingSenderId: "997117081360",
  appId:             "1:997117081360:web:b6875a5a7abe025fa99795"
};

// ============================================================
// ===== SYNC SYSTEM — Firebase + localStorage fallback =====
// ============================================================
const LS_KEY    = 'farmData_v01';
const FARM_ID   = 'farm_main';

// ── Init Firebase ──
export function initFirebase() {
  if (!FIREBASE_CONFIG.apiKey) {
    console.warn('⚠️ ยังไม่ได้ใส่ Firebase Config — ใช้ localStorage แทน');
    _showSyncStatus('local');
    return false;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    setDb(firebase.firestore());
    setFbReady(true);
    _showSyncStatus('cloud');
    console.log('🔥 Firebase พร้อมแล้ว');
    return true;
  } catch(e) {
    console.warn('Firebase init error:', e);
    _showSyncStatus('local');
    return false;
  }
}

// ── Sync status badge ──
export function _showSyncStatus(mode) {
  let el = document.getElementById('sync-badge');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sync-badge';
    el.style.cssText = 'position:fixed;bottom:72px;right:12px;font-size:11px;padding:4px 10px;border-radius:20px;z-index:999;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.15);transition:all .3s';
    document.body.appendChild(el);
  }
  if (mode === 'cloud')  { el.style.background='#e8f5e9'; el.style.color='#2e7d32'; el.textContent='☁️ Cloud Sync'; }
  if (mode === 'local')  { el.style.background='#fff8e1'; el.style.color='#b07a10'; el.textContent='💾 Local Only'; }
  if (mode === 'saving') { el.style.background='#e3f2fd'; el.style.color='#1565c0'; el.textContent='🔄 กำลังบันทึก...'; }
  if (mode === 'saved')  { el.style.background='#e8f5e9'; el.style.color='#2e7d32'; el.textContent='✅ บันทึกแล้ว';
    setTimeout(() => _showSyncStatus(_fbReady ? 'cloud' : 'local'), 2000); }
  if (mode === 'error')  { el.style.background='#fce4ec'; el.style.color='#c62828'; el.textContent='⚠️ บันทึกไม่ได้'; }
}

// ── Pack all data ──
export function _packData() {
  return {
    farmSettings,
    cropItems, nextCropId,
    actItems,  nextActId,
    invItems,  nextInvId,
    custItems, nextCustId,
    salesData, _nextSaleId,
    goalItems,
    calEventsArr: calEvents,
    _nextCalId,
    reqItems,  _nextReqId,
    projectItems, _nextProjId,
    planTemplates, _nextTemplateId,
    plotSeasons,   _nextSeasonId,
    soilRests,     _nextSoilRestId,
    inputBatches,  _nextBatchId,
    savedAt: new Date().toISOString()
  };
}

// ── Apply loaded data ──
export function _applyData(data) {
  if (!data) return;
  if (data.farmSettings) { Object.assign(farmSettings, data.farmSettings); }
  if (data.cropItems)    { cropItems.length=0; data.cropItems.forEach(x=>cropItems.push(x));    setNextCropId(data.nextCropId || nextCropId);  }
  if (data.actItems)     { actItems.length=0; data.actItems.forEach(x=>actItems.push(x));     setNextActId(data.nextActId || nextActId);   }
  if (data.invItems)     { invItems.length=0; data.invItems.forEach(x=>invItems.push(x));     setNextInvId(data.nextInvId || nextInvId);   }
  if (data.custItems)    { custItems.length=0; data.custItems.forEach(x=>custItems.push(x));    setNextCustId(data.nextCustId || nextCustId);  }
  if (data.salesData)    { salesData.length=0; data.salesData.forEach(x=>salesData.push(x));    setNextSaleId(data._nextSaleId || _nextSaleId); }
  if (data.goalItems)    { Object.keys(goalItems).forEach(k=>delete goalItems[k]); Object.assign(goalItems, data.goalItems); }
  if (data.calEventsArr) { calEvents.length=0; data.calEventsArr.forEach(x=>calEvents.push(x)); setNextCalId(data._nextCalId || _nextCalId);  }
  if (data.reqItems)      { reqItems.length=0; data.reqItems.forEach(x=>reqItems.push(x));     setNextReqId(data._nextReqId || _nextReqId);  }
  if (data.projectItems)  { projectItems.length=0; data.projectItems.forEach(x=>projectItems.push(x)); setNextProjId(data._nextProjId || _nextProjId); }
  if (data.plotSeasons)   { plotSeasons.length=0; data.plotSeasons.forEach(x=>plotSeasons.push(x));  setNextSeasonId(data._nextSeasonId || _nextSeasonId); }
  if (data.soilRests)     { soilRests.length=0; data.soilRests.forEach(x=>soilRests.push(x));    setNextSoilRestId(data._nextSoilRestId || _nextSoilRestId); }
  if (data.inputBatches)  { inputBatches.length=0; data.inputBatches.forEach(x=>inputBatches.push(x)); setNextBatchId(data._nextBatchId || _nextBatchId); }
  if (data.planTemplates) { // merge: keep built-in, add user-created
    const userTpls = data.planTemplates.filter(t => t.id >= 10);
    setPlanTemplates([...planTemplates.filter(t=>t.id<10), ...userTpls]);
    setNextTemplateId(data._nextTemplateId || _nextTemplateId);
  }
}

// ── Save (debounced 1.5s) ──
export function saveData() {
  // บันทึก localStorage ทันที (offline backup)
  try { localStorage.setItem(LS_KEY, JSON.stringify(_packData())); } catch(e) {}
  // บันทึก Firebase หลังหยุดพิมพ์ 1.5 วิ
  clearTimeout(_saveTimer);
  _showSyncStatus('saving');
  setSaveTimer(setTimeout(async () => {
    if (!_fbReady) { _showSyncStatus('local'); return; }
    try {
      await db.collection('farms').doc(FARM_ID).set(_packData());
      _showSyncStatus('saved');
    } catch(e) {
      console.warn('Firebase save failed:', e);
      _showSyncStatus('error');
    }
  }, 1500));
}

// ── Load ──
export async function loadData() {
  // ลอง Firebase ก่อน
  if (_fbReady) {
    try {
      const doc = await db.collection('farms').doc(FARM_ID).get();
      if (doc.exists) {
        _applyData(doc.data());
        console.log('☁️ โหลดจาก Firebase สำเร็จ');
        // Real-time listener — sync เมื่ออุปกรณ์อื่นแก้ไข
        db.collection('farms').doc(FARM_ID).onSnapshot(snap => {
          if (snap.exists && !_saveTimer) {
            _applyData(snap.data());
            // Re-render หน้าที่กำลังแสดงอยู่
            const activePage = document.querySelector('.page.active');
            if (activePage) {
              const pid = activePage.id.replace('page-','');
              if (pid==='dashboard')  { renderDashboard(); setTimeout(buildReportCharts,100); }
              if (pid==='crops')      renderCrops();
              if (pid==='activities') renderActivities();
              if (pid==='inventory')  renderInv();
              if (pid==='sales')      renderSales();
              if (pid==='customers')  renderCustomers();
              if (pid==='projects')   renderProjects();
            }
          }
        });
        return;
      }
    } catch(e) { console.warn('Firebase load failed, using localStorage:', e); }
  }
  // Fallback: localStorage
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { _applyData(JSON.parse(raw)); console.log('💾 โหลดจาก localStorage'); }
  } catch(e) {}
}

// ── Clean Mock Data From Existing ──
export function cleanMockDataFromExisting() {
  if (localStorage.getItem('mockDataCleaned_v2')) return;
  
  let changed = false;
  
  const mockCropNames = new Set([
    'ผักคะน้าใบใหญ่', 'มะเขือเทศราชินี', 'ข้าวโพดหวาน', 'พริกแดงใหญ่',
    'กระเทียมโทน', 'ผักบุ้งจีน', 'ฟักทองไทย', 'ตะไคร้หอม', 'ผักชีไทย',
    'ขิงอ่อน', 'ใบมะกรูด', 'มะนาวแป้น', 'ผักกาดขาวปลี', 'หอมแดงพม่า',
    'กระชายเหลือง', 'ผักเคล (Kale)', 'พริกหวานหลากสี', 'ดาวเรืองส้ม',
    'ไพล', 'มะระจีน'
  ]);
  
  // 1. Crops
  const originalCropCount = cropItems.length;
  const userCrops = cropItems.filter(item => !(item.id < 21 && mockCropNames.has(item.name)));
  if (userCrops.length !== originalCropCount) {
    cropItems.length = 0;
    userCrops.forEach(x => cropItems.push(x));
    setNextCropId(Math.max(...cropItems.map(item => item.id), 0) + 1);
    changed = true;
  }
  
  // 2. Activities: Mock activities are those with ID < 37
  const originalActCount = actItems.length;
  const userActs = actItems.filter(item => item.id >= 37);
  if (userActs.length !== originalActCount) {
    actItems.length = 0;
    userActs.forEach(x => actItems.push(x));
    setNextActId(Math.max(...actItems.map(item => item.id), 0) + 1);
    changed = true;
  }
  
  // 3. Customers
  const mockCustNames = new Set([
    'ตลาดสดเช้าลำปาง', 'ร้านอาหารครัวไทย', 'คุณนุ่น (ลูกค้าประจำ)',
    'ออนไลน์ Facebook', 'โรงแรมเวียงลคอร', 'Tops Supermarket ลำปาง',
    'คลินิกสุขภาพธรรมชาติ', 'ร้านก๋วยเตี๋ยวเจ้าเก่า'
  ]);
  const originalCustCount = custItems.length;
  const userCusts = custItems.filter(item => !(item.id < 9 && mockCustNames.has(item.name)));
  if (userCusts.length !== originalCustCount) {
    custItems.length = 0;
    userCusts.forEach(x => custItems.push(x));
    setNextCustId(Math.max(...custItems.map(item => item.id), 0) + 1);
    changed = true;
  }
  
  // 4. Inventory
  const mockInvNames = new Set([
    'ปุ๋ยหมักอินทรีย์', 'น้ำส้มควันไม้', 'เมล็ดพันธุ์ผักคะน้า', 'เมล็ดมะเขือเทศราชินี',
    'ท่อน้ำหยด PE', 'ถุงบรรจุผัก 500g', 'ไม้ค้ำยันมะเขือ', 'น้ำหมักชีวภาพ EM',
    'ตาข่ายกันแมลง', 'เมล็ดพันธุ์ผักบุ้ง', 'ปูนขาวปรับ pH', 'สายยางรด 2 นิ้ว',
    'กล่องกระดาษบรรจุผัก', 'ถุงมือยาง', 'สเปรย์สะเดา'
  ]);
  const originalInvCount = invItems.length;
  const userInvs = invItems.filter(item => !(item.id < 21 && (mockInvNames.has(item.name) || item.cat === 'ผลผลิต')));
  if (userInvs.length !== originalInvCount) {
    invItems.length = 0;
    userInvs.forEach(x => invItems.push(x));
    setNextInvId(Math.max(...invItems.map(item => item.id), 0) + 1);
    changed = true;
  }
  
  // 5. SalesData
  const originalSalesCount = salesData.length;
  const userSales = salesData.filter(item => !(item._id < 40 && mockCropNames.has(item.product)));
  if (userSales.length !== originalSalesCount) {
    salesData.length = 0;
    userSales.forEach(x => salesData.push(x));
    setNextSaleId(Math.max(...salesData.map(item => item._id), 0) + 1);
    changed = true;
  }
  
  // 6. Calendar
  const mockCalTitles = new Set([
    'เก็บเกี่ยวผักคะน้าใบใหญ่', 'ส่ง Tops Supermarket', 'เก็บเกี่ยวผักบุ้งจีน',
    'ใส่ปุ๋ยหมักรอบเดือน', 'ยื่นเอกสาร Organic มกอช.', 'เก็บเกี่ยวผักเคล',
    'ตรวจสุขภาพดินรายเดือน', 'ประชุมทีมงานประจำเดือน', 'สั่งซื้อถุงบรรจุผักด่วน',
    'เก็บเกี่ยวมะเขือเทศราชินี', 'เก็บเกี่ยวผักชีไทย', 'ตรวจรับงานระบบน้ำแปลง F',
    'เก็บเกี่ยวผักกาดขาวปลี', 'เก็บเกี่ยวดาวเรืองส้ม', 'สิ้นเดือน — สรุปยอดขาย พ.ค.',
    'ปลูกพืชรอบใหม่ แปลง A', 'เก็บเกี่ยวข้าวโพดหวาน'
  ]);
  const originalCalCount = calEvents.length;
  const userCalEvents = calEvents.filter(item => !(item.id < 18 && mockCalTitles.has(item.title)));
  if (userCalEvents.length !== originalCalCount) {
    calEvents.length = 0;
    userCalEvents.forEach(x => calEvents.push(x));
    setNextCalId(Math.max(...calEvents.map(item => item.id), 0) + 1);
    changed = true;
  }
  
  // 7. Projects
  const mockProjNames = new Set([
    'ขยายระบบน้ำหยด Phase 2', 'ขอรับรองมาตรฐาน Organic Thailand',
    'เปิดช่องทางขายตรง CSA Box', 'โรงเรือนเพาะกล้าใหม่'
  ]);
  const originalProjCount = projectItems.length;
  const userProjects = projectItems.filter(item => !(item.id < 5 && mockProjNames.has(item.name)));
  if (userProjects.length !== originalProjCount) {
    projectItems.length = 0;
    userProjects.forEach(x => projectItems.push(x));
    setNextProjId(Math.max(...projectItems.map(item => item.id), 0) + 1);
    changed = true;
  }
  
  if (changed) {
    console.log('🧹 Cleaned mock data from existing database.');
    saveData();
  }
  
  localStorage.setItem('mockDataCleaned_v2', 'true');
}

// ── Sanitize Database IDs and Counters ──
export function fixDuplicateIdsAndCounters() {
  let changed = false;

  const fixArray = (arr, idField, nextIdGetter, nextIdSetter) => {
    const seen = new Set();
    let maxId = 0;
    
    // First pass: find max existing ID among non-duplicates
    arr.forEach(item => {
      const id = item[idField];
      if (!seen.has(id)) {
        seen.add(id);
        if (id > maxId) maxId = id;
      }
    });

    // Second pass: re-assign duplicate IDs
    seen.clear();
    arr.forEach(item => {
      const id = item[idField];
      if (seen.has(id)) {
        maxId++;
        item[idField] = maxId;
        console.log(`🧹 Fixed duplicate ID in array: re-assigned ${id} to ${maxId}`);
        changed = true;
      } else {
        seen.add(id);
        if (id > maxId) maxId = id;
      }
    });

    // Enforce nextId counter is at least maxId + 1
    const currentNextId = nextIdGetter();
    if (currentNextId <= maxId) {
      nextIdSetter(maxId + 1);
      changed = true;
    }
  };

  // Run for all models
  fixArray(cropItems, 'id', () => nextCropId, setNextCropId);
  fixArray(actItems, 'id', () => nextActId, setNextActId);
  fixArray(custItems, 'id', () => nextCustId, setNextCustId);
  fixArray(invItems, 'id', () => nextInvId, setNextInvId);
  fixArray(salesData, '_id', () => _nextSaleId, setNextSaleId);
  fixArray(calEvents, 'id', () => _nextCalId, setNextCalId);
  fixArray(projectItems, 'id', () => _nextProjId, setNextProjId);

  if (changed) {
    console.log('⚡ Database IDs and counters sanitized successfully.');
    saveData();
  }
}

// ── Force Wipe All Data (User Request) ──
export function forceWipeAllData() {
  if (localStorage.getItem('userRequestedWipeCompleted_v3')) return;
  
  // Clear all arrays
  cropItems.length = 0;
  actItems.length = 0;
  custItems.length = 0;
  invItems.length = 0;
  salesData.length = 0;
  calEvents.length = 0;
  projectItems.length = 0;
  
  // Reset counters
  setNextCropId(1);
  setNextActId(1);
  setNextCustId(1);
  setNextInvId(1);
  setNextSaleId(1);
  setNextCalId(1);
  setNextProjId(1);
  
  // Write the clean, empty state back to LocalStorage
  localStorage.setItem(LS_KEY, JSON.stringify(_packData()));
  
  // Write the clean, empty state back to Firebase
  if (_fbReady) {
    db.collection('farms').doc(FARM_ID).set(_packData())
      .then(() => {
        console.log('☁️ Firebase database wiped and initialized with clean state.');
      })
      .catch(e => {
        console.warn('Firebase wipe failed:', e);
      });
  }
  
  localStorage.setItem('userRequestedWipeCompleted_v3', 'true');
  // Also force flags so they do not run migrations on empty db
  localStorage.setItem('mockDataCleaned_v2', 'true');
  console.log('🧹 Database fully wiped and reset to clean state.');
}

// ── Auto-save wrappers ──
// Called from main.js AFTER window bridge is set up
export function setupAutoSave() {
  const fns = ['renderCrops','renderActivities','renderInv',
               'renderCustomers','renderSales','renderCalendar'];
  fns.forEach(name => {
    const orig = window[name];
    if (orig) window[name] = (...a) => { orig(...a); saveData(); };
  });
}

// ── ล้างข้อมูลทั้งหมด ──
export async function clearAllData() {
  if (!confirm('⚠️ ล้างข้อมูลทั้งหมด?\n\nข้อมูลทุกอย่างจะถูกลบถาวร')) return;
  localStorage.removeItem(LS_KEY);
  if (_fbReady) {
    try { await db.collection('farms').doc(FARM_ID).delete(); } catch(e) {}
  }
  location.reload();
}

// ============================================================
// ===== REPORTS & ANALYTICS =====
