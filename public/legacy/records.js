/* LandLedger — sale, payment, buyer, plot, message and print actions */
'use strict';

/* ---------------- Sale detail ---------------- */
function openSaleDetail(saleId) {
  const sale = S.decorateSale(data, S.saleById(data, saleId));
  if (!sale) { toast('Sale not found.', 'error'); return; }
  const buyer = sale.buyer || {};
  const plot = sale.plot || {};
  const payments = sale.payments || [];
  const docs = sale.docs || [];

  const body = '<div class="detail-hero">' +
      buyerAvatarHTML(buyer, 'cell-avatar') +
      '<div class="detail-hero-copy"><strong>' + esc(buyer.name || 'Unknown buyer') + '</strong><small>' + esc(sale.receiptNo) + ' · ' + esc(fmtDate(sale.date)) + '</small></div>' +
      '<div class="dh-amt"><strong>' + money(sale.balance) + '</strong><small>outstanding</small></div>' +
    '</div>' +
    '<div class="detail-grid">' +
      '<div class="detail-cell"><small>Plot</small><strong>' + esc(plot.label || '—') + ' · Block ' + esc(plot.block || '—') + '</strong></div>' +
      '<div class="detail-cell"><small>Status</small><strong>' + statusBadge(sale.status) + '</strong></div>' +
      '<div class="detail-cell"><small>Sale price</small><strong>' + money(sale.price) + '</strong></div>' +
      '<div class="detail-cell"><small>Amount paid</small><strong>' + money(sale.paid) + '</strong></div>' +
      '<div class="detail-cell"><small>Sale date</small><strong>' + esc(fmtDate(sale.date)) + '</strong></div>' +
      '<div class="detail-cell"><small>Payment due</small><strong>' + esc(fmtDate(sale.dueDate)) + '</strong></div>' +
    '</div>' +
    '<div class="detail-section"><div class="detail-section-head"><h4>Payments</h4>' + (sale.balance > 0 ? '<button type="button" class="btn-link" data-action="record-payment" data-sale-id="' + esc(sale.id) + '">' + icon('plus', 12) + ' Record payment</button>' : '') + '</div>' +
      (payments.length
        ? '<div class="pay-list">' + payments.map((p) => '<div class="pay-row"><span class="pay-ico">' + icon('banknote', 12) + '</span><div class="pay-copy"><strong>' + money(p.amount) + ' · ' + esc(p.method) + '</strong><small>' + esc(fmtDate(p.date)) + ' · ' + esc(p.note || 'Payment received') + '</small></div><span class="pay-amt">' + esc(fmtDateShort(p.date)) + '</span></div>').join('') + '</div>'
        : '<div class="empty" style="padding:22px;border:1px dashed var(--line);border-radius:10px"><p>No payments recorded yet.</p></div>') +
      '<div class="balance-strip"><div><small>Balance outstanding</small><strong class="' + (sale.balance > 0 ? 'due' : '') + '">' + money(sale.balance) + '</strong></div>' +
        (sale.balance > 0 ? '<button type="button" class="btn btn-primary btn-sm" data-action="record-payment" data-sale-id="' + esc(sale.id) + '">' + icon('wallet', 14) + ' Add payment</button>' : '<span class="badge paid">Paid in full</span>') +
      '</div>' +
    '</div>' +
    '<div class="detail-section"><div class="detail-section-head"><h4>Documents</h4><button type="button" class="btn-link" data-action="add-sale-doc" data-sale-id="' + esc(sale.id) + '">' + icon('paperclip', 12) + ' Attach</button></div>' +
      '<input type="file" id="saleDocInput" accept="image/*,.pdf" multiple hidden data-sale-id="' + esc(sale.id) + '">' +
      '<div class="detail-docs">' + (docs.length ? docs.map((doc) =>
        '<div class="doc-item">' + icon('file', 14) + '<span>' + esc(doc.name) + '</span><small>' + fmtBytes(doc.size || 0) + '</small>' +
          (doc.dataUrl ? '<a class="doc-open" href="' + esc(doc.dataUrl) + '" target="_blank" rel="noopener" title="Open document" download="' + esc(doc.name) + '">' + icon('external', 13) + '</a>' : '') +
          '<button type="button" data-action="remove-sale-doc" data-sale-id="' + esc(sale.id) + '" data-doc-id="' + esc(doc.id) + '" aria-label="Remove document">' + icon('x', 13) + '</button>' +
        '</div>'
      ).join('') : '<div class="empty" style="padding:18px;border:1px dashed var(--line);border-radius:10px"><p>No documents attached.</p></div>') + '</div>' +
    '</div>' +
    (sale.notes ? '<div class="detail-section"><div class="detail-section-head"><h4>Notes</h4></div><div class="review-box"><p style="font-size:11.5px;color:var(--muted);line-height:1.55">' + esc(sale.notes) + '</p></div></div>' : '') +
    '<div style="margin-top:18px;text-align:right"><button type="button" class="btn-link" style="color:var(--red-ink)" data-action="void-sale" data-sale-id="' + esc(sale.id) + '">' + icon('trash', 12) + ' Void this sale</button></div>';

  openModal({
    title: sale.receiptNo,
    subtitle: (buyer.name || 'Unknown buyer') + ' · ' + (plot.label || 'Plot') + ' · ' + fmtDate(sale.date),
    size: 'wide',
    body,
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Close</button>' +
      '<button type="button" class="btn btn-ghost" data-action="print-receipt" data-sale-id="' + esc(sale.id) + '">' + icon('printer', 14) + ' Print</button>' +
      '<button type="button" class="btn btn-soft" data-action="send-receipt" data-sale-id="' + esc(sale.id) + '" data-mode="receipt">' + icon('send', 14) + ' Send</button>' +
      (sale.balance > 0 ? '<button type="button" class="btn btn-primary" data-action="record-payment" data-sale-id="' + esc(sale.id) + '">' + icon('wallet', 14) + ' Record payment</button>' : '')
  });
}

/* ---------------- Payments ---------------- */
function openPaymentPicker() {
  if (!requirePermission('payments.record')) return;
  state.paymentQuery = '';
  openModal({
    title: 'Record a payment',
    subtitle: 'Choose the sale you want to add a payment to.',
    size: 'wide',
    body: '<div class="pay-picker">' +
        '<div class="pay-search">' +
          '<span class="pay-search-ico">' + icon('search', 18) + '</span>' +
          '<input type="search" id="paymentPickerSearch" value="' + esc(state.paymentQuery) + '" placeholder="Search by buyer, plot or receipt number" autocomplete="off" autofocus aria-label="Search outstanding sales">' +
          '<span class="pay-search-hint"><kbd>Enter</kbd> to pick the first result</span>' +
        '</div>' +
        '<div class="pay-summary" id="paymentPickerMeta">' + paymentPickerMetaHTML() + '</div>' +
        '<div class="pay-table" role="table" aria-label="Sales with an outstanding balance">' +
          '<div class="pay-table-head" role="row">' +
            '<span role="columnheader">Buyer</span>' +
            '<span role="columnheader">Plot</span>' +
            '<span role="columnheader">Status</span>' +
            '<span role="columnheader" class="num">Balance</span>' +
            '<span aria-hidden="true"></span>' +
          '</div>' +
          '<div class="pay-table-body" id="paymentPickerList" role="rowgroup">' + paymentPickerListHTML() + '</div>' +
        '</div>' +
      '</div>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>'
  });
}

function paymentPickerSales() {
  const query = (state.paymentQuery || '').trim().toLowerCase();
  let sales = S.decoratedSales(data).filter((s) => s.balance > 0);
  if (query) sales = sales.filter((s) => saleSearchText(s).includes(query));
  sales.sort((a, b) => (b.daysOverdue - a.daysOverdue) || (S.parseDate(a.dueDate) - S.parseDate(b.dueDate)));
  return sales;
}

function paymentPickerMetaHTML() {
  const sales = paymentPickerSales();
  if (!sales.length) return '';
  const overdue = sales.filter((s) => s.status === 'overdue').length;
  const total = sales.reduce((sum, sale) => sum + sale.balance, 0);
  const query = (state.paymentQuery || '').trim();
  return '<span>' + (query ? '<strong>' + sales.length + '</strong> ' + (sales.length === 1 ? 'match' : 'matches') : '<strong>' + sales.length + '</strong> ' + (sales.length === 1 ? 'sale' : 'sales') + ' with a balance') + '</span>' +
    '<span class="pay-summary-right">' + (overdue ? '<span class="pay-summary-overdue">' + overdue + ' overdue</span>' : '') + '<strong>' + money(total) + '</strong> outstanding</span>';
}

function paymentPickerListHTML() {
  const sales = paymentPickerSales();
  const query = (state.paymentQuery || '').trim();
  if (!sales.length) {
    return '<div class="pay-empty"><div class="empty-ico">' + icon(query ? 'search' : 'checkCircle') + '</div><h3>' + (query ? 'No matching sales' : 'Every sale is fully paid') + '</h3><p>' + (query ? 'Try a buyer name, plot number or receipt number.' : 'There are no outstanding balances right now.') + '</p></div>';
  }
  return sales.map((sale) => {
    const overdue = sale.status === 'overdue';
    const buyerName = sale.buyer ? sale.buyer.name : 'Unknown buyer';
    const plotLabel = sale.plot ? sale.plot.label : '—';
    const plotSize = sale.plot && sale.plot.size ? sale.plot.size + ' sqm' : '';
    const statusText = overdue ? sale.daysOverdue + (sale.daysOverdue === 1 ? ' day overdue' : ' days overdue') : 'Due ' + fmtDate(sale.dueDate);
    return '<button type="button" class="pay-row" data-action="record-payment" data-sale-id="' + esc(sale.id) + '" role="row">' +
      '<span class="pay-person" role="cell">' +
        '<span class="pay-avatar' + (overdue ? ' is-overdue' : '') + '">' + esc(initials(buyerName)) + '</span>' +
        '<span class="pay-copy"><strong>' + esc(buyerName) + '</strong><small>' + esc(sale.receiptNo) + '</small></span>' +
      '</span>' +
      '<span class="pay-plot" role="cell"><strong>' + esc(plotLabel) + '</strong><small>' + esc(plotSize) + '</small></span>' +
      '<span class="pay-status" role="cell"><span class="badge ' + (overdue ? 'overdue' : 'neutral') + '">' + esc(statusText) + '</span></span>' +
      '<span class="pay-amt" role="cell"><strong>' + money(sale.balance) + '</strong><small>outstanding</small></span>' +
      '<span class="pay-chev" aria-hidden="true">' + icon('chevronRight', 16) + '</span>' +
    '</button>';
  }).join('');
}

function openPaymentForm(saleId) {
  if (!requirePermission('payments.record')) return;
  const sale = S.decorateSale(data, S.saleById(data, saleId));
  if (!sale) { toast('Sale not found.', 'error'); return; }
  if (sale.balance <= 0) { toast('This sale is already fully paid.', 'warn'); return; }
  openModal({
    title: 'Record payment',
    subtitle: (sale.buyer ? sale.buyer.name : 'Buyer') + ' · ' + (sale.plot ? sale.plot.label : '') + ' · ' + sale.receiptNo,
    size: 'small',
    body: '<div class="selected-summary"><span class="ss-ico">' + icon('wallet', 17) + '</span><div><strong>' + money(sale.balance) + ' outstanding</strong><small>Sale price ' + money(sale.price) + ' · paid ' + money(sale.paid) + '</small></div></div>' +
      '<form id="payment-form" novalidate><input type="hidden" id="paySaleId" value="' + esc(sale.id) + '"><div class="form-grid">' +
        '<div class="field full"><label for="payAmount">Amount (GH₵) <span class="req">*</span></label><input id="payAmount" type="number" min="0" step="500" value="' + esc(sale.balance) + '" autofocus><span class="error"></span></div>' +
        '<div class="field"><label for="payDate">Payment date</label><input id="payDate" type="date" value="' + todayValue() + '"></div>' +
        '<div class="field"><label for="payMethod">Method</label><select id="payMethod">' + ['Mobile Money', 'Bank transfer', 'Cash', 'Cheque'].map((m) => '<option>' + m + '</option>').join('') + '</select></div>' +
        '<div class="field full"><label for="payNote">Note</label><input id="payNote" placeholder="e.g. second installment"></div>' +
      '</div></form>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button type="submit" form="payment-form" class="btn btn-primary">' + icon('check', 15) + ' Save payment</button>'
  });
}

function savePaymentFromForm() {
  if (!requirePermission('payments.record')) return;
  clearFieldErrors($('#payment-form'));
  const saleId = $('#paySaleId') ? $('#paySaleId').value : '';
  const sale = S.decorateSale(data, S.saleById(data, saleId));
  if (!sale) { toast('Sale not found.', 'error'); return; }
  const amount = numberValue('payAmount');
  const amountInput = $('#payAmount');
  if (!Number.isFinite(amount) || amount <= 0) { fieldError(amountInput, 'Enter an amount greater than zero.'); return; }
  if (amount > sale.balance + 0.01) { fieldError(amountInput, 'Amount cannot be more than the ' + money(sale.balance) + ' balance.'); return; }
  const date = inputValue('payDate') || todayValue();
  const method = $('#payMethod') ? $('#payMethod').value : 'Mobile Money';
  const note = inputValue('payNote') || (amount >= sale.balance ? 'Final payment' : 'Installment');
  const payment = {
    id: S.uid('pay-'),
    saleId: sale.id,
    amount,
    date,
    method,
    note,
    createdAt: new Date().toISOString()
  };
  const financeSnapshot = window.FinanceApp ? FinanceApp.snapshot(data) : null;
  const previousActivities = (data.activities || []).slice();

  data.payments.push(payment);
  try {
    if (window.FinanceApp) FinanceApp.recordPayment(data, payment);
  } catch (err) {
    data.payments = data.payments.filter((item) => item.id !== payment.id);
    if (window.FinanceApp) FinanceApp.restore(data, financeSnapshot);
    toast(err && err.message ? err.message : 'The payment could not be posted to the ledger.', 'error');
    return;
  }

  addActivity('payment', 'Payment received from ' + (sale.buyer ? sale.buyer.name : 'buyer'), money(amount) + ' · ' + method, sale.id);
  const result = S.save(data);
  if (!result.ok) {
    data.payments = data.payments.filter((item) => item.id !== payment.id);
    data.activities = previousActivities;
    if (window.FinanceApp) FinanceApp.restore(data, financeSnapshot);
    handleSaveResult(result);
    return;
  }
  handleSaveResult(result);
  if (window.Notify) Notify.event('payment', 'Payment received · ' + (sale.buyer ? sale.buyer.name : 'Buyer') + ' · ' + money(amount) + ' · ' + method);
  closeModal();
  refresh();
  toast(amount >= sale.balance ? 'Sale fully paid. Receipt updated.' : 'Payment recorded.');
  openSaleDetail(sale.id);
}

/* ---------------- Buyers ---------------- */
function openBuyerDetail(buyerId) {
  const buyer = S.buyerById(data, buyerId);
  if (!buyer) { toast('Buyer not found.', 'error'); return; }
  const sales = salesForBuyer(buyerId).sort((a, b) => S.parseDate(b.date) - S.parseDate(a.date));
  const balance = sales.reduce((sum, sale) => sum + sale.balance, 0);
  const portfolioValue = sales.reduce((sum, sale) => sum + sale.price, 0);
  const amountPaid = sales.reduce((sum, sale) => sum + sale.paid, 0);
  const last = sales[0];
  const profileStatus = balance > 0
    ? '<span class="profile-status due"><i></i> Balance due</span>'
    : '<span class="profile-status clear"><i></i> In good standing</span>';

  const body = '<div class="buyer-profile">' +
      '<div class="buyer-profile-head">' +
        buyerAvatarHTML(buyer, 'buyer-profile-avatar') +
        '<div class="buyer-profile-identity"><span class="profile-kicker">BUYER PROFILE</span><h3>' + esc(buyer.name) + '</h3>' +
          '<p>' + esc(buyer.business || 'Individual buyer') + (buyer.address ? ' <span>·</span> ' + esc(buyer.address) : '') + '</p>' +
          profileStatus +
        '</div>' +
        '<div class="buyer-profile-since"><small>CLIENT SINCE</small><strong>' + esc(fmtDate(buyer.createdAt)) + '</strong></div>' +
      '</div>' +
      '<div class="buyer-profile-actions">' +
        (buyer.phone ? '<a class="btn btn-soft btn-sm" href="' + esc(phoneHref(buyer.phone)) + '">' + icon('phone', 13) + ' Call</a>' : '') +
        (buyer.phone ? '<button type="button" class="btn btn-ghost btn-sm" data-action="message-buyer" data-buyer-id="' + esc(buyer.id) + '">' + icon('message', 13) + ' Message</button>' : '') +
        (buyer.phone ? '<button type="button" class="btn btn-ghost btn-sm" data-action="whatsapp-buyer" data-buyer-id="' + esc(buyer.id) + '">' + icon('whatsapp', 13) + ' WhatsApp</button>' : '') +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="buyer-statement" data-buyer-id="' + esc(buyer.id) + '">' + icon('receipts', 13) + ' Account statement</button>' +
        (can('complaints.manage') ? '<button type="button" class="btn btn-ghost btn-sm" data-action="add-complaint" data-buyer-id="' + esc(buyer.id) + '">' + icon('message', 13) + ' Log complaint</button>' : '') +
      '</div>' +
    '</div>' +
    '<div class="buyer-profile-stats">' +
      '<div class="profile-stat"><span class="profile-stat-icon">' + icon('plots', 14) + '</span><small>Plots owned</small><strong>' + sales.length + '</strong></div>' +
      '<div class="profile-stat"><span class="profile-stat-icon">' + icon('wallet', 14) + '</span><small>Portfolio value</small><strong>' + money(portfolioValue) + '</strong></div>' +
      '<div class="profile-stat"><span class="profile-stat-icon">' + icon('checkCircle', 14) + '</span><small>Total paid</small><strong>' + money(amountPaid) + '</strong></div>' +
      '<div class="profile-stat ' + (balance > 0 ? 'is-due' : '') + '"><span class="profile-stat-icon">' + icon('calendar', 14) + '</span><small>Outstanding</small><strong>' + money(balance) + '</strong></div>' +
    '</div>' +
    '<div class="buyer-profile-columns">' +
      '<section class="profile-panel"><div class="profile-panel-head"><span class="profile-panel-icon">' + icon('buyers', 14) + '</span><div><h4>Personal details</h4><p>Contact and identification</p></div></div>' +
        '<div class="profile-facts">' +
          '<div><small>Phone</small><strong>' + esc(buyer.phone || 'Not provided') + '</strong></div>' +
          '<div><small>Email</small><strong>' + esc(buyer.email || 'Not provided') + '</strong></div>' +
          '<div><small>Business</small><strong>' + esc(buyer.business || 'Individual') + '</strong></div>' +
          '<div><small>Identification</small><strong>' + esc(buyer.idType || 'ID') + ' · ' + esc(buyer.idNumber || 'Not provided') + '</strong></div>' +
          '<div><small>Next of kin</small><strong>' + esc(buyer.nextOfKin || 'Not provided') + '</strong></div>' +
          '<div><small>Next of kin phone</small><strong>' + esc(buyer.nextOfKinPhone || 'Not provided') + '</strong></div>' +
          '<div class="profile-fact-wide"><small>Address</small><strong>' + esc(buyer.address || 'Not provided') + '</strong></div>' +
        '</div>' +
      '</section>' +
      '<section class="profile-panel profile-activity"><div class="profile-panel-head"><span class="profile-panel-icon">' + icon('trendUp', 14) + '</span><div><h4>Purchase activity</h4><p>' + (last ? 'Last purchase ' + esc(fmtDate(last.date)) : 'No purchases yet') + '</p></div></div>' +
        (sales.length
          ? '<div class="profile-timeline">' + sales.map((sale) => '<button type="button" class="profile-sale" data-action="view-sale" data-sale-id="' + esc(sale.id) + '">' +
              '<span class="profile-sale-marker">' + icon('plots', 12) + '</span><span class="profile-sale-copy"><strong>' + esc(sale.plot ? sale.plot.label : 'Plot') + ' · ' + money(sale.price) + '</strong><small>' + esc(sale.receiptNo) + ' · ' + esc(fmtDate(sale.date)) + '</small></span><span class="profile-sale-meta">' + statusBadge(sale.status) + '<small>' + money(sale.balance) + ' due</small></span>' +
            '</button>').join('') + '</div>'
          : '<div class="profile-empty"><span>' + icon('plots', 15) + '</span><strong>Ready for a first purchase</strong><small>Sales and plot ownership will appear here.</small></div>') +
      '</section>' +
    '</div>' +
    (buyer.notes ? '<div class="profile-notes"><strong>Notes</strong><p>' + esc(buyer.notes) + '</p></div>' : '') +
    buyerVaultSectionHTML(buyerId);

  openModal({
    title: 'Buyer profile',
    subtitle: buyer.name + ' · Client since ' + fmtDate(buyer.createdAt),
    size: 'xwide',
    body,
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Close</button>' +
      '<button type="button" class="btn btn-primary" data-action="edit-buyer" data-buyer-id="' + esc(buyer.id) + '">' + icon('edit', 14) + ' Edit buyer</button>'
  });
}

function buyerStatementEntries(buyerId) {
  const sales = salesForBuyer(buyerId);
  const entries = [];
  sales.forEach((sale) => {
    entries.push({
      date: sale.date,
      order: 0,
      reference: sale.receiptNo,
      description: (sale.plot ? sale.plot.label : 'Land sale') + ' · Sale charge',
      debit: Number(sale.price) || 0,
      credit: 0
    });
    (sale.payments || []).forEach((payment) => {
      entries.push({
        date: payment.date,
        order: 1,
        reference: sale.receiptNo,
        description: (payment.method || 'Payment') + (payment.note ? ' · ' + payment.note : ''),
        debit: 0,
        credit: Number(payment.amount) || 0
      });
    });
  });
  entries.sort((a, b) => S.parseDate(a.date) - S.parseDate(b.date) || a.order - b.order || a.reference.localeCompare(b.reference));
  let balance = 0;
  return entries.map((entry) => {
    balance += entry.debit - entry.credit;
    return Object.assign({}, entry, { balance });
  });
}

function buyerStatementHTML(buyerId) {
  const buyer = S.buyerById(data, buyerId);
  if (!buyer) return '';
  const entries = buyerStatementEntries(buyerId);
  const debits = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const credits = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const rows = entries.length
    ? entries.map((entry) => '<tr><td>' + esc(fmtDate(entry.date)) + '</td><td>' + esc(entry.reference) + '</td><td>' + esc(entry.description) + '</td><td class="num">' + (entry.debit ? money(entry.debit) : '—') + '</td><td class="num">' + (entry.credit ? money(entry.credit) : '—') + '</td><td class="num">' + money(entry.balance) + '</td></tr>').join('')
    : '<tr><td colspan="6" class="statement-empty">No sales or payments recorded for this buyer.</td></tr>';
  return '<div class="buyer-statement print-sheet" id="buyerStatement">' +
    '<div class="statement-heading"><div><span class="profile-kicker">ACCOUNT STATEMENT</span><h3>' + esc(buyer.name) + '</h3><p>' + esc(buyer.phone || 'No phone') + (buyer.email ? ' · ' + esc(buyer.email) : '') + '</p></div><div class="statement-date"><small>Generated</small><strong>' + esc(fmtDate(new Date())) + '</strong></div></div>' +
    '<div class="statement-summary"><div><small>Total charges</small><strong>' + money(debits) + '</strong></div><div><small>Total payments</small><strong>' + money(credits) + '</strong></div><div><small>Outstanding balance</small><strong>' + money(debits - credits) + '</strong></div></div>' +
    '<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th class="num">Charge</th><th class="num">Payment</th><th class="num">Balance</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<p class="accounting-footnote">This statement is generated from sales and payment records saved in this workspace.</p>' +
  '</div>';
}

function openBuyerStatement(buyerId) {
  const buyer = S.buyerById(data, buyerId);
  if (!buyer) { toast('Buyer not found.', 'error'); return; }
  openModal({
    title: 'Account statement',
    subtitle: buyer.name + ' · All recorded transactions',
    size: 'xwide',
    body: buyerStatementHTML(buyerId),
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Close</button><button type="button" class="btn btn-primary" data-action="print-buyer-statement" data-buyer-id="' + esc(buyerId) + '">' + icon('printer', 14) + ' Print / save PDF</button>'
  });
}

function printBuyerStatement(buyerId) {
  const root = $('#printRoot');
  const buyer = S.buyerById(data, buyerId);
  if (!root || !buyer) { toast('Buyer statement is unavailable.', 'error'); return; }
  root.innerHTML = buyerStatementHTML(buyerId);
  const clear = () => { root.innerHTML = ''; };
  window.addEventListener('afterprint', clear, { once: true });
  setTimeout(() => {
    window.print();
    setTimeout(clear, 1200);
  }, 60);
}

function compressBuyerPhoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) { toast('Could not read that image.', 'error'); resolve(null); return; }
        const max = 256;
        const scale = Math.min(1, max / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { toast('Could not process that image.', 'error'); resolve(null); return; }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch (err) {
          toast('Could not process that image.', 'error');
          resolve(null);
        }
      };
      img.onerror = () => { toast('Could not read that image.', 'error'); resolve(null); };
      img.src = String(reader.result);
    };
    reader.onerror = () => { toast('Could not read that image.', 'error'); resolve(null); };
    reader.readAsDataURL(file);
  });
}

function updateBuyerPhotoPreview(photo) {
  const preview = $('#buyerPhotoPreview');
  if (!preview) return;
  const src = buyerPhotoSrc({ photo });
  preview.className = 'photo-preview' + (src ? ' avatar-photo' : '');
  preview.innerHTML = esc(initials(inputValue('buyerName') || '?')) +
    (src ? '<img src="' + esc(src) + '" alt="" onerror="this.remove()">' : '');
  const remove = document.querySelector('[data-action="remove-buyer-photo"]');
  if (remove) remove.hidden = !src;
  $$('[data-action="select-buyer-sample-photo"]').forEach((button) => {
    const selected = BUYER_SAMPLE_PHOTOS[Number(button.dataset.photoIndex)] === src;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function selectBuyerSamplePhoto(index) {
  const photo = BUYER_SAMPLE_PHOTOS[index];
  if (!photo) { toast('Client image not found.', 'error'); return; }
  const hidden = $('#buyerPhoto');
  if (!hidden) { toast('Buyer photo form is unavailable.', 'error'); return; }
  hidden.value = photo;
  updateBuyerPhotoPreview(photo);
}

function handleBuyerPhoto(file) {
  if (!file) return;
  if (!/^image\//i.test(file.type || '')) { toast('Choose an image file.', 'warn'); return; }
  if (file.size > 8 * 1024 * 1024) { toast('Choose an image under 8 MB.', 'warn'); return; }
  compressBuyerPhoto(file).then((dataUrl) => {
    if (!dataUrl) return;
    const hidden = $('#buyerPhoto');
    if (hidden) hidden.value = dataUrl;
    updateBuyerPhotoPreview(dataUrl);
    toast('Profile photo added.');
  });
}

function openBuyerForm(buyerId) {
  if (!requirePermission('buyers.manage')) return;
  const buyer = buyerId ? S.buyerById(data, buyerId) : null;
  const editing = Boolean(buyer);
  const b = buyer || { name: '', phone: '', email: '', business: '', idType: 'Ghana Card', idNumber: '', nextOfKin: '', nextOfKinPhone: '', address: '', notes: '', photo: '' };
  const hasSales = editing && salesForBuyer(b.id).length > 0;
  openModal({
    title: editing ? 'Edit buyer' : 'Add buyer',
    subtitle: editing ? 'Update the buyer’s contact and identification details.' : 'Create a buyer record before or during a sale.',
    size: 'wide',
    body: '<form id="buyer-form" novalidate><input type="hidden" id="buyerId" value="' + esc(b.id || '') + '"><input type="hidden" id="buyerPhoto" value="' + esc(buyerPhotoSrc(b)) + '"><div class="form-grid">' +
      '<div class="field full"><label>Profile photo</label><div class="photo-upload">' +
        buyerAvatarHTML(b, 'photo-preview', ' id="buyerPhotoPreview"') +
        '<div class="photo-copy"><strong>Buyer profile photo</strong><small>Optional · JPG, PNG or WebP · resized automatically</small>' +
          '<div class="photo-actions"><button type="button" class="btn btn-ghost btn-sm" data-action="pick-buyer-photo">' + icon('upload', 14) + ' Choose photo</button>' +
          '<button type="button" class="btn-link" data-action="remove-buyer-photo"' + (buyerPhotoSrc(b) ? '' : ' hidden') + '>' + icon('trash', 12) + ' Remove</button></div>' +
        '</div>' +
        '<input type="file" id="buyerPhotoInput" accept="image/png,image/jpeg,image/webp,image/gif" hidden>' +
      '</div><div class="buyer-sample-photos"><small>Or choose a client image</small><div>' +
        BUYER_SAMPLE_PHOTOS.map((photo, index) => {
          const selected = buyerPhotoSrc(b) === photo;
          return '<button type="button" class="buyer-sample-photo' + (selected ? ' selected' : '') + '" data-action="select-buyer-sample-photo" data-photo-index="' + index + '" aria-label="Use client image ' + (index + 1) + '" aria-pressed="' + selected + '"><img src="' + esc(photo) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>';
        }).join('') +
      '</div></div></div>' +
      '<div class="field"><label for="buyerName">Full name <span class="req">*</span></label><input id="buyerName" value="' + esc(b.name) + '" placeholder="Kwame Mensah" autofocus><span class="error"></span></div>' +
      '<div class="field"><label for="buyerPhone">Phone number <span class="req">*</span></label><input id="buyerPhone" value="' + esc(b.phone) + '" placeholder="024 000 0000"><span class="error"></span></div>' +
      '<div class="field"><label for="buyerEmail">Email</label><input id="buyerEmail" type="email" value="' + esc(b.email) + '" placeholder="name@example.com"></div>' +
      '<div class="field"><label for="buyerBusiness">Business name</label><input id="buyerBusiness" value="' + esc(b.business) + '" placeholder="Mensah Logistics"></div>' +
      '<div class="field"><label for="buyerIdType">ID type</label><select id="buyerIdType">' + ['Ghana Card', 'Passport', 'Voter ID', 'Driver’s Licence'].map((t) => '<option' + (b.idType === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="buyerIdNumber">ID number</label><input id="buyerIdNumber" value="' + esc(b.idNumber) + '" placeholder="GHA-000000000-0"></div>' +
      '<div class="field"><label for="buyerNok">Next of kin</label><input id="buyerNok" value="' + esc(b.nextOfKin) + '" placeholder="Ama Mensah"></div>' +
      '<div class="field"><label for="buyerNokPhone">Next of kin phone</label><input id="buyerNokPhone" value="' + esc(b.nextOfKinPhone) + '" placeholder="024 000 0000"></div>' +
      '<div class="field full"><label for="buyerAddress">Address</label><input id="buyerAddress" value="' + esc(b.address) + '" placeholder="East Legon, Accra"></div>' +
      '<div class="field full"><label for="buyerNotes">Notes</label><textarea id="buyerNotes" placeholder="Anything to remember about this buyer…">' + esc(b.notes) + '</textarea></div>' +
    '</div></form>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>' +
      (editing && !hasSales ? '<button type="button" class="btn btn-danger" data-action="delete-buyer" data-buyer-id="' + esc(b.id) + '">' + icon('trash', 14) + ' Delete</button>' : '') +
      '<button type="submit" form="buyer-form" class="btn btn-primary">' + icon('check', 15) + ' Save buyer</button>'
  });
}

function saveBuyerFromForm() {
  if (!requirePermission('buyers.manage')) return;
  clearFieldErrors($('#buyer-form'));
  const id = $('#buyerId') ? $('#buyerId').value : '';
  const nameInput = $('#buyerName');
  const phoneInput = $('#buyerPhone');
  const name = inputValue('buyerName');
  const phone = inputValue('buyerPhone');
  let ok = true;
  if (!name) { fieldError(nameInput, 'Enter the buyer’s full name.'); ok = false; }
  if (!phone || phone.replace(/\D/g, '').length < 9) { fieldError(phoneInput, 'Enter a valid phone number.'); ok = false; }
  if (!ok) return;
  const payload = {
    name,
    phone,
    email: inputValue('buyerEmail'),
    business: inputValue('buyerBusiness'),
    idType: $('#buyerIdType') ? $('#buyerIdType').value : 'Ghana Card',
    idNumber: inputValue('buyerIdNumber'),
    nextOfKin: inputValue('buyerNok'),
    nextOfKinPhone: inputValue('buyerNokPhone'),
    address: inputValue('buyerAddress'),
    notes: inputValue('buyerNotes'),
    photo: $('#buyerPhoto') ? $('#buyerPhoto').value : ''
  };
  let buyer;
  if (id) {
    buyer = S.buyerById(data, id);
    if (!buyer) { toast('Buyer not found.', 'error'); return; }
    Object.assign(buyer, payload);
    addActivity('buyer', 'Updated buyer ' + buyer.name, buyer.phone, buyer.id);
  } else {
    buyer = Object.assign({ id: S.uid('buyer-'), createdAt: todayValue() }, payload);
    data.buyers.push(buyer);
    addActivity('buyer', 'Added buyer ' + buyer.name, buyer.phone, buyer.id);
  }
  const result = S.save(data);
  handleSaveResult(result);
  closeModal();
  refresh();
  toast(id ? 'Buyer updated.' : 'Buyer added.');
  openBuyerDetail(buyer.id);
}

function deleteBuyer(buyerId) {
  if (!requirePermission('buyers.delete')) return;
  const buyer = S.buyerById(data, buyerId);
  if (!buyer) return;
  if (salesForBuyer(buyerId).length) { toast('This buyer has sales and cannot be deleted.', 'error'); return; }
  confirmAction({
    title: 'Delete buyer?',
    message: 'Delete ' + buyer.name + '? This cannot be undone.',
    confirmText: 'Delete buyer'
  }).then((ok) => {
    if (!ok) return;
    data.buyers = data.buyers.filter((b) => b.id !== buyerId);
    addActivity('buyer', 'Deleted buyer ' + buyer.name, '', null);
    handleSaveResult(S.save(data));
    closeModal();
    refresh();
    toast('Buyer deleted.');
  });
}

/* ---------------- Plots ---------------- */
function nextPlotNumber() {
  const numbers = data.plots.map((p) => Number((p.code.match(/(\d+)$/) || [0, 0])[1]) || 0);
  return Math.max(0, ...numbers) + 1;
}

function openPlotForm(plotId) {
  if (!requirePermission('plots.manage')) return;
  const plot = plotId ? S.plotById(data, plotId) : null;
  const editing = Boolean(plot);
  const next = nextPlotNumber();
  const p = plot || {
    code: 'P-' + S.pad(next, 3),
    label: 'Plot ' + next,
    block: 'A',
    size: 500,
    price: 30000,
    cost: 0,
    status: 'available',
    lat: data.settings.lat,
    lng: data.settings.lng,
    description: ''
  };
  const hasSale = editing && Boolean(p.saleId);
  openModal({
    title: editing ? 'Edit plot' : 'Add plot',
    subtitle: editing ? 'Update plot details. Sales are managed from the Sales page.' : 'Add a new plot to your site plan.',
    size: 'wide',
    body: '<form id="plot-form" novalidate><input type="hidden" id="plotId" value="' + esc(p.id || '') + '"><div class="form-grid">' +
      '<div class="field"><label for="plotCode">Plot code <span class="req">*</span></label><input id="plotCode" value="' + esc(p.code) + '" placeholder="P-081" autofocus><span class="error"></span></div>' +
      '<div class="field"><label for="plotLabel">Display name <span class="req">*</span></label><input id="plotLabel" value="' + esc(p.label) + '" placeholder="Plot 81"><span class="error"></span></div>' +
      '<div class="field"><label for="plotBlock">Block</label><input id="plotBlock" value="' + esc(p.block) + '" maxlength="3" placeholder="A"></div>' +
      '<div class="field"><label for="plotSize">Size (m²) <span class="req">*</span></label><input id="plotSize" type="number" min="1" step="10" value="' + esc(p.size) + '"><span class="error"></span></div>' +
      '<div class="field"><label for="plotPrice">Price (GH₵) <span class="req">*</span></label><input id="plotPrice" type="number" min="0" step="500" value="' + esc(p.price) + '"><span class="error"></span></div>' +
      '<div class="field"><label for="plotCost">Development cost (GH₵)</label><input id="plotCost" type="number" min="0" step="500" value="' + esc(p.cost == null ? 0 : p.cost) + '"' + (hasSale ? ' disabled' : '') + '><span class="error"></span><span class="hint">' + (hasSale ? 'Cost of sales was posted from this figure. Post a journal adjustment to correct it.' : 'Posts cost of sales when this plot is sold. Leave 0 to skip.') + '</span></div>' +
      '<div class="field"><label for="plotStatus">Status</label><select id="plotStatus"' + (hasSale ? ' disabled' : '') + '>' + ['available', 'reserved', 'sold'].map((s) => '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + statusLabel(s) + '</option>').join('') + '</select><span class="error"></span>' + (hasSale ? '<span class="hint">Status is controlled by the sale. Void the sale to change it.</span>' : '') + '</div>' +
      '<div class="field"><label for="plotLat">Latitude</label><input id="plotLat" type="number" step="0.000001" value="' + esc(p.lat) + '"></div>' +
      '<div class="field"><label for="plotLng">Longitude</label><input id="plotLng" type="number" step="0.000001" value="' + esc(p.lng) + '"></div>' +
      '<div class="field full"><label for="plotDescription">Description</label><textarea id="plotDescription" placeholder="Corner plot, near the main road…">' + esc(p.description || '') + '</textarea></div>' +
    '</div></form>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>' +
      (editing && !hasSale ? '<button type="button" class="btn btn-danger" data-action="delete-plot" data-plot-id="' + esc(p.id) + '">' + icon('trash', 14) + ' Delete</button>' : '') +
      '<button type="submit" form="plot-form" class="btn btn-primary">' + icon('check', 15) + ' Save plot</button>'
  });
}

function savePlotFromForm() {
  if (!requirePermission('plots.manage')) return;
  clearFieldErrors($('#plot-form'));
  const id = $('#plotId') ? $('#plotId').value : '';
  const existing = id ? S.plotById(data, id) : null;
  const codeInput = $('#plotCode');
  const labelInput = $('#plotLabel');
  const sizeInput = $('#plotSize');
  const priceInput = $('#plotPrice');
  const costInput = $('#plotCost');
  const statusInput = $('#plotStatus');
  const code = inputValue('plotCode').toUpperCase();
  const label = inputValue('plotLabel');
  const size = numberValue('plotSize');
  const price = numberValue('plotPrice');
  const cost = costInput ? numberValue('plotCost') : 0;
  const status = statusInput ? statusInput.value : 'available';
  let ok = true;
  if (!code) { fieldError(codeInput, 'Enter a plot code.'); ok = false; }
  if (data.plots.some((p) => String(p.code || '').toLowerCase() === code.toLowerCase() && p.id !== id)) { fieldError(codeInput, 'That plot code is already in use.'); ok = false; }
  if (!label) { fieldError(labelInput, 'Enter a display name.'); ok = false; }
  if (!Number.isFinite(size) || size <= 0) { fieldError(sizeInput, 'Enter a size greater than zero.'); ok = false; }
  if (!Number.isFinite(price) || price < 0) { fieldError(priceInput, 'Enter a valid price.'); ok = false; }
  if (!Number.isFinite(cost) || cost < 0) { fieldError(costInput, 'Enter a valid cost, or 0.'); ok = false; }
  if (existing && existing.saleId && status !== 'sold') { fieldError(statusInput, 'Void the sale before changing this plot.'); ok = false; }
  if (!ok) return;
  const lat = numberValue('plotLat');
  const lng = numberValue('plotLng');
  const payload = {
    code,
    label,
    block: (inputValue('plotBlock') || 'A').toUpperCase(),
    size,
    price,
    cost: existing && existing.saleId ? (Number(existing.cost) || 0) : cost,
    status,
    lat: Number.isFinite(lat) ? lat : data.settings.lat,
    lng: Number.isFinite(lng) ? lng : data.settings.lng,
    description: inputValue('plotDescription')
  };
  let plot;
  if (existing) {
    plot = existing;
    Object.assign(plot, payload);
    addActivity('plot', 'Updated ' + plot.label, plot.code + ' · ' + statusLabel(plot.status), plot.id);
  } else {
    plot = Object.assign({ id: S.uid('plot-'), buyerId: null, saleId: null, createdAt: todayValue() }, payload);
    data.plots.push(plot);
    addActivity('plot', 'Added ' + plot.label, plot.code + ' · ' + statusLabel(plot.status), plot.id);
  }
  handleSaveResult(S.save(data));
  closeModal();
  refresh();
  toast(existing ? 'Plot updated.' : 'Plot added.');
}

function deletePlot(plotId) {
  if (!requirePermission('plots.manage')) return;
  const plot = S.plotById(data, plotId);
  if (!plot) return;
  if (plot.saleId) { toast('This plot has a sale. Void the sale first.', 'error'); return; }
  confirmAction({
    title: 'Delete plot?',
    message: 'Delete ' + plot.label + ' (' + plot.code + ')? This cannot be undone.',
    confirmText: 'Delete plot'
  }).then((ok) => {
    if (!ok) return;
    data.plots = data.plots.filter((p) => p.id !== plotId);
    if (state.selectedPlotId === plotId) state.selectedPlotId = data.plots[0] ? data.plots[0].id : null;
    addActivity('plot', 'Deleted ' + plot.label, plot.code, null);
    handleSaveResult(S.save(data));
    closeModal();
    refresh();
    toast('Plot deleted.');
  });
}

function voidSale(saleId) {
  if (!requirePermission('sales.void')) return;
  const sale = S.decorateSale(data, S.saleById(data, saleId));
  if (!sale) return;
  confirmAction({
    title: 'Void this sale?',
    message: 'Void ' + sale.receiptNo + ' for ' + (sale.buyer ? sale.buyer.name : 'this buyer') + '? The plot will become available again, the sale and its payments will be reversed in the accounting ledger, and the operational records will be removed. The audit trail keeps the financial history.',
    confirmText: 'Void sale'
  }).then((ok) => {
    if (!ok) return;
    const plot = sale.plot ? S.plotById(data, sale.plotId) : null;
    const previous = {
      sales: data.sales.slice(),
      payments: data.payments.slice(),
      activities: (data.activities || []).slice(),
      plot: plot ? { status: plot.status, buyerId: plot.buyerId, saleId: plot.saleId } : null,
      receiptId: state.receiptId,
      finance: window.FinanceApp ? FinanceApp.snapshot(data) : null
    };
    try {
      if (window.FinanceApp) FinanceApp.voidSale(data, sale, 'Sale voided');
    } catch (err) {
      toast(err && err.message ? err.message : 'The sale could not be reversed in the ledger.', 'error');
      return;
    }
    if (plot) {
      plot.status = 'available';
      plot.buyerId = null;
      plot.saleId = null;
    }
    data.sales = data.sales.filter((s) => s.id !== saleId);
    data.payments = data.payments.filter((p) => p.saleId !== saleId);
    addActivity('plot', 'Voided sale ' + sale.receiptNo, (plot ? plot.label : '') + ' · ' + (sale.buyer ? sale.buyer.name : ''), null);
    const result = S.save(data);
    if (!result.ok) {
      data.sales = previous.sales;
      data.payments = previous.payments;
      data.activities = previous.activities;
      if (plot && previous.plot) {
        plot.status = previous.plot.status;
        plot.buyerId = previous.plot.buyerId;
        plot.saleId = previous.plot.saleId;
      }
      state.receiptId = previous.receiptId;
      if (window.FinanceApp) FinanceApp.restore(data, previous.finance);
      handleSaveResult(result);
      return;
    }
    if (state.receiptId === saleId) state.receiptId = null;
    handleSaveResult(result);
    closeModal();
    ensureReceiptSelection();
    refresh();
    toast('Sale voided. The plot is available again and the ledger was reversed.');
  });
}

/* ---------------- Messages and reminders ---------------- */
function openMessageModal(opts) {
  state.message = {
    phone: opts.phone || '',
    message: opts.message || '',
    onSent: opts.onSent || null,
    channelLabel: opts.channelLabel || 'SMS'
  };
  const hasPhone = phoneDigits(opts.phone).length >= 9;
  openModal({
    title: opts.title || 'Send message',
    subtitle: opts.subtitle || '',
    size: 'small',
    body: '<textarea class="message-box" id="sendMessage" aria-label="Message text">' + esc(opts.message || '') + '</textarea>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;font-size:10.5px;color:var(--muted)"><span>' + (hasPhone ? icon('smartphone', 13) + ' ' + esc(opts.phone) : 'No phone number on file') + '</span><button type="button" class="btn-link" data-action="copy-message">' + icon('copy', 12) + ' Copy text</button></div>' +
      (hasPhone ? '' : '<p class="review-note" style="color:var(--red-ink)">Add a phone number to the buyer to send by SMS or WhatsApp.</p>'),
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Close</button>' +
      '<button type="button" class="btn btn-soft" data-action="send-sms"' + (hasPhone ? '' : ' disabled') + '>' + icon('message', 14) + ' SMS</button>' +
      '<button type="button" class="btn btn-primary" data-action="send-whatsapp"' + (hasPhone ? '' : ' disabled') + '>' + icon('whatsapp', 14) + ' WhatsApp</button>'
  });
}

function sendVia(channel) {
  if (!state.message) return;
  const textEl = $('#sendMessage');
  const text = textEl ? textEl.value : state.message.message;
  state.message.message = text;
  const digits = phoneDigits(state.message.phone);

  if (channel === 'copy') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('Message copied.')).catch(() => toast('Could not copy the message.', 'error'));
    } else {
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      try { document.execCommand('copy'); toast('Message copied.'); } catch (e) { toast('Could not copy the message.', 'error'); }
      temp.remove();
    }
    if (state.message.onSent) state.message.onSent(text, 'copy');
    return;
  }

  if (!digits) { toast('No phone number available.', 'warn'); return; }
  if (channel === 'sms') {
    window.location.href = 'sms:' + digits + '?body=' + encodeURIComponent(text);
  } else if (channel === 'whatsapp') {
    window.open('https://wa.me/' + digits + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }
  if (state.message.onSent) state.message.onSent(text, channel);
  closeModal();
}

function openReminder(saleId) {
  if (!requirePermission('reminders.send')) return;
  const sale = S.decorateSale(data, S.saleById(data, saleId));
  if (!sale) return;
  const buyer = sale.buyer || {};
  const org = data.settings;
  const message = 'Hello ' + (buyer.name ? buyer.name.split(' ')[0] : 'there') + ', a friendly reminder from ' + org.orgName + ': ' + money(sale.balance) + ' is outstanding on ' + (sale.plot ? sale.plot.label : 'your plot') + ' (' + sale.receiptNo + '). Due date: ' + fmtDate(sale.dueDate) + '. Please contact us on ' + org.phone + '. Thank you.';
  openMessageModal({
    title: 'Send payment reminder',
    subtitle: (buyer.name || 'Buyer') + ' · ' + money(sale.balance) + ' outstanding',
    phone: buyer.phone,
    message,
    onSent: (text, channel) => {
      const record = S.saleById(data, sale.id);
      if (record) record.lastRemindedAt = new Date().toISOString();
      addActivity('reminder', 'Payment reminder sent to ' + (buyer.name || 'buyer'), money(sale.balance) + ' outstanding · ' + (channel === 'copy' ? 'Copied' : channel === 'whatsapp' ? 'WhatsApp' : 'SMS'), sale.id);
      if (channel !== 'copy' && window.Notify) Notify.event('reminder', 'Reminder sent · ' + (buyer.name || 'Buyer') + ' · ' + money(sale.balance) + ' outstanding');
      handleSaveResult(S.save(data));
      refresh();
      toast('Reminder sent to ' + (buyer.name || 'buyer') + '.');
    }
  });
}

function openSendReceipt(saleId, mode) {
  if (!requirePermission('messages.send')) return;
  const sale = S.decorateSale(data, S.saleById(data, saleId));
  if (!sale) return;
  const buyer = sale.buyer || {};
  const org = data.settings;
  const invoice = mode === 'invoice';
  const message = invoice
    ? 'Hello ' + (buyer.name ? buyer.name.split(' ')[0] : 'there') + ', here is your invoice ' + sale.receiptNo.replace(/^LL-/, 'INV-') + ' from ' + org.orgName + ' for ' + (sale.plot ? sale.plot.label : 'your plot') + '. Total: ' + money(sale.price) + ', paid: ' + money(sale.paid) + ', balance due: ' + money(sale.balance) + ' by ' + fmtDate(sale.dueDate) + '. Thank you.'
    : 'Hello ' + (buyer.name ? buyer.name.split(' ')[0] : 'there') + ', thank you for your payment of ' + money(sale.paid) + ' for ' + (sale.plot ? sale.plot.label : 'your plot') + '. Receipt ' + sale.receiptNo + '. Outstanding balance: ' + money(sale.balance) + '. — ' + org.orgName;
  openMessageModal({
    title: invoice ? 'Send invoice' : 'Send receipt',
    subtitle: (buyer.name || 'Buyer') + ' · ' + sale.receiptNo,
    phone: buyer.phone,
    message,
    onSent: (text, channel) => {
      const record = S.saleById(data, sale.id);
      if (record) record.lastSentAt = new Date().toISOString();
      addActivity('receipt', (invoice ? 'Invoice ' : 'Receipt ') + sale.receiptNo + ' sent to ' + (buyer.name || 'buyer'), channel === 'copy' ? 'Copied message' : channel === 'whatsapp' ? 'WhatsApp' : 'SMS', sale.id);
      handleSaveResult(S.save(data));
      refresh();
      toast((invoice ? 'Invoice' : 'Receipt') + ' ready to send.');
    }
  });
}

function messageBuyer(buyerId) {
  if (!requirePermission('messages.send')) return;
  const buyer = S.buyerById(data, buyerId);
  if (!buyer) return;
  openMessageModal({
    title: 'Message buyer',
    subtitle: buyer.name,
    phone: buyer.phone,
    message: 'Hello ' + buyer.name.split(' ')[0] + ', this is ' + data.settings.orgName + '. '
  });
}

/* ---------------- Documents ---------------- */
function readFileAsDoc(file) {
  return new Promise((resolve) => {
    const doc = {
      id: S.uid('doc-'),
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: null,
      addedAt: new Date().toISOString()
    };
    if (file.size > 1024 * 1024) {
      toast(file.name + ' is over 1 MB — saved as a file reference only.', 'warn');
      resolve(doc);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { doc.dataUrl = reader.result; resolve(doc); };
    reader.onerror = () => { toast('Could not read ' + file.name + '.', 'error'); resolve(doc); };
    reader.readAsDataURL(file);
  });
}

function handleSaleDocs(saleId, files) {
  if (!requirePermission('documents.manage')) return;
  const sale = S.saleById(data, saleId);
  if (!sale || !files || !files.length) return;
  Promise.all(Array.from(files).map(readFileAsDoc)).then((docs) => {
    sale.docs = (sale.docs || []).concat(docs);
    handleSaveResult(S.save(data));
    toast(docs.length + ' document' + (docs.length === 1 ? '' : 's') + ' attached.');
    openSaleDetail(saleId);
  });
}

function removeSaleDoc(saleId, docId) {
  if (!requirePermission('documents.manage')) return;
  const sale = S.saleById(data, saleId);
  if (!sale) return;
  sale.docs = (sale.docs || []).filter((d) => d.id !== docId);
  handleSaveResult(S.save(data));
  toast('Document removed.');
  openSaleDetail(saleId);
}

/* ---------------- Print ---------------- */
function createDocumentVerificationId(mode) {
  if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
    toast('Secure document ID generation is unavailable in this browser.', 'error');
    return '';
  }
  const bytes = new Uint8Array(8);
  window.crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return 'LPP-' + (mode === 'invoice' ? 'INV' : 'REC') + '-' + new Date().getFullYear() + '-' + code;
}

function printSale(saleId, mode) {
  const record = S.saleById(data, saleId);
  if (!record) return;
  const documentMode = mode === 'invoice' ? 'invoice' : 'receipt';
  if (!record.documentIds || typeof record.documentIds !== 'object' || Array.isArray(record.documentIds)) record.documentIds = {};
  if (!record.documentIds[documentMode]) {
    let verificationId = '';
    do {
      verificationId = createDocumentVerificationId(documentMode);
      if (!verificationId) return;
    } while (data.sales.some((sale) => Object.values(sale.documentIds || {}).includes(verificationId)));
    record.documentIds[documentMode] = verificationId;
    const saved = S.save(data);
    handleSaveResult(saved);
    if (!saved.ok) {
      delete record.documentIds[documentMode];
      return;
    }
  }
  const sale = S.decorateSale(data, record);
  if (!sale) return;
  const root = $('#printRoot');
  if (!root) return;
  root.innerHTML = receiptSheetHTML(sale, documentMode, true);
  const clear = () => { root.innerHTML = ''; };
  window.addEventListener('afterprint', clear, { once: true });
  setTimeout(() => {
    window.print();
    setTimeout(clear, 1200);
  }, 60);
}
