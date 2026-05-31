import { renderDashboard } from './dashboard.js';
import { saveData } from './firebase.js';
import { renderSalesCharts, buildReportCharts } from './charts.js';
import { deductProduceStock, renderInv } from './inventory.js';
import { _pgState, _renderSalesPage } from './pagination.js';
import { _buildProductOptions, _getInvIdFromSelectVal, _getSaleTotal } from './sales.js';
import { _delContext, editingSaleId, invItems, salesData, setEditingSaleId, setDelContext } from './state.js';
import { closeModal, showToast } from './ui.js';

// ============================================================
export const paymentBadge={'เงินสด':'badge-green','โอน':'badge-sky','รอชำระ':'badge-amber'};

export function renderSales(){
  _pgState.sales.page = 1;
  _renderSalesPage(_pgState.sales.page, _pgState.sales.query);
  // refresh charts if sales page is visible
  const pg = document.getElementById('page-sales');
  if (pg && pg.classList.contains('active')) setTimeout(renderSalesCharts, 80);
}

export function updateSaleStats(){
  const total=salesData.reduce((s,i)=>s+i.total,0);
  const maxSale=salesData.reduce((mx,i)=>i.total>mx?i.total:mx,0);
  const pending=salesData.filter(i=>i.payment==='รอชำระ').reduce((s,i)=>s+i.total,0);
  const set=(id,html)=>{const el=document.getElementById(id);if(el)el.innerHTML=html;};
  set('sales-total-val',total.toLocaleString('th-TH')+' <span class="stat-unit">฿</span>');
  set('sales-count-val',salesData.length+' <span class="stat-unit">รายการ</span>');
  set('sales-max-val',maxSale.toLocaleString('th-TH')+' <span class="stat-unit">฿</span>');
  set('sales-pending-val',pending.toLocaleString('th-TH')+' <span class="stat-unit">฿</span>');
}

export function editSaleItem(id){
  setEditingSaleId(id);
  const item=salesData.find(s=>s._id===id);
  if(!item)return;
  _buildProductOptions('se-product-select', item.product);
  document.getElementById('se-date').value=item.date;
  document.getElementById('se-product').value=item.product;
  document.getElementById('se-customer').value=item.customer;
  document.getElementById('se-channel').value=item.channel;
  document.getElementById('se-weight').value=item.weight;
  document.getElementById('se-price').value=item.price;
  // restore editable total
  document.getElementById('se-total-auto').checked = true;
  document.getElementById('se-total').readOnly = true;
  document.getElementById('se-total').style.background = 'var(--gray-50)';
  document.getElementById('se-total').value = item.total.toLocaleString('th-TH');
  document.getElementById('se-payment').value=item.payment;
  document.getElementById('modal-sale-edit').classList.add('open');
}

export function calcSeTotal(){
  if (!document.getElementById('se-total-auto').checked) return;
  const w=parseFloat(document.getElementById('se-weight').value)||0;
  const p=parseFloat(document.getElementById('se-price').value)||0;
  document.getElementById('se-total').value=w&&p?(w*p).toLocaleString('th-TH'):'';
}

export function saveSaleEdit(){
  const item=salesData.find(s=>s._id===editingSaleId);
  if(!item)return;
  const w=parseFloat(document.getElementById('se-weight').value)||0;
  const p=parseFloat(document.getElementById('se-price').value)||0;
  const total = _getSaleTotal('se-total','se-total-auto') || (w * p);

  // Restore old weight to the exact lot (use stored invId if available)
  const oldInvId   = item.invId || null;
  const oldProduct = item.product;
  const oldWeight  = item.weight || 0;
  const oldInv = oldInvId
    ? invItems.find(i => i.id === oldInvId)
    : invItems.find(i => i.cat === 'ผลผลิต' && i.name === oldProduct);
  // Restore old weight silently, then deduct new amount
  if (oldInv) {
    oldInv.qty += oldWeight;
    saveData();
  }

  item.date=document.getElementById('se-date').value;
  const seProductVal = document.getElementById('se-product').value.trim();
  const seSelectRaw  = document.getElementById('se-product-select').value;
  const newInvId     = seProductVal ? null : _getInvIdFromSelectVal(seSelectRaw);
  item.product = seProductVal || (seSelectRaw.startsWith('__inv__') ? seSelectRaw.split('__')[3] : seSelectRaw);
  item.invId   = newInvId;
  item.customer=document.getElementById('se-customer').value.trim();
  item.channel=document.getElementById('se-channel').value;
  item.weight=w; item.price=p; item.total=total;
  item.payment=document.getElementById('se-payment').value;

  // Deduct new weight (shows toast + saves)
  deductProduceStock(item.product, w, newInvId);

  closeModal('modal-sale-edit');
  renderSales(); renderDashboard(); setTimeout(buildReportCharts,100);
  showToast('✅ แก้ไขรายการขายสำเร็จ');
}

// execDel override — called from main.js AFTER window bridge
export function patchExecDel() {
  const _orig = window.execDel;
  window.execDel = function() {
    const ctx = _delContext;
    if (ctx && ctx.ctx === 'sale') {
      const idx = salesData.findIndex(s => s._id === ctx.id);
      if (idx > -1) {
        const sold = salesData[idx];
        const restoreInv = sold.invId
          ? invItems.find(i => i.id === sold.invId)
          : invItems.find(i => i.cat === 'ผลผลิต' && i.name === sold.product);
        if (restoreInv) {
          restoreInv.qty += (sold.weight || 0);
          window.renderInv();
          window.saveData && window.saveData();
          window.showToast(`↩️ คืนสต็อก ${sold.product} +${sold.weight} กก.`);
        }
        salesData.splice(idx, 1);
      }
      window.renderSales(); window.renderDashboard();
      setTimeout(() => window.buildReportCharts && window.buildReportCharts(), 100);
      window.closeModal('modal-confirm-del');
      setDelContext(null);
      window.showToast('🗑 ลบรายการขายแล้ว');
      return;
    }
    if (_orig) _orig();
  };
}

// ============================================================
// ===== GOALS =====
