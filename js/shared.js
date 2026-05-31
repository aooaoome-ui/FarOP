import { renderActivities, renderCrops } from './crops.js';
import { renderCustomers } from './customers.js';
import { saveData } from './firebase.js';
import { renderInv } from './inventory.js';
import { _delContext, actItems, cropItems, custItems, invItems, setActItems, setCropItems, setCustItems, setDelContext, setInvItems } from './state.js';
import { closeModal, showToast } from './ui.js';

// ===== SHARED CONFIRM DELETE =====
// ============================================================
export function askConfirmDel(ctx, id, label) {
  setDelContext({ ctx, id });
  document.getElementById('confirm-del-name').textContent = label;
  document.getElementById('confirm-del-btn').onclick = execDel;
  document.getElementById('modal-confirm-del').classList.add('open');
}
export function execDel() {
  const { ctx, id } = _delContext;
  if (ctx === 'crop') { setCropItems(cropItems.filter(i => i.id !== id)); saveData(); renderCrops();      showToast('🗑 ลบพืชผลแล้ว'); }
  if (ctx === 'act')  { setActItems(actItems.filter(i => i.id !== id));   saveData(); renderActivities(); showToast('🗑 ลบกิจกรรมแล้ว'); }
  if (ctx === 'cust') { setCustItems(custItems.filter(i => i.id !== id)); saveData(); renderCustomers();  showToast('🗑 ลบลูกค้าแล้ว'); }
  if (ctx === 'inv')  { setInvItems(invItems.filter(i => i.id !== id));   saveData(); renderInv();        showToast('🗑 ลบวัสดุแล้ว'); }
  closeModal('modal-confirm-del');
  setDelContext(null);
}

// ============================================================
// ===== INVENTORY (existing, updated to use shared del) =====
