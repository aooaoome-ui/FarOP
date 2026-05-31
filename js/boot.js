import { _autoUpdateCropStatuses } from './ai.js';
import { initFirebase, loadData } from './firebase.js';
import { _applySidebarInfo, _syncPlotDropdown, _syncWorkerDropdown } from './settings.js';
import { navigate } from './ui.js';

export async function bootApp() {
  initFirebase();
  await loadData();
  _autoUpdateCropStatuses();
  _applySidebarInfo();
  _syncWorkerDropdown();
  _syncPlotDropdown();
  navigate('dashboard', document.querySelector('.nav-item[onclick*="dashboard"]'));
}
