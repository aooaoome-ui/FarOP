import { _pgState, _renderCustomersPage } from './pagination.js';
import { saveData } from './firebase.js';
import { custItems, editingCustId, nextCustId, setEditingCustId, setNextCustId } from './state.js';
import { closeModal, showToast } from './ui.js';
import { dateStr } from './utils.js';

// ============================================================
export const custTypeMap = {
  'ตลาด':          'badge-green',
  'ร้านอาหาร':     'badge-sky',
  'บุคคล':         'badge-earth',
  'ออนไลน์':       'badge-amber',
  'โรงแรม':        'badge-sky',
  'ซูเปอร์มาร์เก็ต':'badge-purple',
  'อื่นๆ':         'badge-gray',
};
export function renderCustomers() {
  _pgState.customers.page = 1;
  _renderCustomersPage(_pgState.customers.page, _pgState.customers.query);
}

export function openCustModal(id) {
  setEditingCustId(id || null);
  document.getElementById('cust-modal-title').textContent = id ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่';
  document.getElementById('cust-save-btn').textContent    = id ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า';
  if (id) {
    const item = custItems.find(i => i.id === id);
    document.getElementById('cust-name').value        = item.name;
    document.getElementById('cust-type').value        = item.type;
    document.getElementById('cust-contact').value     = item.contact;
    document.getElementById('cust-products').value    = item.products;
    document.getElementById('cust-total').value       = item.total;
    document.getElementById('cust-last-order').value  = item.lastOrder;
  } else {
    ['cust-name','cust-contact','cust-products','cust-total'].forEach(x => document.getElementById(x).value = '');
    document.getElementById('cust-type').value        = 'ตลาด';
    document.getElementById('cust-last-order').value  = dateStr;
  }
  document.getElementById('modal-cust').classList.add('open');
}

export function editCustItem(id) { openCustModal(id); }

export function saveCustItem() {
  const name      = document.getElementById('cust-name').value.trim();
  const type      = document.getElementById('cust-type').value;
  const contact   = document.getElementById('cust-contact').value.trim();
  const products  = document.getElementById('cust-products').value.trim();
  const total     = parseFloat(document.getElementById('cust-total').value) || 0;
  const lastOrder = document.getElementById('cust-last-order').value;
  if (!name) { showToast('⚠️ กรุณากรอกชื่อลูกค้า'); return; }
  if (editingCustId) {
    const item = custItems.find(i => i.id === editingCustId);
    Object.assign(item, { name, type, contact, products, total, lastOrder });
    showToast('✅ แก้ไขข้อมูลลูกค้าสำเร็จ');
  } else {
    custItems.push({ id: nextCustId, name, type, contact, products, total, lastOrder });
  setNextCustId(nextCustId + 1);
    showToast('✅ เพิ่มลูกค้าสำเร็จ');
  }
  closeModal('modal-cust');
  saveData(); renderCustomers();
}

// ============================================================
