/* LandLedger — modals, toasts, confirmations and the sale wizard */
'use strict';

/* ---------------- Toast ---------------- */
function toast(message, type, undoOpts) {
  const root = $('#toastRoot');
  if (!root) return;
  const kind = type || 'success';
  const el = document.createElement('div');
  const hasUndo = undoOpts && typeof undoOpts.onUndo === 'function';
  el.className = 'toast ' + kind + (hasUndo ? ' undo' : '');
  const ico = kind === 'error' || kind === 'warn' ? 'alert' : 'check';
  let html = '<span class="t-ico">' + icon(ico, 13) + '</span><span>' + esc(message) + '</span>';
  if (hasUndo) {
    html += '<div class="toast-actions">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-toast-undo>' + icon('refresh', 12) + ' Undo</button>' +
    '</div>';
  }
  el.innerHTML = html;
  root.appendChild(el);
  if (hasUndo) {
    el.querySelector('[data-toast-undo]').addEventListener('click', () => {
      undoOpts.onUndo();
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    });
  }
  const timeout = hasUndo ? 8000 : 4300;
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, timeout);
  return el;
}

function toastUndo(message, onUndo, type) {
  return toast(message, type, { onUndo });
}

/* ---------------- Modal shell ---------------- */
function openModal(opts) {
  const root = $('#modalRoot');
  if (!root) return;
  if (root.innerHTML) closeModal();
  state.modalLastFocus = document.activeElement;
  state.modalOnClose = opts.onClose || null;
  const size = opts.size ? ' ' + opts.size : '';
  const head = opts.hideHead
    ? ''
    : '<div class="modal-head"><div class="modal-title"><h2 id="modalTitle">' + esc(opts.title || '') + '</h2>' +
      (opts.subtitle ? '<p>' + esc(opts.subtitle) + '</p>' : '') +
      '</div><button type="button" class="modal-close" data-action="close-modal" aria-label="Close dialog">' + icon('x', 15) + '</button></div>';
  root.innerHTML = '<div class="modal-backdrop" data-modal-backdrop>' +
    '<div class="modal' + size + '" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
      head +
      '<div class="modal-body" id="modalBody">' + (opts.body || '') + '</div>' +
      (opts.footer ? '<div class="modal-foot" id="modalFoot">' + opts.footer + '</div>' : '') +
    '</div>' +
  '</div>';
  document.body.classList.add('modal-open');
  setTimeout(() => {
    const focusTarget = $('#modalBody [autofocus]') || $('#modalBody input:not([type="hidden"]):not([disabled])') || $('#modalBody select:not([disabled])') || $('#modalBody textarea') || $('#modalFoot button');
    if (focusTarget) focusTarget.focus();
  }, 40);
}

function closeModal() {
  const root = $('#modalRoot');
  if (!root || !root.innerHTML) return;
  const callback = state.modalOnClose;
  state.modalOnClose = null;
  root.innerHTML = '';
  document.body.classList.remove('modal-open');
  const focus = state.modalLastFocus;
  state.modalLastFocus = null;
  if (focus && document.contains(focus) && typeof focus.focus === 'function') focus.focus();
  if (callback) callback();
}

function setModalBody(html) {
  const body = $('#modalBody');
  if (body) body.innerHTML = html;
}
function setModalFooter(html) {
  const foot = $('#modalFoot');
  if (foot) foot.innerHTML = html;
}
function setModalTitle(title, subtitle) {
  const titleEl = $('#modalTitle');
  if (titleEl) titleEl.textContent = title;
  const subEl = $('#modalTitle') ? $('#modalTitle').parentElement.querySelector('p') : null;
  if (subEl) subEl.textContent = subtitle || '';
}

/* ---------------- Confirm ---------------- */
function confirmAction(opts) {
  return new Promise((resolve) => {
    state.confirmResolver = resolve;
    const tone = opts.tone || 'danger';
    const ico = tone === 'danger' ? 'alert' : tone === 'warn' ? 'alert' : 'info';
    openModal({
      title: opts.title || 'Please confirm',
      subtitle: '',
      size: 'small',
      body: '<div class="confirm-icon ' + tone + '">' + icon(ico, 22) + '</div>' +
        '<div class="confirm-copy"><p>' + esc(opts.message || '') + '</p></div>',
      footer: '<button type="button" class="btn btn-ghost" data-action="confirm-cancel">Cancel</button>' +
        '<button type="button" class="btn ' + (tone === 'danger' ? 'btn-danger' : 'btn-primary') + '" data-action="confirm-ok">' + esc(opts.confirmText || 'Confirm') + '</button>',
      onClose: () => {
        if (state.confirmResolver) {
          const r = state.confirmResolver;
          state.confirmResolver = null;
          r(false);
        }
      }
    });
  });
}

function resolveConfirm(value) {
  const resolver = state.confirmResolver;
  state.confirmResolver = null;
  closeModal();
  if (resolver) resolver(value);
}

/* ---------------- Shared helpers ---------------- */
function addActivity(type, text, detail, refId) {
  data.activities.unshift({
    id: S.uid('act-'),
    type,
    text,
    detail: detail || '',
    at: new Date().toISOString(),
    refId: refId || null
  });
  data.activities = data.activities.slice(0, 120);
}

function handleSaveResult(result) {
  if (!result) return;
  if (!result.ok) {
    toast('Could not save to this browser. Storage may be full.', 'error');
    return;
  }
  if (result.stripped) toast('Storage is full — document previews were kept as file names only.', 'warn');
}

function fieldError(input, message) {
  if (!input) return;
  const field = input.closest('.field');
  if (!field) return;
  field.classList.add('invalid');
  const error = field.querySelector('.error');
  if (error) error.textContent = message;
  input.focus();
}
function clearFieldErrors(form) {
  if (!form) return;
  $$('.field.invalid', form).forEach((f) => f.classList.remove('invalid'));
}
function inputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function numberValue(id) {
  const el = document.getElementById(id);
  return el ? Number(el.value) : NaN;
}

/* ---------------- New sale wizard ---------------- */
function openNewSale(presetPlotId) {
  if (!requirePermission('sales.create')) return;
  const preset = presetPlotId ? S.plotById(data, presetPlotId) : null;
  const validPreset = preset && preset.status === 'available' ? preset : null;
  state.wizard = {
    step: 1,
    plotId: validPreset ? validPreset.id : null,
    plotQuery: '',
    buyerMode: 'new',
    buyerId: null,
    buyerQuery: '',
    buyer: { name: '', phone: '', email: '', business: '', idType: 'Ghana Card', idNumber: '', nextOfKin: '', nextOfKinPhone: '', address: '', notes: '' },
    sale: {
      date: todayValue(),
      price: validPreset ? validPreset.price : '',
      amount: validPreset ? validPreset.price : '',
      method: 'Mobile Money',
      dueDate: S.addDays(todayValue(), 120),
      notes: ''
    },
    docs: []
  };
  openModal({
    title: 'New sale',
    subtitle: 'Pick a plot, capture the buyer and issue a receipt automatically.',
    size: 'wide',
    body: wizardBodyHTML(),
    footer: wizardFooterHTML()
  });
}

function wizardStepsHTML() {
  const step = state.wizard.step;
  const items = [
    [1, 'Choose plot'],
    [2, 'Buyer details'],
    [3, 'Payment & documents']
  ];
  return '<div class="wizard-steps">' + items.map(([n, label], i) => {
    const cls = step === n ? 'active' : step > n ? 'done' : '';
    return '<div class="wiz-step ' + cls + '"><span class="num">' + (step > n ? icon('check', 11) : n) + '</span><span class="lbl">' + label + '</span></div>' +
      (i < items.length - 1 ? '<span class="wiz-line"></span>' : '');
  }).join('') + '</div>';
}

function wizardPlotMatchesSearch(plot, query) {
  return [plot.code, plot.label, plot.block, 'Block ' + plot.block, plot.size]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function wizardPlotPickerHTML() {
  const query = state.wizard.plotQuery.trim().toLowerCase();
  let plots = data.plots.filter((p) => p.status === 'available').sort((a, b) => a.code.localeCompare(b.code));
  if (query) plots = plots.filter((p) => wizardPlotMatchesSearch(p, query));
  if (!plots.length) {
    const hasAvailablePlots = data.plots.some((plot) => plot.status === 'available');
    return '<div class="empty plot-search-empty"><div class="empty-ico">' + icon('plots') + '</div><h3>' + (hasAvailablePlots ? 'No matching plots' : 'No available plots') + '</h3><p>' + (hasAvailablePlots ? 'Try another plot code, block or size.' : 'Add a plot or change an existing plot back to available.') + '</p>' + (query && hasAvailablePlots ? '<button type="button" class="btn-link" data-action="clear-plot-search">Clear search</button>' : '') + '</div>';
  }
  return plots.map((p) =>
    '<button type="button" class="plot-pick' + (state.wizard.plotId === p.id ? ' selected' : '') + '" data-action="wizard-pick-plot" data-plot-id="' + esc(p.id) + '">' +
      '<span class="plot-pick-title">' + esc(p.label) + '</span><small>Block ' + esc(p.block) + ' · ' + p.size + ' m²</small><strong class="plot-pick-price">' + money(p.price) + '</strong>' +
    '</button>'
  ).join('');
}

function wizardBuyerListHTML() {
  const query = state.wizard.buyerQuery.trim().toLowerCase();
  let buyers = data.buyers.slice().sort((a, b) => a.name.localeCompare(b.name));
  if (query) buyers = buyers.filter((b) => buyerSearchText(b).includes(query));
  const matchCount = buyers.length;
  const visible = buyers.slice(0, 40);
  const resultsMeta = '<div class="buyer-results-meta"><span><strong>' + matchCount + '</strong> ' + (matchCount === 1 ? 'buyer' : 'buyers') + (query ? ' found' : '') + '</span>' +
    (matchCount > visible.length ? '<small>Showing first ' + visible.length + '</small>' : '<small>Choose a buyer to continue</small>') + '</div>';
  if (!visible.length) {
    return resultsMeta + '<div class="buyer-search-empty"><span class="buyer-search-empty-icon">' + icon('search', 18) + '</span><strong>No matching buyers</strong><small>Try another name, phone, email or Ghana Card number.</small><button type="button" class="btn btn-soft btn-sm" data-action="wizard-buyer-mode" data-mode="new">' + icon('plus', 13) + ' Add a new buyer</button></div>';
  }
  return resultsMeta + '<div class="buyer-existing-items">' + visible.map((b) => {
    const selected = state.wizard.buyerId === b.id;
    const secondary = [b.phone, b.email || b.business].filter(Boolean).join(' · ');
    const ownedPlots = salesForBuyer(b.id).length;
    return '<button type="button" class="buyer-existing' + (selected ? ' selected' : '') + '" data-action="wizard-pick-buyer" data-buyer-id="' + esc(b.id) + '" aria-pressed="' + selected + '">' +
      buyerAvatarHTML(b, 'cell-avatar') + '<span class="buyer-existing-copy"><strong>' + esc(b.name) + '</strong><small>' + esc(secondary || 'No contact details') + '</small></span>' +
      '<span class="buyer-existing-meta"><small>' + ownedPlots + ' plot' + (ownedPlots === 1 ? '' : 's') + '</small>' + (selected ? '<span class="buyer-selected-check">' + icon('check', 12) + ' Selected</span>' : icon('chevronRight', 15)) + '</span>' +
    '</button>';
  }).join('') + '</div>';
}

function wizardSelectedPlotHTML() {
  const plot = state.wizard.plotId ? S.plotById(data, state.wizard.plotId) : null;
  if (!plot) return '';
  return '<div class="selected-summary"><span class="ss-ico">' + icon('plots', 17) + '</span><div><strong>' + esc(plot.label) + ' · Block ' + esc(plot.block) + '</strong><small>' + plot.size + ' m² · ' + esc(plot.code) + '</small></div><div class="ss-price">' + money(plot.price) + '<small>asking price</small></div></div>';
}

function wizardBodyHTML() {
  const w = state.wizard;
  if (!w) return '';
  const step = w.step;
  const plot = w.plotId ? S.plotById(data, w.plotId) : null;
  const selectedBuyer = w.buyerMode === 'existing' && w.buyerId ? S.buyerById(data, w.buyerId) : null;
  const price = Number(w.sale.price) || 0;
  const amount = Number(w.sale.amount) || 0;

  let panel = '';
  if (step === 1) {
    panel = '<div class="wizard-panel active"><h3>Which plot is being sold?</h3><p>Only available plots are shown. A plot turns red as soon as the sale is saved.</p>' +
      '<label class="plot-search" for="wizPlotSearch"><span class="plot-search-icon">' + icon('search', 17) + '</span><input type="search" id="wizPlotSearch" value="' + esc(w.plotQuery) + '" placeholder="Search available plots…" autocomplete="off" autofocus><kbd>Search</kbd><button class="plot-search-clear" type="button" data-action="clear-plot-search" aria-label="Clear plot search"' + (w.plotQuery ? '' : ' hidden') + '>' + icon('x', 14) + '</button></label>' +
      '<div class="plot-search-meta"><span>' + (data.plots.filter((plot) => plot.status === 'available').length) + ' plots available</span><span>Search by plot, block, code or size</span></div>' +
      wizardSelectedPlotHTML() +
      '<div class="plot-picker" id="wizPlotPicker">' + wizardPlotPickerHTML() + '</div></div>';
  } else if (step === 2) {
    panel = '<div class="wizard-panel active"><h3>Who is buying?</h3><p>Pick an existing buyer or capture a new buyer record. Name and phone number are required.</p>' +
      '<div class="buyer-toggle"><button type="button" class="' + (w.buyerMode === 'new' ? 'active' : '') + '" data-action="wizard-buyer-mode" data-mode="new">New buyer</button><button type="button" class="' + (w.buyerMode === 'existing' ? 'active' : '') + '" data-action="wizard-buyer-mode" data-mode="existing">Existing buyer</button></div>' +
      (w.buyerMode === 'existing'
        ? '<div class="buyer-search-card"><label class="buyer-search" for="wizBuyerSearch"><span class="buyer-search-icon">' + icon('search', 18) + '</span><input type="search" id="wizBuyerSearch" value="' + esc(w.buyerQuery) + '" placeholder="Search by name, phone, email or ID…" autocomplete="off" aria-label="Search existing buyers"><button type="button" class="buyer-search-clear" data-action="clear-buyer-search" aria-label="Clear buyer search"' + (w.buyerQuery ? '' : ' hidden') + '>' + icon('x', 14) + '</button></label><div class="buyer-search-foot"><span>Search existing buyer records</span><kbd>Enter</kbd></div></div><div class="buyer-existing-list" id="wizBuyerList">' + wizardBuyerListHTML() + '</div>'
        : '<div class="form-grid">' +
            '<div class="field"><label for="wizName">Full name <span class="req">*</span></label><input id="wizName" value="' + esc(w.buyer.name) + '" placeholder="Kwame Mensah" autofocus><span class="error"></span></div>' +
            '<div class="field"><label for="wizPhone">Phone number <span class="req">*</span></label><input id="wizPhone" value="' + esc(w.buyer.phone) + '" placeholder="024 000 0000"><span class="error"></span></div>' +
            '<div class="field"><label for="wizBusiness">Business name</label><input id="wizBusiness" value="' + esc(w.buyer.business) + '" placeholder="Mensah Logistics"></div>' +
            '<div class="field"><label for="wizEmail">Email address</label><input id="wizEmail" type="email" value="' + esc(w.buyer.email) + '" placeholder="name@example.com"></div>' +
            '<div class="field"><label for="wizIdType">ID type</label><select id="wizIdType">' + ['Ghana Card', 'Passport', 'Voter ID', 'Driver’s Licence'].map((t) => '<option' + (w.buyer.idType === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
            '<div class="field"><label for="wizIdNumber">ID number</label><input id="wizIdNumber" value="' + esc(w.buyer.idNumber) + '" placeholder="GHA-000000000-0"></div>' +
            '<div class="field"><label for="wizNok">Next of kin</label><input id="wizNok" value="' + esc(w.buyer.nextOfKin) + '" placeholder="Ama Mensah"></div>' +
            '<div class="field"><label for="wizNokPhone">Next of kin phone</label><input id="wizNokPhone" value="' + esc(w.buyer.nextOfKinPhone) + '" placeholder="024 000 0000"></div>' +
            '<div class="field full"><label for="wizAddress">Address</label><input id="wizAddress" value="' + esc(w.buyer.address) + '" placeholder="East Legon, Accra"></div>' +
          '</div>') +
      (selectedBuyer ? '<div class="selected-summary buyer-selected-summary"><span class="ss-ico">' + icon('user', 17) + '</span><div><small class="buyer-selected-label">Selected buyer</small><strong>' + esc(selectedBuyer.name) + '</strong><small>' + esc(selectedBuyer.phone) + (selectedBuyer.business ? ' · ' + esc(selectedBuyer.business) : '') + '</small></div><span class="buyer-selected-check">' + icon('check', 12) + ' Ready</span></div>' : '') +
    '</div>';
  } else {
    panel = '<div class="wizard-panel active"><h3>Payment and documents</h3><p>Set the sale price, record any deposit and attach the buyer’s ID or indenture. A receipt is issued automatically.</p>' +
      (plot ? '<div class="selected-summary"><span class="ss-ico">' + icon('plots', 17) + '</span><div><strong>' + esc(plot.label) + ' · Block ' + esc(plot.block) + '</strong><small>' + plot.size + ' m² · ' + esc(plot.code) + '</small></div><div class="ss-price">' + money(plot.price) + '<small>asking</small></div></div>' : '') +
      '<div class="form-grid">' +
        '<div class="field"><label for="wizDate">Sale date <span class="req">*</span></label><input id="wizDate" type="date" value="' + esc(w.sale.date) + '"><span class="error"></span></div>' +
        '<div class="field"><label for="wizDue">Payment due date</label><input id="wizDue" type="date" value="' + esc(w.sale.dueDate) + '"></div>' +
        '<div class="field"><label for="wizPrice">Sale price (GH₵) <span class="req">*</span></label><input id="wizPrice" type="number" min="0" step="500" value="' + esc(w.sale.price) + '"><span class="error"></span></div>' +
        '<div class="field"><label for="wizAmount">Amount paid now (GH₵)</label><input id="wizAmount" type="number" min="0" step="500" value="' + esc(w.sale.amount) + '"><span class="error"></span></div>' +
        '<div class="field"><label for="wizMethod">Payment method</label><select id="wizMethod">' + ['Mobile Money', 'Bank transfer', 'Cash', 'Cheque'].map((m) => '<option' + (w.sale.method === m ? ' selected' : '') + '>' + m + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Payment plan</label><input value="' + (amount >= price && price > 0 ? 'Full payment' : 'Installments') + '" disabled></div>' +
        '<div class="field full"><label for="wizNotes">Notes</label><textarea id="wizNotes" placeholder="Anything to remember about this sale…">' + esc(w.sale.notes) + '</textarea></div>' +
      '</div>' +
      '<div class="upload-box" style="margin-top:14px" data-action="add-wizard-doc">' + icon('upload', 21) + '<strong>Attach ID or documents</strong><small>PDF, JPG or PNG · up to 1 MB each</small><input type="file" id="wizDocInput" accept="image/*,.pdf" multiple hidden></div>' +
      '<div class="doc-list">' + (w.docs.length ? w.docs.map((doc) =>
        '<div class="doc-item">' + icon('paperclip', 14) + '<span>' + esc(doc.name) + '</span><small>' + fmtBytes(doc.size) + '</small><button type="button" data-action="remove-wizard-doc" data-doc-id="' + esc(doc.id) + '" aria-label="Remove document">' + icon('x', 13) + '</button></div>'
      ).join('') : '') + '</div>' +
      '<div class="review-box" style="margin-top:16px"><div class="review-row"><span>Plot</span><strong>' + esc(plot ? plot.label : '—') + '</strong></div><div class="review-row"><span>Buyer</span><strong>' + esc(selectedBuyer ? selectedBuyer.name : w.buyer.name || '—') + '</strong></div><div class="review-row"><span>Sale price</span><strong>' + money(price) + '</strong></div><div class="review-row"><span>Paid now</span><strong>' + money(amount) + '</strong></div><div class="review-row total"><span>Balance</span><strong>' + money(Math.max(0, price - amount)) + '</strong></div></div>' +
    '</div>';
  }

  return wizardStepsHTML() + '<form id="wizardForm" novalidate>' + panel + '</form>';
}

function wizardFooterHTML() {
  const step = state.wizard ? state.wizard.step : 1;
  const back = step > 1 ? '<button type="button" class="btn btn-ghost" data-action="wizard-back">' + icon('chevronLeft', 14) + ' Back</button>' : '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>';
  const nextLabel = step === 3 ? 'Save & issue receipt' : 'Continue';
  return '<span class="left" style="font-size:10.5px;color:var(--muted);font-weight:650">Step ' + step + ' of 3</span>' + back +
    '<button type="submit" form="wizardForm" class="btn btn-primary">' + (step === 3 ? icon('check', 15) : '') + nextLabel + (step < 3 ? ' ' + icon('arrowRight', 14) : '') + '</button>';
}

function updateWizard() {
  if (!state.wizard) return;
  const body = $('#modalBody');
  if (body) body.innerHTML = wizardBodyHTML();
  const foot = $('#modalFoot');
  if (foot) foot.innerHTML = wizardFooterHTML();
}

function collectWizardBuyer() {
  const w = state.wizard;
  if (w.buyerMode === 'existing') {
    if (!w.buyerId) {
      toast('Choose an existing buyer, or switch to “New buyer”.', 'warn');
      return false;
    }
    return true;
  }
  clearFieldErrors($('#wizardForm'));
  const nameInput = $('#wizName');
  const phoneInput = $('#wizPhone');
  const name = inputValue('wizName');
  const phone = inputValue('wizPhone');
  let ok = true;
  if (!name) { fieldError(nameInput, 'Enter the buyer’s full name.'); ok = false; }
  if (!phone || phone.replace(/\D/g, '').length < 9) { fieldError(phoneInput, 'Enter a valid phone number.'); ok = false; }
  if (!ok) return false;
  w.buyer = {
    name,
    phone,
    email: inputValue('wizEmail'),
    business: inputValue('wizBusiness'),
    idType: $('#wizIdType') ? $('#wizIdType').value : 'Ghana Card',
    idNumber: inputValue('wizIdNumber'),
    nextOfKin: inputValue('wizNok'),
    nextOfKinPhone: inputValue('wizNokPhone'),
    address: inputValue('wizAddress'),
    notes: w.buyer.notes || ''
  };
  return true;
}

function collectWizardSale() {
  const w = state.wizard;
  clearFieldErrors($('#wizardForm'));
  const priceInput = $('#wizPrice');
  const amountInput = $('#wizAmount');
  const dateInput = $('#wizDate');
  const price = numberValue('wizPrice');
  const amount = numberValue('wizAmount');
  let ok = true;
  if (!inputValue('wizDate')) { fieldError(dateInput, 'Choose the sale date.'); ok = false; }
  if (!Number.isFinite(price) || price <= 0) { fieldError(priceInput, 'Enter a sale price greater than zero.'); ok = false; }
  if (!Number.isFinite(amount) || amount < 0) { fieldError(amountInput, 'Enter a valid amount paid.'); ok = false; }
  else if (price > 0 && amount > price) { fieldError(amountInput, 'Amount paid cannot be more than the sale price.'); ok = false; }
  if (!ok) return false;
  w.sale = {
    date: inputValue('wizDate'),
    dueDate: inputValue('wizDue') || S.addDays(inputValue('wizDate'), 120),
    price,
    amount,
    method: $('#wizMethod') ? $('#wizMethod').value : 'Mobile Money',
    notes: inputValue('wizNotes')
  };
  return true;
}

function handleWizardSubmit() {
  if (!requirePermission('sales.create')) return;
  const w = state.wizard;
  if (!w) return;
  if (w.step === 1) {
    if (!w.plotId) { toast('Choose a plot to continue.', 'warn'); return; }
    const plot = S.plotById(data, w.plotId);
    if (!plot || plot.status !== 'available') {
      toast('That plot is no longer available. Choose another plot.', 'warn');
      w.plotId = null;
      updateWizard();
      return;
    }
    if (!w.sale.price) w.sale.price = plot.price;
    if (!w.sale.amount && w.sale.amount !== 0) w.sale.amount = plot.price;
    w.step = 2;
    updateWizard();
    return;
  }
  if (w.step === 2) {
    if (!collectWizardBuyer()) return;
    w.step = 3;
    updateWizard();
    return;
  }
  if (!collectWizardSale()) return;
  createSaleFromWizard();
}

function snapshotWizard() {
  const w = state.wizard;
  if (!w) return;
  if (w.step === 2 && w.buyerMode === 'new' && $('#wizName')) {
    w.buyer = {
      name: inputValue('wizName'),
      phone: inputValue('wizPhone'),
      email: inputValue('wizEmail'),
      business: inputValue('wizBusiness'),
      idType: $('#wizIdType') ? $('#wizIdType').value : w.buyer.idType,
      idNumber: inputValue('wizIdNumber'),
      nextOfKin: inputValue('wizNok'),
      nextOfKinPhone: inputValue('wizNokPhone'),
      address: inputValue('wizAddress'),
      notes: w.buyer.notes || ''
    };
  }
  if (w.step === 3 && $('#wizPrice')) {
    w.sale = {
      date: inputValue('wizDate') || w.sale.date,
      dueDate: inputValue('wizDue') || w.sale.dueDate,
      price: numberValue('wizPrice'),
      amount: numberValue('wizAmount'),
      method: $('#wizMethod') ? $('#wizMethod').value : w.sale.method,
      notes: inputValue('wizNotes')
    };
  }
}

function wizardBack() {
  if (!state.wizard) return;
  snapshotWizard();
  if (state.wizard.step > 1) state.wizard.step -= 1;
  updateWizard();
}

function wizardPickPlot(plotId) {
  const plot = S.plotById(data, plotId);
  if (!plot || plot.status !== 'available') return;
  state.wizard.plotId = plotId;
  state.wizard.sale.price = plot.price;
  state.wizard.sale.amount = plot.price;
  updateWizard();
}

function wizardPickBuyer(buyerId) {
  state.wizard.buyerId = buyerId;
  updateWizard();
}

function wizardSetBuyerMode(mode) {
  state.wizard.buyerMode = mode;
  updateWizard();
}

function createSaleFromWizard() {
  if (!requirePermission('sales.create')) return;
  const w = state.wizard;
  const plot = S.plotById(data, w.plotId);
  if (!plot || plot.status !== 'available') {
    toast('That plot is no longer available. Choose another plot.', 'warn');
    w.step = 1;
    w.plotId = null;
    updateWizard();
    return;
  }

  const previous = {
    buyers: data.buyers.slice(),
    sales: data.sales.slice(),
    payments: data.payments.slice(),
    activities: (data.activities || []).slice(),
    saleSeq: data.settings.saleSeq,
    plot: { status: plot.status, buyerId: plot.buyerId, saleId: plot.saleId }
  };
  const financeSnapshot = window.FinanceApp ? FinanceApp.snapshot(data) : null;
  const rollbackWizardSale = () => {
    data.buyers = previous.buyers;
    data.sales = previous.sales;
    data.payments = previous.payments;
    data.activities = previous.activities;
    data.settings.saleSeq = previous.saleSeq;
    plot.status = previous.plot.status;
    plot.buyerId = previous.plot.buyerId;
    plot.saleId = previous.plot.saleId;
    if (window.FinanceApp) FinanceApp.restore(data, financeSnapshot);
  };

  let buyer = null;
  if (w.buyerMode === 'existing') {
    buyer = S.buyerById(data, w.buyerId);
    if (!buyer) { toast('The selected buyer could not be found.', 'error'); return; }
  } else {
    buyer = {
      id: S.uid('buyer-'),
      name: w.buyer.name,
      phone: w.buyer.phone,
      email: w.buyer.email,
      business: w.buyer.business,
      idType: w.buyer.idType,
      idNumber: w.buyer.idNumber,
      nextOfKin: w.buyer.nextOfKin,
      nextOfKinPhone: w.buyer.nextOfKinPhone,
      address: w.buyer.address,
      notes: '',
      createdAt: todayValue()
    };
    data.buyers.push(buyer);
  }

  const receiptNo = S.nextReceipt(data, w.sale.date);
  const sale = {
    id: S.uid('sale-'),
    receiptNo,
    seq: data.settings.saleSeq,
    plotId: plot.id,
    buyerId: buyer.id,
    date: w.sale.date,
    price: w.sale.price,
    dueDate: w.sale.dueDate,
    paymentPlan: w.sale.amount >= w.sale.price ? 'Full payment' : 'Installments',
    notes: w.sale.notes,
    docs: w.docs.slice(),
    createdAt: new Date().toISOString()
  };
  data.sales.push(sale);

  let payment = null;
  if (w.sale.amount > 0) {
    payment = {
      id: S.uid('pay-'),
      saleId: sale.id,
      amount: w.sale.amount,
      date: w.sale.date,
      method: w.sale.method,
      note: w.sale.amount >= w.sale.price ? 'Full payment' : 'Deposit',
      createdAt: new Date().toISOString()
    };
    data.payments.push(payment);
  }

  plot.status = 'sold';
  plot.buyerId = buyer.id;
  plot.saleId = sale.id;

  try {
    if (window.FinanceApp) {
      FinanceApp.recordSale(data, sale);
      if (payment) FinanceApp.recordPayment(data, payment);
    }
  } catch (err) {
    rollbackWizardSale();
    toast(err && err.message ? err.message : 'The sale could not be posted to the ledger.', 'error');
    return;
  }

  addActivity('sale', 'Sold ' + plot.label + ' to ' + buyer.name, receiptNo + ' · ' + money(sale.price), sale.id);
  if (w.sale.amount > 0) {
    addActivity('payment', 'Payment received from ' + buyer.name, money(w.sale.amount) + ' · ' + w.sale.method, sale.id);
  }

  const result = S.save(data);
  if (!result.ok) {
    rollbackWizardSale();
    handleSaveResult(result);
    return;
  }
  handleSaveResult(result);
  if (window.Notify) {
    Notify.event('sale', 'New sale · ' + plot.label + ' to ' + buyer.name + ' · ' + money(sale.price) + ' · ' + receiptNo);
    if (payment) Notify.event('payment', 'Payment received · ' + buyer.name + ' · ' + money(w.sale.amount) + ' · ' + w.sale.method);
  }
  state.wizard = null;
  closeModal();
  refresh();
  showSaleSuccess(sale.id);
  toast('Sale recorded. Receipt ' + receiptNo + ' created.');
}

function showSaleSuccess(saleId) {
  const sale = S.decorateSale(data, S.saleById(data, saleId));
  if (!sale) return;
  openModal({
    title: 'Sale recorded',
    subtitle: 'The plot is now marked as sold and a receipt has been issued.',
    size: 'small',
    body: '<div class="confirm-icon info" style="background:var(--accent-soft);color:var(--accent-ink);margin-bottom:14px">' + icon('checkCircle', 24) + '</div>' +
      '<div class="review-box"><div class="review-row"><span>Receipt</span><strong>' + esc(sale.receiptNo) + '</strong></div>' +
      '<div class="review-row"><span>Buyer</span><strong>' + esc(sale.buyer.name) + '</strong></div>' +
      '<div class="review-row"><span>Plot</span><strong>' + esc(sale.plot.label) + '</strong></div>' +
      '<div class="review-row"><span>Paid now</span><strong>' + money(sale.paid) + '</strong></div>' +
      '<div class="review-row total"><span>Balance</span><strong>' + money(sale.balance) + '</strong></div></div>' +
      '<p class="review-note">You can print or send the receipt now, or find it any time under Receipts.</p>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Done</button><button type="button" class="btn btn-primary" data-action="open-receipt" data-sale-id="' + esc(sale.id) + '">' + icon('receipts', 15) + ' View receipt</button>'
  });
}

function handleWizardDocs(files) {
  if (!requirePermission('documents.manage')) return;
  if (!state.wizard || !files || !files.length) return;
  Array.from(files).forEach((file) => {
    const doc = {
      id: S.uid('doc-'),
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: null,
      addedAt: new Date().toISOString()
    };
    if (file.size > 1024 * 1024) {
      state.wizard.docs.push(doc);
      toast(file.name + ' is over 1 MB — saved as a file reference only.', 'warn');
      updateWizard();
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        doc.dataUrl = reader.result;
        state.wizard.docs.push(doc);
        updateWizard();
      };
      reader.onerror = () => {
        state.wizard.docs.push(doc);
        updateWizard();
        toast('Could not read ' + file.name + '.', 'error');
      };
      reader.readAsDataURL(file);
    }
  });
}
