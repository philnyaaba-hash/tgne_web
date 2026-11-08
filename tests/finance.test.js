'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../public/legacy/finance-core.js');

const GHS = (value) => F.toMinor(value);

function fresh() {
  const state = F.createState();
  F.ensureState(state);
  return state;
}

function post(state, overrides) {
  return F.postJournal(state, Object.assign({
    date: '2026-01-15',
    narration: 'Test journal',
    sourceType: 'manual',
    idempotencyKey: 'test:' + Math.random().toString(36).slice(2)
  }, overrides)).journal;
}

function seedCompany() {
  const state = fresh();
  post(state, {
    date: '2026-01-01',
    narration: 'Owner capital introduced',
    idempotencyKey: 'capital:1',
    lines: [
      { accountCode: '1200', debit: GHS(100000) },
      { accountCode: '3000', credit: GHS(100000) }
    ]
  });
  const sale = post(state, {
    date: '2026-01-15',
    narration: 'Sold Plot A-01',
    sourceType: 'sale',
    sourceId: 'sale-1',
    idempotencyKey: 'sale:sale-1',
    lines: [
      { accountCode: '1100', debit: GHS(45000) },
      { accountCode: '4000', credit: GHS(45000) }
    ]
  });
  post(state, {
    date: '2026-01-15',
    narration: 'Recognise cost of Plot A-01',
    category: 'non-cash',
    idempotencyKey: 'cost:sale-1',
    lines: [
      { accountCode: '5000', debit: GHS(15000) },
      { accountCode: '1200', credit: GHS(15000) }
    ]
  });
  const payment = post(state, {
    date: '2026-01-20',
    narration: 'Deposit from buyer',
    sourceType: 'payment',
    sourceId: 'pay-1',
    idempotencyKey: 'payment:pay-1',
    lines: [
      { accountCode: '1010', debit: GHS(20000) },
      { accountCode: '1100', credit: GHS(20000) }
    ]
  });
  const expense = post(state, {
    date: '2026-01-25',
    narration: 'January utilities',
    sourceType: 'expense',
    sourceId: 'exp-1',
    idempotencyKey: 'expense:exp-1',
    lines: [
      { accountCode: '5950', debit: GHS(5000) },
      { accountCode: '1010', credit: GHS(5000) }
    ]
  });
  const later = post(state, {
    date: '2026-02-05',
    narration: 'Second installment',
    sourceType: 'payment',
    sourceId: 'pay-2',
    idempotencyKey: 'payment:pay-2',
    lines: [
      { accountCode: '1010', debit: GHS(5000) },
      { accountCode: '1100', credit: GHS(5000) }
    ]
  });
  return { state, sale, payment, expense, later };
}

test('default chart of accounts is unique and valid', () => {
  const state = fresh();
  const codes = state.accounts.map((account) => account.code);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(codes.includes('1000'));
  assert.ok(codes.includes('4000'));
  assert.ok(state.accounts.every((account) => F.ACCOUNT_TYPES.includes(account.type)));
  assert.ok(state.accounts.filter((account) => account.cash).length >= 3);
});

test('money conversion uses integer pesewas', () => {
  assert.equal(F.toMinor(45000), 4500000);
  assert.equal(F.toMinor('1,234.56'), 123456);
  assert.equal(F.toMinor('12.345'), 1235);
  assert.equal(F.toMinor(null), 0);
  assert.equal(F.formatMinor(4500000), 'GH₵ 45,000');
  assert.equal(F.formatMinor(123456), 'GH₵ 1,234.56');
  assert.throws(() => F.toMinor('not money'), (error) => error.code === 'INVALID_AMOUNT');
});

test('balanced journal posts with sequence and audit entry', () => {
  const state = fresh();
  const journal = post(state, {
    narration: 'Capital introduced',
    idempotencyKey: 'capital:test',
    lines: [
      { accountCode: '1010', debit: GHS(10000) },
      { accountCode: '3000', credit: GHS(10000) }
    ]
  });
  assert.equal(journal.ref, 'JE-2026-0001');
  assert.equal(journal.status, 'posted');
  assert.equal(journal.debitTotal, GHS(10000));
  assert.equal(journal.creditTotal, GHS(10000));
  assert.equal(state.journals.length, 1);
  assert.equal(state.seq, 1);
  assert.equal(state.audit.length, 1);
  assert.equal(state.audit[0].action, 'journal.post');
  assert.equal(F.accountBalance(state, '1010'), GHS(10000));
  assert.equal(F.accountBalance(state, '3000'), GHS(10000));
});

test('journal validation rejects malformed entries', () => {
  const state = fresh();
  const lines = [
    { accountCode: '1010', debit: GHS(100) },
    { accountCode: '3000', credit: GHS(100) }
  ];
  assert.throws(() => post(state, { date: '2026-02-30', lines }), (error) => error.code === 'INVALID_DATE');
  assert.throws(() => post(state, { narration: '', lines }), (error) => error.code === 'INVALID_NARRATION');
  assert.throws(() => post(state, { lines: [] }), (error) => error.code === 'INVALID_LINES');
  assert.throws(() => post(state, {
    lines: [{ accountCode: '1010', debit: GHS(100) }, { accountCode: '3000', credit: GHS(99) }]
  }), (error) => error.code === 'UNBALANCED');
  assert.throws(() => post(state, {
    lines: [
      { accountCode: '1010', debit: GHS(100), credit: GHS(100) },
      { accountCode: '3000', credit: GHS(100) }
    ]
  }), (error) => error.code === 'INVALID_LINE');
  assert.throws(() => post(state, {
    lines: [{ accountCode: '1010', debit: GHS(100) }, { accountCode: '9999', credit: GHS(100) }]
  }), (error) => error.code === 'UNKNOWN_ACCOUNT');
  assert.equal(state.journals.length, 0);
});

test('idempotency key returns the existing journal without double posting', () => {
  const state = fresh();
  const payload = {
    date: '2026-01-10',
    narration: 'Receipt',
    idempotencyKey: 'payment:abc',
    lines: [
      { accountCode: '1010', debit: GHS(500) },
      { accountCode: '1100', credit: GHS(500) }
    ]
  };
  const first = F.postJournal(state, payload);
  const second = F.postJournal(state, payload);
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.journal.id, first.journal.id);
  assert.equal(state.journals.length, 1);
  assert.equal(state.seq, 1);
});

test('reversal swaps lines, nets balances to zero and keeps the original', () => {
  const state = fresh();
  const original = post(state, {
    date: '2026-01-15',
    narration: 'Sale',
    sourceType: 'sale',
    idempotencyKey: 'sale:rev',
    lines: [
      { accountCode: '1100', debit: GHS(1000) },
      { accountCode: '4000', credit: GHS(1000) }
    ]
  });
  const result = F.reverseJournal(state, original.id, {
    date: '2026-01-16',
    reason: 'Buyer cancelled',
    actor: 'admin'
  });
  assert.equal(original.status, 'reversed');
  assert.equal(original.reversedBy, result.journal.id);
  assert.equal(result.journal.reversalOf, original.id);
  assert.equal(result.journal.category, 'non-cash');
  const revenueLine = result.journal.lines.find((line) => line.accountCode === '4000');
  assert.equal(revenueLine.debit, GHS(1000));
  assert.equal(F.accountBalance(state, '1100'), 0);
  assert.equal(F.accountBalance(state, '4000'), 0);
  assert.equal(state.journals.length, 2);
  assert.ok(state.audit.some((entry) => entry.action === 'journal.reverse'));
  assert.throws(() => F.reverseJournal(state, original.id), (error) => error.code === 'ALREADY_REVERSED');
});

test('closed periods block posting until reopened', () => {
  const state = fresh();
  post(state, {
    date: '2026-01-31',
    narration: 'January close entry',
    idempotencyKey: 'jan:1',
    lines: [
      { accountCode: '1010', debit: GHS(100) },
      { accountCode: '1100', credit: GHS(100) }
    ]
  });
  const closed = F.closePeriod(state, '2026-01', { actor: 'admin' });
  assert.equal(closed.summary.revenue, 0);
  assert.equal(F.periodInfo(state, '2026-01').status, 'closed');
  assert.throws(() => post(state, {
    date: '2026-01-20',
    narration: 'Late entry',
    lines: [
      { accountCode: '1010', debit: GHS(50) },
      { accountCode: '1100', credit: GHS(50) }
    ]
  }), (error) => error.code === 'PERIOD_CLOSED');
  post(state, {
    date: '2026-02-01',
    narration: 'February entry',
    idempotencyKey: 'feb:1',
    lines: [
      { accountCode: '1010', debit: GHS(50) },
      { accountCode: '1100', credit: GHS(50) }
    ]
  });
  assert.throws(() => F.closePeriod(state, '2026-01'), (error) => error.code === 'PERIOD_ALREADY_CLOSED');
  F.reopenPeriod(state, '2026-01', { actor: 'admin', note: 'Late invoice' });
  assert.equal(F.periodInfo(state, '2026-01').status, 'open');
  post(state, {
    date: '2026-01-20',
    narration: 'Late entry after reopen',
    idempotencyKey: 'jan:2',
    lines: [
      { accountCode: '1010', debit: GHS(50) },
      { accountCode: '1100', credit: GHS(50) }
    ]
  });
  assert.throws(() => F.reopenPeriod(state, '2026-03'), (error) => error.code === 'PERIOD_NOT_CLOSED');
  assert.ok(state.audit.some((entry) => entry.action === 'period.close'));
  assert.ok(state.audit.some((entry) => entry.action === 'period.reopen'));
});

test('trial balance balances after sale, payments and expenses', () => {
  const { state } = seedCompany();
  const trial = F.trialBalance(state);
  assert.equal(trial.balanced, true);
  assert.equal(trial.difference, 0);
  assert.equal(trial.totalDebit, GHS(145000));
  assert.equal(trial.totalCredit, GHS(145000));
  const receivable = trial.rows.find((row) => row.code === '1100');
  assert.equal(receivable.debit, GHS(20000));
  const bank = trial.rows.find((row) => row.code === '1010');
  assert.equal(bank.debit, GHS(20000));
});

test('income statement separates cost of sales from operating expenses', () => {
  const { state } = seedCompany();
  const statement = F.incomeStatement(state, { from: '2026-01-01', to: '2026-01-31' });
  assert.equal(statement.revenueTotal, GHS(45000));
  assert.equal(statement.costTotal, GHS(15000));
  assert.equal(statement.operatingTotal, GHS(5000));
  assert.equal(statement.grossProfit, GHS(30000));
  assert.equal(statement.operatingProfit, GHS(25000));
  assert.equal(statement.netProfit, GHS(25000));
  assert.equal(statement.costLines.length, 1);
  assert.equal(statement.operatingExpenseLines[0].name, 'Utilities');
});

test('balance sheet balances and includes unclosed earnings', () => {
  const { state } = seedCompany();
  const sheet = F.balanceSheet(state, { asOf: '2026-02-28' });
  assert.equal(sheet.balanced, true);
  assert.equal(sheet.difference, 0);
  assert.equal(sheet.totalAssets, GHS(125000));
  assert.equal(sheet.totalLiabilities, 0);
  assert.equal(sheet.totalEquity, GHS(125000));
  const earnings = sheet.equity.find((row) => row.synthetic);
  assert.equal(earnings.amount, GHS(25000));
});

test('cash flow reconciles opening and closing cash by activity', () => {
  const { state } = seedCompany();
  const january = F.cashFlow(state, { from: '2026-01-01', to: '2026-01-31' });
  assert.equal(january.opening, 0);
  assert.equal(january.operating, GHS(15000));
  assert.equal(january.investing, 0);
  assert.equal(january.financing, 0);
  assert.equal(january.netChange, GHS(15000));
  assert.equal(january.closing, GHS(15000));
  assert.equal(january.closingFromLedger, GHS(15000));
  assert.equal(january.balanced, true);

  const february = F.cashFlow(state, { from: '2026-02-01', to: '2026-02-28' });
  assert.equal(february.opening, GHS(15000));
  assert.equal(february.operating, GHS(5000));
  assert.equal(february.closing, GHS(20000));
  assert.equal(february.balanced, true);
});

test('cash flow classifies financing and investing journals', () => {
  const state = fresh();
  post(state, {
    date: '2026-03-01',
    narration: 'Owner funding',
    category: 'financing',
    idempotencyKey: 'fin:1',
    lines: [
      { accountCode: '1010', debit: GHS(10000) },
      { accountCode: '3000', credit: GHS(10000) }
    ]
  });
  post(state, {
    date: '2026-03-02',
    narration: 'Buy land inventory',
    category: 'investing',
    idempotencyKey: 'inv:1',
    lines: [
      { accountCode: '1200', debit: GHS(4000) },
      { accountCode: '1010', credit: GHS(4000) }
    ]
  });
  post(state, {
    date: '2026-03-03',
    narration: 'Pay site security',
    sourceType: 'expense',
    idempotencyKey: 'exp:1',
    lines: [
      { accountCode: '5210', debit: GHS(1000) },
      { accountCode: '1010', credit: GHS(1000) }
    ]
  });
  const flow = F.cashFlow(state, { from: '2026-03-01', to: '2026-03-31' });
  assert.equal(flow.financing, GHS(10000));
  assert.equal(flow.investing, -GHS(4000));
  assert.equal(flow.operating, -GHS(1000));
  assert.equal(flow.closing, GHS(5000));
  assert.equal(flow.balanced, true);
  const sheet = F.balanceSheet(state, { asOf: '2026-03-31' });
  assert.equal(sheet.balanced, true);
  assert.equal(sheet.totalAssets, GHS(9000));
  assert.equal(sheet.totalEquity, GHS(9000));
});

test('custom accounts can be added, deactivated and audited', () => {
  const state = fresh();
  const account = F.addAccount(state, { code: '1110', name: 'Escrow account', type: 'asset', cash: false }, 'admin');
  assert.equal(account.code, '1110');
  assert.equal(state.accounts.filter((item) => item.code === '1110').length, 1);
  assert.throws(() => F.addAccount(state, { code: '1110', name: 'Duplicate', type: 'asset' }), (error) => error.code === 'DUPLICATE_ACCOUNT');
  assert.throws(() => F.addAccount(state, { code: 'X1', name: 'Bad', type: 'asset' }), (error) => error.code === 'INVALID_ACCOUNT_CODE');
  assert.throws(() => F.addAccount(state, { code: '1120', name: 'Bad type', type: 'income' }), (error) => error.code === 'INVALID_ACCOUNT_TYPE');
  F.setAccountActive(state, '1110', false, 'admin');
  assert.throws(() => post(state, {
    lines: [
      { accountCode: '1110', debit: GHS(100) },
      { accountCode: '3000', credit: GHS(100) }
    ]
  }), (error) => error.code === 'INACTIVE_ACCOUNT');
  F.setAccountActive(state, '1110', true, 'admin');
  post(state, {
    lines: [
      { accountCode: '1110', debit: GHS(100) },
      { accountCode: '3000', credit: GHS(100) }
    ]
  });
  assert.equal(F.accountBalance(state, '1110'), GHS(100));
  assert.ok(state.audit.some((entry) => entry.action === 'account.deactivate'));
});

test('overview, audit trail and integrity checks report consistent figures', () => {
  const { state } = seedCompany();
  const overview = F.overview(state, { asOf: '2026-02-28' });
  assert.equal(overview.cash, GHS(20000));
  assert.equal(overview.receivable, GHS(20000));
  assert.equal(overview.netProfit, GHS(25000));
  assert.equal(overview.journalCount, 6);

  const trail = F.auditTrail(state, { action: 'journal.post' });
  assert.equal(trail.length, 6);
  assert.ok(trail[0].ref.startsWith('JE-2026-'));

  assert.deepEqual(F.integrityCheck(state), []);
  state.journals[0].lines[0].debit += 1;
  const issues = F.integrityCheck(state);
  assert.ok(issues.length > 0);
  assert.ok(issues.some((issue) => issue.includes('unbalanced')));
});

test('closed period summary reflects its movement', () => {
  const { state } = seedCompany();
  const summary = F.periodSummary(state, '2026-01');
  assert.equal(summary.revenue, GHS(45000));
  assert.equal(summary.expenses, GHS(20000));
  assert.equal(summary.netProfit, GHS(25000));
  assert.equal(summary.journalCount, 5);
});

test('closing a period zeroes its P&L accounts and transfers the result to retained earnings', () => {
  const { state } = seedCompany();
  const result = F.closePeriod(state, '2026-01', { actor: 'admin', note: 'Month end' });
  assert.equal(result.status, 'closed');
  assert.equal(result.closeCount, 1);
  assert.ok(result.closingJournal);
  assert.equal(result.closingJournal.date, '2026-01-31');
  assert.equal(result.closingJournal.sourceType, 'closing');
  assert.equal(result.closingJournal.category, 'non-cash');

  assert.equal(F.accountBalance(state, '4000'), 0);
  assert.equal(F.accountBalance(state, '5000'), 0);
  assert.equal(F.accountBalance(state, '5950'), 0);
  assert.equal(F.accountBalance(state, '3100'), GHS(25000));

  const statement = F.incomeStatement(state, { from: '2026-01-01', to: '2026-01-31' });
  assert.equal(statement.revenueTotal, GHS(45000));
  assert.equal(statement.netProfit, GHS(25000));
  assert.equal(F.periodSummary(state, '2026-01').journalCount, 5);

  const trial = F.trialBalance(state);
  assert.equal(trial.balanced, true);

  const januarySheet = F.balanceSheet(state, { asOf: '2026-01-31' });
  assert.equal(januarySheet.balanced, true);
  assert.equal(januarySheet.totalAssets, GHS(125000));
  assert.equal(januarySheet.totalEquity, GHS(125000));
  assert.equal(januarySheet.equity.some((row) => row.synthetic), false);

  const februarySheet = F.balanceSheet(state, { asOf: '2026-02-28' });
  assert.equal(februarySheet.balanced, true);
  assert.equal(februarySheet.totalEquity, GHS(125000));
  assert.equal(februarySheet.equity.some((row) => row.synthetic), false);
});

test('reopening reverses the closing entry and the next close posts a fresh one', () => {
  const { state } = seedCompany();
  const closed = F.closePeriod(state, '2026-01', { actor: 'admin' });
  const reopened = F.reopenPeriod(state, '2026-01', { actor: 'admin', note: 'Correct January' });
  assert.ok(reopened.reversalJournal);
  assert.equal(F.journalById(state, closed.closingJournal.id).status, 'reversed');
  assert.equal(F.accountBalance(state, '3100'), 0);
  assert.equal(F.accountBalance(state, '4000'), GHS(45000));

  const reclosed = F.closePeriod(state, '2026-01', { actor: 'admin' });
  assert.equal(reclosed.closeCount, 2);
  assert.notEqual(reclosed.closingJournal.id, closed.closingJournal.id);
  assert.equal(F.accountBalance(state, '3100'), GHS(25000));
  assert.equal(F.accountBalance(state, '4000'), 0);
  assert.equal(state.journals.filter((journal) => journal.sourceType === 'closing').length, 2);
  assert.equal(F.trialBalance(state).balanced, true);
  assert.equal(F.balanceSheet(state, { asOf: '2026-01-31' }).balanced, true);
});

test('a loss-making period transfers a debit balance to retained earnings', () => {
  const state = fresh();
  post(state, {
    date: '2026-04-10',
    narration: 'Site security',
    sourceType: 'expense',
    idempotencyKey: 'loss:exp',
    lines: [
      { accountCode: '5210', debit: GHS(1200) },
      { accountCode: '2000', credit: GHS(1200) }
    ]
  });
  F.closePeriod(state, '2026-04', { actor: 'admin' });
  assert.equal(F.accountBalance(state, '3100'), -GHS(1200));
  const sheet = F.balanceSheet(state, { asOf: '2026-04-30' });
  assert.equal(sheet.balanced, true);
  assert.equal(sheet.totalAssets, 0);
  assert.equal(sheet.totalLiabilities, GHS(1200));
  assert.equal(sheet.totalEquity, -GHS(1200));
});

test('closing entries are dated on the real last day of short months', () => {
  const state = fresh();
  post(state, {
    date: '2026-02-14',
    narration: 'February sale',
    sourceType: 'sale',
    idempotencyKey: 'feb:sale',
    lines: [
      { accountCode: '1100', debit: GHS(8000) },
      { accountCode: '4000', credit: GHS(8000) }
    ]
  });
  const result = F.closePeriod(state, '2026-02', { actor: 'admin' });
  assert.equal(result.closingJournal.date, '2026-02-28');
  assert.equal(F.periodEndDate('2026-02'), '2026-02-28');
  assert.equal(F.periodEndDate('2026-12'), '2026-12-31');
  assert.equal(F.periodEndDate('2024-02'), '2024-02-29');
});
