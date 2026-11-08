/* LandLedger — delegated events, search, settings and data tools */
'use strict';

const ACTION_PERMISSIONS = {
  'new-sale': 'sales.create',
  'record-payment': 'payments.record',
  'remind': 'reminders.send',
  'add-plot': 'plots.manage',
  'edit-plot': 'plots.manage',
  'delete-plot': 'plots.manage',
  'add-buyer': 'buyers.manage',
  'edit-buyer': 'buyers.manage',
  'delete-buyer': 'buyers.delete',
  'add-expense': 'expenses.manage',
  'edit-expense': 'expenses.manage',
  'delete-expense': 'expenses.manage',
  'add-staff': 'staff.manage',
  'edit-staff': 'staff.manage',
  'delete-staff': 'staff.manage',
  'add-lead': 'leads.manage',
  'add-complaint': 'complaints.manage',
  'edit-complaint': 'complaints.manage',
  'view-complaint': 'complaints.view',
  'open-notif-complaint': 'complaints.view',
  'edit-lead': 'leads.manage',
  'delete-lead': 'leads.manage',
  'convert-lead': 'leads.manage',
  'add-task': 'tasks.manage',
  'edit-task': 'tasks.manage',
  'delete-task': 'tasks.manage',
  'complete-task': 'tasks.manage',
  'add-estate-document': 'estateDocs.manage',
  'edit-estate-document': 'estateDocs.manage',
  'delete-estate-document': 'estateDocs.manage',
  'pick-estate-document-file': 'estateDocs.manage',
  'remove-estate-document-file': 'estateDocs.manage',
  'download-estate-document': 'estateDocs.view',
  'add-maintenance': 'maintenance.manage',
  'edit-maintenance': 'maintenance.manage',
  'delete-maintenance': 'maintenance.manage',
  'export-report': 'reports.view',
  'print-report': 'reports.view',
  'void-sale': 'sales.void',
  'add-sale-doc': 'documents.manage',
  'remove-sale-doc': 'documents.manage',
  'add-wizard-doc': 'documents.manage',
  'remove-wizard-doc': 'documents.manage',
  'message-buyer': 'messages.send',
  'sms-buyer': 'messages.send',
  'whatsapp-buyer': 'messages.send',
  'send-receipt': 'messages.send',
  'send-current': 'messages.send',
  'copy-message': 'messages.send',
  'send-sms': 'messages.send',
  'send-whatsapp': 'messages.send',
  'export-data': 'data.export',
  'import-data': 'data.import',
  'reset-demo': 'data.reset',
  'slack-test': 'settings.edit',
  'wizard-back': 'sales.create',
  'wizard-pick-plot': 'sales.create',
  'wizard-pick-buyer': 'sales.create',
  'wizard-buyer-mode': 'sales.create',
  'clear-plot-search': 'sales.create',
  'finance-new-journal': 'finance.manage',
  'finance-add-account': 'finance.manage',
  'finance-toggle-account': 'finance.manage',
  'finance-reverse-journal': 'finance.manage',
  'finance-sync': 'finance.manage',
  'manual-journal-add-line': 'finance.manage',
  'manual-journal-remove-line': 'finance.manage',
  'finance-close-period': 'finance.close',
  'finance-reopen-period': 'finance.close',
  'finance-start-clean': 'finance.close',
  'finance-statement': 'finance.view',
  'finance-journal-page': 'finance.view',
  'finance-gl-page': 'finance.view',
  'finance-view-journal': 'finance.view',
  'finance-export': 'finance.view',
  'finance-print': 'finance.view'
};

/* ---------------- Global search ---------------- */
function searchResultHTML(type, id, iconName, title, meta) {
  return '<button type="button" class="search-result" data-action="search-result" data-type="' + esc(type) + '" data-id="' + esc(id) + '">' +
    '<span class="sr-ico">' + icon(iconName, 15) + '</span>' +
    '<span class="sr-copy"><strong>' + esc(title) + '</strong><small>' + esc(meta) + '</small></span>' +
  '</button>';
}

function handleGlobalSearch(value) {
  const panel = $('#searchResults');
  if (!panel) return;
  const query = String(value || '').trim().toLowerCase();
  if (!query) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }

  const sales = S.decoratedSales(data).filter((sale) => saleSearchText(sale).includes(query)).slice(0, 5);
  const buyers = data.buyers.filter((buyer) => buyerSearchText(buyer).includes(query)).slice(0, 4);
  const plots = data.plots.filter((plot) => {
    const sale = saleForPlot(plot);
    const hay = [plot.code, plot.label, plot.block, plot.description, sale && sale.buyer ? sale.buyer.name : ''].join(' ').toLowerCase();
    return hay.includes(query);
  }).slice(0, 4);
  const leads = (data.leads || []).filter((lead) =>
    [lead.name, lead.phone, lead.email, lead.interest].join(' ').toLowerCase().includes(query)
  ).slice(0, 3);

  let html = '';
  if (sales.length) {
    html += '<div class="search-group-label">Receipts &amp; sales</div>' +
      sales.map((sale) => searchResultHTML(
        'sale',
        sale.id,
        'receipts',
        (sale.buyer ? sale.buyer.name : 'Unknown buyer') + ' · ' + sale.receiptNo,
        (sale.plot ? sale.plot.label + ' · Block ' + sale.plot.block : '') + ' · ' + money(sale.price)
      )).join('');
  }
  if (buyers.length) {
    html += '<div class="search-group-label">Buyers</div>' +
      buyers.map((buyer) => searchResultHTML(
        'buyer',
        buyer.id,
        'buyers',
        buyer.name,
        buyer.phone + (buyer.business ? ' · ' + buyer.business : '')
      )).join('');
  }
  if (plots.length) {
    html += '<div class="search-group-label">Plots</div>' +
      plots.map((plot) => searchResultHTML(
        'plot',
        plot.id,
        'plots',
        plot.label + ' · Block ' + plot.block,
        plot.code + ' · ' + plot.size + ' m² · ' + statusLabel(plot.status)
      )).join('');
  }
  if (leads.length) {
    html += '<div class="search-group-label">Leads</div>' +
      leads.map((lead) => searchResultHTML('lead', lead.id, 'user', lead.name, (lead.phone || 'No phone') + ' · ' + lead.status)).join('');
  }

  panel.innerHTML = html || '<div class="search-empty">No matches for “' + esc(value.trim()) + '”.</div>';
  panel.hidden = false;
}

/* ---------------- Settings, export, import and reset ---------------- */
function saveSettingsFromForm(form) {
  if (!requirePermission('settings.edit')) return;
  const org = data.settings;
  ['orgName', 'ownerName', 'phone', 'email', 'siteName', 'address'].forEach((key) => {
    const field = form.elements[key];
    if (field) org[key] = field.value.trim();
  });
  const lat = Number(form.elements.lat ? form.elements.lat.value : NaN);
  const lng = Number(form.elements.lng ? form.elements.lng.value : NaN);
  if (Number.isFinite(lat)) org.lat = lat;
  if (Number.isFinite(lng)) org.lng = lng;
  if (!org.orgName) org.orgName = 'Land Management System';
  handleSaveResult(S.save(data));
  refresh();
  toast('Business settings saved.');
}

function saveSlackSettingsFromForm() {
  if (!requirePermission('settings.edit') || !window.Notify) return;
  const existing = Notify.readConfig();
  const endpoint = inputValue('slackEndpoint');
  const typedKey = inputValue('slackKey');
  const enabled = $('#slackEnabled') ? $('#slackEnabled').checked : false;
  if (enabled && !/^https?:\/\//i.test(endpoint)) { toast('Enter the relay endpoint before enabling alerts.', 'error'); return; }
  if (enabled && !(typedKey || existing.key)) { toast('Enter the workspace key before enabling alerts.', 'error'); return; }
  const events = {};
  Notify.EVENTS.forEach(([name]) => {
    const box = document.getElementById('slackEvent-' + name);
    if (box) events[name] = box.checked;
  });
  if (!Notify.saveConfig({ enabled, endpoint, key: typedKey || existing.key, events })) {
    toast('Could not save notification settings in this browser.', 'error');
    return;
  }
  refresh();
  toast('Notification settings saved.');
}

function exportData() {
  if (!requirePermission('data.export')) return;
  const payload = JSON.stringify(data, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'landledger-backup-' + todayValue() + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Backup downloaded.');
}

function resetOperationFilters() {
  state.leadQuery = '';
  state.leadStatus = 'all';
  state.taskStatus = 'open';
  state.documentQuery = '';
  state.maintenanceStatus = 'all';
  state.reportType = 'overview';
  state.reportStart = '';
  state.reportEnd = '';
  state.staffQuery = '';
  state.staffStatus = 'all';
}

function handleImportFile(file) {
  if (!requirePermission('data.import')) return;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed = null;
    try {
      parsed = JSON.parse(reader.result);
    } catch (err) {
      toast('That file is not valid JSON.', 'error');
      return;
    }
    const next = S.normalizeImported(parsed);
    if (!next) {
      toast('This file does not look like a land-management backup.', 'error');
      return;
    }
    confirmAction({
      title: 'Import this backup?',
      message: 'Replace the current workspace with ' + next.plots.length + ' plots, ' + next.buyers.length + ' buyers and ' + next.sales.length + ' sales? Your current records on this device will be overwritten.',
      confirmText: 'Import backup',
      tone: 'warn'
    }).then((ok) => {
      if (!ok) return;
      data = next;
      state.clientVaultKey = null;
      state.clientVaultCache = {};
      state.clientVaultBuyerId = null;
      state.selectedPlotId = data.plots[0] ? data.plots[0].id : null;
      state.receiptId = null;
      resetOperationFilters();
      state.plotsPage = 1;
      state.salesPage = 1;
      state.buyersPage = 1;
      try {
        if (window.FinanceApp) FinanceApp.ensure(data);
      } catch (err) {
        console.error('Could not initialise finance for the imported workspace.', err);
      }
      handleSaveResult(S.save(data));
      render();
      updateChrome();
      toast('Backup imported successfully.');
    });
  };
  reader.onerror = () => toast('Could not read that file.', 'error');
  reader.readAsText(file);
}

function resetDemoData() {
  if (!requirePermission('data.reset')) return;
  confirmAction({
    title: 'Reset demo data?',
    message: 'This removes every change you have made on this device and restores the sample workspace. Export a backup first if you want to keep your records.',
    confirmText: 'Reset workspace'
  }).then((ok) => {
    if (!ok) return;
    data = S.reset();
    if (window.FinanceApp) {
      FinanceApp.ensure(data);
      handleSaveResult(S.save(data));
    }
    state.clientVaultKey = null;
    state.clientVaultCache = {};
    state.clientVaultBuyerId = null;
    const demo = data.plots.find((plot) => plot.code === 'P-014') || data.plots[0];
    state.selectedPlotId = demo ? demo.id : null;
    state.receiptId = null;
    state.mapStatus = 'all';
    state.mapQuery = '';
    state.plotsQuery = '';
    state.plotsStatus = 'all';
    state.plotsBlock = 'all';
    state.plotsPage = 1;
    state.salesQuery = '';
    state.salesStatus = 'all';
    state.salesPage = 1;
    state.receiptsQuery = '';
    state.receiptsStatus = 'all';
    state.buyersQuery = '';
    state.buyersPage = 1;
    resetOperationFilters();
    render();
    updateChrome();
    toast('Demo workspace restored.');
  });
}

/* ---------------- Click actions ---------------- */
function handleAction(action, el) {
  const saleId = el.dataset.saleId || '';
  const plotId = el.dataset.plotId || '';
  const buyerId = el.dataset.buyerId || '';
  const page = Number(el.dataset.page) || 1;

  const requiredPermission = ACTION_PERMISSIONS[action];
  if (requiredPermission && !requirePermission(requiredPermission)) return;

  switch (action) {
    case 'sign-out':
      Auth.logout();
      break;
    case 'go-settings':
      hideUserMenu();
      go('settings');
      break;
    case 'new-sale':
      openNewSale(plotId || null);
      break;
    case 'record-payment':
      if (saleId) openPaymentForm(saleId);
      else openPaymentPicker();
      break;
    case 'go-map':
      go('map');
      break;
    case 'go-sales':
      go('sales');
      break;
    case 'go-sales-overdue':
      state.salesStatus = 'overdue';
      state.salesPage = 1;
      go('sales');
      break;
    case 'remind':
      if (saleId) openReminder(saleId);
      break;
    case 'view-sale':
      if (saleId) openSaleDetail(saleId);
      break;
    case 'select-plot':
      if (plotId) {
        state.selectedPlotId = plotId;
        updateMap();
      }
      break;
    case 'map-filter':
      state.mapStatus = el.dataset.status || 'all';
      updateMap();
      break;
    case 'open-plot':
      if (plotId) {
        state.selectedPlotId = plotId;
        go('map');
      }
      break;
    case 'open-maps': {
      const plot = plotId ? S.plotById(data, plotId) : null;
      if (plot) window.open('https://www.google.com/maps/search/?api=1&query=' + plot.lat + ',' + plot.lng, '_blank', 'noopener');
      break;
    }
    case 'add-plot':
      openPlotForm();
      break;
    case 'edit-plot':
      if (plotId) openPlotForm(plotId);
      break;
    case 'delete-plot':
      if (plotId) deletePlot(plotId);
      break;
    case 'plots-page':
      state.plotsPage = Math.max(1, page);
      updatePlotsResults();
      break;
    case 'sales-page':
      state.salesPage = Math.max(1, page);
      updateSalesResults();
      break;
    case 'buyers-page':
      state.buyersPage = Math.max(1, page);
      updateBuyersResults();
      break;
    case 'receipt-filter':
      state.receiptsStatus = el.dataset.status || 'all';
      updateReceipts();
      break;
    case 'receipt-mode':
      state.receiptMode = el.dataset.mode === 'invoice' ? 'invoice' : 'receipt';
      updateReceipts();
      break;
    case 'select-receipt':
      if (saleId) {
        state.receiptId = saleId;
        updateReceipts();
      }
      break;
    case 'print-current':
      if (saleId) printSale(saleId, state.receiptMode);
      break;
    case 'send-current':
      if (saleId) openSendReceipt(saleId, state.receiptMode);
      break;
    case 'print-receipt':
      if (saleId) printSale(saleId, el.dataset.mode || 'receipt');
      break;
    case 'send-receipt':
      if (saleId) openSendReceipt(saleId, el.dataset.mode || 'receipt');
      break;
    case 'view-buyer':
      if (buyerId) openBuyerDetail(buyerId);
      break;
    case 'buyer-statement':
      if (buyerId) openBuyerStatement(buyerId);
      break;
    case 'print-buyer-statement':
      if (buyerId) printBuyerStatement(buyerId);
      break;
    case 'add-complaint':
      openComplaintForm('', buyerId);
      break;
    case 'edit-complaint':
      if (el.dataset.complaintId) openComplaintForm(el.dataset.complaintId);
      break;
    case 'view-complaint':
      if (el.dataset.complaintId) openComplaintForm(el.dataset.complaintId);
      break;
    case 'open-notif-complaint':
      if (el.dataset.complaintId) openComplaintForm(el.dataset.complaintId);
      break;
    case 'add-buyer':
      openBuyerForm();
      break;
    case 'add-expense':
      openExpenseForm();
      break;
    case 'edit-expense':
      if (el.dataset.expenseId) openExpenseForm(el.dataset.expenseId);
      break;
    case 'delete-expense':
      if (el.dataset.expenseId) deleteExpense(el.dataset.expenseId);
      break;
    case 'add-staff':
      openStaffForm();
      break;
    case 'edit-staff':
      if (el.dataset.staffId) openStaffForm(el.dataset.staffId);
      break;
    case 'delete-staff':
      if (el.dataset.staffId) deleteStaff(el.dataset.staffId);
      break;
    case 'add-lead': openLeadForm(); break;
    case 'edit-lead': if (el.dataset.leadId) openLeadForm(el.dataset.leadId); break;
    case 'delete-lead': if (el.dataset.leadId) deleteLead(el.dataset.leadId); break;
    case 'convert-lead': if (el.dataset.leadId) convertLead(el.dataset.leadId); break;
    case 'add-task': openTaskForm(); break;
    case 'edit-task': if (el.dataset.taskId) openTaskForm(el.dataset.taskId); break;
    case 'delete-task': if (el.dataset.taskId) deleteTask(el.dataset.taskId); break;
    case 'complete-task': if (el.dataset.taskId) toggleTaskComplete(el.dataset.taskId); break;
    case 'add-estate-document': openEstateDocumentForm(); break;
    case 'edit-estate-document': if (el.dataset.documentId) openEstateDocumentForm(el.dataset.documentId); break;
    case 'delete-estate-document': if (el.dataset.documentId) deleteEstateDocument(el.dataset.documentId); break;
    case 'download-estate-document': if (el.dataset.documentId) downloadEstateDocument(el.dataset.documentId); break;
    case 'pick-estate-document-file': {
      const input = $('#estateDocumentFileInput');
      if (input) input.click();
      break;
    }
    case 'remove-estate-document-file': {
      state.operationFileDraft = null;
      const label = $('#estateDocumentFileName');
      if (label) label.textContent = 'No file selected';
      el.remove();
      break;
    }
    case 'add-maintenance': openMaintenanceForm(); break;
    case 'edit-maintenance': if (el.dataset.maintenanceId) openMaintenanceForm(el.dataset.maintenanceId); break;
    case 'delete-maintenance': if (el.dataset.maintenanceId) deleteMaintenance(el.dataset.maintenanceId); break;
    case 'export-report': exportReport(); break;
    case 'print-report': printReport(); break;
    case 'clear-report-filters': {
      state.reportStart = '';
      state.reportEnd = '';
      state.reportQuery = '';
      const reportSearch = $('#reportSearch');
      if (reportSearch) reportSearch.value = '';
      updateReports();
      break;
    }
    case 'view-expense-evidence':
      if (el.dataset.expenseId) viewExpenseEvidence(el.dataset.expenseId);
      break;
    case 'pick-expense-evidence': {
      const input = $('#expenseEvidenceInput');
      if (input) input.click();
      break;
    }
    case 'remove-expense-evidence':
      removeExpenseEvidence(Number(el.dataset.evidenceIndex));
      break;
    case 'preview-expense-evidence':
      previewExpenseEvidence(Number(el.dataset.evidenceIndex));
      break;
    case 'unlock-client-vault':
      openClientVaultUnlock(buyerId);
      break;
    case 'lock-client-vault':
      lockClientVault(false);
      break;
    case 'upload-client-documents': {
      const input = $('#clientVaultFileInput');
      if (input) input.click();
      break;
    }
    case 'download-client-document':
      if (el.dataset.docId) downloadClientDocument(el.dataset.docId);
      break;
    case 'delete-client-document':
      if (el.dataset.docId) deleteClientDocument(el.dataset.docId);
      break;
    case 'edit-buyer':
      if (buyerId) openBuyerForm(buyerId);
      break;
    case 'pick-buyer-photo': {
      const input = $('#buyerPhotoInput');
      if (input) input.click();
      break;
    }
    case 'select-buyer-sample-photo':
      selectBuyerSamplePhoto(Number(el.dataset.photoIndex));
      break;
    case 'remove-buyer-photo': {
      const input = $('#buyerPhoto');
      if (input) input.value = '';
      updateBuyerPhotoPreview('');
      break;
    }
    case 'delete-buyer':
      if (buyerId) deleteBuyer(buyerId);
      break;
    case 'message-buyer':
    case 'sms-buyer':
    case 'whatsapp-buyer':
      if (buyerId) messageBuyer(buyerId);
      break;
    case 'call': {
      const href = phoneHref(el.dataset.phone);
      if (href) window.location.href = href;
      else toast('No phone number on file.', 'warn');
      break;
    }
    case 'void-sale':
      if (saleId) voidSale(saleId);
      break;
    case 'add-sale-doc': {
      const input = $('#saleDocInput');
      if (input) input.click();
      break;
    }
    case 'remove-sale-doc':
      if (saleId && el.dataset.docId) removeSaleDoc(saleId, el.dataset.docId);
      break;
    case 'add-wizard-doc': {
      const input = $('#wizDocInput');
      if (input) input.click();
      break;
    }
    case 'remove-wizard-doc':
      if (state.wizard) {
        state.wizard.docs = state.wizard.docs.filter((doc) => doc.id !== el.dataset.docId);
        updateWizard();
      }
      break;
    case 'wizard-back':
      wizardBack();
      break;
    case 'wizard-pick-plot':
      if (plotId) wizardPickPlot(plotId);
      break;
    case 'wizard-pick-buyer':
      if (buyerId) wizardPickBuyer(buyerId);
      break;
    case 'wizard-buyer-mode':
      if (state.wizard) wizardSetBuyerMode(el.dataset.mode === 'existing' ? 'existing' : 'new');
      break;
    case 'clear-plot-search': {
      if (!state.wizard) break;
      state.wizard.plotQuery = '';
      updateWizard();
      const input = $('#wizPlotSearch');
      if (input) input.focus();
      break;
    }
    case 'clear-buyer-search': {
      if (!state.wizard) break;
      state.wizard.buyerQuery = '';
      const input = $('#wizBuyerSearch');
      if (input) {
        input.value = '';
        input.focus();
      }
      const clear = $('.buyer-search-clear');
      if (clear) clear.hidden = true;
      const list = $('#wizBuyerList');
      if (list) list.innerHTML = wizardBuyerListHTML();
      break;
    }
    case 'close-modal':
      if (state.wizard) state.wizard = null;
      closeModal();
      break;
    case 'confirm-ok':
      resolveConfirm(true);
      break;
    case 'confirm-cancel':
      resolveConfirm(false);
      break;
    case 'open-receipt':
      if (saleId) {
        state.receiptId = saleId;
        state.receiptMode = 'receipt';
        closeModal();
        go('receipts');
      }
      break;
    case 'open-notif-sale':
      hideNotif();
      if (saleId) openSaleDetail(saleId);
      break;
    case 'copy-message':
      sendVia('copy');
      break;
    case 'send-sms':
      sendVia('sms');
      break;
    case 'send-whatsapp':
      sendVia('whatsapp');
      break;
    case 'export-data':
      exportData();
      break;
    case 'slack-test':
      if (window.Notify) {
        Notify.test()
          .then((result) => {
            const names = { slack: 'Slack', email: 'email', whatsapp: 'WhatsApp' };
            const deliveries = result && result.deliveries ? result.deliveries : null;
            if (!deliveries) { toast('Test message sent.'); return; }
            const keys = Object.keys(deliveries);
            const sent = keys.filter((key) => deliveries[key] === 'sent').map((key) => names[key] || key);
            const failed = keys.filter((key) => deliveries[key] !== 'sent').map((key) => names[key] || key);
            if (failed.length) toast('Test delivered to ' + (sent.join(', ') || 'no channel') + '; failed: ' + failed.join(', ') + '.', 'warn');
            else toast('Test message sent to ' + (sent.join(', ') || 'the relay') + '.');
          })
          .catch((err) => toast(err && err.message ? err.message : 'The test message could not be sent.', 'error'));
      }
      break;
    case 'import-data': {
      const input = $('#importFile');
      if (input) input.click();
      break;
    }
    case 'reset-demo':
      resetDemoData();
      break;
    case 'finance-new-journal':
      openManualJournalModal();
      break;
    case 'finance-add-account':
      openFinanceAccountModal();
      break;
    case 'finance-toggle-account':
      if (el.dataset.code) toggleFinanceAccount(el.dataset.code);
      break;
    case 'finance-view-journal':
      if (el.dataset.journalId) openJournalDetailModal(el.dataset.journalId);
      break;
    case 'finance-reverse-journal':
      if (el.dataset.journalId) openFinanceReversalModal(el.dataset.journalId);
      break;
    case 'finance-sync':
      syncFinanceLedger();
      break;
    case 'finance-start-clean':
      startCleanFinanceLedger();
      break;
    case 'finance-close-period':
      if (el.dataset.period) closeFinancePeriod(el.dataset.period);
      break;
    case 'finance-reopen-period':
      if (el.dataset.period) reopenFinancePeriod(el.dataset.period);
      break;
    case 'finance-statement':
      state.financeStatement = ['pl', 'bs', 'cf', 'tb'].includes(el.dataset.statement) ? el.dataset.statement : 'pl';
      render();
      break;
    case 'finance-journal-page':
      state.financeJournalPage = Math.max(1, page);
      updateFinanceJournalResults();
      break;
    case 'finance-gl-page':
      state.financeGlPage = Math.max(1, page);
      updateFinanceGlResults();
      break;
    case 'finance-export':
      exportFinanceCSV();
      break;
    case 'finance-print':
      printFinanceStatement();
      break;
    case 'manual-journal-add-line':
      addManualJournalLine();
      break;
    case 'manual-journal-remove-line':
      removeManualJournalLine(Number(el.dataset.index));
      break;
    case 'search-result': {
      const type = el.dataset.type;
      const id = el.dataset.id;
      hideSearch();
      const search = $('#globalSearch');
      if (search) search.value = '';
      if (type === 'sale') openSaleDetail(id);
      else if (type === 'buyer') openBuyerDetail(id);
      else if (type === 'lead') {
        const lead = data.leads.find((item) => item.id === id);
        state.leadQuery = lead ? lead.name : '';
        go('leads');
      }
      else if (type === 'plot') {
        state.selectedPlotId = id;
        go('map');
      }
      break;
    }
    default:
      break;
  }
}

document.addEventListener('click', (e) => {
  if (e.target.matches('input[type="file"]')) return;
  if (e.target.matches('[data-modal-backdrop]')) {
    if (state.wizard) state.wizard = null;
    closeModal();
    return;
  }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (!action) return;
  handleAction(action, el);
});

/* ---------------- Form submissions ---------------- */
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (!form || !form.id) return;
  if (form.id === 'wizardForm') {
    e.preventDefault();
    handleWizardSubmit();
  } else if (form.id === 'payment-form') {
    e.preventDefault();
    savePaymentFromForm();
  } else if (form.id === 'buyer-form') {
    e.preventDefault();
    saveBuyerFromForm();
  } else if (form.id === 'expense-form') {
    e.preventDefault();
    saveExpenseFromForm();
  } else if (form.id === 'staff-form') {
    e.preventDefault();
    saveStaffFromForm();
  } else if (form.id === 'lead-form') {
    e.preventDefault();
    saveLeadFromForm();
  } else if (form.id === 'task-form') {
    e.preventDefault();
    saveTaskFromForm();
  } else if (form.id === 'estate-document-form') {
    e.preventDefault();
    saveEstateDocumentFromForm();
  } else if (form.id === 'maintenance-form') {
    e.preventDefault();
    saveMaintenanceFromForm();
  } else if (form.id === 'complaint-form') {
    e.preventDefault();
    saveComplaintFromForm();
  } else if (form.id === 'client-vault-form') {
    e.preventDefault();
    submitClientVaultPassphrase();
  } else if (form.id === 'plot-form') {
    e.preventDefault();
    savePlotFromForm();
  } else if (form.id === 'settings-form') {
    e.preventDefault();
    saveSettingsFromForm(form);
  } else if (form.id === 'slack-form') {
    e.preventDefault();
    saveSlackSettingsFromForm();
  } else if (form.id === 'finance-account-form') {
    e.preventDefault();
    saveFinanceAccountFromForm();
  } else if (form.id === 'manual-journal-form') {
    e.preventDefault();
    saveManualJournalFromForm();
  } else if (form.id === 'finance-reversal-form') {
    e.preventDefault();
    saveFinanceReversalFromForm();
  }
});

/* ---------------- Search, filters and pickers ---------------- */
document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (!id) return;
  if (id === 'plotSearch') {
    state.plotsQuery = e.target.value;
    state.plotsPage = 1;
    updatePlotsResults();
  } else if (id === 'salesSearch') {
    state.salesQuery = e.target.value;
    state.salesPage = 1;
    updateSalesResults();
  } else if (id === 'buyerSearch') {
    state.buyersQuery = e.target.value;
    state.buyersPage = 1;
    updateBuyersResults();
  } else if (id === 'accountingSearch') {
    state.accountingQuery = e.target.value;
    updateAccountingLedger();
  } else if (id === 'staffSearch') {
    state.staffQuery = e.target.value;
    updateStaffResults();
  } else if (id === 'leadSearch') {
    state.leadQuery = e.target.value;
    updateLeadsResults();
  } else if (id === 'reportSearch') {
    state.reportQuery = e.target.value;
    updateReports();
  } else if (id === 'documentSearch') {
    state.documentQuery = e.target.value;
    updateEstateDocumentResults();
  } else if (id === 'staffStatus') {
    state.staffStatus = e.target.value;
    updateStaffResults();
  } else if (id === 'leadStatusFilter') {
    state.leadStatus = e.target.value;
    updateLeadsResults();
  } else if (id === 'complaintSearch') {
    state.complaintQuery = e.target.value;
    updateComplaintsResults();
  } else if (id === 'complaintStatusFilter') {
    state.complaintStatus = e.target.value;
    updateComplaintsResults();
  } else if (id === 'buyerName') {
    const photo = $('#buyerPhoto');
    if (photo && !photo.value) updateBuyerPhotoPreview('');
  } else if (id === 'mapSearch') {
    state.mapQuery = e.target.value;
    updateMap();
  } else if (id === 'receiptSearch') {
    state.receiptsQuery = e.target.value;
    updateReceipts();
  } else if (id === 'paymentPickerSearch') {
    state.paymentQuery = e.target.value;
    const list = $('#paymentPickerList');
    if (list) list.innerHTML = paymentPickerListHTML();
    const meta = $('#paymentPickerMeta');
    if (meta) meta.innerHTML = paymentPickerMetaHTML();
  } else if (id === 'wizPlotSearch') {
    if (!state.wizard) return;
    state.wizard.plotQuery = e.target.value;
    const picker = $('#wizPlotPicker');
    if (picker) picker.innerHTML = wizardPlotPickerHTML();
    const clear = $('.plot-search-clear');
    if (clear) clear.hidden = !e.target.value;
    const count = $('.plot-search-meta span');
    if (count) {
      const query = e.target.value.trim().toLowerCase();
      const available = data.plots.filter((plot) => plot.status === 'available');
      const matches = query ? available.filter((plot) => wizardPlotMatchesSearch(plot, query)).length : available.length;
      count.textContent = query ? matches + ' matching plots' : available.length + ' plots available';
    }
  } else if (id === 'wizBuyerSearch') {
    if (!state.wizard) return;
    state.wizard.buyerQuery = e.target.value;
    const list = $('#wizBuyerList');
    if (list) list.innerHTML = wizardBuyerListHTML();
    const clear = $('.buyer-search-clear');
    if (clear) clear.hidden = !e.target.value;
  }
});

document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (!id) return;
  if (id === 'plotStatusFilter') {
    state.plotsStatus = e.target.value;
    state.plotsPage = 1;
    updatePlotsResults();
  } else if (id === 'plotBlockFilter') {
    state.plotsBlock = e.target.value;
    state.plotsPage = 1;
    updatePlotsResults();
  } else if (id === 'salesStatusFilter') {
    state.salesStatus = e.target.value;
    state.salesPage = 1;
    updateSalesResults();
  } else if (id === 'accountingMonth') {
    state.accountingMonth = e.target.value;
    refresh();
  } else if (id === 'accountingType') {
    state.accountingType = e.target.value;
    updateAccountingLedger();
  } else if (id === 'staffStatus') {
    state.staffStatus = e.target.value;
    updateStaffResults();
  } else if (id === 'leadStatusFilter') {
    state.leadStatus = e.target.value;
    updateLeadsResults();
  } else if (id === 'taskStatusFilter') {
    state.taskStatus = e.target.value;
    refresh();
  } else if (id === 'maintenanceStatusFilter') {
    state.maintenanceStatus = e.target.value;
    refresh();
  } else if (id === 'reportType' || id === 'reportStart' || id === 'reportEnd') {
    if (id === 'reportType') state.reportType = e.target.value;
    if (id === 'reportStart') state.reportStart = e.target.value;
    if (id === 'reportEnd') state.reportEnd = e.target.value;
    updateReports();
  } else if (id === 'wizDocInput') {
    handleWizardDocs(e.target.files);
    e.target.value = '';
  } else if (id === 'saleDocInput') {
    handleSaleDocs(e.target.dataset.saleId || '', e.target.files);
    e.target.value = '';
  } else if (id === 'buyerPhotoInput') {
    handleBuyerPhoto(e.target.files && e.target.files[0]);
    e.target.value = '';
  } else if (id === 'clientVaultFileInput') {
    addClientDocuments(e.target.files);
    e.target.value = '';
  } else if (id === 'expenseEvidenceInput') {
    addExpenseEvidence(e.target.files);
    e.target.value = '';
  } else if (id === 'estateDocumentFileInput') {
    handleEstateDocumentFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  } else if (id === 'importFile') {
    handleImportFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  }
});

/* ---------------- Keyboard accessibility and modal escape ---------------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const root = $('#modalRoot');
    if (root && root.innerHTML) {
      if (state.wizard) state.wizard = null;
      closeModal();
    }
    return;
  }
  // Wizard keyboard shortcuts
  if (state.wizard && $('#modalRoot').innerHTML) {
    const w = state.wizard;
    const active = document.activeElement;

    // Enter in step 1/2 continues, in step 3 submits
    if (e.key === 'Enter' && !active.matches('input, textarea, select')) {
      e.preventDefault();
      if (w.step === 1) {
        if (w.plotId) { w.step = 2; updateWizard(); }
      } else if (w.step === 2) {
        if (collectWizardBuyer()) { w.step = 3; updateWizard(); }
      } else if (w.step === 3) {
        handleWizardSubmit();
      }
    }

    // Arrow keys for plot/buyer pickers
    if (w.step === 1 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const picks = $$('.plot-pick');
      if (picks.length) {
        const currentIdx = picks.findIndex(p => p.classList.contains('selected'));
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, picks.length - 1)
          : Math.max(currentIdx - 1, 0);
        picks[nextIdx].click();
        picks[nextIdx].focus();
      }
    }
    if (w.step === 2 && w.buyerMode === 'existing' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const picks = $$('.buyer-existing');
      if (picks.length) {
        const currentIdx = picks.findIndex(p => p.classList.contains('selected'));
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, picks.length - 1)
          : Math.max(currentIdx - 1, 0);
        picks[nextIdx].click();
        picks[nextIdx].focus();
      }
    }

    // Number keys 1-9 for quick plot selection in step 1
    if (w.step === 1 && /^[1-9]$/.test(e.key) && !active.matches('input, textarea, select')) {
      const picks = $$('.plot-pick');
      const idx = parseInt(e.key, 10) - 1;
      if (picks[idx]) { e.preventDefault(); picks[idx].click(); }
    }
  }

  if (e.target && e.target.id === 'paymentPickerSearch' && (e.key === 'Enter' || e.key === 'ArrowDown')) {
    const rows = $$('#paymentPickerList .pay-row');
    if (rows.length) {
      e.preventDefault();
      if (e.key === 'Enter') rows[0].click();
      else rows[0].focus();
    }
  }
  if (e.target && e.target.closest && e.target.closest('#paymentPickerList') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    const rows = $$('#paymentPickerList .pay-row');
    const idx = rows.indexOf(e.target);
    if (idx !== -1) {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(idx + 1, rows.length - 1) : Math.max(idx - 1, 0);
      rows[next].focus();
    }
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.buyer-card')) {
    e.preventDefault();
    e.target.click();
  }
});
