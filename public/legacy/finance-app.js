/* LandLedger Finance — integration between operational records and the ledger
 * Translates land sales, receipts and expenses into balanced double-entry
 * journals. Storage remains the app's existing adapter (localStorage for now).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./finance-core.js'));
  else root.FinanceApp = factory(root.FinanceCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';

  if (!Core) throw new Error('FinanceApp requires FinanceCore.');

  const RECEIVABLE = '1100';
  const LAND_INVENTORY = '1200';
  const LAND_REVENUE = '4000';
  const COST_OF_SALES = '5000';
  const DEFAULT_CASH = '1010';
  const DEFAULT_EXPENSE = '5990';
  const DEMO_ORG = 'Asante Land Company';
  const DEMO_SITE = 'Asante Ridge Estates';

  const PAYMENT_CASH_ACCOUNTS = {
    cash: '1000',
    'mobile money': '1020',
    momo: '1020',
    'bank transfer': '1010',
    bank: '1010',
    cheque: '1010',
    check: '1010',
    card: '1010',
    other: '1090'
  };

  const EXPENSE_ACCOUNTS = {
    advertising: '5700',
    'bank charges': '5900',
    development: '5200',
    equipment: '5970',
    'legal & professional': '5400',
    'office supplies': '5980',
    operations: '5800',
    salaries: '5600',
    'site maintenance': '5210',
    transport: '5960',
    utilities: '5950',
    other: '5990'
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function actorName() {
    try {
      if (typeof Auth !== 'undefined' && Auth && typeof Auth.user === 'function') {
        const role = Auth.user();
        if (role) return role.name + ' · ' + role.label;
      }
    } catch (err) {
      /* Authentication is optional for headless use. */
    }
    return 'System';
  }

  function isDemoWorkspace(data) {
    if (data && data.finance && typeof data.finance.demo === 'boolean') return data.finance.demo;
    const settings = (data && data.settings) || {};
    return settings.orgName === DEMO_ORG && settings.siteName === DEMO_SITE;
  }

  function stateOf(data) {
    if (!data || typeof data !== 'object') throw new Error('A workspace is required.');
    if (!data.finance) {
      data.finance = Core.createState({ demo: isDemoWorkspace(data) });
      Core.ensureState(data.finance);
    } else {
      Core.ensureState(data.finance);
    }
    return data.finance;
  }

  function snapshot(data) {
    return data && data.finance ? clone(data.finance) : null;
  }

  function restore(data, saved) {
    if (!data) return;
    data.finance = saved ? clone(saved) : null;
  }

  function dateOf(item, label) {
    if (Core.isValidDate(item && item.date)) return item.date;
    throw new Error((label || 'Record') + ' ' + ((item && item.id) || '') + ' has an invalid date and was not posted.');
  }

  function cashAccountFor(method) {
    const key = String(method || '').trim().toLowerCase();
    return PAYMENT_CASH_ACCOUNTS[key] || DEFAULT_CASH;
  }

  function expenseAccountFor(category) {
    const key = String(category || '').trim().toLowerCase();
    return EXPENSE_ACCOUNTS[key] || DEFAULT_EXPENSE;
  }

  function receivableNarration(sale, data) {
    const plot = (data.plots || []).find((item) => item.id === sale.plotId);
    const buyer = (data.buyers || []).find((item) => item.id === sale.buyerId);
    const detail = [plot && plot.label, buyer && buyer.name].filter(Boolean).join(' · ');
    return 'Land sale ' + (sale.receiptNo || sale.id) + (detail ? ' — ' + detail : '');
  }

  function recordSale(data, sale) {
    if (!sale) return null;
    const amount = Core.toMinor(sale.price);
    if (amount <= 0) return null;
    const state = stateOf(data);
    const date = dateOf(sale, 'Sale');
    const result = Core.postJournal(state, {
      date,
      narration: receivableNarration(sale, data),
      sourceType: 'sale',
      sourceId: sale.id,
      category: 'non-cash',
      idempotencyKey: 'sale:' + sale.id,
      createdBy: actorName(),
      metadata: { receiptNo: sale.receiptNo || null, plotId: sale.plotId || null, buyerId: sale.buyerId || null },
      lines: [
        { accountCode: RECEIVABLE, debit: amount, memo: 'Receivable · ' + (sale.receiptNo || sale.id) },
        { accountCode: LAND_REVENUE, credit: amount, memo: 'Land sales revenue' }
      ]
    }, actorName());
    recordSaleCogs(data, sale, state);
    return result.journal;
  }

  function recordSaleCogs(data, sale, state) {
    const plot = (data.plots || []).find((item) => item.id === sale.plotId);
    const cost = Core.toMinor(plot && plot.cost);
    if (cost <= 0) return null;
    const result = Core.postJournal(state || stateOf(data), {
      date: dateOf(sale, 'Sale'),
      narration: 'Cost of land sold — ' + (plot.label || plot.code || sale.plotId) +
        (sale.receiptNo ? ' (' + sale.receiptNo + ')' : ''),
      sourceType: 'sale',
      sourceId: sale.id,
      category: 'non-cash',
      idempotencyKey: 'sale-cogs:' + sale.id,
      createdBy: actorName(),
      metadata: { receiptNo: sale.receiptNo || null, plotId: plot.id },
      lines: [
        { accountCode: COST_OF_SALES, debit: cost, memo: 'Cost of ' + (plot.code || plot.label || sale.plotId) },
        { accountCode: LAND_INVENTORY, credit: cost, memo: 'Release land inventory' }
      ]
    }, actorName());
    return result.journal;
  }

  function recordPayment(data, payment) {
    if (!payment) return null;
    const amount = Core.toMinor(payment.amount);
    if (amount <= 0) return null;
    const state = stateOf(data);
    const date = dateOf(payment, 'Payment');
    const sale = (data.sales || []).find((item) => item.id === payment.saleId) || null;
    const buyer = sale ? (data.buyers || []).find((item) => item.id === sale.buyerId) : null;
    const narration = 'Payment received' +
      (sale && sale.receiptNo ? ' — ' + sale.receiptNo : '') +
      (buyer ? ' from ' + buyer.name : '');
    const result = Core.postJournal(state, {
      date,
      narration,
      sourceType: 'payment',
      sourceId: payment.id,
      category: 'operating',
      idempotencyKey: 'payment:' + payment.id,
      createdBy: actorName(),
      metadata: { saleId: payment.saleId || null, method: payment.method || null, note: payment.note || null },
      lines: [
        { accountCode: cashAccountFor(payment.method), debit: amount, memo: payment.method || 'Payment' },
        { accountCode: RECEIVABLE, credit: amount, memo: 'Settle ' + (sale && sale.receiptNo ? sale.receiptNo : 'receivable') }
      ]
    }, actorName());
    return result.journal;
  }

  function recordExpense(data, expense) {
    if (!expense) return null;
    const amount = Core.toMinor(expense.amount);
    const revision = Number(expense.ledgerRevision) || 0;
    if (amount <= 0) return null;
    const state = stateOf(data);
    const date = dateOf(expense, 'Expense');
    const result = Core.postJournal(state, {
      date,
      narration: 'Expense — ' + (expense.description || expense.category || 'Operating expense'),
      sourceType: 'expense',
      sourceId: expense.id,
      category: 'operating',
      idempotencyKey: 'expense:' + expense.id + ':v' + revision,
      createdBy: actorName(),
      metadata: { category: expense.category || null, method: expense.method || null, reference: expense.reference || null },
      lines: [
        { accountCode: expenseAccountFor(expense.category), debit: amount, memo: expense.category || 'Expense' },
        { accountCode: cashAccountFor(expense.method), credit: amount, memo: expense.method || 'Payment' }
      ]
    }, actorName());
    expense.ledgerRevision = revision;
    return result.journal;
  }

  function postedJournalsFor(state, sourceType, sourceId) {
    return state.journals.filter((journal) =>
      journal.status === 'posted' && journal.sourceType === sourceType && journal.sourceId === sourceId
    );
  }

  function reverseMany(state, journals, reason) {
    let count = 0;
    journals.forEach((journal) => {
      Core.reverseJournal(state, journal.id, {
        date: Core.todayISO(),
        reason,
        actor: actorName()
      });
      count++;
    });
    return count;
  }

  function updateExpense(data, expense, previous) {
    if (!expense) return null;
    const saved = snapshot(data);
    try {
      const state = stateOf(data);
      const existing = postedJournalsFor(state, 'expense', expense.id);
      reverseMany(state, existing, 'Expense updated');
      const nextRevision = (Number(previous && previous.ledgerRevision) || 0) + 1;
      expense.ledgerRevision = nextRevision;
      return recordExpense(data, expense);
    } catch (err) {
      restore(data, saved);
      if (previous) expense.ledgerRevision = previous.ledgerRevision;
      throw err;
    }
  }

  function voidExpense(data, expense, reason) {
    if (!expense) return 0;
    const saved = snapshot(data);
    try {
      const state = stateOf(data);
      const journals = postedJournalsFor(state, 'expense', expense.id);
      return reverseMany(state, journals, reason || 'Expense removed');
    } catch (err) {
      restore(data, saved);
      throw err;
    }
  }

  function voidSale(data, sale, reason) {
    if (!sale) return 0;
    const saved = snapshot(data);
    try {
      const state = stateOf(data);
      const paymentIds = new Set((data.payments || []).filter((payment) => payment.saleId === sale.id).map((payment) => payment.id));
      const journals = state.journals.filter((journal) => {
        if (journal.status !== 'posted') return false;
        if (journal.sourceType === 'sale' && journal.sourceId === sale.id) return true;
        return journal.sourceType === 'payment' && paymentIds.has(journal.sourceId);
      });
      return reverseMany(state, journals, reason || 'Sale voided');
    } catch (err) {
      restore(data, saved);
      throw err;
    }
  }

  function replay(data) {
    const state = stateOf(data);
    const events = [];
    (data.sales || []).forEach((sale) => events.push({ kind: 'sale', item: sale, order: 0, date: sale.date }));
    (data.payments || []).forEach((payment) => events.push({ kind: 'payment', item: payment, order: 1, date: payment.date }));
    (data.expenses || []).forEach((expense) => events.push({ kind: 'expense', item: expense, order: 2, date: expense.date }));
    events.sort((a, b) => {
      if (String(a.date) !== String(b.date)) return String(a.date) < String(b.date) ? -1 : 1;
      return a.order - b.order;
    });
    let posted = 0;
    const failures = [];
    events.forEach((event) => {
      const before = state.journals.length;
      try {
        if (event.kind === 'sale') recordSale(data, event.item);
        else if (event.kind === 'payment') recordPayment(data, event.item);
        else recordExpense(data, event.item);
        if (state.journals.length > before) posted++;
      } catch (err) {
        failures.push({
          kind: event.kind,
          id: (event.item && event.item.id) || '',
          message: err && err.message ? err.message : String(err)
        });
      }
    });
    return { posted, failures };
  }

  function ensure(data) {
    let initialized = false;
    let changed = false;
    let state;
    if (!data.finance) {
      state = Core.createState({ demo: isDemoWorkspace(data) });
      data.finance = state;
      Core.ensureState(state);
      Core.recordAudit(state, {
        actor: actorName(),
        action: 'ledger.initialize',
        entityType: 'ledger',
        entityId: 'finance',
        ref: state.demo ? 'DEMO' : 'LIVE',
        detail: (state.demo ? 'Initialised the demo ledger' : 'Initialised the accounting ledger') +
          ' with the default chart of accounts.'
      });
      initialized = true;
      changed = true;
    } else {
      state = Core.ensureState(data.finance);
    }
    let replayResult = { posted: 0, failures: [] };
    if (state.demo && state.replayVersion !== 1) {
      replayResult = replay(data);
      state.replayVersion = 1;
      changed = true;
    } else if (!state.replayVersion) {
      state.replayVersion = 1;
      changed = true;
    }
    if (state.demo && replayResult.failures.length) {
      console.warn('Finance replay skipped some records.', replayResult.failures);
    }
    return {
      state,
      initialized,
      changed,
      posted: replayResult.posted,
      failures: replayResult.failures
    };
  }

  function sync(data) {
    const state = stateOf(data);
    const result = replay(data);
    state.replayVersion = 1;
    return result;
  }

  function startClean(data) {
    const previous = data.finance;
    const previousCount = previous && Array.isArray(previous.journals) ? previous.journals.length : 0;
    const state = Core.createState({ demo: false });
    Core.ensureState(state);
    state.replayVersion = 1;
    Core.recordAudit(state, {
      actor: actorName(),
      action: 'ledger.initialize',
      entityType: 'ledger',
      entityId: 'finance',
      ref: 'CLEAN',
      detail: 'Started a clean accounting ledger. Existing operational records were not posted.' +
        (previousCount ? ' The previous ledger held ' + previousCount + ' journals and was discarded by explicit user action.' : '')
    });
    data.finance = state;
    return state;
  }

  function postManual(data, input) {
    const state = stateOf(data);
    return Core.postJournal(state, Object.assign({}, input, {
      sourceType: input && input.sourceType ? input.sourceType : 'manual',
      createdBy: (input && input.createdBy) || actorName()
    }), actorName());
  }

  function reverse(data, journalId, reason) {
    const state = stateOf(data);
    return Core.reverseJournal(state, journalId, {
      date: Core.todayISO(),
      reason: reason || '',
      actor: actorName()
    });
  }

  function closePeriod(data, key, note) {
    const state = stateOf(data);
    return Core.closePeriod(state, key, { actor: actorName(), note: note || '' });
  }

  function reopenPeriod(data, key, note) {
    const state = stateOf(data);
    return Core.reopenPeriod(state, key, { actor: actorName(), note: note || '' });
  }

  return {
    RECEIVABLE,
    LAND_INVENTORY,
    LAND_REVENUE,
    COST_OF_SALES,
    PAYMENT_CASH_ACCOUNTS,
    EXPENSE_ACCOUNTS,
    actorName,
    isDemoWorkspace,
    stateOf,
    snapshot,
    restore,
    cashAccountFor,
    expenseAccountFor,
    recordSale,
    recordPayment,
    recordExpense,
    updateExpense,
    voidExpense,
    voidSale,
    replay,
    ensure,
    sync,
    startClean,
    postManual,
    reverse,
    closePeriod,
    reopenPeriod
  };
});
