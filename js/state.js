// ===== STATE — all shared mutable state =====
// Auto-generated: do not edit manually

export let cropItems = [];

export let nextCropId = 1;
export let editingCropId = null;
export let cropRendered = false;
export let actItems = [];

export let nextActId = 1;
export let editingActId = null;
export let actRendered = false;
export let actFilteredItems = null;
export let custItems = [];

export let nextCustId = 1;
export let editingCustId = null;
export let custRendered = false;
export let invItems = [];

export let nextInvId = 1;
export let editingInvId = null;
export let invRendered = false;
export let salesData = [];

export let _nextSaleId = 1;
export let salesRendered = false;
export let editingSaleId = null;
export let goalItems = {};
export let goalsRendered = false;
export let editingGoalId = null;
export let goalRevenueTarget = null;
export let goalBarInst = null;
export let calEvents = [];

export let _nextCalId = 1;
export let calView = 'month';
export let calYear = new Date().getFullYear();
export let calMonth = new Date().getMonth();
export let calRendered = false;
export let editingCalId = null;
export let farmSettings =
{
    name:         'โต้งลำปางหลวง',
    location:     'ลำปาง',
    area:         8,
    owner:        '',
    desc:         '',
    workers:      ['สมชาย','มาลี','สมใจ'],
    plots:        ['A1','A2','A3','B1','B2','C1','C2','C3','C4','D1','D2','D3','E1','F1','F2','G1'],
    shelfLife:    7,
    alertPct:     20,
    anthropicKey: '',   // Anthropic API Key
    geminiKey:    '',   // Google Gemini API Key
    openrouterKey:'',   // OpenRouter API Key (ฟรี ใช้ได้ในไทย)
    openrouterModel:'', // กำหนด model เอง (ถ้าว่างจะใช้ลิสต์ฟรี)
    aiProvider:   'openrouter'  // 'openrouter' | 'anthropic' | 'gemini'
  };

export let planTemplates =
[
    { id:1, name:'ผักคะน้า', category:'พืชผัก', daysToHarvest:45, isContinuous:false, icon:'🥬',
      notes:'เหมาะฤดูหนาว-ต้นร้อน หลีกเลี่ยงฤดูฝนจัด',
      stages:[
        { id:'s1', name:'เตรียมดิน + ใส่ปุ๋ยหมัก', day:0,  type:'เตรียมดิน',                  icon:'⛏️', materials:['ปุ๋ยหมัก','ถ่านไบโอชาร์'], notes:'พรวนดินลึก 20 ซม. ใส่ปุ๋ยหมัก 2 กก./ตร.ม.' },
        { id:'s2', name:'หว่านเมล็ด / ย้ายกล้า',  day:3,  type:'ปลูกต้นกล้า',                 icon:'🌱', materials:['เมล็ดพันธุ์'], notes:'ระยะปลูก 20×20 ซม.' },
        { id:'s3', name:'ใช้ไตรโคเดอม่า รอบแรก',   day:7,  type:'ใช้ไตรโคเดอม่า',              icon:'🍄', materials:['ไตรโคเดอม่า'], notes:'50 ก./น้ำ 20 ลิตร ราดโคนต้น ป้องกันรากเน่า' },
        { id:'s4', name:'รดน้ำหมัก + รดน้ำ',       day:14, type:'รดน้ำหมักชีวภาพ',             icon:'🧴', materials:['น้ำหมักชีวภาพ'], notes:'เจือจาง 1:500 รดทั้งแปลง' },
        { id:'s5', name:'พ่นบิวเวอเรีย+เมธาไรเซียม',day:21, type:'พ่นบิวเวอเรีย+เมธาไรเซียม', icon:'🦠', materials:['บิวเวอเรีย','เมธาไรเซียม'], notes:'พ่นช่วงเย็น ป้องกันหนอน-แมลง' },
        { id:'s6', name:'ใส่ปุ๋ยหมัก รอบสอง',      day:28, type:'ใส่ปุ๋ยหมัก',                  icon:'♻️', materials:['ปุ๋ยหมัก'], notes:'โรยรอบโคนต้น 0.5 กก./ต้น' },
        { id:'s7', name:'ใช้ไตรโคเดอม่า รอบสอง',   day:35, type:'ใช้ไตรโคเดอม่า',              icon:'🍄', materials:['ไตรโคเดอม่า'], notes:'ป้องกันโรคใบ' },
        { id:'s8', name:'ตรวจความพร้อมก่อนเก็บ',   day:42, type:'ตรวจโรคพืช',                  icon:'🩺', materials:[], notes:'ดูขนาดใบ สีใบ ความพร้อมเก็บ' },
        { id:'s9', name:'เก็บเกี่ยว',               day:45, type:'เก็บเกี่ยว',                  icon:'🌾', materials:[], notes:'เก็บตอนเช้า ก่อน 8 โมง' },
      ]},
    { id:2, name:'มะเขือเทศ', category:'พืชสวนครัว', daysToHarvest:90, isContinuous:false, icon:'🍅',
      notes:'ต้องการแสงแดดเต็มวัน อากาศเย็น 15-25°C',
      stages:[
        { id:'s1', name:'เตรียมดิน + ปรับ pH',      day:0,  type:'เตรียมดิน',                  icon:'⛏️', materials:['ปุ๋ยหมัก','ปูนขาว'], notes:'pH 6.0-6.8 ใส่ปูนขาวถ้าดินเป็นกรด' },
        { id:'s2', name:'ย้ายกล้า',                  day:7,  type:'ปลูกต้นกล้า',                 icon:'🌱', materials:[], notes:'ระยะ 50×60 ซม.' },
        { id:'s3', name:'ใช้ไตรโคเดอม่า',            day:10, type:'ใช้ไตรโคเดอม่า',              icon:'🍄', materials:['ไตรโคเดอม่า'], notes:'ป้องกันโรครากและลำต้น' },
        { id:'s4', name:'ปักค้างและมัดต้น รอบแรก',  day:20, type:'ค้ำยัน / มัดขึ้นค้าง',       icon:'🪵', materials:['ไม้ค้ำยัน'], notes:'ปักค้างทุกต้น มัดหลวมๆ' },
        { id:'s5', name:'ตัดแต่งกิ่ง + รดน้ำหมัก',  day:30, type:'ตัดแต่งกิ่ง',                icon:'✂️', materials:['น้ำหมักชีวภาพ'], notes:'ตัดกิ่งแขนง เหลือ 1-2 ลำ' },
        { id:'s6', name:'พ่นบิวเวอเรีย+เมธาไรเซียม',day:35, type:'พ่นบิวเวอเรีย+เมธาไรเซียม', icon:'🦠', materials:['บิวเวอเรีย','เมธาไรเซียม'], notes:'ป้องกันแมลงหวี่ขาว เพลี้ย' },
        { id:'s7', name:'มัดต้น รอบสอง + ใส่ปุ๋ยหมัก',day:45,type:'ค้ำยัน / มัดขึ้นค้าง',     icon:'🪵', materials:['ปุ๋ยหมัก'], notes:'มัดเพิ่มเมื่อต้นสูงขึ้น' },
        { id:'s8', name:'ตัดแต่งกิ่ง รอบสอง',       day:55, type:'ตัดแต่งกิ่ง',                icon:'✂️', materials:[], notes:'ตัดใบแก่-ใบเหลือง ให้อากาศถ่ายเท' },
        { id:'s9', name:'ใช้ไตรโคเดอม่า รอบสอง',    day:65, type:'ใช้ไตรโคเดอม่า',              icon:'🍄', materials:['ไตรโคเดอม่า'], notes:'' },
        { id:'s10',name:'เริ่มเก็บเกี่ยว',           day:85, type:'เก็บเกี่ยว',                  icon:'🌾', materials:[], notes:'เก็บเมื่อผลสีแดง 80%' },
      ]},
    { id:3, name:'พริก', category:'พืชสวนครัว', daysToHarvest:120, isContinuous:true, icon:'🌶️',
      notes:'เก็บเกี่ยวได้ต่อเนื่อง 6-12 เดือน ชอบแดดจัด',
      stages:[
        { id:'s1', name:'เตรียมดิน',                 day:0,  type:'เตรียมดิน',                  icon:'⛏️', materials:['ปุ๋ยหมัก'], notes:'' },
        { id:'s2', name:'ย้ายกล้า',                  day:7,  type:'ปลูกต้นกล้า',                 icon:'🌱', materials:[], notes:'ระยะ 60×60 ซม.' },
        { id:'s3', name:'ใช้ไตรโคเดอม่า',            day:10, type:'ใช้ไตรโคเดอม่า',              icon:'🍄', materials:['ไตรโคเดอม่า'], notes:'' },
        { id:'s4', name:'รดน้ำหมัก รอบแรก',          day:21, type:'รดน้ำหมักชีวภาพ',             icon:'🧴', materials:['น้ำหมักชีวภาพ'], notes:'' },
        { id:'s5', name:'ปักค้าง',                   day:30, type:'ค้ำยัน / มัดขึ้นค้าง',       icon:'🪵', materials:['ไม้ค้ำยัน'], notes:'ปักค้างก่อนออกดอก' },
        { id:'s6', name:'พ่นบิวเวอเรีย+เมธาไรเซียม',day:40, type:'พ่นบิวเวอเรีย+เมธาไรเซียม', icon:'🦠', materials:['บิวเวอเรีย','เมธาไรเซียม'], notes:'ป้องกันไรแดง เพลี้ยไฟ' },
        { id:'s7', name:'ใส่ปุ๋ยหมัก รอบสอง',       day:50, type:'ใส่ปุ๋ยหมัก',                  icon:'♻️', materials:['ปุ๋ยหมัก'], notes:'' },
        { id:'s8', name:'ตรวจโรค + ใช้ไตรโคเดอม่า', day:70, type:'ใช้ไตรโคเดอม่า',              icon:'🍄', materials:['ไตรโคเดอม่า'], notes:'ตรวจโรคแอนแทรคโนส' },
        { id:'s9', name:'เก็บเกี่ยวรอบแรก',         day:90, type:'เก็บเกี่ยว',                  icon:'🌾', materials:[], notes:'เก็บพริกเขียว หรือรอแดง' },
        { id:'s10',name:'รดน้ำหมักบำรุงต่อเนื่อง',  day:105,type:'รดน้ำหมักชีวภาพ',             icon:'🧴', materials:['น้ำหมักชีวภาพ','ปุ๋ยหมัก'], notes:'รดน้ำหมักทุกเดือน' },
      ]},
    { id:4, name:'ตะไคร้ (ต่อเนื่อง)', category:'สมุนไพร', daysToHarvest:90, isContinuous:true, icon:'🌿',
      notes:'เก็บเกี่ยวได้ต่อเนื่อง ตัดรอบ 30-45 วัน',
      stages:[
        { id:'s1', name:'เตรียมดิน + ปลูก',          day:0,  type:'เตรียมดิน',                  icon:'⛏️', materials:['ปุ๋ยหมัก'], notes:'ปลูกจากหน่อ ระยะ 50×50 ซม.' },
        { id:'s2', name:'ใช้ไตรโคเดอม่า',            day:7,  type:'ใช้ไตรโคเดอม่า',              icon:'🍄', materials:['ไตรโคเดอม่า'], notes:'ป้องกันโรครา' },
        { id:'s3', name:'รดน้ำหมัก',                 day:21, type:'รดน้ำหมักชีวภาพ',             icon:'🧴', materials:['น้ำหมักชีวภาพ'], notes:'' },
        { id:'s4', name:'ใส่ปุ๋ยหมัก',              day:45, type:'ใส่ปุ๋ยหมัก',                  icon:'♻️', materials:['ปุ๋ยหมัก'], notes:'' },
        { id:'s5', name:'เก็บเกี่ยวรอบแรก',         day:90, type:'เก็บเกี่ยว',                  icon:'🌾', materials:[], notes:'ตัดเหลือโคน 10 ซม.' },
      ]},
    { id:5, name:'ผักกาด/ผักบุ้ง (30 วัน)', category:'พืชผัก', daysToHarvest:30, isContinuous:false, icon:'🥗',
      notes:'ปลูกง่าย เติบโตเร็ว เหมาะทุกฤดู',
      stages:[
        { id:'s1', name:'เตรียมดิน + หว่านเมล็ด',   day:0,  type:'หว่านเมล็ด',                  icon:'🌾', materials:['ปุ๋ยหมัก'], notes:'' },
        { id:'s2', name:'ใช้ไตรโคเดอม่า',            day:5,  type:'ใช้ไตรโคเดอม่า',              icon:'🍄', materials:['ไตรโคเดอม่า'], notes:'' },
        { id:'s3', name:'รดน้ำหมัก',                 day:14, type:'รดน้ำหมักชีวภาพ',             icon:'🧴', materials:['น้ำหมักชีวภาพ'], notes:'' },
        { id:'s4', name:'พ่นบิวเวอเรีย',             day:20, type:'พ่นบิวเวอเรีย+เมธาไรเซียม',  icon:'🦠', materials:['บิวเวอเรีย'], notes:'ป้องกันหนอนใยผัก' },
        { id:'s5', name:'เก็บเกี่ยว',               day:30, type:'เก็บเกี่ยว',                  icon:'🌾', materials:[], notes:'' },
      ]},
  ];

export let _nextTemplateId = 6;
export let plotSeasons = [];
export let _nextSeasonId = 1;
export let soilRests = [];
export let _nextSoilRestId = 1;
export let inputBatches = [];
export let _nextBatchId = 1;
export let projectItems = [];

export let _nextProjId = 1;
export let _editingProjId = null;
export let _projView = 'card';
export let _viewingProjId = null;
export let reqItems = [];
export let _nextReqId = 1;
export let db = null;
export let _fbReady = false;
export let _saveTimer = null;
export let chartsInit = false;
export let _currentPage = 'dashboard';
export let _delContext = null;
export let _harvestLogCropId = null;

// ── Setters (for ES Module live-binding writes) ──
export function setCurrentPage(v) { _currentPage = v; }
export function setDelContext(v) { _delContext = v; }
export function setEditingProjId(v) { _editingProjId = v; }
export function setFbReady(v) { _fbReady = v; }
export function setHarvestLogCropId(v) { _harvestLogCropId = v; }
export function setNextTemplateId(v) { _nextTemplateId = v; }
export function setProjView(v) { _projView = v; }
export function setSaveTimer(v) { _saveTimer = v; }
export function setViewingProjId(v) { _viewingProjId = v; }
export function setActFilteredItems(v) { actFilteredItems = v; }
export function setActRendered(v) { actRendered = v; }
export function setCalEvents(v) { calEvents = v; }
export function setCalView(v) { calView = v; }
export function setCropRendered(v) { cropRendered = v; }
export function setCustRendered(v) { custRendered = v; }
export function setDb(v) { db = v; }
export function setEditingActId(v) { editingActId = v; }
export function setEditingCalId(v) { editingCalId = v; }
export function setEditingCropId(v) { editingCropId = v; }
export function setEditingCustId(v) { editingCustId = v; }
export function setEditingInvId(v) { editingInvId = v; }
export function setEditingSaleId(v) { editingSaleId = v; }
export function setGoalRevenueTarget(v) { goalRevenueTarget = v; }
export function setGoalsRendered(v) { goalsRendered = v; }
export function setInputBatches(v) { inputBatches = v; }
export function setInvItems(v) { invItems = v; }
export function setInvRendered(v) { invRendered = v; }
export function setPlanTemplates(v) { planTemplates = v; }
export function setPlotSeasons(v) { plotSeasons = v; }
export function setProjectItems(v) { projectItems = v; }
export function setReqItems(v) { reqItems = v; }
export function setSalesRendered(v) { salesRendered = v; }
export function setSoilRests(v) { soilRests = v; }
export function setCropItems(v) { cropItems = v; }
export function setActItems(v) { actItems = v; }
export function setCustItems(v) { custItems = v; }
export function setGoalItems(v) { goalItems = v; }
export function setNextCropId(v) { nextCropId = v; }
export function setNextActId(v) { nextActId = v; }
export function setNextCustId(v) { nextCustId = v; }
export function setNextInvId(v) { nextInvId = v; }
export function setNextSaleId(v) { _nextSaleId = v; }
export function setNextCalId(v) { _nextCalId = v; }
export function setNextSeasonId(v) { _nextSeasonId = v; }
export function setNextSoilRestId(v) { _nextSoilRestId = v; }
export function setNextBatchId(v) { _nextBatchId = v; }
export function setNextProjId(v) { _nextProjId = v; }
export function setNextReqId(v) { _nextReqId = v; }
export function setGoalBarInst(v) { goalBarInst = v; }
export function setCalMonth(v) { calMonth = v; }
export function setCalYear(v) { calYear = v; }
export function setChartsInit(v) { chartsInit = v; }
