/* LandLedger Finance — double-entry accounting domain engine
 * Pure module: no DOM, no storage, no clock beyond audit timestamps.
 * Amounts are always integer minor units (pesewas).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FinanceCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = 1;
  const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  const JOURNAL_CATEGORIES = ['operating', 'investing', 'financing', 'non-cash'];
  const RETAINED_EARNINGS = '3100';
  const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  const DEFAULT_ACCOUNTS = [
    { code: '1000', name: 'Cash on hand', type: 'asset', group: 'cash', cash: true },
    { code: '1010', name: 'Bank accounts', type: 'asset', group: 'cash', cash: true },
    { code: '1020', name: 'Mobile Money', type: 'asset', group: 'cash', cash: true },
    { code: '1090', name: 'Undeposited funds', type: 'asset', group: 'cash', cash: true },
    { code: '1100', name: 'Accounts receivable', type: 'asset', group: 'receivable' },
    { code: '1200', name: 'Land inventory', type: 'asset', group: 'inventory' },
    { code: '1300', name: 'Prepayments', type: 'asset', group: 'currentAsset' },
    { code: '2000', name: 'Accounts payable', type: 'liability', group: 'payable' },
    { code: '2100', name: 'VAT payable', type: 'liability', group: 'tax' },
    { code: '2200', name: 'Accrued expenses', type: 'liability', group: 'currentLiability' },
    { code: '2300', name: 'Customer deposits', type: 'liability', group: 'currentLiability' },
    { code: '3000', name: "Owner's capital", type: 'equity', group: 'capital' },
    { code: '3100', name: 'Retained earnings', type: 'equity', group: 'retained' },
    { code: '4000', name: 'Land sales revenue', type: 'revenue', group: 'revenue' },
    { code: '4900', name: 'Other income', type: 'revenue', group: 'otherIncome' },
    { code: '5000', name: 'Cost of land sales', type: 'expense', group: 'costOfSales' },
    { code: '5100', name: 'Surveying', type: 'expense', group: 'costOfSales' },
    { code: '5200', name: 'Site development', type: 'expense', group: 'costOfSales' },
    { code: '5210', name: 'Site maintenance', type: 'expense', group: 'costOfSales' },
    { code: '5300', name: 'Road construction', type: 'expense', group: 'costOfSales' },
    { code: '5400', name: 'Legal & professional', type: 'expense', group: 'operatingExpenses' },
    { code: '5500', name: 'Documentation', type: 'expense', group: 'operatingExpenses' },
    { code: '5600', name: 'Salaries', type: 'expense', group: 'operatingExpenses' },
    { code: '5700', name: 'Marketing & commissions', type: 'expense', group: 'operatingExpenses' },
    { code: '5800', name: 'Administrative', type: 'expense', group: 'operatingExpenses' },
    { code: '5900', name: 'Bank charges', type: 'expense', group: 'operatingExpenses' },
    { code: '5950', name: 'Utilities', type: 'expense', group: 'operatingExpenses' },
    { code: '5960', name: 'Transport', type: 'expense', group: 'operatingExpenses' },
    { code: '5970', name: 'Equipment', type: 'expense', group: 'operatingExpenses' },
    { code: '5980', name: 'Office supplies', type: 'expense', group: 'operatingExpenses' },
    { code: '5990', name: 'Other expenses', type: 'expense', group: 'operatingExpenses' }
  ];

  class FinanceError extends Error {
    constructor(code, message, details) {
      super(message || code);
      this.name = 'FinanceError';
      this.code = code;
      if (details) this.details = details;
    }
  }

  const pad = (value, width) => String(value).padStart(width || 2, '0');

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function todayISO() {
    const now = new Date();
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  function isValidDate(value) {
    const match = DATE_RE.exec(String(value || ''));
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function assertDate(value, field) {
    if (!isValidDate(value)) {
      throw new FinanceError('INVALID_DATE', (field || 'Date') + ' must be a valid YYYY-MM-DD date.');
    }
    return value;
  }

  function periodEndDate(key) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    if (!match) throw new FinanceError('INVALID_PERIOD', 'Period must be in YYYY-MM format.');
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) throw new FinanceError('INVALID_PERIOD', 'Period month must be between 01 and 12.');
    const day = new Date(year, month, 0).getDate();
    return String(year) + '-' + pad(month) + '-' + pad(day);
  }

  function monthKey(value) {
    assertDate(value, 'Date');
    return String(value).slice(0, 7);
  }

  function toMinor(value) {
    if (value === null || value === undefined || value === '') return 0;
    let number = value;
    if (typeof value !== 'number') {
      const cleaned = String(value).replace(/,/g, '').replace(/[^0-9.\-]/g, '');
      if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
        throw new FinanceError('INVALID_AMOUNT', 'Amount is not a valid number.');
      }
      number = Number(cleaned);
    }
    if (!Number.isFinite(number)) {
      throw new FinanceError('INVALID_AMOUNT', 'Amount is not a valid number.');
    }
    return Math.round(number * 100);
  }

  function fromMinor(minor) {
    return (Number(minor) || 0) / 100;
  }

  function formatMinor(minor, options) {
    const opts = options || {};
    const symbol = opts.symbol === undefined ? 'GH₵' : opts.symbol;
    const amount = Number(minor) || 0;
    const hasPesewas = amount % 100 !== 0;
    const text = (amount / 100).toLocaleString('en-GH', {
      minimumFractionDigits: hasPesewas || opts.forceDecimals ? 2 : 0,
      maximumFractionDigits: 2
    });
    return symbol ? symbol + ' ' + text : text;
  }

  function normalBalance(type) {
    return type === 'asset' || type === 'expense' ? 'debit' : 'credit';
  }

  function defaultGroup(type) {
    if (type === 'asset') return 'currentAsset';
    if (type === 'liability') return 'currentLiability';
    if (type === 'equity') return 'capital';
    if (type === 'revenue') return 'revenue';
    return 'operatingExpenses';
  }

  function makeAccount(definition) {
    return {
      code: definition.code,
      name: definition.name,
      type: definition.type,
      group: definition.group || defaultGroup(definition.type),
      cash: definition.cash === true,
      active: definition.active !== false,
      system: definition.system === true,
      createdAt: definition.createdAt || new Date().toISOString()
    };
  }

  function createState(options) {
    const opts = options || {};
    return {
      version: VERSION,
      currency: opts.currency || 'GHS',
      demo: opts.demo === true,
      initializedAt: new Date().toISOString(),
      accounts: DEFAULT_ACCOUNTS.map((account) => makeAccount(Object.assign({ system: true }, account))),
      journals: [],
      seq: 0,
      auditSeq: 0,
      periods: {},
      audit: []
    };
  }

  function ensureState(finance) {
    const state = finance && typeof finance === 'object' ? finance : createState();
    if (!Array.isArray(state.accounts)) state.accounts = [];
    DEFAULT_ACCOUNTS.forEach((definition) => {
      const existing = state.accounts.find((account) => account && account.code === definition.code);
      if (!existing) state.accounts.push(makeAccount(Object.assign({ system: true }, definition)));
      else {
        if (!existing.name) existing.name = definition.name;
        if (!existing.type) existing.type = definition.type;
        if (!existing.group) existing.group = definition.group;
        if (definition.cash) existing.cash = true;
        if (existing.active === undefined) existing.active = true;
        if (existing.system === undefined) existing.system = definition.system === true;
      }
    });
    state.accounts.forEach((account) => {
      if (account && account.active === undefined) account.active = true;
    });
    if (!Array.isArray(state.journals)) state.journals = [];
    if (!Array.isArray(state.audit)) state.audit = [];
    if (!state.periods || typeof state.periods !== 'object') state.periods = {};
    if (!Number.isFinite(Number(state.seq))) state.seq = 0;
    if (!Number.isFinite(Number(state.auditSeq))) state.auditSeq = 0;
    state.seq = Math.max(Number(state.seq) || 0, maxJournalSeq(state.journals));
    state.auditSeq = Math.max(Number(state.auditSeq) || 0, state.audit.length);
    state.version = VERSION;
    state.currency = state.currency || 'GHS';
    state.demo = state.demo === true;
    return state;
  }

  function maxJournalSeq(journals) {
    return (journals || []).reduce((max, journal) => {
      const seq = Number(journal && journal.seq);
      return Number.isFinite(seq) && seq > max ? seq : max;
    }, 0);
  }

  function accountsSorted(state) {
    return state.accounts.slice().sort((a, b) => String(a.code).localeCompare(String(b.code)));
  }

  function accountByCode(state, code) {
    return state.accounts.find((account) => account.code === code) || null;
  }

  function journalById(state, id) {
    return state.journals.find((journal) => journal.id === id) || null;
  }

  function journalByKey(state, key) {
    return state.journals.find((journal) => journal.idempotencyKey && journal.idempotencyKey === key) || null;
  }

  function addAccount(state, input, actor) {
    ensureState(state);
    const code = String((input && input.code) || '').trim();
    const name = String((input && input.name) || '').trim();
    const type = String((input && input.type) || '');
    if (!/^\d{3,10}$/.test(code)) {
      throw new FinanceError('INVALID_ACCOUNT_CODE', 'Account code must be 3–10 digits.');
    }
    if (!name) throw new FinanceError('INVALID_ACCOUNT_NAME', 'Account name is required.');
    if (!ACCOUNT_TYPES.includes(type)) {
      throw new FinanceError('INVALID_ACCOUNT_TYPE', 'Account type must be asset, liability, equity, revenue or expense.');
    }
    if (accountByCode(state, code)) {
      throw new FinanceError('DUPLICATE_ACCOUNT', 'Account code ' + code + ' already exists.');
    }
    const account = makeAccount({
      code,
      name,
      type,
      group: input.group,
      cash: input.cash,
      system: false
    });
    state.accounts.push(account);
    recordAudit(state, {
      actor: actor || 'system',
      action: 'account.create',
      entityType: 'account',
      entityId: code,
      ref: code,
      detail: 'Created account ' + code + ' — ' + name + '.'
    });
    return account;
  }

  function setAccountActive(state, code, active, actor) {
    const account = accountByCode(state, code);
    if (!account) throw new FinanceError('UNKNOWN_ACCOUNT', 'Account ' + code + ' was not found.');
    const next = active !== false;
    if (account.active === next) return account;
    if (account.system && !next) {
      throw new FinanceError('SYSTEM_ACCOUNT', 'Account ' + code + ' is required by the ledger and cannot be deactivated.');
    }
    account.active = next;
    recordAudit(state, {
      actor: actor || 'system',
      action: next ? 'account.activate' : 'account.deactivate',
      entityType: 'account',
      entityId: code,
      ref: code,
      detail: (next ? 'Activated ' : 'Deactivated ') + code + ' — ' + account.name + '.'
    });
    return account;
  }

  function recordAudit(state, entry) {
    if (!Array.isArray(state.audit)) state.audit = [];
    state.auditSeq = (Number(state.auditSeq) || 0) + 1;
    const record = {
      id: 'aud-' + pad(state.auditSeq, 6),
      at: entry.at || new Date().toISOString(),
      actor: entry.actor || 'system',
      action: entry.action || 'unknown',
      entityType: entry.entityType || null,
      entityId: entry.entityId || null,
      ref: entry.ref || null,
      detail: entry.detail || ''
    };
    state.audit.push(record);
    return record;
  }

  function assertPeriodOpen(state, date) {
    const key = monthKey(date);
    const period = state.periods[key];
    if (period && period.status === 'closed') {
      throw new FinanceError('PERIOD_CLOSED', 'Accounting period ' + key + ' is closed. Reopen it before posting.');
    }
    return key;
  }

  function normaliseCategory(value, sourceType, fallback) {
    if (JOURNAL_CATEGORIES.includes(value)) return value;
    if (sourceType === 'sale') return 'non-cash';
    if (sourceType === 'closing') return 'non-cash';
    if (sourceType === 'payment' || sourceType === 'expense') return 'operating';
    return JOURNAL_CATEGORIES.includes(fallback) ? fallback : 'operating';
  }

  function validateLines(state, rawLines) {
    if (!Array.isArray(rawLines) || rawLines.length < 2) {
      throw new FinanceError('INVALID_LINES', 'A journal needs at least two lines.');
    }
    const lines = rawLines.map((raw, index) => {
      const line = raw || {};
      const code = String(line.accountCode || '').trim();
      const account = accountByCode(state, code);
      if (!account) {
        throw new FinanceError('UNKNOWN_ACCOUNT', 'Line ' + (index + 1) + ' references unknown account ' + (code || '(blank)') + '.');
      }
      if (account.active === false) {
        throw new FinanceError('INACTIVE_ACCOUNT', 'Account ' + code + ' is inactive and cannot receive postings.');
      }
      const debit = line.debit === undefined || line.debit === null || line.debit === '' ? 0 : Number(line.debit);
      const credit = line.credit === undefined || line.credit === null || line.credit === '' ? 0 : Number(line.credit);
      if (!Number.isInteger(debit) || !Number.isInteger(credit) || debit < 0 || credit < 0) {
        throw new FinanceError('INVALID_LINE', 'Line ' + (index + 1) + ' must have non-negative integer debit and credit values.');
      }
      if (debit > 0 && credit > 0) {
        throw new FinanceError('INVALID_LINE', 'Line ' + (index + 1) + ' cannot have both a debit and a credit.');
      }
      if (debit === 0 && credit === 0) {
        throw new FinanceError('INVALID_LINE', 'Line ' + (index + 1) + ' has no amount.');
      }
      return {
        accountCode: code,
        debit,
        credit,
        memo: String(line.memo || '')
      };
    });
    const debitTotal = lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = lines.reduce((sum, line) => sum + line.credit, 0);
    if (debitTotal !== creditTotal) {
      throw new FinanceError('UNBALANCED', 'Journal is unbalanced: debits ' + formatMinor(debitTotal) + ' vs credits ' + formatMinor(creditTotal) + '.');
    }
    if (debitTotal === 0) {
      throw new FinanceError('ZERO_JOURNAL', 'A journal must post a non-zero amount.');
    }
    return { lines, debitTotal, creditTotal };
  }

  function postJournal(state, input, actor) {
    ensureState(state);
    const data = input || {};
    const date = assertDate(data.date, 'Journal date');
    const narration = String(data.narration || '').trim();
    if (!narration) {
      throw new FinanceError('INVALID_NARRATION', 'A journal narration is required.');
    }
    if (data.idempotencyKey) {
      const existing = journalByKey(state, data.idempotencyKey);
      if (existing) return { journal: existing, duplicate: true };
    }
    const periodKey = assertPeriodOpen(state, date);
    const validated = validateLines(state, data.lines);
    const seq = (Number(state.seq) || 0) + 1;
    const sourceType = String(data.sourceType || 'manual');
    const journal = {
      id: 'je-' + pad(seq, 6),
      ref: 'JE-' + date.slice(0, 4) + '-' + pad(seq, 4),
      seq,
      date,
      postingDate: data.postingDate ? assertDate(data.postingDate, 'Posting date') : todayISO(),
      narration,
      sourceType,
      sourceId: data.sourceId || null,
      category: normaliseCategory(data.category, sourceType, data.fallbackCategory),
      status: 'posted',
      lines: validated.lines,
      debitTotal: validated.debitTotal,
      creditTotal: validated.creditTotal,
      idempotencyKey: data.idempotencyKey || null,
      reversalOf: data.reversalOf || null,
      reversedBy: null,
      reversedAt: null,
      reversalReason: null,
      metadata: data.metadata && typeof data.metadata === 'object' ? clone(data.metadata) : null,
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy || actor || 'system'
    };
    state.journals.push(journal);
    state.seq = seq;
    recordAudit(state, {
      actor: journal.createdBy,
      action: 'journal.post',
      entityType: 'journal',
      entityId: journal.id,
      ref: journal.ref,
      detail: 'Posted ' + journal.ref + ' — ' + narration + ' (' + formatMinor(journal.debitTotal) + ', ' + periodKey + ').'
    });
    return { journal, duplicate: false };
  }

  function reverseJournal(state, journalId, options) {
    ensureState(state);
    const opts = options || {};
    const original = journalById(state, journalId);
    if (!original) throw new FinanceError('NOT_FOUND', 'Journal ' + journalId + ' was not found.');
    if (original.status !== 'posted') {
      throw new FinanceError('ALREADY_REVERSED', 'Journal ' + original.ref + ' has already been reversed.');
    }
    const date = assertDate(opts.date || todayISO(), 'Reversal date');
    const reason = String(opts.reason || '').trim();
    const result = postJournal(state, {
      date,
      narration: 'Reversal of ' + original.ref + (reason ? ' — ' + reason : ''),
      sourceType: 'reversal',
      sourceId: original.id,
      category: original.category,
      idempotencyKey: 'reversal:' + original.id,
      reversalOf: original.id,
      postingDate: opts.postingDate,
      createdBy: opts.actor,
      lines: original.lines.map((line) => ({
        accountCode: line.accountCode,
        debit: line.credit,
        credit: line.debit,
        memo: 'Reversal: ' + (line.memo || original.ref)
      }))
    }, opts.actor);
    original.status = 'reversed';
    original.reversedBy = result.journal.id;
    original.reversedAt = new Date().toISOString();
    original.reversalReason = reason || null;
    recordAudit(state, {
      actor: opts.actor || 'system',
      action: 'journal.reverse',
      entityType: 'journal',
      entityId: original.id,
      ref: original.ref,
      detail: 'Reversed ' + original.ref + ' with ' + result.journal.ref + (reason ? ' — ' + reason : '') + '.'
    });
    return { journal: result.journal, original, duplicate: result.duplicate };
  }

  function isClosingRelated(state, journal) {
    if (!journal) return false;
    if (journal.sourceType === 'closing') return true;
    if (journal.sourceType === 'reversal' && journal.reversalOf) {
      const original = journalById(state, journal.reversalOf);
      return Boolean(original && original.sourceType === 'closing');
    }
    return false;
  }

  function activeJournals(state, options) {
    const opts = options || {};
    return (state.journals || []).filter((journal) => {
      if (!journal || (journal.status !== 'posted' && journal.status !== 'reversed')) return false;
      if (opts.from && journal.date < opts.from) return false;
      if (opts.to && journal.date > opts.to) return false;
      if (opts.before && journal.date >= opts.before) return false;
      if (opts.excludeClosing && isClosingRelated(state, journal)) return false;
      return true;
    });
  }

  function sumAccounts(state, journals) {
    const totals = new Map();
    (journals || []).forEach((journal) => {
      (journal.lines || []).forEach((line) => {
        const current = totals.get(line.accountCode) || { debit: 0, credit: 0 };
        current.debit += Number(line.debit) || 0;
        current.credit += Number(line.credit) || 0;
        totals.set(line.accountCode, current);
      });
    });
    return totals;
  }

  function balances(state, options) {
    ensureState(state);
    const totals = sumAccounts(state, activeJournals(state, options));
    const result = new Map();
    state.accounts.forEach((account) => {
      const raw = totals.get(account.code) || { debit: 0, credit: 0 };
      const net = raw.debit - raw.credit;
      const signed = normalBalance(account.type) === 'debit' ? net : -net;
      result.set(account.code, {
        code: account.code,
        name: account.name,
        type: account.type,
        group: account.group,
        cash: account.cash === true,
        debit: raw.debit,
        credit: raw.credit,
        net,
        balance: signed === 0 ? 0 : signed
      });
    });
    return result;
  }

  function accountBalance(state, code, options) {
    const map = balances(state, options);
    const entry = map.get(code);
    return entry ? entry.balance : 0;
  }

  function trialBalance(state, options) {
    const opts = options || {};
    const map = balances(state, { to: opts.asOf });
    const rows = [];
    accountsSorted(state).forEach((account) => {
      const entry = map.get(account.code);
      if (!entry || entry.net === 0) return;
      rows.push({
        code: account.code,
        name: account.name,
        type: account.type,
        debit: entry.net > 0 ? entry.net : 0,
        credit: entry.net < 0 ? -entry.net : 0
      });
    });
    const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);
    return {
      asOf: opts.asOf || null,
      rows,
      totalDebit,
      totalCredit,
      balanced: totalDebit === totalCredit,
      difference: totalDebit - totalCredit
    };
  }

  function incomeStatement(state, options) {
    ensureState(state);
    const opts = options || {};
    const from = opts.from || null;
    const to = opts.to || null;
    const totals = sumAccounts(state, activeJournals(state, {
      from,
      to,
      excludeClosing: opts.includeClosing !== true
    }));
    const buckets = {
      revenue: [],
      otherIncome: [],
      costOfSales: [],
      operatingExpenses: [],
      otherExpenses: []
    };
    accountsSorted(state).forEach((account) => {
      if (account.type !== 'revenue' && account.type !== 'expense') return;
      const raw = totals.get(account.code);
      if (!raw) return;
      const amount = account.type === 'revenue' ? raw.credit - raw.debit : raw.debit - raw.credit;
      if (amount === 0) return;
      const group = account.type === 'revenue'
        ? (account.group === 'otherIncome' ? 'otherIncome' : 'revenue')
        : (account.group === 'costOfSales' ? 'costOfSales'
          : account.group === 'otherExpenses' ? 'otherExpenses' : 'operatingExpenses');
      buckets[group].push({ code: account.code, name: account.name, amount });
    });
    const total = (rows) => rows.reduce((sum, row) => sum + row.amount, 0);
    const revenueTotal = total(buckets.revenue);
    const otherIncomeTotal = total(buckets.otherIncome);
    const costTotal = total(buckets.costOfSales);
    const operatingTotal = total(buckets.operatingExpenses);
    const otherExpensesTotal = total(buckets.otherExpenses);
    const grossProfit = revenueTotal - costTotal;
    const operatingProfit = grossProfit - operatingTotal;
    const netProfit = operatingProfit - otherExpensesTotal + otherIncomeTotal;
    return {
      from,
      to,
      revenueLines: buckets.revenue,
      otherIncomeLines: buckets.otherIncome,
      costLines: buckets.costOfSales,
      operatingExpenseLines: buckets.operatingExpenses,
      otherExpenseLines: buckets.otherExpenses,
      revenueTotal,
      otherIncomeTotal,
      costTotal,
      operatingTotal,
      otherExpensesTotal,
      grossProfit,
      operatingProfit,
      netProfit
    };
  }

  function cumulativeEarnings(state, asOf) {
    const statement = incomeStatement(state, { to: asOf, includeClosing: true });
    return statement.netProfit;
  }

  function balanceSheet(state, options) {
    ensureState(state);
    const opts = options || {};
    const asOf = opts.asOf || null;
    const map = balances(state, { to: asOf });
    const assets = [];
    const liabilities = [];
    const equity = [];
    accountsSorted(state).forEach((account) => {
      const entry = map.get(account.code);
      if (!entry || entry.balance === 0) return;
      const row = { code: account.code, name: account.name, amount: entry.balance, group: account.group, cash: account.cash === true };
      if (account.type === 'asset') assets.push(row);
      else if (account.type === 'liability') liabilities.push(row);
      else if (account.type === 'equity') equity.push(row);
    });
    const earnings = cumulativeEarnings(state, asOf);
    if (earnings !== 0) {
      equity.push({ code: '—', name: 'Current earnings (unclosed)', amount: earnings, synthetic: true });
    }
    const sum = (rows) => rows.reduce((total, row) => total + row.amount, 0);
    const totalAssets = sum(assets);
    const totalLiabilities = sum(liabilities);
    const totalEquity = sum(equity);
    return {
      asOf,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      difference: totalAssets - totalLiabilities - totalEquity,
      balanced: totalAssets === totalLiabilities + totalEquity
    };
  }

  function cashAccounts(state) {
    return state.accounts.filter((account) => account && account.cash === true);
  }

  function cashMovement(journal, cashCodes) {
    return (journal.lines || []).reduce((sum, line) => {
      if (!cashCodes.has(line.accountCode)) return sum;
      return sum + (Number(line.debit) || 0) - (Number(line.credit) || 0);
    }, 0);
  }

  function cashFlow(state, options) {
    ensureState(state);
    const opts = options || {};
    const from = opts.from || null;
    const to = opts.to || null;
    const codes = new Set(cashAccounts(state).map((account) => account.code));
    const opening = from
      ? activeJournals(state, { before: from }).reduce((sum, journal) => sum + cashMovement(journal, codes), 0)
      : 0;
    const buckets = { operating: 0, investing: 0, financing: 0, 'non-cash': 0 };
    const rows = [];
    activeJournals(state, { from, to }).forEach((journal) => {
      const amount = cashMovement(journal, codes);
      if (amount === 0) return;
      const category = JOURNAL_CATEGORIES.includes(journal.category) ? journal.category : 'operating';
      buckets[category] += amount;
      rows.push({
        journalId: journal.id,
        ref: journal.ref,
        date: journal.date,
        narration: journal.narration,
        sourceType: journal.sourceType,
        category,
        amount
      });
    });
    const netChange = buckets.operating + buckets.investing + buckets.financing + buckets['non-cash'];
    const closing = opening + netChange;
    const closingFromLedger = cashAccounts(state).reduce((sum, account) => sum + (balances(state, { to }).get(account.code) || { balance: 0 }).balance, 0);
    return {
      from,
      to,
      opening,
      operating: buckets.operating,
      investing: buckets.investing,
      financing: buckets.financing,
      nonCash: buckets['non-cash'],
      netChange,
      closing,
      closingFromLedger,
      balanced: closing === closingFromLedger,
      rows
    };
  }

  function periodInfo(state, key) {
    assertDate(key + '-01', 'Period');
    const period = (state.periods || {})[key];
    return period ? Object.assign({ key, status: 'open' }, period) : { key, status: 'open' };
  }

  function periodSummary(state, key) {
    const from = key + '-01';
    const to = key + '-31';
    const statement = incomeStatement(state, { from, to });
    return {
      revenue: statement.revenueTotal + statement.otherIncomeTotal,
      expenses: statement.costTotal + statement.operatingTotal + statement.otherExpensesTotal,
      netProfit: statement.netProfit,
      journalCount: activeJournals(state, { from, to, excludeClosing: true }).length
    };
  }

  function periodClosingLines(state, key) {
    const totals = sumAccounts(state, activeJournals(state, {
      from: key + '-01',
      to: key + '-31',
      excludeClosing: true
    }));
    const lines = [];
    accountsSorted(state).forEach((account) => {
      if (account.type !== 'revenue' && account.type !== 'expense') return;
      const raw = totals.get(account.code);
      if (!raw) return;
      const balance = account.type === 'revenue' ? raw.credit - raw.debit : raw.debit - raw.credit;
      if (balance === 0) return;
      if (account.type === 'revenue') {
        lines.push(balance > 0
          ? { accountCode: account.code, debit: balance, credit: 0, memo: 'Close revenue' }
          : { accountCode: account.code, debit: 0, credit: -balance, memo: 'Close revenue' });
      } else {
        lines.push(balance > 0
          ? { accountCode: account.code, debit: 0, credit: balance, memo: 'Close expense' }
          : { accountCode: account.code, debit: -balance, credit: 0, memo: 'Close expense' });
      }
    });
    return lines;
  }

  function closePeriod(state, key, options) {
    ensureState(state);
    const opts = options || {};
    const match = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    if (!match) throw new FinanceError('INVALID_PERIOD', 'Period must be in YYYY-MM format.');
    assertDate(key + '-01', 'Period');
    const existing = (state.periods || {})[key];
    if (existing && existing.status === 'closed') {
      throw new FinanceError('PERIOD_ALREADY_CLOSED', 'Period ' + key + ' is already closed.');
    }
    const summary = periodSummary(state, key);
    const closeCount = (Number(existing && existing.closeCount) || 0) + 1;
    const lines = periodClosingLines(state, key);
    if (summary.netProfit > 0) {
      lines.push({ accountCode: RETAINED_EARNINGS, debit: 0, credit: summary.netProfit, memo: 'Profit for the period' });
    } else if (summary.netProfit < 0) {
      lines.push({ accountCode: RETAINED_EARNINGS, debit: -summary.netProfit, credit: 0, memo: 'Loss for the period' });
    }
    let closing = null;
    if (lines.length) {
      closing = postJournal(state, {
        date: periodEndDate(key),
        narration: 'Close ' + key + ' — transfer ' + (summary.netProfit < 0 ? 'loss' : 'net profit') + ' to retained earnings',
        sourceType: 'closing',
        sourceId: key,
        category: 'non-cash',
        idempotencyKey: 'closing:' + key + ':v' + closeCount,
        createdBy: opts.actor || 'system',
        metadata: { period: key, netProfit: summary.netProfit, closeCount },
        lines
      }, opts.actor || 'system').journal;
    }
    state.periods[key] = {
      status: 'closed',
      closeCount,
      closingJournalId: closing ? closing.id : null,
      closedAt: new Date().toISOString(),
      closedBy: opts.actor || 'system',
      note: opts.note || '',
      summary
    };
    recordAudit(state, {
      actor: opts.actor || 'system',
      action: 'period.close',
      entityType: 'period',
      entityId: key,
      ref: key,
      detail: 'Closed ' + key + ' with net profit ' + formatMinor(summary.netProfit) + ' across ' + summary.journalCount + ' journals.' +
        (closing ? ' Closing entry ' + closing.ref + ' transferred the result to retained earnings.' : ' No revenue or expense balances needed closing.')
    });
    return { key, status: 'closed', summary, closingJournal: closing, closeCount };
  }

  function reopenPeriod(state, key, options) {
    ensureState(state);
    const opts = options || {};
    const match = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    if (!match) throw new FinanceError('INVALID_PERIOD', 'Period must be in YYYY-MM format.');
    assertDate(key + '-01', 'Period');
    const existing = state.periods[key];
    if (!existing || existing.status !== 'closed') {
      throw new FinanceError('PERIOD_NOT_CLOSED', 'Period ' + key + ' is not closed.');
    }
    const closedState = Object.assign({}, existing);
    state.periods[key] = Object.assign({}, existing, {
      status: 'open',
      closingJournalId: null,
      reopenedAt: new Date().toISOString(),
      reopenedBy: opts.actor || 'system',
      reopenNote: opts.note || ''
    });
    const closing = (state.journals || []).slice().sort((a, b) => (b.seq || 0) - (a.seq || 0))
      .find((journal) => journal.sourceType === 'closing' && journal.sourceId === key && journal.status === 'posted');
    let reversal = null;
    try {
      if (closing) {
        reversal = reverseJournal(state, closing.id, {
          date: periodEndDate(key),
          reason: 'Period reopened',
          actor: opts.actor || 'system'
        }).journal;
      }
    } catch (err) {
      state.periods[key] = closedState;
      throw err;
    }
    recordAudit(state, {
      actor: opts.actor || 'system',
      action: 'period.reopen',
      entityType: 'period',
      entityId: key,
      ref: key,
      detail: 'Reopened ' + key + (opts.note ? ' — ' + opts.note : '') + '.' +
        (reversal ? ' Reversed closing entry ' + reversal.ref + '.' : '')
    });
    return { key, status: 'open', reversalJournal: reversal };
  }

  function periodList(state) {
    const keys = new Set(Object.keys(state.periods || {}));
    state.journals.forEach((journal) => {
      if (journal.date) keys.add(String(journal.date).slice(0, 7));
    });
    return Array.from(keys).sort().reverse().map((key) => periodInfo(state, key));
  }

  function overview(state, options) {
    ensureState(state);
    const asOf = (options && options.asOf) || null;
    const sheet = balanceSheet(state, { asOf });
    const statement = incomeStatement(state, { to: asOf });
    const cash = cashAccounts(state).reduce((sum, account) => sum + (balances(state, { to: asOf }).get(account.code) || { balance: 0 }).balance, 0);
    const receivable = accountBalance(state, '1100', { to: asOf });
    const payable = accountBalance(state, '2000', { to: asOf });
    const posted = state.journals.filter((journal) => journal.status === 'posted');
    return {
      asOf,
      cash,
      receivable,
      payable,
      totalAssets: sheet.totalAssets,
      totalLiabilities: sheet.totalLiabilities,
      totalEquity: sheet.totalEquity,
      revenue: statement.revenueTotal + statement.otherIncomeTotal,
      expenses: statement.costTotal + statement.operatingTotal + statement.otherExpensesTotal,
      netProfit: statement.netProfit,
      journalCount: state.journals.length,
      postedCount: posted.length,
      reversedCount: state.journals.filter((journal) => journal.status === 'reversed').length,
      lastPostedAt: posted.length ? posted[posted.length - 1].createdAt : null
    };
  }

  function auditTrail(state, options) {
    const opts = options || {};
    let entries = (state.audit || []).slice().reverse();
    if (opts.action) entries = entries.filter((entry) => entry.action === opts.action);
    if (opts.from) entries = entries.filter((entry) => String(entry.at || '').slice(0, 10) >= opts.from);
    if (opts.to) entries = entries.filter((entry) => String(entry.at || '').slice(0, 10) <= opts.to);
    if (opts.query) {
      const query = String(opts.query).toLowerCase();
      entries = entries.filter((entry) => [entry.actor, entry.action, entry.ref, entry.detail].join(' ').toLowerCase().includes(query));
    }
    return entries;
  }

  function integrityCheck(state) {
    ensureState(state);
    const issues = [];
    const refs = new Set();
    state.journals.forEach((journal) => {
      if (refs.has(journal.ref)) issues.push('Duplicate journal reference ' + journal.ref + '.');
      refs.add(journal.ref);
      const debit = (journal.lines || []).reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
      const credit = (journal.lines || []).reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
      if (debit !== credit) issues.push(journal.ref + ' is unbalanced (' + debit + ' vs ' + credit + ').');
      if (debit === 0) issues.push(journal.ref + ' posts zero.');
      (journal.lines || []).forEach((line) => {
        if (!accountByCode(state, line.accountCode)) issues.push(journal.ref + ' uses missing account ' + line.accountCode + '.');
      });
    });
    const trial = trialBalance(state);
    if (!trial.balanced) issues.push('Trial balance is out by ' + formatMinor(trial.difference) + '.');
    return issues;
  }

  return {
    VERSION,
    ACCOUNT_TYPES,
    JOURNAL_CATEGORIES,
    DEFAULT_ACCOUNTS,
    RETAINED_EARNINGS,
    FinanceError,
    todayISO,
    isValidDate,
    monthKey,
    periodEndDate,
    toMinor,
    fromMinor,
    formatMinor,
    normalBalance,
    createState,
    ensureState,
    accountByCode,
    accountsSorted,
    journalById,
    addAccount,
    setAccountActive,
    recordAudit,
    postJournal,
    reverseJournal,
    balances,
    accountBalance,
    trialBalance,
    incomeStatement,
    balanceSheet,
    cashFlow,
    periodInfo,
    periodList,
    periodSummary,
    closePeriod,
    reopenPeriod,
    overview,
    auditTrail,
    integrityCheck
  };
});
