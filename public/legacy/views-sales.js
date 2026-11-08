/* LandLedger — sales and receipts views */
'use strict';

/* ---------------- Sales ---------------- */
function filteredSales() {
  const query = state.salesQuery.trim().toLowerCase();
  let list = S.decoratedSales(data).sort((a, b) => S.parseDate(b.date) - S.parseDate(a.date));
  if (state.salesStatus !== 'all') list = list.filter((s) => s.status === state.salesStatus);
  if (query) list = list.filter((s) => saleSearchText(s).includes(query));
  return list;
}

function salesResultsHTML() {
  const list = filteredSales();
  if (!list.length) {
    return '<div class="empty"><div class="empty-ico">' + icon('sales') + '</div><h3>No sales found</h3><p>Try another search, or record a new plot sale.</p><button type="button" class="btn btn-primary btn-sm" data-action="new-sale">' + icon('plus') + ' New sale</button></div>';
  }
  const pageSize = PAGE_SIZE.sales;
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  if (state.salesPage > pages) state.salesPage = pages;
  const page = Math.max(1, state.salesPage);
  const rows = list.slice((page - 1) * pageSize, page * pageSize);

  return '<div class="table-wrap"><table class="data" style="min-width:920px"><thead><tr><th>Receipt</th><th>Plot</th><th>Date</th><th class="num">Sale price</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
    rows.map((sale) => '<tr data-action="view-sale" data-sale-id="' + esc(sale.id) + '">' +
      '<td><div class="cell-main">' + buyerAvatarHTML(sale.buyer, 'cell-avatar') + '<div class="cell-copy"><strong>' + esc(sale.buyer ? sale.buyer.name : 'Unknown') + '</strong><small>' + esc(sale.receiptNo) + '</small></div></div></td>' +
      '<td><span class="strong">' + esc(sale.plot ? sale.plot.label : '—') + '</span><span class="sub">' + esc(sale.plot ? 'Block ' + sale.plot.block : '') + '</span></td>' +
      '<td>' + esc(fmtDate(sale.date)) + '<span class="sub">Due ' + esc(fmtDate(sale.dueDate)) + '</span></td>' +
      '<td class="num strong">' + money(sale.price) + '</td>' +
      '<td class="num">' + money(sale.paid) + '</td>' +
      '<td class="num strong" style="' + (sale.balance > 0 ? 'color:var(--red-ink)' : '') + '">' + money(sale.balance) + '</td>' +
      '<td>' + statusBadge(sale.status) + '</td>' +
      '<td><div class="row-actions">' +
        '<button type="button" class="mini-btn" data-action="view-sale" data-sale-id="' + esc(sale.id) + '" title="View sale">' + icon('chevronRight', 13) + '</button>' +
        (sale.balance > 0 ? '<button type="button" class="mini-btn" data-action="remind" data-sale-id="' + esc(sale.id) + '" title="Send reminder">' + icon('bell', 13) + '</button>' : '') +
        '<button type="button" class="mini-btn" data-action="print-receipt" data-sale-id="' + esc(sale.id) + '" title="Print receipt">' + icon('printer', 13) + '</button>' +
      '</div></td>' +
    '</tr>').join('') +
    '</tbody></table></div>' + pagerHTML(list.length, page, pageSize, 'sales-page');
}

function viewSales() {
  const stats = S.stats(data);
  return '<div class="page">' +
    '<div class="page-head"><div><h2>Sales</h2><p>' + stats.sales.length + ' sales · ' + money(stats.collected) + ' collected · ' + money(stats.outstanding) + ' outstanding.</p></div>' +
      '<div class="head-actions"><button type="button" class="btn btn-primary" data-action="new-sale">' + icon('plus', 16) + ' New sale</button></div>' +
    '</div>' +
    '<div class="toolbar">' +
      '<div class="search-field"><span>' + icon('search') + '</span><input type="search" id="salesSearch" value="' + esc(state.salesQuery) + '" placeholder="Search buyer, plot or receipt…" aria-label="Search sales"></div>' +
      '<select id="salesStatusFilter" aria-label="Filter sales by status">' +
        ['all', 'paid', 'partial', 'overdue'].map((s) => '<option value="' + s + '"' + (state.salesStatus === s ? ' selected' : '') + '>' + (s === 'all' ? 'All statuses' : statusLabel(s)) + '</option>').join('') +
      '</select>' +
      '<span class="spacer"></span><span class="result-count" id="salesCount">' + filteredSales().length + ' sales</span>' +
    '</div>' +
    '<div class="card" id="salesResults">' + salesResultsHTML() + '</div>' +
  '</div>';
}

function updateSalesResults() {
  const wrap = $('#salesResults');
  if (wrap) wrap.innerHTML = salesResultsHTML();
  const count = $('#salesCount');
  if (count) count.textContent = filteredSales().length + ' sales';
}

/* ---------------- Receipts ---------------- */
function receiptFilterChipsHTML() {
  const all = S.decoratedSales(data);
  const counts = {
    all: all.length,
    paid: all.filter((s) => s.status === 'paid').length,
    partial: all.filter((s) => s.status === 'partial').length,
    overdue: all.filter((s) => s.status === 'overdue').length
  };
  return [['all', 'All receipts'], ['paid', 'Paid'], ['partial', 'Part paid'], ['overdue', 'Overdue']]
    .map(([key, label]) => '<button type="button" class="chip' + (state.receiptsStatus === key ? ' active' : '') + '" data-action="receipt-filter" data-status="' + key + '">' + label + ' <span class="count">' + counts[key] + '</span></button>')
    .join('');
}

function filteredReceipts() {
  const query = state.receiptsQuery.trim().toLowerCase();
  let list = S.decoratedSales(data).sort((a, b) => S.parseDate(b.date) - S.parseDate(a.date));
  if (state.receiptsStatus !== 'all') list = list.filter((s) => s.status === state.receiptsStatus);
  if (query) list = list.filter((s) => saleSearchText(s).includes(query));
  return list;
}

function ensureReceiptSelection() {
  const list = filteredReceipts();
  if (!list.length) {
    state.receiptId = null;
    return;
  }
  if (!list.some((s) => s.id === state.receiptId)) state.receiptId = list[0].id;
}

function receiptListHTML() {
  const list = filteredReceipts();
  if (!list.length) {
    return '<div class="empty" style="padding:34px 18px"><div class="empty-ico">' + icon('receipts') + '</div><h3>No receipts</h3><p>Try another search or clear the filter.</p></div>';
  }
  return list.map((sale) => '<button type="button" class="receipt-item' + (sale.id === state.receiptId ? ' active' : '') + '" data-action="select-receipt" data-sale-id="' + esc(sale.id) + '">' +
    buyerAvatarHTML(sale.buyer, 'ri-avatar') +
    '<span class="ri-copy"><strong>' + esc(sale.buyer ? sale.buyer.name : 'Unknown buyer') + '</strong><small>' + esc(sale.receiptNo) + ' · ' + esc(sale.plot ? sale.plot.label : '') + '</small></span>' +
    '<span class="ri-right"><strong>' + money(sale.paid) + '</strong><small>' + (sale.balance > 0 ? money(sale.balance) + ' due' : 'Paid in full') + '</small></span>' +
  '</button>').join('');
}

function receiptSheetHTML(sale, mode, forPrint) {
  if (!sale) return '';
  const org = data.settings;
  const invoice = mode === 'invoice';
  const buyer = sale.buyer || {};
  const plot = sale.plot || {};
  const title = invoice ? 'INVOICE' : 'RECEIPT';
  const ref = invoice ? sale.receiptNo.replace(/^LL-/, 'INV-') : sale.receiptNo;
  let stamp = sale.status === 'paid' ? 'PAID' : sale.status === 'overdue' ? 'OVERDUE' : 'PART PAID';
  if (invoice && sale.balance > 0) stamp = 'BALANCE DUE';
  const stampClass = sale.status === 'paid' ? '' : ' due';
  const paymentRows = (sale.payments || []).map((p) =>
    '<tr><td>' + esc(fmtDate(p.date)) + '<small>' + esc(p.method || 'Payment') + '</small></td><td>' + esc(p.note || 'Payment received') + '</td><td class="num" style="text-align:right;font-weight:700">' + money(p.amount) + '</td></tr>'
  ).join('');

  return '<div class="receipt-sheet' + (forPrint ? ' print-sheet' : '') + '">' +
    '<div class="rs-head">' +
      '<div class="rs-org"><img class="rs-logo" src="assets/brand-logo.jpg" alt="Land Pro Premium Properties logo"><div><strong>' + esc(org.orgName) + '</strong><small>' + esc(org.address) + '<br>' + esc(org.phone) + ' · ' + esc(org.email) + '</small></div></div>' +
      '<div class="rs-title"><h3>' + title + '</h3><p>' + esc(ref) + '<br>' + esc(fmtDate(sale.date)) + '</p></div>' +
    '</div>' +
    '<div class="rs-stamp' + stampClass + '">' + esc(stamp) + '</div>' +
    '<div class="rs-meta">' +
      '<div class="rs-meta-block"><small>Billed to</small><strong>' + esc(buyer.name || '—') + '</strong><p>' + esc(buyer.phone || '') + (buyer.idNumber ? '<br>' + esc(buyer.idType || 'ID') + ': ' + esc(buyer.idNumber) : '') + '</p></div>' +
      '<div class="rs-meta-block"><small>Plot details</small><strong>' + esc(plot.label || '—') + '</strong><p>' + esc(plot.code || '') + ' · Block ' + esc(plot.block || '—') + ' · ' + (plot.size || 0) + ' m²<br>' + (invoice ? 'Due ' + esc(fmtDate(sale.dueDate)) : 'Issued ' + esc(fmtDate(sale.date))) + '</p></div>' +
    '</div>' +
    '<table class="rs-items"><thead><tr><th>Description</th><th>Details</th><th>Amount</th></tr></thead><tbody>' +
      '<tr><td><strong>Land purchase</strong><small>' + esc(plot.label || 'Plot') + ' · ' + (plot.size || 0) + ' m²</small></td><td>Block ' + esc(plot.block || '—') + '<small>' + esc(org.siteName || '') + '</small></td><td style="text-align:right;font-weight:700">' + money(sale.price) + '</td></tr>' +
    '</tbody></table>' +
    '<div class="rs-totals">' +
      '<div class="rs-total-row"><span>' + (invoice ? 'Invoice total' : 'Plot price') + '</span><strong>' + money(sale.price) + '</strong></div>' +
      '<div class="rs-total-row"><span>' + (invoice ? 'Paid to date' : 'Amount paid') + '</span><strong>' + money(sale.paid) + '</strong></div>' +
      '<div class="rs-total-row grand"><span>' + (invoice ? 'Balance due' : 'Outstanding balance') + '</span><strong style="' + (sale.balance > 0 ? 'color:var(--red-ink)' : 'color:var(--accent-dark)') + '">' + money(sale.balance) + '</strong></div>' +
    '</div>' +
    (paymentRows
      ? '<div class="detail-section" style="margin-top:24px"><div class="detail-section-head"><h4>Payment history</h4></div><div class="pay-list"><table class="rs-items" style="margin-top:0"><thead><tr><th>Date</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead><tbody>' + paymentRows + '</tbody></table></div></div>'
      : '') +
    (sale.notes ? '<div style="margin-top:18px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--line);border-radius:9px;font-size:10px;color:var(--muted);line-height:1.5"><strong style="color:var(--ink-2)">Note:</strong> ' + esc(sale.notes) + '</div>' : '') +
    '<div class="rs-foot"><span>Thank you for your business.<br><strong>' + esc(org.orgName) + '</strong> · ' + esc(org.phone) + '</span><span style="text-align:right">Generated by Land Management System<br>' + esc(ref) + '</span></div>' +
    (forPrint ? '<div class="rs-verification"><span>Document verification ID</span><strong>' + esc((sale.documentIds || {})[invoice ? 'invoice' : 'receipt'] || '') + '</strong></div>' : '') +
    '<div class="rs-sign"><div>Received by</div><div>Buyer signature</div></div>' +
  '</div>';
}

function receiptPreviewHTML() {
  const sale = selectedReceiptSale();
  if (!sale) {
    return '<div class="card receipt-empty"><div class="empty-ico">' + icon('receipts') + '</div><h3>Select a receipt</h3><p>Choose a receipt from the list to preview, print or send it.</p></div>';
  }
  const mode = state.receiptMode;
  return '<div class="preview-toolbar no-print">' +
    '<div class="segmented"><button type="button" class="' + (mode === 'receipt' ? 'active' : '') + '" data-action="receipt-mode" data-mode="receipt">Receipt</button><button type="button" class="' + (mode === 'invoice' ? 'active' : '') + '" data-action="receipt-mode" data-mode="invoice">Invoice</button></div>' +
    '<div class="head-actions">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="send-current" data-sale-id="' + esc(sale.id) + '">' + icon('send', 14) + ' Send</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="print-current" data-sale-id="' + esc(sale.id) + '">' + icon('printer', 14) + ' Print</button>' +
    '</div>' +
  '</div>' + receiptSheetHTML(sale, mode, false);
}

function viewReceipts() {
  ensureReceiptSelection();
  return '<div class="page">' +
    '<div class="page-head"><div><h2>Receipts &amp; invoices</h2><p>Find any receipt in seconds. Search a buyer’s name, plot or receipt number.</p></div>' +
      '<div class="head-actions"><button type="button" class="btn btn-primary" data-action="new-sale">' + icon('plus', 16) + ' New sale</button></div>' +
    '</div>' +
    '<div class="toolbar"><div class="chip-row" id="receiptFilters">' + receiptFilterChipsHTML() + '</div><span class="spacer"></span><span class="result-count" id="receiptCount">' + filteredReceipts().length + ' receipts</span></div>' +
    '<div class="receipt-layout">' +
      '<div class="card receipt-list-card">' +
        '<div class="receipt-list-head"><div class="search-field"><span>' + icon('search') + '</span><input type="search" id="receiptSearch" value="' + esc(state.receiptsQuery) + '" placeholder="Search buyer, plot or receipt…" aria-label="Search receipts"></div></div>' +
        '<div class="receipt-list" id="receiptList">' + receiptListHTML() + '</div>' +
      '</div>' +
      '<div class="receipt-preview-wrap" id="receiptPreview">' + receiptPreviewHTML() + '</div>' +
    '</div>' +
  '</div>';
}

function updateReceipts() {
  ensureReceiptSelection();
  const list = $('#receiptList');
  if (list) list.innerHTML = receiptListHTML();
  const preview = $('#receiptPreview');
  if (preview) preview.innerHTML = receiptPreviewHTML();
  const filters = $('#receiptFilters');
  if (filters) filters.innerHTML = receiptFilterChipsHTML();
  const count = $('#receiptCount');
  if (count) count.textContent = filteredReceipts().length + ' receipts';
}
