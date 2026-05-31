// ===== MAIN.JS — ES Module entry point =====
// Imports all modules, exposes HTML-callable functions to window

import { aiQuickAsk, onProviderChange, saveAiKey, sendAiMessage, toggleAiPanel } from './ai.js';
import { calCellClick, calNext, calPrev, openCalEventModal, renderCalendar, saveCalEvent, setCalView, showCalDetail } from './calendar.js';
import { initDashboardChart, renderDashChart, renderSalesCharts, setDashChartType, setDashPeriod, setSalesChartType, setSalesPeriod, setSalesWChartType, setSalesWPeriod, buildReportCharts } from './charts.js';
import { editActItem, editCropItem, handleActPlotChange, handleActTypeChange, openActivityModal, openCropModal, saveActivityItem, saveCropItem , renderCrops, renderActivities} from './crops.js';
import { openCustHistory, openCustHistoryByName } from './customerHistory.js';
import { editCustItem, openCustModal, saveCustItem , renderCustomers} from './customers.js';
import { _doExport, _exportToggleAll, _onExportRowChk, _rebuildExportRows, openExportModal } from './export.js';
import { fabAction } from './fab.js';
import { clearAllData , setupAutoSave, saveData} from './firebase.js';
import { openGoalModal, prefillGoalCrop, saveGoalItem } from './goals.js';
import { addHarvestEntry, openHarvestLogModal, removeHarvestEntry } from './harvestLog.js';
import { _toggleShelfFields, adjustQty, clearInvSearch, disposeAllOverstock, disposeItem, disposeSelectedOverstock, editInvItem, gotoInvPage, markAsOverstock, onInvSearch, openInvModal, saveInvItem, toggleAllOverstock , renderInv} from './inventory.js';
import { _doAct, _gotoAlert, toggleNotifPanel } from './notifications.js';
import { clearSearch, gotoPage, onSearch, toggleCropTypeAll, toggleCropTypeSection } from './pagination.js';
import { deleteReqItem, handleReqPersonChange, onReqItemSelect, openRequisitionModal, saveRequisition, updateReqTotal } from './planning.js';
import { _renderTplStages, _sortTplStages, addTemplateStage, deleteBatch, deleteSeason, deleteSoilRest, deleteTemplate, markBatchDone, markSeasonDone, markTaskDone, onBatchTypeChange, onSeasonTemplateChange, openInputBatchModal, openSeasonDetail, openSeasonModal, openSoilRestModal, openTemplateModal, removeTemplateStage, saveInputBatch, saveSeason, saveSoilRest, saveTemplate, setSeasonFilter, skipTask, switchInvTab, switchPlanTab } from './planningSystem.js';
import { openPlotActs } from './plotActivities.js';
import { addTimelineStep, deleteProject, deleteTimelineStep, editCurrentProject, openProjectDetail, openProjectModal, openTimelineModal, quickUpdateStep, renderProjects, saveProject, setProjView } from './projects.js';
import { exportReportExcel, exportReportPDF, renderReports, setRptChartType, setRptTab } from './reports.js';
import { _updateSaleStockPreview, calcSaleTotal, onSaleProductSelect, onSaleTotalInput, onSeProductSelect, onSeTotalInput, openSaleModal, saveSale, toggleHarvestDate, toggleSaleProductInput, toggleSaleTotalAuto, toggleSeProductInput, toggleSeTotalAuto } from './sales.js';
import { calcSeTotal, editSaleItem, saveSaleEdit , patchExecDel, renderSales} from './salesLink.js';
import { _updateSelBar, clearSelected, deleteSelected, toggleCheckAll } from './selection.js';
import { addPlot, addWorker, exportData, handleActPersonChange, importDataPrompt, removePlot, removeWorker, saveSettingsDefaults, saveSettingsFarm } from './settings.js';
import { askConfirmDel, execDel } from './shared.js';
import { closeModal, closeSidebar, navigate, setBottomNav, toggleSidebar , showToast } from './ui.js';
import { bootApp } from './boot.js';
import { renderDashboard } from './dashboard.js';
import { setDelContext } from './state.js';

// Expose all HTML-callable functions to window
// (Required because ES modules are scoped — inline onclick cannot see them)
Object.assign(window, {
  showToast,
  renderInv,
  renderCustomers,
  renderActivities,
  renderCrops,
  aiQuickAsk,
  onProviderChange,
  saveAiKey,
  sendAiMessage,
  toggleAiPanel,
  calCellClick,
  calNext,
  calPrev,
  openCalEventModal,
  renderCalendar,
  saveCalEvent,
  setCalView,
  showCalDetail,
  initDashboardChart,
  renderDashChart,
  renderSalesCharts,
  setDashChartType,
  setDashPeriod,
  setSalesChartType,
  setSalesPeriod,
  setSalesWChartType,
  setSalesWPeriod,
  editActItem,
  editCropItem,
  handleActPlotChange,
  handleActTypeChange,
  openActivityModal,
  openCropModal,
  saveActivityItem,
  saveCropItem,
  openCustHistory,
  openCustHistoryByName,
  editCustItem,
  openCustModal,
  saveCustItem,
  _doExport,
  _exportToggleAll,
  _onExportRowChk,
  _rebuildExportRows,
  openExportModal,
  fabAction,
  clearAllData,
  openGoalModal,
  prefillGoalCrop,
  saveGoalItem,
  addHarvestEntry,
  openHarvestLogModal,
  removeHarvestEntry,
  _toggleShelfFields,
  adjustQty,
  clearInvSearch,
  disposeAllOverstock,
  disposeItem,
  disposeSelectedOverstock,
  editInvItem,
  gotoInvPage,
  markAsOverstock,
  onInvSearch,
  openInvModal,
  saveInvItem,
  toggleAllOverstock,
  _doAct,
  _gotoAlert,
  toggleNotifPanel,
  clearSearch,
  gotoPage,
  onSearch,
  toggleCropTypeAll,
  toggleCropTypeSection,
  deleteReqItem,
  handleReqPersonChange,
  onReqItemSelect,
  openRequisitionModal,
  saveRequisition,
  updateReqTotal,
  _renderTplStages,
  _sortTplStages,
  addTemplateStage,
  deleteBatch,
  deleteSeason,
  deleteSoilRest,
  deleteTemplate,
  markBatchDone,
  markSeasonDone,
  markTaskDone,
  onBatchTypeChange,
  onSeasonTemplateChange,
  openInputBatchModal,
  openSeasonDetail,
  openSeasonModal,
  openSoilRestModal,
  openTemplateModal,
  removeTemplateStage,
  saveInputBatch,
  saveSeason,
  saveSoilRest,
  saveTemplate,
  setSeasonFilter,
  skipTask,
  switchInvTab,
  switchPlanTab,
  openPlotActs,
  addTimelineStep,
  deleteProject,
  deleteTimelineStep,
  editCurrentProject,
  openProjectDetail,
  openProjectModal,
  openTimelineModal,
  quickUpdateStep,
  renderProjects,
  saveProject,
  setProjView,
  exportReportExcel,
  exportReportPDF,
  renderReports,
  setRptChartType,
  setRptTab,
  _updateSaleStockPreview,
  calcSaleTotal,
  onSaleProductSelect,
  onSaleTotalInput,
  onSeProductSelect,
  onSeTotalInput,
  openSaleModal,
  saveSale,
  toggleHarvestDate,
  toggleSaleProductInput,
  toggleSaleTotalAuto,
  toggleSeProductInput,
  toggleSeTotalAuto,
  calcSeTotal,
  editSaleItem,
  saveSaleEdit,
  _updateSelBar,
  clearSelected,
  deleteSelected,
  toggleCheckAll,
  addPlot,
  addWorker,
  exportData,
  handleActPersonChange,
  importDataPrompt,
  removePlot,
  removeWorker,
  saveSettingsDefaults,
  saveSettingsFarm,
  askConfirmDel,
  execDel,
  closeModal,
  closeSidebar,
  navigate,
  setBottomNav,
  toggleSidebar,
  renderDashboard,
  renderSales,
  saveData,
  buildReportCharts,
  setDelContext,
});


// ── Run patches AFTER window bridge is set up ──
setupAutoSave();
patchExecDel();

// ── Boot app ──
bootApp();
