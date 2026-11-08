/* LandLedger Finance — accounting views, statements and ledger modals */
'use strict';

const FC = window.FinanceCore;
const FA = window.FinanceApp;

const FINANCE_TABS = [
  ['finance', 'Overview'],
  ['finance-accounts', 'Accounts'],
  ['finance-journals', 'Journals'],
  ['finance-ledger', 'Ledger'],
  ['finance-statements', 'Statements'],
  ['finance-audit', 'Periods & audit']
];

const FINANCE_SOURCE_LABELS = {
  sale: 'Sale',
  payment: 'Receipt',
  expense: 'Expense',
  manual: 'Manual',
  closing: 'Period close',
  reversal: 'Reversal'
};

const FINANCE_CATEGORY_LABELS = {
  operating: 'Operating',
  investing: 'Investing',
  financing: 'Financing',
  'non-cash': 'Non-cash'
};

const FINANCE_ACCOUNT_TYPE_LABELS = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense'
};

const FINANCE_AUDIT_ACTIONS = [
  ['journal.post', 'Journal posted'],
  ['journal.reverse', 'Journal reversed'],
  ['period.close', 'Period closed'],
  ['period.reopen', 'Period reopened'],
  ['account.create', 'Account created'],
  ['account.activate', 'Account activated'],
  ['account.deactivate', 'Account deactivated'],
  ['ledger.initialize', 'Ledger initialised']
];

function financeLedger() {
  return FA.stateOf(data);
}

function financeAmount(minor) {
  return FC.formatMinor(minor);
}

function financeStatementAmount(minor) {
  return FC.formatMinor(minor, { forceDecimals: true });
}

function financeCompact(minor) {
  const value = Math.abs(Number(minor) || 0) / 100;
  if (value >= 1000000) return 'GH₵ ' + (value / 1000000).toFixed(value >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (value >= 1000) return 'GH₵ ' + Math.round(value / 1000) + 'K';
  return financeAmount(minor);
}

function financeTimestamp(value) {
  const date = new Date(value);
  if (isNaN(date)) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function financeMonthLabel(key) {
  const date = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);
  if (isNaN(date)) return key;
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function financeDefaultFrom() {
  return new Date().getFullYear() + '-01-01';
}

function financeRange() {
  return {
    from: state.financeFrom || financeDefaultFrom(),
    to: state.financeTo || todayValue()
  };
}

function financeTabs(active) {
  return '<div class="finance-tabs" role="navigation" aria-label="Finance sections">' +
    FINANCE_TABS.map(([route, label]) =>
      '<a href="#/' + route + '" class="' + (active === route ? 'active' : '') + '"' + (active === route ? ' aria-current="page"' : '') + '>' + esc(label) + '</a>'
    ).join('') + '</div>';
}

function financeSourceLabel(type) {
  return FINANCE_SOURCE_LABELS[type] || (type ? String(type).charAt(0).toUpperCase() + String(type).slice(1) : 'Manual');
}

function financeStatusBadge(journal) {
  if (journal.status === 'reversed') return '<span class="badge sold">Reversed</span>';
  if (journal.sourceType === 'reversal') return '<span class="badge info">Reversal</span>';
  return '<span class="badge paid">Posted</span>';
}

function financeCheckBadge(ok, okText, failText) {
  return '<span class="badge ' + (ok ? 'paid' : 'sold') + '">' + esc(ok ? okText : failText) + '</span>';
}

function financeBannerHTML(ledger) {
  let html = '';
  if (ledger.demo) {
    html += '<div class="finance-banner demo"><span class="finance-banner-ico">' + icon('info', 17) + '</span><div>' +
      '<strong>Demo ledger</strong><p>These figures were replayed from the sample workspace and are not real financial data. ' +
      (can('finance.close') ? 'Start a clean ledger when you are ready to keep real records.' : 'An administrator can start a clean ledger before real use.') + '</p></div>' +
      (can('finance.close') ? '<button type="button" class="btn btn-ghost btn-sm" data-action="finance-start-clean">Start clean ledger</button>' : '') +
      '</div>';
  }
  if (state.financeReplayFailures && state.financeReplayFailures.length) {
    html += '<div class="finance-banner warn"><span class="finance-banner-ico">' + icon('alert', 17) + '</span><div><strong>' +
      state.financeReplayFailures.length + ' record' + (state.financeReplayFailures.length === 1 ? '' : 's') + ' could not be posted</strong><p>' +
      esc(state.financeReplayFailures[0].message || 'Check the source records and run a ledger sync.') + '</p></div>' +
      (can('finance.manage') ? '<button type="button" class="btn btn-ghost btn-sm" data-action="finance-sync">Sync ledger</button>' : '') + '</div>';
  }
  const issues = FC.integrityCheck(ledger);
  if (issues.length) {
    html += '<div class="finance-banner error"><span class="finance-banner-ico">' + icon('alert', 17) + '</span><div><strong>Ledger integrity needs attention</strong><p>' +
      esc(issues.slice(0, 2).join(' ')) + (issues.length > 2 ? ' …' : '') + '</p></div></div>';
  }
  return html;
}

function financePageHead(title, subtitle, actions) {
  return '<div class="page-head"><div><h2>' + esc(title) + '</h2><p>' + esc(subtitle) + '</p></div>' +
    (actions ? '<div class="head-actions">' + actions + '</div>' : '') + '</div>';
}

/* ---------------- Overview ---------------- */
function financeMonthlyFlow(ledger) {
  const months = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = date.getFullYear() + '-' + S.pad(date.getMonth() + 1, 2);
    const statement = FC.incomeStatement(ledger, { from: key + '-01', to: key + '-31' });
    months.push({
      key,
      label: date.toLocaleDateString('en-GB', { month: 'short' }),
      income: statement.revenueTotal + statement.otherIncomeTotal,
      expenses: statement.costTotal + statement.operatingTotal + statement.otherExpensesTotal
    });
  }
  return months;
}

function financeFlowHTML(months) {
  const max = Math.max(1, ...months.flatMap((month) => [month.income, month.expenses]));
  return '<div class="accounting-flow">' + months.map((month) =>
    '<div class="flow-month"><span class="flow-month-label">' + esc(month.label) + '</span><div class="flow-bars">' +
      '<span class="flow-bar income" style="width:' + Math.max(month.income ? 2 : 0, month.income / max * 100).toFixed(1) + '%" title="Income: ' + esc(financeAmount(month.income)) + '"></span>' +
      '<span class="flow-bar expense" style="width:' + Math.max(month.expenses ? 2 : 0, month.expenses / max * 100).toFixed(1) + '%" title="Expenses: ' + esc(financeAmount(month.expenses)) + '"></span>' +
    '</div><span class="flow-net">' + esc(financeCompact(month.income - month.expenses)) + '</span></div>'
  ).join('') + '</div>';
}

function financeRecentJournalsHTML(ledger) {
  const recent = ledger.journals.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.seq || 0) - (a.seq || 0);
  }).slice(0, 6);
  if (!recent.length) {
    return '<div class="empty finance-empty"><div class="empty-ico">' + icon('receipts') + '</div><h3>No journal entries yet</h3><p>Sales, receipts and expenses will appear here automatically.</p>' +
      (can('finance.manage') ? '<button type="button" class="btn btn-primary btn-sm" data-action="finance-new-journal">' + icon('plus', 13) + ' New journal</button>' : '') + '</div>';
  }
  return '<div class="table-wrap"><table class="data finance-table"><thead><tr><th>Reference</th><th>Date</th><th>Narration</th><th>Source</th><th class="num">Amount</th><th>Status</th><th><span class="sr-only">View</span></th></tr></thead><tbody>' +
    recent.map((journal) => '<tr>' +
      '<td><strong class="finance-ref">' + esc(journal.ref) + '</strong></td>' +
      '<td>' + esc(fmtDate(journal.date)) + '</td>' +
      '<td><span class="finance-narration">' + esc(journal.narration) + '</span></td>' +
      '<td><span class="badge neutral">' + esc(financeSourceLabel(journal.sourceType)) + '</span></td>' +
      '<td class="num strong">' + esc(financeAmount(journal.debitTotal)) + '</td>' +
      '<td>' + financeStatusBadge(journal) + '</td>' +
      '<td><div class="row-actions"><button type="button" class="mini-btn" data-action="finance-view-journal" data-journal-id="' + esc(journal.id) + '" title="View journal" aria-label="View ' + esc(journal.ref) + '">' + icon('chevronRight', 13) + '</button></div></td>' +
    '</tr>').join('') + '</tbody></table></div>';
}

function viewFinanceOverview() {
  const ledger = financeLedger();
  const overview = FC.overview(ledger);
  const trial = FC.trialBalance(ledger);
  const sheet = FC.balanceSheet(ledger);
  const issues = FC.integrityCheck(ledger);
  const cashAccounts = ledger.accounts.filter((account) => account.cash === true).length;
  const closedPeriods = Object.values(ledger.periods || {}).filter((period) => period && period.status === 'closed').length;
  const balanced = trial.balanced && sheet.balanced && issues.length === 0;
  const actions = (can('finance.manage') ? '<button type="button" class="btn btn-ghost" data-action="finance-sync">' + icon('refresh', 15) + ' Sync records</button>' : '') +
    (can('finance.manage') ? '<button type="button" class="btn btn-primary" data-action="finance-new-journal">' + icon('plus', 15) + ' New journal</button>' : '');
  return '<div class="page finance-page">' +
    financePageHead('Finance', 'Accrual accounting from your sales, receipts and expenses — posted as balanced double-entry journals.', actions) +
    financeTabs('finance') +
    financeBannerHTML(ledger) +
    '<div class="accounting-kpis finance-kpis">' +
      '<div class="accounting-kpi income-kpi"><span class="accounting-kpi-icon">' + icon('wallet', 16) + '</span><small>Cash &amp; bank</small><strong>' + financeAmount(overview.cash) + '</strong><span>' + cashAccounts + ' cash accounts</span></div>' +
      '<div class="accounting-kpi receivable-kpi"><span class="accounting-kpi-icon">' + icon('clock', 16) + '</span><small>Accounts receivable</small><strong>' + financeAmount(overview.receivable) + '</strong><span>Unpaid sale balances</span></div>' +
      '<div class="accounting-kpi"><span class="accounting-kpi-icon">' + icon('trendUp', 16) + '</span><small>Revenue recognised</small><strong>' + financeAmount(overview.revenue) + '</strong><span>Accrual basis</span></div>' +
      '<div class="accounting-kpi net-kpi"><span class="accounting-kpi-icon">' + icon('banknote', 16) + '</span><small>Net profit</small><strong>' + financeAmount(overview.netProfit) + '</strong><span>Revenue less expenses</span></div>' +
    '</div>' +
    '<div class="finance-overview-grid">' +
      '<section class="card finance-chart-card"><div class="accounting-section-head"><div><h3>Income &amp; expenses</h3><p>Recognised in the last six months · accrual basis</p></div><div class="flow-legend"><span><i class="income"></i>Income</span><span><i class="expense"></i>Expenses</span></div></div>' +
        financeFlowHTML(financeMonthlyFlow(ledger)) +
      '</section>' +
      '<section class="card finance-position-card"><div class="accounting-section-head"><div><h3>Financial position</h3><p>Assets = liabilities + equity</p></div>' + financeCheckBadge(balanced, 'Balanced', 'Review') + '</div>' +
        '<div class="finance-position-body">' +
          '<div class="finance-position-row"><span>Total assets</span><strong>' + financeAmount(sheet.totalAssets) + '</strong></div>' +
          '<div class="finance-position-row"><span>Total liabilities</span><strong>' + financeAmount(sheet.totalLiabilities) + '</strong></div>' +
          '<div class="finance-position-row"><span>Total equity</span><strong>' + financeAmount(sheet.totalEquity) + '</strong></div>' +
          '<div class="finance-position-row total"><span>Liabilities + equity</span><strong>' + financeAmount(sheet.totalLiabilitiesAndEquity) + '</strong></div>' +
          '<div class="finance-position-foot"><span>' + overview.journalCount + ' journals · ' + closedPeriods + ' closed periods</span>' +
            (overview.lastPostedAt ? '<span>Last posted ' + esc(fmtDate(overview.lastPostedAt)) + '</span>' : '') + '</div>' +
        '</div>' +
      '</section>' +
    '</div>' +
    '<section class="card finance-recent-card"><div class="accounting-section-head"><div><h3>Recent journal entries</h3><p>Latest postings across sales, receipts, expenses and adjustments.</p></div>' +
      '<a class="btn btn-ghost btn-sm" href="#/finance-journals">' + icon('arrowRight', 13) + ' All journals</a></div>' +
      financeRecentJournalsHTML(ledger) +
    '</section>' +
    (issues.length ? '<section class="card finance-issues"><div class="accounting-section-head"><div><h3>Integrity check</h3><p>These items need review before relying on the statements.</p></div><span class="badge sold">' + issues.length + ' issue' + (issues.length === 1 ? '' : 's') + '</span></div><ul class="finance-issue-list">' + issues.map((issue) => '<li>' + esc(issue) + '</li>').join('') + '</ul></section>' : '') +
    '<p class="accounting-footnote">' + icon('shield', 12) + ' The ledger is stored on this device. Ask a qualified accountant to review the chart of accounts, tax treatment and statements before official use.</p>' +
  '</div>';
}

/* ---------------- Chart of accounts ---------------- */
function financeAccountRows() {
  const ledger = financeLedger();
  const balances = FC.balances(ledger);
  const query = String(state.financeAccountQuery || '').trim().toLowerCase();
  const type = state.financeAccountType || 'all';
  return FC.accountsSorted(ledger).filter((account) => {
    if (type !== 'all' && account.type !== type) return false;
    return !query || [account.code, account.name, account.group, account.type].join(' ').toLowerCase().includes(query);
  }).map((account) => ({
    account,
    balance: (balances.get(account.code) || { balance: 0 }).balance
  }));
}

function financeAccountResultsHTML() {
  const rows = financeAccountRows();
  if (!rows.length) {
    return '<div class="empty finance-empty"><div class="empty-ico">' + icon('search') + '</div><h3>No matching accounts</h3><p>Try another account type or search term.</p></div>';
  }
  return '<div class="table-wrap"><table class="data finance-table"><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Cash</th><th class="num">Balance</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
    rows.map(({ account, balance }) => '<tr>' +
      '<td><span class="finance-code">' + esc(account.code) + '</span></td>' +
      '<td><div class="finance-account-name"><strong>' + esc(account.name) + '</strong><small>' + esc(account.group || '—') + (account.system ? ' · system' : '') + '</small></div></td>' +
      '<td><span class="finance-type ' + esc(account.type) + '">' + esc(FINANCE_ACCOUNT_TYPE_LABELS[account.type] || account.type) + '</span></td>' +
      '<td>' + (account.cash ? '<span class="finance-cash-yes" title="Cash or bank account">' + icon('check', 13) + '</span>' : '<span class="finance-muted">—</span>') + '</td>' +
      '<td class="num strong">' + (balance ? esc(financeAmount(balance)) : '<span class="finance-muted">—</span>') + '</td>' +
      '<td><span class="badge ' + (account.active === false ? 'neutral' : 'paid') + '">' + (account.active === false ? 'Inactive' : 'Active') + '</span></td>' +
      '<td><div class="row-actions">' +
        (account.system ? '<span class="finance-lock" title="System account required by the ledger">' + icon('shield', 13) + '</span>' :
          (can('finance.manage') ? '<button type="button" class="mini-btn" data-action="finance-toggle-account" data-code="' + esc(account.code) + '" title="' + (account.active === false ? 'Activate' : 'Deactivate') + ' account">' + icon(account.active === false ? 'check' : 'x', 13) + '</button>' : '')) +
      '</div></td>' +
    '</tr>').join('') + '</tbody></table></div>' +
    '<div class="finance-table-foot"><span>' + rows.length + ' account' + (rows.length === 1 ? '' : 's') + ' shown</span><span>Signed balances follow each account’s normal balance.</span></div>';
}

function viewFinanceAccounts() {
  const ledger = financeLedger();
  const active = ledger.accounts.filter((account) => account.active !== false).length;
  const custom = ledger.accounts.filter((account) => !account.system).length;
  const cash = ledger.accounts.filter((account) => account.cash === true).length;
  const typeOptions = ['all'].concat(FC.ACCOUNT_TYPES).map((value) =>
    '<option value="' + value + '"' + ((state.financeAccountType || 'all') === value ? ' selected' : '') + '>' + (value === 'all' ? 'All account types' : FINANCE_ACCOUNT_TYPE_LABELS[value]) + '</option>'
  ).join('');
  return '<div class="page finance-page">' +
    financePageHead('Chart of accounts', 'The ledger’s account structure, grouped by financial statement line.', can('finance.manage') ? '<button type="button" class="btn btn-primary" data-action="finance-add-account">' + icon('plus', 15) + ' Add account</button>' : '') +
    financeTabs('finance-accounts') +
    financeBannerHTML(ledger) +
    '<div class="finance-mini-stats">' +
      '<div><small>ACCOUNTS</small><strong>' + ledger.accounts.length + '</strong></div>' +
      '<div><small>ACTIVE</small><strong>' + active + '</strong></div>' +
      '<div><small>CASH &amp; BANK</small><strong>' + cash + '</strong></div>' +
      '<div><small>CUSTOM</small><strong>' + custom + '</strong></div>' +
    '</div>' +
    '<section class="card finance-table-card"><div class="toolbar finance-toolbar">' +
      '<div class="search-field"><span>' + icon('search') + '</span><input type="search" id="financeAccountSearch" value="' + esc(state.financeAccountQuery || '') + '" placeholder="Search code, name or group…" aria-label="Search accounts"></div>' +
      '<select id="financeAccountType" aria-label="Filter by account type">' + typeOptions + '</select>' +
      '<span class="spacer"></span><span class="result-count">' + ledger.accounts.length + ' accounts</span>' +
    '</div><div id="financeAccountResults">' + financeAccountResultsHTML() + '</div></section>' +
    '<p class="accounting-footnote">' + icon('info', 12) + ' System accounts are referenced by automatic postings and cannot be deactivated. Add custom accounts for items specific to your business.</p>' +
  '</div>';
}

/* ---------------- Journal entries ---------------- */
function financeJournalMatches() {
  const ledger = financeLedger();
  const query = String(state.financeJournalQuery || '').trim().toLowerCase();
  const source = state.financeJournalSource || 'all';
  const status = state.financeJournalStatus || 'all';
  return ledger.journals.filter((journal) => {
    if (source !== 'all' && journal.sourceType !== source) return false;
    if (status !== 'all' && journal.status !== status) return false;
    if (!query) return true;
    const accountNames = journal.lines.map((line) => {
      const account = FC.accountByCode(ledger, line.accountCode);
      return account ? account.code + ' ' + account.name : line.accountCode;
    }).join(' ');
    return [journal.ref, journal.narration, journal.sourceId, journal.createdBy, journal.date, accountNames]
      .join(' ').toLowerCase().includes(query);
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.seq || 0) - (a.seq || 0);
  });
}

function financeJournalResultsHTML() {
  const ledger = financeLedger();
  const journals = financeJournalMatches();
  const pageSize = 15;
  const pages = Math.max(1, Math.ceil(journals.length / pageSize));
  const page = Math.min(Math.max(1, Number(state.financeJournalPage) || 1), pages);
  state.financeJournalPage = page;
  if (!journals.length) {
    const hasAny = ledger.journals.length > 0;
    return '<div class="empty finance-empty"><div class="empty-ico">' + icon('receipts') + '</div><h3>' + (hasAny ? 'No matching journals' : 'No journals yet') + '</h3><p>' + (hasAny ? 'Try another source, status or search term.' : 'Record a sale, receipt or expense — or post a manual journal.') + '</p>' +
      (can('finance.manage') && !hasAny ? '<button type="button" class="btn btn-primary btn-sm" data-action="finance-new-journal">' + icon('plus', 13) + ' New journal</button>' : '') + '</div>';
  }
  const slice = journals.slice((page - 1) * pageSize, page * pageSize);
  const table = '<div class="table-wrap"><table class="data finance-table"><thead><tr><th>Reference</th><th>Date</th><th>Narration</th><th>Source</th><th class="num">Amount</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
    slice.map((journal) => {
      const reversalOf = journal.reversalOf ? FC.journalById(ledger, journal.reversalOf) : null;
      return '<tr>' +
        '<td><strong class="finance-ref">' + esc(journal.ref) + '</strong>' + (reversalOf ? '<small class="finance-sub">Reverses ' + esc(reversalOf.ref) + '</small>' : '') + '</td>' +
        '<td>' + esc(fmtDate(journal.date)) + '</td>' +
        '<td><span class="finance-narration">' + esc(journal.narration) + '</span><small class="finance-sub">' + esc(journal.createdBy || 'System') + '</small></td>' +
        '<td><span class="badge neutral">' + esc(financeSourceLabel(journal.sourceType)) + '</span></td>' +
        '<td class="num strong">' + esc(financeAmount(journal.debitTotal)) + '</td>' +
        '<td>' + financeStatusBadge(journal) + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="mini-btn" data-action="finance-view-journal" data-journal-id="' + esc(journal.id) + '" title="View journal" aria-label="View ' + esc(journal.ref) + '">' + icon('chevronRight', 13) + '</button>' +
          (can('finance.manage') && journal.status === 'posted' && journal.sourceType !== 'reversal' ? '<button type="button" class="mini-btn" data-action="finance-reverse-journal" data-journal-id="' + esc(journal.id) + '" title="Reverse journal" aria-label="Reverse ' + esc(journal.ref) + '">' + icon('refresh', 13) + '</button>' : '') +
        '</div></td>' +
      '</tr>';
    }).join('') + '</tbody></table></div>';
  const pager = '<div class="pager"><span>Showing ' + ((page - 1) * pageSize + 1) + '–' + Math.min(page * pageSize, journals.length) + ' of ' + journals.length + '</span><div class="pager-btns">' +
    '<button type="button" class="pager-btn" data-action="finance-journal-page" data-page="' + (page - 1) + '" aria-label="Previous page"' + (page <= 1 ? ' disabled' : '') + '>' + icon('chevronLeft', 13) + '</button>' +
    '<button type="button" class="pager-btn" data-action="finance-journal-page" data-page="' + (page + 1) + '" aria-label="Next page"' + (page >= pages ? ' disabled' : '') + '>' + icon('chevronRight', 13) + '</button>' +
  '</div></div>';
  return table + pager;
}

function viewFinanceJournals() {
  const ledger = financeLedger();
  const sources = [['all', 'All sources']].concat(Object.keys(FINANCE_SOURCE_LABELS).map((value) => [value, FINANCE_SOURCE_LABELS[value]]));
  const statuses = [['all', 'All statuses'], ['posted', 'Posted'], ['reversed', 'Reversed']];
  const actions = (can('finance.manage') ? '<button type="button" class="btn btn-ghost" data-action="finance-sync">' + icon('refresh', 15) + ' Sync records</button>' : '') +
    (can('finance.manage') ? '<button type="button" class="btn btn-primary" data-action="finance-new-journal">' + icon('plus', 15) + ' New journal</button>' : '');
  return '<div class="page finance-page">' +
    financePageHead('Journal entries', 'Every financial event is posted as a balanced journal that remains traceable in the audit trail.', actions) +
    financeTabs('finance-journals') +
    financeBannerHTML(ledger) +
    '<section class="card finance-table-card"><div class="toolbar finance-toolbar">' +
      '<div class="search-field"><span>' + icon('search') + '</span><input type="search" id="financeJournalSearch" value="' + esc(state.financeJournalQuery || '') + '" placeholder="Search reference, narration or account…" aria-label="Search journals"></div>' +
      '<select id="financeJournalSource" aria-label="Filter by source">' + sources.map(([value, label]) => '<option value="' + value + '"' + ((state.financeJournalSource || 'all') === value ? ' selected' : '') + '>' + esc(label) + '</option>').join('') + '</select>' +
      '<select id="financeJournalStatus" aria-label="Filter by status">' + statuses.map(([value, label]) => '<option value="' + value + '"' + ((state.financeJournalStatus || 'all') === value ? ' selected' : '') + '>' + esc(label) + '</option>').join('') + '</select>' +
      '<span class="spacer"></span><span class="result-count">' + ledger.journals.length + ' total entries</span>' +
    '</div><div id="financeJournalResults">' + financeJournalResultsHTML() + '</div></section>' +
    '<p class="accounting-footnote">' + icon('shield', 12) + ' Posted journals cannot be edited. Corrections are made with a reversal journal, keeping both sides of the story.</p>' +
  '</div>';
}

/* ---------------- General ledger ---------------- */
function financePreviousDay(value) {
  if (!value) return '';
  const date = S.parseDate(value);
  if (isNaN(date)) return '';
  date.setDate(date.getDate() - 1);
  return S.dateOnly(date);
}

function financeLedgerData() {
  const ledger = financeLedger();
  const accountCode = state.financeGlAccount || 'all';
  const account = accountCode === 'all' ? null : FC.accountByCode(ledger, accountCode);
  const from = state.financeGlFrom || '';
  const to = state.financeGlTo || '';
  const normal = account ? FC.normalBalance(account.type) : 'debit';
  let opening = 0;
  if (account && from) {
    ledger.journals.forEach((journal) => {
      if (journal.status !== 'posted' && journal.status !== 'reversed') return;
      if (journal.date >= from) return;
      journal.lines.forEach((line) => {
        if (line.accountCode !== account.code) return;
        opening += normal === 'debit' ? line.debit - line.credit : line.credit - line.debit;
      });
    });
  }
  let running = opening;
  const rows = [];
  const journals = ledger.journals.filter((journal) => {
    if (journal.status !== 'posted' && journal.status !== 'reversed') return false;
    if (from && journal.date < from) return false;
    if (to && journal.date > to) return false;
    if (account && !journal.lines.some((line) => line.accountCode === account.code)) return false;
    return true;
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.seq || 0) - (b.seq || 0);
  });
  journals.forEach((journal) => {
    const lines = account ? journal.lines.filter((line) => line.accountCode === account.code) : journal.lines;
    lines.forEach((line) => {
      const target = FC.accountByCode(ledger, line.accountCode);
      let balance = null;
      if (account) {
        running += normal === 'debit' ? line.debit - line.credit : line.credit - line.debit;
        balance = running;
      }
      rows.push({
        journalId: journal.id,
        ref: journal.ref,
        date: journal.date,
        status: journal.status,
        accountCode: line.accountCode,
        accountName: target ? target.name : line.accountCode,
        memo: line.memo || journal.narration,
        narration: journal.narration,
        debit: line.debit,
        credit: line.credit,
        balance
      });
    });
  });
  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);
  const closing = account
    ? opening + (normal === 'debit' ? totalDebit - totalCredit : totalCredit - totalDebit)
    : null;
  return { ledger, account, rows, opening, closing, totalDebit, totalCredit, journalCount: journals.length };
}

function financeLedgerResultsHTML() {
  const dataSet = financeLedgerData();
  const { account, rows, opening } = dataSet;
  const pageSize = 50;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, Number(state.financeGlPage) || 1), pages);
  state.financeGlPage = page;
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);
  const summary = '<div class="finance-ledger-summary">' +
    (account && state.financeGlFrom ? '<div><small>OPENING</small><strong>' + esc(financeAmount(opening)) + '</strong></div>' : '') +
    '<div><small>DEBITS</small><strong>' + esc(financeAmount(dataSet.totalDebit)) + '</strong></div>' +
    '<div><small>CREDITS</small><strong>' + esc(financeAmount(dataSet.totalCredit)) + '</strong></div>' +
    (account ? '<div><small>CLOSING</small><strong>' + esc(financeAmount(dataSet.closing)) + '</strong></div>' : '<div><small>JOURNALS</small><strong>' + dataSet.journalCount + '</strong></div>') +
  '</div>';
  if (!rows.length) {
    return summary + '<div class="empty finance-empty"><div class="empty-ico">' + icon('sales') + '</div><h3>No ledger activity</h3><p>No journal lines match the selected account and date range.</p></div>';
  }
  const header = account
    ? '<tr><th>Date</th><th>Reference</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr>'
    : '<tr><th>Date</th><th>Reference</th><th>Account</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th><th>Status</th></tr>';
  const body = slice.map((row) => '<tr>' +
    '<td>' + esc(fmtDate(row.date)) + '</td>' +
    '<td><button type="button" class="link-btn finance-ref-link" data-action="finance-view-journal" data-journal-id="' + esc(row.journalId) + '">' + esc(row.ref) + '</button></td>' +
    (account ? '' : '<td><span class="finance-code">' + esc(row.accountCode) + '</span><small class="finance-sub">' + esc(row.accountName) + '</small></td>') +
    '<td><span class="finance-narration">' + esc(row.memo || row.narration) + '</span></td>' +
    '<td class="num">' + (row.debit ? esc(financeAmount(row.debit)) : '<span class="finance-muted">—</span>') + '</td>' +
    '<td class="num">' + (row.credit ? esc(financeAmount(row.credit)) : '<span class="finance-muted">—</span>') + '</td>' +
    (account ? '<td class="num strong">' + esc(financeAmount(row.balance)) + '</td>' : '<td>' + financeStatusBadge({ status: row.status, sourceType: 'manual' }) + '</td>') +
  '</tr>').join('');
  const pager = '<div class="pager"><span>Showing ' + ((page - 1) * pageSize + 1) + '–' + Math.min(page * pageSize, rows.length) + ' of ' + rows.length + ' lines</span><div class="pager-btns">' +
    '<button type="button" class="pager-btn" data-action="finance-gl-page" data-page="' + (page - 1) + '" aria-label="Previous page"' + (page <= 1 ? ' disabled' : '') + '>' + icon('chevronLeft', 13) + '</button>' +
    '<button type="button" class="pager-btn" data-action="finance-gl-page" data-page="' + (page + 1) + '" aria-label="Next page"' + (page >= pages ? ' disabled' : '') + '>' + icon('chevronRight', 13) + '</button>' +
  '</div></div>';
  return summary + '<div class="table-wrap"><table class="data finance-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>' + pager;
}

function viewFinanceLedger() {
  const ledger = financeLedger();
  const accountOptions = ['<option value="all"' + ((state.financeGlAccount || 'all') === 'all' ? ' selected' : '') + '>All accounts</option>'].concat(
    FC.accountsSorted(ledger).map((account) =>
      '<option value="' + esc(account.code) + '"' + (state.financeGlAccount === account.code ? ' selected' : '') + '>' + esc(account.code) + ' · ' + esc(account.name) + '</option>'
    )
  ).join('');
  return '<div class="page finance-page">' +
    financePageHead('General ledger', 'Every posted line by account, with running balances and source journals.', '<button type="button" class="btn btn-ghost" data-action="finance-export">' + icon('download', 15) + ' Export CSV</button>') +
    financeTabs('finance-ledger') +
    financeBannerHTML(ledger) +
    '<section class="card finance-table-card"><div class="toolbar finance-toolbar">' +
      '<select id="financeGlAccount" aria-label="Select account">' + accountOptions + '</select>' +
      '<label class="toolbar-date">From<input type="date" id="financeGlFrom" value="' + esc(state.financeGlFrom || '') + '"></label>' +
      '<label class="toolbar-date">To<input type="date" id="financeGlTo" value="' + esc(state.financeGlTo || '') + '"></label>' +
      '<span class="spacer"></span><span class="result-count">' + ledger.journals.length + ' journals</span>' +
    '</div><div id="financeGlResults">' + financeLedgerResultsHTML() + '</div></section>' +
    '<p class="accounting-footnote">' + icon('info', 12) + ' Select a single account to see its opening balance, movements and running balance. Reversed journals remain visible for the audit trail.</p>' +
  '</div>';
}

/* ---------------- Statements ---------------- */
function financeStmtSection(label) {
  return '<tr class="stmt-section"><td colspan="2">' + esc(label) + '</td></tr>';
}

function financeStmtLine(code, name, amount) {
  return '<tr class="stmt-line"><td><span class="stmt-code">' + esc(code || '') + '</span><span class="stmt-name">' + esc(name) + '</span></td>' +
    '<td class="num">' + esc(financeStatementAmount(amount)) + '</td></tr>';
}

function financeStmtEmpty(message) {
  return '<tr class="stmt-empty"><td colspan="2">' + esc(message) + '</td></tr>';
}

function financeStmtSubtotal(label, amount, grand) {
  return '<tr class="stmt-' + (grand ? 'grand' : 'subtotal') + '"><td>' + esc(label) + '</td><td class="num">' + esc(financeStatementAmount(amount)) + '</td></tr>';
}

function financeStmtShell(title, subtitle, badge, rows, note) {
  return '<div class="statement-sheet"><div class="statement-head"><div><span class="finance-eyebrow">FINANCIAL STATEMENT</span><h3>' + esc(title) + '</h3><p>' + esc(subtitle) + '</p></div>' +
    (badge || '') + '</div>' +
    '<table class="stmt-table"><thead><tr><th>Account</th><th class="num">Amount (GH₵)</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    (note ? '<p class="statement-note">' + icon('info', 12) + ' ' + esc(note) + '</p>' : '') +
  '</div>';
}

function financeIncomeStatementHTML(ledger, from, to) {
  const statement = FC.incomeStatement(ledger, { from, to });
  let rows = '';
  rows += financeStmtSection('Revenue');
  rows += statement.revenueLines.length ? statement.revenueLines.map((line) => financeStmtLine(line.code, line.name, line.amount)).join('') : financeStmtEmpty('No revenue posted in this period.');
  rows += financeStmtSubtotal('Total revenue', statement.revenueTotal);
  if (statement.otherIncomeLines.length) {
    rows += financeStmtSection('Other income');
    rows += statement.otherIncomeLines.map((line) => financeStmtLine(line.code, line.name, line.amount)).join('');
    rows += financeStmtSubtotal('Total other income', statement.otherIncomeTotal);
  }
  rows += financeStmtSection('Cost of sales');
  rows += statement.costLines.length ? statement.costLines.map((line) => financeStmtLine(line.code, line.name, line.amount)).join('') : financeStmtEmpty('No cost of sales posted in this period.');
  rows += financeStmtSubtotal('Total cost of sales', statement.costTotal);
  rows += financeStmtSubtotal('Gross profit', statement.grossProfit, true);
  rows += financeStmtSection('Operating expenses');
  rows += statement.operatingExpenseLines.length ? statement.operatingExpenseLines.map((line) => financeStmtLine(line.code, line.name, line.amount)).join('') : financeStmtEmpty('No operating expenses posted in this period.');
  rows += financeStmtSubtotal('Total operating expenses', statement.operatingTotal);
  if (statement.otherExpenseLines.length) {
    rows += financeStmtSection('Other expenses');
    rows += statement.otherExpenseLines.map((line) => financeStmtLine(line.code, line.name, line.amount)).join('');
    rows += financeStmtSubtotal('Total other expenses', statement.otherExpensesTotal);
  }
  rows += financeStmtSubtotal('Operating profit', statement.operatingProfit, true);
  rows += financeStmtSubtotal('Net profit', statement.netProfit, true);
  return financeStmtShell(
    'Income statement',
    'For the period ' + fmtDate(from) + ' to ' + fmtDate(to),
    '<span class="badge info">Accrual basis</span>',
    rows,
    'Revenue is recognised when a sale is recorded, not only when cash is received. Period-closing entries are excluded so each period reports its own result. Cost of sales uses the development cost entered on the plot.'
  );
}

function financeBalanceSheetHTML(ledger, asOf) {
  const sheet = FC.balanceSheet(ledger, { asOf });
  let rows = '';
  rows += financeStmtSection('Assets');
  rows += sheet.assets.length ? sheet.assets.map((line) => financeStmtLine(line.code, line.name, line.amount)).join('') : financeStmtEmpty('No asset balances yet.');
  rows += financeStmtSubtotal('Total assets', sheet.totalAssets, true);
  rows += financeStmtSection('Liabilities');
  rows += sheet.liabilities.length ? sheet.liabilities.map((line) => financeStmtLine(line.code, line.name, line.amount)).join('') : financeStmtEmpty('No liabilities recorded.');
  rows += financeStmtSubtotal('Total liabilities', sheet.totalLiabilities);
  rows += financeStmtSection('Equity');
  rows += sheet.equity.length ? sheet.equity.map((line) => financeStmtLine(line.code, line.name, line.amount)).join('') : financeStmtEmpty('No equity recorded.');
  rows += financeStmtSubtotal('Total equity', sheet.totalEquity);
  rows += financeStmtSubtotal('Total liabilities and equity', sheet.totalLiabilitiesAndEquity, true);
  const badge = financeCheckBadge(sheet.balanced, 'Balanced', 'Out of balance');
  return financeStmtShell(
    'Balance sheet',
    'As at ' + fmtDate(asOf),
    badge,
    rows,
    sheet.balanced
      ? 'Assets equal liabilities plus equity. Closed periods carry their result in retained earnings; anything after the last close is shown as current earnings.'
      : 'The statement is out of balance by ' + financeStatementAmount(sheet.difference) + '. Review the ledger before using these figures.'
  );
}

function financeCashFlowHTML(ledger, from, to) {
  const flow = FC.cashFlow(ledger, { from, to });
  let rows = '';
  rows += financeStmtSection('Operating activities');
  rows += financeStmtSubtotal('Net cash from operating activities', flow.operating);
  rows += financeStmtSection('Investing activities');
  rows += financeStmtSubtotal('Net cash from investing activities', flow.investing);
  rows += financeStmtSection('Financing activities');
  rows += financeStmtSubtotal('Net cash from financing activities', flow.financing);
  if (flow.nonCash !== 0) {
    rows += financeStmtSection('Other cash movements');
    rows += financeStmtSubtotal('Net other cash movements', flow.nonCash);
  }
  rows += financeStmtSubtotal('Net increase/(decrease) in cash', flow.netChange, true);
  rows += financeStmtSubtotal('Cash at start of period', flow.opening);
  rows += financeStmtSubtotal('Cash at end of period', flow.closing, true);
  const badge = financeCheckBadge(flow.balanced, 'Reconciled', 'Not reconciled');
  let detail = '';
  if (flow.rows.length) {
    detail = '<div class="statement-detail"><h4>Cash movements</h4><div class="table-wrap"><table class="data finance-table"><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Activity</th><th class="num">Amount</th></tr></thead><tbody>' +
      flow.rows.map((row) => '<tr><td>' + esc(fmtDate(row.date)) + '</td><td><strong class="finance-ref">' + esc(row.ref) + '</strong></td><td>' + esc(row.narration) + '</td><td>' + esc(FINANCE_CATEGORY_LABELS[row.category] || row.category) + '</td><td class="num strong">' + esc(financeStatementAmount(row.amount)) + '</td></tr>').join('') +
      '</tbody></table></div></div>';
  }
  return financeStmtShell(
    'Cash flow statement',
    'For the period ' + fmtDate(from) + ' to ' + fmtDate(to),
    badge,
    rows,
    'Cash includes cash on hand, bank accounts, Mobile Money and undeposited funds.'
  ) + detail;
}

function financeTrialBalanceHTML(ledger, asOf) {
  const trial = FC.trialBalance(ledger, { asOf });
  if (!trial.rows.length) {
    return '<div class="statement-sheet"><div class="statement-head"><div><span class="finance-eyebrow">FINANCIAL STATEMENT</span><h3>Trial balance</h3><p>As at ' + esc(fmtDate(asOf)) + '</p></div>' + financeCheckBadge(true, 'Balanced', 'Out of balance') + '</div>' +
      '<div class="empty finance-empty"><div class="empty-ico">' + icon('database') + '</div><h3>No balances yet</h3><p>Post a sale, receipt or expense to populate the trial balance.</p></div></div>';
  }
  const rows = trial.rows.map((row) => '<tr class="stmt-line"><td><span class="stmt-code">' + esc(row.code) + '</span><span class="stmt-name">' + esc(row.name) + '<small>' + esc(FINANCE_ACCOUNT_TYPE_LABELS[row.type] || row.type) + '</small></span></td>' +
    '<td class="num">' + (row.debit ? esc(financeStatementAmount(row.debit)) : '<span class="finance-muted">—</span>') + '</td>' +
    '<td class="num">' + (row.credit ? esc(financeStatementAmount(row.credit)) : '<span class="finance-muted">—</span>') + '</td></tr>').join('');
  return '<div class="statement-sheet"><div class="statement-head"><div><span class="finance-eyebrow">FINANCIAL STATEMENT</span><h3>Trial balance</h3><p>As at ' + esc(fmtDate(asOf)) + ' · ' + trial.rows.length + ' accounts with balances</p></div>' + financeCheckBadge(trial.balanced, 'Balanced', 'Out by ' + financeAmount(trial.difference)) + '</div>' +
    '<table class="stmt-table stmt-trial"><thead><tr><th>Account</th><th class="num">Debit (GH₵)</th><th class="num">Credit (GH₵)</th></tr></thead><tbody>' + rows +
    '<tr class="stmt-grand"><td>Total</td><td class="num">' + esc(financeStatementAmount(trial.totalDebit)) + '</td><td class="num">' + esc(financeStatementAmount(trial.totalCredit)) + '</td></tr>' +
    '</tbody></table><p class="statement-note">' + icon('shield', 12) + ' Total debits must equal total credits in a double-entry ledger.</p></div>';
}

function financeStatementBodyHTML(ledger, type, from, to) {
  if (type === 'bs') return financeBalanceSheetHTML(ledger, to);
  if (type === 'cf') return financeCashFlowHTML(ledger, from, to);
  if (type === 'tb') return financeTrialBalanceHTML(ledger, to);
  return financeIncomeStatementHTML(ledger, from, to);
}

function viewFinanceStatements() {
  const ledger = financeLedger();
  const range = financeRange();
  const type = state.financeStatement || 'pl';
  const options = [['pl', 'Profit &amp; loss'], ['bs', 'Balance sheet'], ['cf', 'Cash flow'], ['tb', 'Trial balance']];
  const invalid = range.from > range.to;
  return '<div class="page finance-page">' +
    financePageHead('Financial statements', 'Accrual-basis profit and loss, balance sheet, cash flow and trial balance from posted journals.', '<button type="button" class="btn btn-ghost" data-action="finance-print">' + icon('printer', 15) + ' Print</button><button type="button" class="btn btn-primary" data-action="finance-export">' + icon('download', 15) + ' Export CSV</button>') +
    financeTabs('finance-statements') +
    financeBannerHTML(ledger) +
    '<section class="card finance-statement-controls"><div class="segmented finance-segmented">' +
      options.map(([value, label]) => '<button type="button" class="' + (type === value ? 'active' : '') + '" data-action="finance-statement" data-statement="' + value + '">' + label + '</button>').join('') +
    '</div><div class="finance-date-range"><label>From<input type="date" id="financeFrom" value="' + esc(range.from) + '"></label><label>To / as at<input type="date" id="financeTo" value="' + esc(range.to) + '"></label></div>' +
    '<p>' + (type === 'bs' || type === 'tb' ? 'The balance sheet and trial balance use the “To / as at” date.' : 'Income and cash flow use the full date range.') + '</p></section>' +
    (invalid ? '<div class="finance-banner warn"><span class="finance-banner-ico">' + icon('alert', 17) + '</span><div><strong>Check the reporting dates</strong><p>The “From” date is after the “To” date, so no journals will fall in this range.</p></div></div>' : '') +
    '<div id="financeStatementBody">' + financeStatementBodyHTML(ledger, type, range.from, range.to) + '</div>' +
    '<p class="accounting-footnote">' + icon('info', 12) + ' Statements are generated from posted journals in this device’s ledger, not from dashboard summaries. Tax and statutory treatment needs review by a qualified accountant.</p>' +
  '</div>';
}

/* ---------------- Periods & audit ---------------- */
function financePeriodKeys(ledger) {
  const keys = new Set();
  const now = new Date();
  for (let offset = 0; offset < 12; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    keys.add(date.getFullYear() + '-' + S.pad(date.getMonth() + 1, 2));
  }
  FC.periodList(ledger).forEach((period) => keys.add(period.key));
  return Array.from(keys).sort().reverse();
}

function financePeriodsHTML() {
  const ledger = financeLedger();
  const keys = financePeriodKeys(ledger);
  const rows = keys.map((key) => {
    const info = FC.periodInfo(ledger, key);
    const summary = FC.periodSummary(ledger, key);
    const closed = info.status === 'closed';
    const closingJournal = closed && info.closingJournalId ? FC.journalById(ledger, info.closingJournalId) : null;
    return '<tr>' +
      '<td><strong>' + esc(financeMonthLabel(key)) + '</strong><small class="finance-sub">' + esc(key) + '</small></td>' +
      '<td class="num">' + summary.journalCount + '</td>' +
      '<td class="num">' + esc(financeAmount(summary.revenue)) + '</td>' +
      '<td class="num">' + esc(financeAmount(summary.expenses)) + '</td>' +
      '<td class="num strong ' + (summary.netProfit < 0 ? 'finance-negative' : '') + '">' + esc(financeAmount(summary.netProfit)) + '</td>' +
      '<td><span class="badge ' + (closed ? 'neutral' : 'paid') + '">' + (closed ? 'Closed' : 'Open') + '</span>' + (info.reopenedAt ? '<small class="finance-sub">Reopened ' + esc(fmtDate(info.reopenedAt)) + '</small>' : '') + '</td>' +
      '<td><small class="finance-sub">' + (closed ? esc(info.closedBy || 'System') : '—') + (closed && info.closedAt ? '<br>' + esc(fmtDate(info.closedAt)) : '') + (closingJournal ? '<br>' + esc(closingJournal.ref) : '') + '</small></td>' +
      '<td><div class="row-actions">' +
        (can('finance.close') ? (closed
          ? '<button type="button" class="mini-btn" data-action="finance-reopen-period" data-period="' + esc(key) + '" title="Reopen period" aria-label="Reopen ' + esc(financeMonthLabel(key)) + '">' + icon('refresh', 13) + '</button>'
          : '<button type="button" class="mini-btn" data-action="finance-close-period" data-period="' + esc(key) + '" title="Close period" aria-label="Close ' + esc(financeMonthLabel(key)) + '">' + icon('check', 13) + '</button>') : '<span class="finance-muted">—</span>') +
      '</div></td>' +
    '</tr>';
  }).join('');
  return '<div class="table-wrap"><table class="data finance-table"><thead><tr><th>Period</th><th class="num">Journals</th><th class="num">Revenue</th><th class="num">Expenses</th><th class="num">Net</th><th>Status</th><th>Closed by</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function financeAuditMatches() {
  const ledger = financeLedger();
  return FC.auditTrail(ledger, {
    query: state.financeAuditQuery || '',
    action: state.financeAuditAction && state.financeAuditAction !== 'all' ? state.financeAuditAction : ''
  });
}

function financeAuditResultsHTML() {
  const entries = financeAuditMatches();
  if (!entries.length) {
    return '<div class="empty finance-empty"><div class="empty-ico">' + icon('shield') + '</div><h3>No matching audit entries</h3><p>Try another action or search term.</p></div>';
  }
  return '<div class="table-wrap"><table class="data finance-table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Reference</th><th>Detail</th></tr></thead><tbody>' +
    entries.slice(0, 100).map((entry) => '<tr>' +
      '<td><span class="finance-nowrap">' + esc(financeTimestamp(entry.at)) + '</span></td>' +
      '<td>' + esc(entry.actor || 'System') + '</td>' +
      '<td><span class="badge neutral">' + esc((FINANCE_AUDIT_ACTIONS.find(([value]) => value === entry.action) || [entry.action, entry.action])[1]) + '</span></td>' +
      '<td><strong class="finance-ref">' + esc(entry.ref || '—') + '</strong></td>' +
      '<td><span class="finance-audit-detail">' + esc(entry.detail || '') + '</span></td>' +
    '</tr>').join('') + '</tbody></table></div>' +
    (entries.length > 100 ? '<div class="finance-table-foot"><span>Showing the latest 100 of ' + entries.length + ' audit entries.</span></div>' : '');
}

function viewFinanceAudit() {
  const ledger = financeLedger();
  const closed = Object.values(ledger.periods || {}).filter((period) => period && period.status === 'closed').length;
  const last = ledger.journals.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  const actions = FINANCE_AUDIT_ACTIONS.map(([value, label]) => '<option value="' + value + '"' + (state.financeAuditAction === value ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
  return '<div class="page finance-page">' +
    financePageHead('Periods & audit', 'Lock accounting periods, review the full audit trail and keep the ledger in sync with operational records.', '<button type="button" class="btn btn-ghost" data-action="finance-export">' + icon('download', 15) + ' Export audit</button>') +
    financeTabs('finance-audit') +
    financeBannerHTML(ledger) +
    '<section class="card finance-controls-card"><div class="accounting-section-head"><div><h3>Ledger controls</h3><p>Local double-entry ledger · ' + (ledger.demo ? 'demo data' : 'live workspace') + '</p></div><span class="badge ' + (ledger.demo ? 'reserved' : 'paid') + '">' + (ledger.demo ? 'Demo' : 'Live') + '</span></div>' +
      '<div class="finance-controls-grid">' +
        '<div><small>JOURNALS</small><strong>' + ledger.journals.length + '</strong></div>' +
        '<div><small>CLOSED PERIODS</small><strong>' + closed + '</strong></div>' +
        '<div><small>LAST POSTED</small><strong>' + (last ? esc(fmtDate(last.postedDate || last.date)) : '—') + '</strong></div>' +
        '<div><small>ACCOUNTS</small><strong>' + ledger.accounts.length + '</strong></div>' +
      '</div>' +
      '<div class="finance-controls-actions">' +
        (can('finance.manage') ? '<button type="button" class="btn btn-soft btn-sm" data-action="finance-sync">' + icon('refresh', 14) + ' Sync missing records</button>' : '') +
        (can('finance.close') ? '<button type="button" class="btn btn-ghost btn-sm" data-action="finance-start-clean">' + icon('database', 14) + ' Start clean ledger</button>' : '') +
        '<span class="finance-controls-note">Posting into a closed period is blocked until the period is reopened.</span>' +
      '</div>' +
    '</section>' +
    '<section class="card finance-table-card"><div class="accounting-section-head"><div><h3>Accounting periods</h3><p>Close a month once its journals are reviewed. Closing zeroes that month’s revenue and expenses, moves the result to retained earnings and blocks new postings.</p></div></div>' +
      financePeriodsHTML() +
    '</section>' +
    '<section class="card finance-table-card"><div class="accounting-section-head"><div><h3>Audit trail</h3><p>Every post, reversal, period action and account change is recorded.</p></div></div>' +
      '<div class="toolbar finance-toolbar"><div class="search-field"><span>' + icon('search') + '</span><input type="search" id="financeAuditSearch" value="' + esc(state.financeAuditQuery || '') + '" placeholder="Search actor, reference or detail…" aria-label="Search audit trail"></div>' +
      '<select id="financeAuditAction" aria-label="Filter audit action"><option value="all">All actions</option>' + actions + '</select></div>' +
      '<div id="financeAuditResults">' + financeAuditResultsHTML() + '</div>' +
    '</section>' +
  '</div>';
}

/* ---------------- Modals ---------------- */
function openFinanceAccountModal() {
  if (!requirePermission('finance.manage')) return;
  openModal({
    title: 'Add an account',
    subtitle: 'Extend the chart of accounts for balances specific to your business.',
    size: 'small',
    body: '<form id="finance-account-form" novalidate><div class="form-grid">' +
      '<div class="field"><label for="faCode">Account code <span class="req">*</span></label><input id="faCode" inputmode="numeric" placeholder="e.g. 1110" autofocus><span class="error"></span></div>' +
      '<div class="field"><label for="faType">Type <span class="req">*</span></label><select id="faType">' + FC.ACCOUNT_TYPES.map((type) => '<option value="' + type + '">' + esc(FINANCE_ACCOUNT_TYPE_LABELS[type]) + '</option>').join('') + '</select></div>' +
      '<div class="field full"><label for="faName">Account name <span class="req">*</span></label><input id="faName" placeholder="e.g. Escrow account"><span class="error"></span></div>' +
      '<div class="field"><label for="faGroup">Group</label><input id="faGroup" placeholder="e.g. currentAsset"><span class="error"></span></div>' +
      '<div class="field"><label class="check-field"><input type="checkbox" id="faCash"> Treat as cash / bank</label></div>' +
    '</div></form>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button type="submit" form="finance-account-form" class="btn btn-primary">' + icon('check', 15) + ' Add account</button>'
  });
}

function saveFinanceAccountFromForm() {
  if (!requirePermission('finance.manage')) return;
  clearFieldErrors($('#finance-account-form'));
  const ledger = financeLedger();
  const saved = FA.snapshot(data);
  const code = inputValue('faCode');
  const name = inputValue('faName');
  try {
    FC.addAccount(ledger, {
      code,
      name,
      type: $('#faType').value,
      group: inputValue('faGroup'),
      cash: $('#faCash').checked
    }, FA.actorName());
  } catch (err) {
    toast(err && err.message ? err.message : 'Could not add the account.', 'error');
    return;
  }
  if (!financePersist(saved)) return;
  closeModal();
  refresh();
  toast('Account ' + code + ' added.');
}

function openManualJournalModal() {
  if (!requirePermission('finance.manage')) return;
  state.manualJournal = {
    date: todayValue(),
    category: 'operating',
    narration: '',
    lines: [
      { accountCode: '', debit: '', credit: '', memo: '' },
      { accountCode: '', debit: '', credit: '', memo: '' }
    ]
  };
  renderManualJournalModal();
}

function financeAccountChoiceOptions(selected) {
  const ledger = financeLedger();
  return '<option value="">Select account</option>' + FC.ACCOUNT_TYPES.map((type) => {
    const accounts = FC.accountsSorted(ledger).filter((account) => account.type === type && account.active !== false);
    if (!accounts.length) return '';
    return '<optgroup label="' + esc(FINANCE_ACCOUNT_TYPE_LABELS[type]) + '">' +
      accounts.map((account) => '<option value="' + esc(account.code) + '"' + (selected === account.code ? ' selected' : '') + '>' + esc(account.code) + ' · ' + esc(account.name) + '</option>').join('') +
    '</optgroup>';
  }).join('');
}

function renderManualJournalModal() {
  const draft = state.manualJournal;
  const categories = FC.JOURNAL_CATEGORIES.map((value) =>
    '<option value="' + value + '"' + (draft.category === value ? ' selected' : '') + '>' + esc(FINANCE_CATEGORY_LABELS[value]) + '</option>'
  ).join('');
  const lines = draft.lines.map((line, index) =>
    '<div class="mj-row" data-index="' + index + '">' +
      '<select class="mj-account" aria-label="Line ' + (index + 1) + ' account">' + financeAccountChoiceOptions(line.accountCode) + '</select>' +
      '<input class="mj-debit" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" value="' + esc(line.debit) + '" aria-label="Line ' + (index + 1) + ' debit">' +
      '<input class="mj-credit" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" value="' + esc(line.credit) + '" aria-label="Line ' + (index + 1) + ' credit">' +
      '<input class="mj-memo" type="text" placeholder="Memo" value="' + esc(line.memo) + '" aria-label="Line ' + (index + 1) + ' memo">' +
      '<button type="button" class="mini-btn" data-action="manual-journal-remove-line" data-index="' + index + '" title="Remove line"' + (draft.lines.length <= 2 ? ' disabled' : '') + '>' + icon('x', 13) + '</button>' +
    '</div>'
  ).join('');
  openModal({
    title: 'Post a manual journal',
    subtitle: 'Use manual journals for adjustments, opening balances and transfers. Debits must equal credits.',
    size: 'wide',
    body: '<form id="manual-journal-form" novalidate><div class="form-grid">' +
      '<div class="field"><label for="mjDate">Journal date <span class="req">*</span></label><input id="mjDate" type="date" value="' + esc(draft.date) + '"><span class="error"></span></div>' +
      '<div class="field"><label for="mjCategory">Cash flow activity</label><select id="mjCategory">' + categories + '</select></div>' +
      '<div class="field full"><label for="mjNarration">Narration <span class="req">*</span></label><input id="mjNarration" value="' + esc(draft.narration) + '" placeholder="What is this journal for?" autofocus><span class="error"></span></div>' +
      '</div>' +
      '<div class="manual-journal-lines"><div class="mj-head"><span>Account</span><span>Debit (GH₵)</span><span>Credit (GH₵)</span><span>Memo</span><span></span></div>' +
      '<div id="manualJournalLines">' + lines + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm mj-add" data-action="manual-journal-add-line">' + icon('plus', 13) + ' Add line</button>' +
      '<div class="mj-totals" id="mjTotals"></div></div>' +
      '<p class="review-note">The journal will be posted to the general ledger and recorded in the audit trail. Posted journals cannot be edited; use a reversal for corrections.</p>' +
    '</form>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button type="submit" form="manual-journal-form" class="btn btn-primary">' + icon('check', 15) + ' Post journal</button>'
  });
  updateManualJournalTotals();
}

function readManualJournalLines() {
  return $$('#manualJournalLines .mj-row').map((row) => ({
    accountCode: row.querySelector('.mj-account') ? row.querySelector('.mj-account').value : '',
    debit: row.querySelector('.mj-debit') ? row.querySelector('.mj-debit').value : '',
    credit: row.querySelector('.mj-credit') ? row.querySelector('.mj-credit').value : '',
    memo: row.querySelector('.mj-memo') ? row.querySelector('.mj-memo').value.trim() : ''
  }));
}

function captureManualJournalDraft() {
  if (!state.manualJournal || !$('#manual-journal-form')) return;
  state.manualJournal.date = inputValue('mjDate') || state.manualJournal.date;
  state.manualJournal.category = $('#mjCategory') ? $('#mjCategory').value : state.manualJournal.category;
  state.manualJournal.narration = inputValue('mjNarration');
  state.manualJournal.lines = readManualJournalLines();
}

function financeSafeMinor(value) {
  try {
    return FC.toMinor(value);
  } catch (err) {
    return 0;
  }
}

function updateManualJournalTotals() {
  const target = $('#mjTotals');
  if (!target) return;
  const lines = readManualJournalLines();
  const debit = lines.reduce((sum, line) => sum + financeSafeMinor(line.debit), 0);
  const credit = lines.reduce((sum, line) => sum + financeSafeMinor(line.credit), 0);
  const balanced = debit === credit && debit > 0;
  target.innerHTML = '<span>Debits <strong>' + financeAmount(debit) + '</strong></span><span>Credits <strong>' + financeAmount(credit) + '</strong></span><span class="' +
    (debit === 0 && credit === 0 ? 'is-neutral' : balanced ? 'is-balanced' : 'is-unbalanced') + '">' +
    (debit === 0 && credit === 0 ? 'Enter amounts'
      : balanced ? icon('check', 12) + ' Balanced'
        : icon('alert', 12) + ' Difference ' + financeAmount(debit - credit)) + '</span>';
}

function addManualJournalLine() {
  captureManualJournalDraft();
  if (!state.manualJournal) return;
  state.manualJournal.lines.push({ accountCode: '', debit: '', credit: '', memo: '' });
  renderManualJournalModal();
}

function removeManualJournalLine(index) {
  captureManualJournalDraft();
  if (!state.manualJournal || state.manualJournal.lines.length <= 2) return;
  state.manualJournal.lines.splice(index, 1);
  renderManualJournalModal();
}

function saveManualJournalFromForm() {
  if (!requirePermission('finance.manage')) return;
  captureManualJournalDraft();
  const draft = state.manualJournal;
  if (!draft) return;
  clearFieldErrors($('#manual-journal-form'));
  if (!FC.isValidDate(draft.date)) { fieldError($('#mjDate'), 'Choose a valid journal date.'); return; }
  if (!draft.narration) { fieldError($('#mjNarration'), 'Enter a narration for this journal.'); return; }
  const lines = draft.lines.map((line) => ({
    accountCode: line.accountCode,
    debit: line.debit === '' ? 0 : financeSafeMinor(line.debit),
    credit: line.credit === '' ? 0 : financeSafeMinor(line.credit),
    memo: line.memo
  })).filter((line) => line.accountCode || line.debit || line.credit);
  if (lines.length < 2) { toast('Add at least two journal lines.', 'warn'); return; }
  const saved = FA.snapshot(data);
  let result;
  try {
    result = FA.postManual(data, {
      date: draft.date,
      narration: draft.narration,
      category: draft.category,
      lines
    });
  } catch (err) {
    toast(err && err.message ? err.message : 'The journal could not be posted.', 'error');
    return;
  }
  if (!financePersist(saved)) return;
  state.manualJournal = null;
  closeModal();
  refresh();
  toast('Journal ' + result.journal.ref + ' posted.');
}

function openJournalDetailModal(journalId) {
  const ledger = financeLedger();
  const journal = FC.journalById(ledger, journalId);
  if (!journal) { toast('Journal not found.', 'error'); return; }
  const reversedBy = journal.reversedBy ? FC.journalById(ledger, journal.reversedBy) : null;
  const reversalOf = journal.reversalOf ? FC.journalById(ledger, journal.reversalOf) : null;
  const lines = journal.lines.map((line) => {
    const account = FC.accountByCode(ledger, line.accountCode);
    return '<tr><td><span class="finance-code">' + esc(line.accountCode) + '</span><small class="finance-sub">' + esc(account ? account.name : 'Unknown account') + '</small></td>' +
      '<td class="num">' + (line.debit ? esc(financeAmount(line.debit)) : '<span class="finance-muted">—</span>') + '</td>' +
      '<td class="num">' + (line.credit ? esc(financeAmount(line.credit)) : '<span class="finance-muted">—</span>') + '</td>' +
      '<td><span class="finance-muted">' + esc(line.memo || '—') + '</span></td></tr>';
  }).join('');
  const footer = '<button type="button" class="btn btn-ghost" data-action="close-modal">Close</button>' +
    (can('finance.manage') && journal.status === 'posted' && journal.sourceType !== 'reversal'
      ? '<button type="button" class="btn btn-soft" data-action="finance-reverse-journal" data-journal-id="' + esc(journal.id) + '">' + icon('refresh', 14) + ' Reverse</button>' : '');
  openModal({
    title: journal.ref,
    subtitle: 'Posted ' + fmtDate(journal.date) + ' · ' + financeSourceLabel(journal.sourceType),
    size: 'wide',
    body: '<div class="journal-detail-meta">' +
      '<div><small>STATUS</small>' + financeStatusBadge(journal) + '</div>' +
      '<div><small>JOURNAL DATE</small><strong>' + esc(fmtDate(journal.date)) + '</strong></div>' +
      '<div><small>POSTING DATE</small><strong>' + esc(fmtDate(journal.postingDate)) + '</strong></div>' +
      '<div><small>CREATED BY</small><strong>' + esc(journal.createdBy || 'System') + '</strong></div>' +
    '</div>' +
    '<p class="journal-detail-narration">' + esc(journal.narration) + '</p>' +
    (reversalOf ? '<p class="review-note">This journal reverses <strong>' + esc(reversalOf.ref) + '</strong>.</p>' : '') +
    (reversedBy ? '<p class="review-note">This journal was reversed by <strong>' + esc(reversedBy.ref) + '</strong>' + (journal.reversalReason ? ' — ' + esc(journal.reversalReason) : '') + '.</p>' : '') +
    '<div class="table-wrap"><table class="data journal-lines-table"><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th><th>Memo</th></tr></thead><tbody>' + lines +
      '<tr class="journal-totals"><td>Total</td><td class="num">' + esc(financeAmount(journal.debitTotal)) + '</td><td class="num">' + esc(financeAmount(journal.creditTotal)) + '</td><td></td></tr>' +
    '</tbody></table></div>',
    footer
  });
}

function openFinanceReversalModal(journalId) {
  if (!requirePermission('finance.manage')) return;
  const ledger = financeLedger();
  const journal = FC.journalById(ledger, journalId);
  if (!journal) { toast('Journal not found.', 'error'); return; }
  if (journal.status !== 'posted') { toast('Only posted journals can be reversed.', 'warn'); return; }
  openModal({
    title: 'Reverse ' + journal.ref + '?',
    subtitle: 'A reversal journal dated today will be posted. The original stays in the audit trail.',
    size: 'small',
    body: '<div class="review-box"><div class="review-row"><span>Journal</span><strong>' + esc(journal.ref) + '</strong></div><div class="review-row"><span>Original date</span><strong>' + esc(fmtDate(journal.date)) + '</strong></div><div class="review-row total"><span>Amount</span><strong>' + esc(financeAmount(journal.debitTotal)) + '</strong></div></div>' +
      '<form id="finance-reversal-form" novalidate><input type="hidden" id="reverseJournalId" value="' + esc(journal.id) + '"><div class="form-grid"><div class="field full"><label for="reverseReason">Reason <span class="req">*</span></label><textarea id="reverseReason" placeholder="e.g. duplicate entry, corrected amount…" autofocus></textarea><span class="error"></span></div></div></form>' +
      '<p class="review-note">Reversals cannot be deleted. If the reversal date falls in a closed period, reopen the period first.</p>',
    footer: '<button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button><button type="submit" form="finance-reversal-form" class="btn btn-primary">' + icon('refresh', 15) + ' Post reversal</button>'
  });
}

function saveFinanceReversalFromForm() {
  if (!requirePermission('finance.manage')) return;
  clearFieldErrors($('#finance-reversal-form'));
  const journalId = inputValue('reverseJournalId');
  const reason = inputValue('reverseReason');
  if (!reason) { fieldError($('#reverseReason'), 'Give a reason for the reversal.'); return; }
  const saved = FA.snapshot(data);
  let result;
  try {
    result = FA.reverse(data, journalId, reason);
  } catch (err) {
    toast(err && err.message ? err.message : 'The journal could not be reversed.', 'error');
    return;
  }
  if (!financePersist(saved)) return;
  closeModal();
  refresh();
  toast('Reversal ' + result.journal.ref + ' posted.');
}

function closeFinancePeriod(periodKey) {
  if (!requirePermission('finance.close')) return;
  confirmAction({
    title: 'Close ' + financeMonthLabel(periodKey) + '?',
    message: 'Closing posts an entry dated the last day of ' + financeMonthLabel(periodKey) + ' that zeroes its revenue and expenses and moves the result to retained earnings. New journals dated in that month are then blocked until the period is reopened.',
    confirmText: 'Close period'
  }).then((ok) => {
    if (!ok) return;
    const saved = FA.snapshot(data);
    let result;
    try {
      result = FA.closePeriod(data, periodKey, '');
    } catch (err) {
      toast(err && err.message ? err.message : 'The period could not be closed.', 'error');
      return;
    }
    if (!financePersist(saved)) return;
    if (window.Notify) {
      Notify.event('periodClose', financeMonthLabel(periodKey) + ' closed · net ' + financeAmount(result.summary.netProfit) +
        (result.closingJournal ? ' · ' + result.closingJournal.ref : ''));
    }
    refresh();
    toast(financeMonthLabel(periodKey) + ' closed.');
  });
}

function reopenFinancePeriod(periodKey) {
  if (!requirePermission('finance.close')) return;
  confirmAction({
    title: 'Reopen ' + financeMonthLabel(periodKey) + '?',
    message: 'Reopening reverses the period’s closing entry and allows new or corrected journals in ' + financeMonthLabel(periodKey) + '. Both actions stay in the audit trail.',
    confirmText: 'Reopen period',
    tone: 'warn'
  }).then((ok) => {
    if (!ok) return;
    const saved = FA.snapshot(data);
    try {
      FA.reopenPeriod(data, periodKey, '');
    } catch (err) {
      toast(err && err.message ? err.message : 'The period could not be reopened.', 'error');
      return;
    }
    if (!financePersist(saved)) return;
    refresh();
    toast(financeMonthLabel(periodKey) + ' reopened.');
  });
}

function syncFinanceLedger() {
  if (!requirePermission('finance.manage')) return;
  confirmAction({
    title: 'Sync the ledger?',
    message: 'Post any sales, receipts or expenses that are missing from the ledger. Existing journals are matched by their source record and will never be duplicated.',
    confirmText: 'Sync ledger'
  }).then((ok) => {
    if (!ok) return;
    const saved = FA.snapshot(data);
    let result;
    try {
      result = FA.sync(data);
      state.financeReplayFailures = result.failures || [];
    } catch (err) {
      FA.restore(data, saved);
      toast(err && err.message ? err.message : 'The ledger could not be synced.', 'error');
      return;
    }
    if (!financePersist(saved)) return;
    refresh();
    if (result.failures.length) {
      toast(result.posted + ' posted, ' + result.failures.length + ' skipped. ' + result.failures[0].message, 'warn');
    } else {
      toast(result.posted ? result.posted + ' journal' + (result.posted === 1 ? '' : 's') + ' posted from operational records.' : 'The ledger is already up to date.');
    }
  });
}

function startCleanFinanceLedger() {
  if (!requirePermission('finance.close')) return;
  confirmAction({
    title: 'Start a clean ledger?',
    message: 'This discards the current ledger, including all journals and audit history, and starts an empty live ledger. Existing sales, receipts and expenses will not be posted automatically. Export a backup first if you need the current records.',
    confirmText: 'Start clean ledger',
    tone: 'warn'
  }).then((ok) => {
    if (!ok) return;
    const saved = FA.snapshot(data);
    FA.startClean(data);
    state.financeReplayFailures = [];
    state.financeJournalPage = 1;
    state.financeGlPage = 1;
    if (!financePersist(saved)) return;
    refresh();
    toast('Clean ledger started. Operational records were not posted.');
  });
}

function toggleFinanceAccount(code) {
  if (!requirePermission('finance.manage')) return;
  const ledger = financeLedger();
  const account = FC.accountByCode(ledger, code);
  if (!account) { toast('Account not found.', 'error'); return; }
  if (account.system) { toast('System accounts cannot be deactivated.', 'warn'); return; }
  const deactivate = account.active !== false;
  confirmAction({
    title: (deactivate ? 'Deactivate ' : 'Activate ') + account.name + '?',
    message: deactivate
      ? 'Inactive accounts stay in the chart and keep their history, but cannot receive new postings.'
      : 'This account will be available for new journal postings again.',
    confirmText: deactivate ? 'Deactivate account' : 'Activate account'
  }).then((ok) => {
    if (!ok) return;
    const saved = FA.snapshot(data);
    try {
      FC.setAccountActive(ledger, code, !deactivate, FA.actorName());
    } catch (err) {
      FA.restore(data, saved);
      toast(err && err.message ? err.message : 'The account could not be updated.', 'error');
      return;
    }
    if (!financePersist(saved)) return;
    refresh();
    toast(account.name + (deactivate ? ' deactivated.' : ' activated.'));
  });
}

/* ---------------- Export and print ---------------- */
function financePersist(saved) {
  const result = S.save(data);
  if (!result.ok) {
    if (saved) FA.restore(data, saved);
    handleSaveResult(result);
    return false;
  }
  handleSaveResult(result);
  return true;
}

function financeCsvRows() {
  const ledger = financeLedger();
  if (state.route === 'finance-accounts') {
    const balances = FC.balances(ledger);
    return {
      name: 'chart-of-accounts',
      rows: [['Code', 'Account', 'Type', 'Group', 'Cash', 'Active', 'Balance (GHS)']].concat(
        financeAccountRows().map(({ account, balance }) => [account.code, account.name, account.type, account.group || '', account.cash ? 'Yes' : 'No', account.active === false ? 'No' : 'Yes', FC.fromMinor(balance).toFixed(2)])
      )
    };
  }
  if (state.route === 'finance-journals') {
    return {
      name: 'journal-entries',
      rows: [['Reference', 'Date', 'Narration', 'Source', 'Status', 'Debit (GHS)', 'Credit (GHS)', 'Created by']].concat(
        financeJournalMatches().map((journal) => [journal.ref, journal.date, journal.narration, financeSourceLabel(journal.sourceType), journal.status, FC.fromMinor(journal.debitTotal).toFixed(2), FC.fromMinor(journal.creditTotal).toFixed(2), journal.createdBy || 'System'])
      )
    };
  }
  if (state.route === 'finance-ledger') {
    const dataSet = financeLedgerData();
    return {
      name: 'general-ledger',
      rows: [['Date', 'Reference', 'Account code', 'Account', 'Description', 'Debit (GHS)', 'Credit (GHS)', 'Status']].concat(
        dataSet.rows.map((row) => [row.date, row.ref, row.accountCode, row.accountName, row.memo || row.narration, FC.fromMinor(row.debit).toFixed(2), FC.fromMinor(row.credit).toFixed(2), row.status])
      )
    };
  }
  if (state.route === 'finance-audit') {
    return {
      name: 'audit-trail',
      rows: [['When', 'Actor', 'Action', 'Reference', 'Detail']].concat(
        financeAuditMatches().map((entry) => [entry.at, entry.actor, entry.action, entry.ref || '', entry.detail])
      )
    };
  }
  if (state.route === 'finance-statements') {
    const range = financeRange();
    const type = state.financeStatement || 'pl';
    if (type === 'bs') {
      const sheet = FC.balanceSheet(ledger, { asOf: range.to });
      return {
        name: 'balance-sheet',
        rows: [['Section', 'Code', 'Account', 'Amount (GHS)']]
          .concat(sheet.assets.map((line) => ['Assets', line.code, line.name, FC.fromMinor(line.amount).toFixed(2)]))
          .concat([['Assets', '', 'Total assets', FC.fromMinor(sheet.totalAssets).toFixed(2)]])
          .concat(sheet.liabilities.map((line) => ['Liabilities', line.code, line.name, FC.fromMinor(line.amount).toFixed(2)]))
          .concat([['Liabilities', '', 'Total liabilities', FC.fromMinor(sheet.totalLiabilities).toFixed(2)]])
          .concat(sheet.equity.map((line) => ['Equity', line.code, line.name, FC.fromMinor(line.amount).toFixed(2)]))
          .concat([['Equity', '', 'Total equity', FC.fromMinor(sheet.totalEquity).toFixed(2)], ['', '', 'Total liabilities and equity', FC.fromMinor(sheet.totalLiabilitiesAndEquity).toFixed(2)]])
      };
    }
    if (type === 'cf') {
      const flow = FC.cashFlow(ledger, { from: range.from, to: range.to });
      return {
        name: 'cash-flow',
        rows: [['Item', 'Amount (GHS)'], ['Operating activities', FC.fromMinor(flow.operating).toFixed(2)], ['Investing activities', FC.fromMinor(flow.investing).toFixed(2)], ['Financing activities', FC.fromMinor(flow.financing).toFixed(2)], ['Other cash movements', FC.fromMinor(flow.nonCash).toFixed(2)], ['Net change in cash', FC.fromMinor(flow.netChange).toFixed(2)], ['Cash at start', FC.fromMinor(flow.opening).toFixed(2)], ['Cash at end', FC.fromMinor(flow.closing).toFixed(2)]]
      };
    }
    if (type === 'tb') {
      const trial = FC.trialBalance(ledger, { asOf: range.to });
      return {
        name: 'trial-balance',
        rows: [['Code', 'Account', 'Type', 'Debit (GHS)', 'Credit (GHS)']].concat(
          trial.rows.map((row) => [row.code, row.name, row.type, row.debit ? FC.fromMinor(row.debit).toFixed(2) : '', row.credit ? FC.fromMinor(row.credit).toFixed(2) : ''])
        ).concat([['', 'Total', '', FC.fromMinor(trial.totalDebit).toFixed(2), FC.fromMinor(trial.totalCredit).toFixed(2)]])
      };
    }
    const statement = FC.incomeStatement(ledger, { from: range.from, to: range.to });
    return {
      name: 'profit-and-loss',
      rows: [['Section', 'Code', 'Account', 'Amount (GHS)']]
        .concat(statement.revenueLines.map((line) => ['Revenue', line.code, line.name, FC.fromMinor(line.amount).toFixed(2)]))
        .concat([['Revenue', '', 'Total revenue', FC.fromMinor(statement.revenueTotal).toFixed(2)]])
        .concat(statement.otherIncomeLines.map((line) => ['Other income', line.code, line.name, FC.fromMinor(line.amount).toFixed(2)]))
        .concat(statement.costLines.map((line) => ['Cost of sales', line.code, line.name, FC.fromMinor(line.amount).toFixed(2)]))
        .concat([['Cost of sales', '', 'Gross profit', FC.fromMinor(statement.grossProfit).toFixed(2)]])
        .concat(statement.operatingExpenseLines.map((line) => ['Operating expenses', line.code, line.name, FC.fromMinor(line.amount).toFixed(2)]))
        .concat([['Operating expenses', '', 'Operating profit', FC.fromMinor(statement.operatingProfit).toFixed(2)], ['', '', 'Net profit', FC.fromMinor(statement.netProfit).toFixed(2)]])
    };
  }
  const overview = FC.overview(ledger);
  return {
    name: 'finance-overview',
    rows: [['Metric', 'Value (GHS)'], ['Cash and bank', FC.fromMinor(overview.cash).toFixed(2)], ['Accounts receivable', FC.fromMinor(overview.receivable).toFixed(2)], ['Revenue recognised', FC.fromMinor(overview.revenue).toFixed(2)], ['Expenses', FC.fromMinor(overview.expenses).toFixed(2)], ['Net profit', FC.fromMinor(overview.netProfit).toFixed(2)], ['Total assets', FC.fromMinor(overview.totalAssets).toFixed(2)], ['Total liabilities', FC.fromMinor(overview.totalLiabilities).toFixed(2)], ['Total equity', FC.fromMinor(overview.totalEquity).toFixed(2)], ['Journals', String(overview.journalCount)]]
  };
}

function exportFinanceCSV() {
  if (!requirePermission('finance.view')) return;
  const payload = financeCsvRows();
  const cell = typeof safeCsvCell === 'function' ? safeCsvCell : (value) => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  const csv = payload.rows.map((row) => row.map(cell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'landledger-' + payload.name + '-' + todayValue() + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Finance data exported as CSV.');
}

function printFinanceStatement() {
  if (!requirePermission('finance.view')) return;
  if (state.route !== 'finance-statements') { toast('Open a statement before printing.', 'warn'); return; }
  const body = $('#financeStatementBody');
  const root = $('#printRoot');
  if (!body || !root) { toast('Print area is unavailable.', 'error'); return; }
  const range = financeRange();
  const label = { pl: 'Income statement', bs: 'Balance sheet', cf: 'Cash flow statement', tb: 'Trial balance' }[state.financeStatement || 'pl'];
  const verification = 'LL-FIN-' + new Date().getFullYear() + '-' + Date.now().toString(36).toUpperCase().slice(-8);
  root.innerHTML = '<section class="print-sheet report-print"><header><img src="assets/brand-logo.jpg" alt=""><div><h1>' + esc(label) + '</h1><p>' + esc(data.settings.orgName || '') + ' · ' + esc(data.settings.siteName || '') + '</p></div></header>' +
    '<p class="report-print-range">' + esc(state.financeStatement === 'bs' || state.financeStatement === 'tb' ? 'As at ' + fmtDate(range.to) : 'Period ' + fmtDate(range.from) + ' to ' + fmtDate(range.to)) + ' · Generated ' + esc(fmtDate(new Date())) + '</p>' +
    body.innerHTML +
    '<div class="rs-verification"><span>Document verification ID</span><strong>' + esc(verification) + '</strong></div></section>';
  const clear = () => { root.innerHTML = ''; };
  window.addEventListener('afterprint', clear, { once: true });
  setTimeout(() => { window.print(); setTimeout(clear, 1200); }, 60);
}

/* ---------------- Results refresh and filters ---------------- */
function updateFinanceAccountResults() {
  const target = $('#financeAccountResults');
  if (target) target.innerHTML = financeAccountResultsHTML();
}

function updateFinanceJournalResults() {
  const target = $('#financeJournalResults');
  if (target) target.innerHTML = financeJournalResultsHTML();
}

function updateFinanceAuditResults() {
  const target = $('#financeAuditResults');
  if (target) target.innerHTML = financeAuditResultsHTML();
}

function updateFinanceGlResults() {
  const target = $('#financeGlResults');
  if (target) target.innerHTML = financeLedgerResultsHTML();
}

function handleFinanceInput(event) {
  if (String(state.route || '').indexOf('finance') !== 0) return;
  if (event.target.closest && event.target.closest('#manual-journal-form')) {
    updateManualJournalTotals();
    return;
  }
  const id = event.target.id;
  if (id === 'financeAccountSearch') {
    state.financeAccountQuery = event.target.value;
    updateFinanceAccountResults();
  } else if (id === 'financeJournalSearch') {
    state.financeJournalQuery = event.target.value;
    state.financeJournalPage = 1;
    updateFinanceJournalResults();
  } else if (id === 'financeAuditSearch') {
    state.financeAuditQuery = event.target.value;
    updateFinanceAuditResults();
  }
}

function handleFinanceChange(event) {
  if (String(state.route || '').indexOf('finance') !== 0) return;
  if (event.target.closest && event.target.closest('#manual-journal-form')) {
    updateManualJournalTotals();
    return;
  }
  const id = event.target.id;
  if (id === 'financeAccountType') {
    state.financeAccountType = event.target.value;
    updateFinanceAccountResults();
  } else if (id === 'financeJournalSource') {
    state.financeJournalSource = event.target.value;
    state.financeJournalPage = 1;
    updateFinanceJournalResults();
  } else if (id === 'financeJournalStatus') {
    state.financeJournalStatus = event.target.value;
    state.financeJournalPage = 1;
    updateFinanceJournalResults();
  } else if (id === 'financeGlAccount' || id === 'financeGlFrom' || id === 'financeGlTo') {
    if (id === 'financeGlAccount') state.financeGlAccount = event.target.value;
    if (id === 'financeGlFrom') state.financeGlFrom = event.target.value;
    if (id === 'financeGlTo') state.financeGlTo = event.target.value;
    state.financeGlPage = 1;
    render();
  } else if (id === 'financeFrom' || id === 'financeTo') {
    if (id === 'financeFrom') state.financeFrom = event.target.value;
    if (id === 'financeTo') state.financeTo = event.target.value;
    render();
  } else if (id === 'financeAuditAction') {
    state.financeAuditAction = event.target.value;
    updateFinanceAuditResults();
  }
}

document.addEventListener('input', handleFinanceInput);
document.addEventListener('change', handleFinanceChange);
