/* LandLedger — accounting overview and transaction ledger */
'use strict';

const EXPENSE_CATEGORIES = ['Advertising', 'Bank charges', 'Development', 'Equipment', 'Legal & professional', 'Office supplies', 'Operations', 'Salaries', 'Site maintenance', 'Transport', 'Utilities', 'Other'];

function accountingMoney(value) {
  const amount = Number(value) || 0;
  const hasPesewas = Math.abs(amount - Math.round(amount)) > 0.000001;
  return 'GH₵ ' + amount.toLocaleString('en-GH', {
    minimumFractionDigits: hasPesewas ? 2 : 0,
    maximumFractionDigits: 2
  });
}

function accountingPeriodTotals() {
  const inPeriod = (item) => state.accountingMonth === 'all' || String(item.date || '').slice(0, 7) === state.accountingMonth;
  const income = data.payments.filter(inPeriod).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const expenses = (data.expenses || []).filter(inPeriod).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return { income, expenses };
}

function accountingMonthOptions() {
  const options = ['<option value="all"' + (state.accountingMonth === 'all' ? ' selected' : '') + '>All time</option>'];
  const now = new Date();
  for (let offset = 0; offset < 12; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = date.getFullYear() + '-' + S.pad(date.getMonth() + 1, 2);
    options.push('<option value="' + key + '"' + (state.accountingMonth === key ? ' selected' : '') + '>' +
      esc(date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })) + '</option>');
  }
  return options.join('');
}

function accountingTransactions() {
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  const salesById = new Map(data.sales.map((sale) => [sale.id, S.decorateSale(data, sale)]));
  const transactions = data.payments.map((payment) => {
    const sale = salesById.get(payment.saleId);
    const buyer = sale ? sale.buyer : null;
    return {
      id: payment.id,
      date: payment.date,
      kind: 'income',
      description: buyer ? 'Payment from ' + buyer.name : 'Sale payment',
      detail: (payment.method || 'Payment') + (sale ? ' · ' + sale.receiptNo : ''),
      amount: Number(payment.amount) || 0,
      saleId: sale ? sale.id : null
    };
  });
  expenses.forEach((expense) => transactions.push({
    id: expense.id,
    date: expense.date,
    kind: 'expense',
    description: expense.description,
    detail: [expense.category, expense.paidTo, expense.method, expense.reference].filter(Boolean).join(' · '),
    amount: Number(expense.amount) || 0,
    expenseId: expense.id,
    evidenceCount: Array.isArray(expense.evidence) ? expense.evidence.length : 0
  }));
  return transactions.filter((item) => {
    if (state.accountingMonth !== 'all' && String(item.date || '').slice(0, 7) !== state.accountingMonth) return false;
    if (state.accountingType !== 'all' && item.kind !== state.accountingType) return false;
    const query = (state.accountingQuery || '').trim().toLowerCase();
    return !query || [item.description, item.detail, item.amount, item.date].join(' ').toLowerCase().includes(query);
  }).sort((a, b) => S.parseDate(b.date) - S.parseDate(a.date));
}

function accountingMonthlyFlow() {
  const months = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = date.getFullYear() + '-' + S.pad(date.getMonth() + 1, 2);
    months.push({
      key,
      label: date.toLocaleDateString('en-GB', { month: 'short' }),
      income: 0,
      expenses: 0
    });
  }
  data.payments.forEach((payment) => {
    const month = months.find((item) => item.key === String(payment.date || '').slice(0, 7));
    if (month) month.income += Number(payment.amount) || 0;
  });
  (data.expenses || []).forEach((expense) => {
    const month = months.find((item) => item.key === String(expense.date || '').slice(0, 7));
    if (month) month.expenses += Number(expense.amount) || 0;
  });
  return months;
}

function accountingFlowHTML(months) {
  const max = Math.max(1, ...months.flatMap((month) => [month.income, month.expenses]));
  return '<div class="accounting-flow">' + months.map((month) =>
    '<div class="flow-month"><span class="flow-month-label">' + esc(month.label) + '</span><div class="flow-bars">' +
      '<span class="flow-bar income" style="width:' + Math.max(month.income ? 2 : 0, month.income / max * 100).toFixed(1) + '%" title="Income: ' + esc(money(month.income)) + '"></span>' +
      '<span class="flow-bar expense" style="width:' + Math.max(month.expenses ? 2 : 0, month.expenses / max * 100).toFixed(1) + '%" title="Expenses: ' + esc(money(month.expenses)) + '"></span>' +
    '</div><span class="flow-net">' + esc(moneyCompact(month.income - month.expenses)) + '</span></div>'
  ).join('') + '</div>';
}

function accountingLedgerHTML(transactions) {
  if (!transactions.length) {
    const hasEntries = data.payments.length || (data.expenses || []).length;
    return '<div class="empty accounting-empty"><div class="empty-ico">' + icon('receipts') + '</div><h3>' + (hasEntries ? 'No matching transactions' : 'Your ledger is ready') + '</h3><p>' + (hasEntries ? 'Try another period, type or search.' : 'Record an expense or collect a payment to start your accounting ledger.') + '</p>' +
      (can('expenses.manage') ? '<button type="button" class="btn btn-primary btn-sm" data-action="add-expense">' + icon('plus') + ' Record expense</button>' : '') + '</div>';
  }
  return '<div class="table-wrap"><table class="data accounting-table"><thead><tr><th>Date</th><th>Description</th><th>Category / reference</th><th>Type</th><th class="num">Amount</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
    transactions.map((item) => '<tr>' +
      '<td>' + esc(fmtDate(item.date)) + '</td>' +
      '<td><div class="accounting-description"><span class="accounting-kind ' + item.kind + '">' + icon(item.kind === 'income' ? 'arrowDownLeft' : 'arrowUpRight', 13) + '</span><strong>' + esc(item.description || 'Expense') + '</strong></div></td>' +
      '<td><span class="accounting-detail">' + esc(item.detail || '—') + '</span></td>' +
      '<td><span class="accounting-type ' + item.kind + '">' + (item.kind === 'income' ? 'Income' : 'Expense') + '</span></td>' +
      '<td class="num strong ' + (item.kind === 'income' ? 'accounting-credit' : 'accounting-debit') + '">' + (item.kind === 'income' ? '+' : '−') + accountingMoney(item.amount) + '</td>' +
      '<td><div class="row-actions">' +
        (item.saleId ? '<button type="button" class="mini-btn" data-action="view-sale" data-sale-id="' + esc(item.saleId) + '" title="View sale">' + icon('chevronRight', 13) + '</button>' : '') +
        (item.expenseId && item.evidenceCount ? '<button type="button" class="mini-btn" data-action="view-expense-evidence" data-expense-id="' + esc(item.expenseId) + '" title="View image evidence (' + item.evidenceCount + ')">' + icon('image', 13) + '</button>' : '') +
        (item.expenseId && can('expenses.manage') ? '<button type="button" class="mini-btn" data-action="edit-expense" data-expense-id="' + esc(item.expenseId) + '" title="Edit expense">' + icon('edit', 13) + '</button><button type="button" class="mini-btn" data-action="delete-expense" data-expense-id="' + esc(item.expenseId) + '" title="Delete expense">' + icon('trash', 13) + '</button>' : '') +
      '</div></td>' +
    '</tr>').join('') +
  '</tbody></table></div>';
}

function viewAccounting() {
  const transactions = accountingTransactions();
  const period = accountingPeriodTotals();
  const allOutstanding = S.stats(data).outstanding;
  const trend = accountingMonthlyFlow();
  const selectedLabel = state.accountingMonth === 'all' ? 'all time' : esc(new Date(Number(state.accountingMonth.slice(0, 4)), Number(state.accountingMonth.slice(5, 7)) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
  return '<div class="page accounting-page">' +
    '<div class="page-head"><div><h2>Accounting</h2><p>Track money collected, operating expenses and your cash position.</p></div>' +
      (can('expenses.manage') ? '<div class="head-actions"><button type="button" class="btn btn-primary" data-action="add-expense">' + icon('plus', 16) + ' Record expense</button></div>' : '') +
    '</div>' +
    '<div class="accounting-intro"><div><span class="accounting-eyebrow">FINANCIAL OVERVIEW</span><h3>Your money, clearly accounted for.</h3><p>Cash received from recorded buyer payments, less expenses entered in this workspace.</p></div><span class="accounting-intro-icon">' + icon('wallet', 24) + '</span></div>' +
    '<div class="accounting-kpis">' +
      '<div class="accounting-kpi income-kpi"><span class="accounting-kpi-icon">' + icon('arrowDownLeft', 16) + '</span><small>Collected · ' + selectedLabel + '</small><strong>' + accountingMoney(period.income) + '</strong><span>Cash received</span></div>' +
      '<div class="accounting-kpi expense-kpi"><span class="accounting-kpi-icon">' + icon('arrowUpRight', 16) + '</span><small>Expenses · ' + selectedLabel + '</small><strong>' + accountingMoney(period.expenses) + '</strong><span>' + (data.expenses || []).length + ' expense records</span></div>' +
      '<div class="accounting-kpi net-kpi"><span class="accounting-kpi-icon">' + icon('trendUp', 16) + '</span><small>Net cash flow · ' + selectedLabel + '</small><strong>' + accountingMoney(period.income - period.expenses) + '</strong><span>Collected minus expenses</span></div>' +
      '<div class="accounting-kpi receivable-kpi"><span class="accounting-kpi-icon">' + icon('clock', 16) + '</span><small>Outstanding receivables</small><strong>' + money(allOutstanding) + '</strong><span>Across all active sales</span></div>' +
    '</div>' +
    '<section class="card accounting-chart-card"><div class="accounting-section-head"><div><h3>Cash flow</h3><p>Monthly income and expenses · last six months</p></div><div class="flow-legend"><span><i class="income"></i>Income</span><span><i class="expense"></i>Expenses</span></div></div>' +
      accountingFlowHTML(trend) +
    '</section>' +
    '<section class="card accounting-ledger"><div class="accounting-section-head ledger-head"><div><h3>Transaction ledger</h3><p>Showing ' + transactions.length + ' transactions for ' + selectedLabel + '.</p></div></div>' +
      '<div class="toolbar accounting-toolbar">' +
        '<div class="search-field"><span>' + icon('search') + '</span><input type="search" id="accountingSearch" value="' + esc(state.accountingQuery || '') + '" placeholder="Search transactions…" aria-label="Search accounting transactions"></div>' +
        '<select id="accountingMonth" aria-label="Filter by period">' + accountingMonthOptions() + '</select>' +
        '<select id="accountingType" aria-label="Filter by transaction type">' +
          [['all', 'All transactions'], ['income', 'Income only'], ['expense', 'Expenses only']].map(([value, label]) => '<option value="' + value + '"' + ((state.accountingType || 'all') === value ? ' selected' : '') + '>' + label + '</option>').join('') +
        '</select>' +
      '</div>' +
      '<div id="accountingLedger">' + accountingLedgerHTML(transactions) + '</div>' +
    '</section>' +
    '<p class="accounting-footnote">' + icon('info', 12) + ' Net cash flow is an operational summary, not a formal profit or tax statement. Records are stored on this device.</p>' +
  '</div>';
}

function updateAccountingLedger() {
  const wrap = $('#accountingLedger');
  if (wrap) wrap.innerHTML = accountingLedgerHTML(accountingTransactions());
  const head = $('.ledger-head p');
  if (head) {
    const transactions = accountingTransactions();
    const label = state.accountingMonth === 'all' ? 'all time' : new Date(Number(state.accountingMonth.slice(0, 4)), Number(state.accountingMonth.slice(5, 7)) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    head.textContent = 'Showing ' + transactions.length + ' transactions for ' + label + '.';
  }
}
