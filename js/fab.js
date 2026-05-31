import { openCalEventModal } from './calendar.js';
import { openCropModal, openActivityModal } from './crops.js';
import { openCustModal } from './customers.js';
import { openInvModal } from './inventory.js';
import { openProjectModal } from './projects.js';
import { openSaleModal } from './sales.js';
import { _currentPage } from './state.js';

// ============================================================
const _fabActions = {
  dashboard:   () => openSaleModal(),
  crops:       () => openCropModal(),
  activities:  () => openActivityModal(),
  inventory:   () => openInvModal(),
  sales:       () => openSaleModal(),
  customers:   () => openCustModal(),
  projects:    () => openProjectModal(),
  calendar:    () => openCalEventModal(),
  settings:    () => {},
};

export function fabAction() {
  const fn = _fabActions[_currentPage];
  if (fn) fn();
}

// ============================================================
// ===== CUSTOMER HISTORY MODAL =====
// ============================================================
