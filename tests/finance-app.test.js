'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../public/legacy/finance-core.js');
const FinanceApp = require('../public/legacy/finance-app.js');

function demoWorkspace() {
  return {
    settings: { orgName: 'Asante Land Company', siteName: 'Asante Ridge Estates' },
    plots: [{ id: 'plot-1', label: 'Plot A-01' }],
    buyers: [{ id: 'buyer-1', name: 'Ama Mensah' }],
    sales: [
      { id: 'sale-1', receiptNo: 'LL-2026-0001', plotId: 'plot-1', buyerId: 'buyer-1', date: '2026-01-10', price: 45000 }
    ],
    payments: [
      { id: 'pay-1', saleId: 'sale-1', amount: 20000, date: '2026-01-10', method: 'Mobile Money' }
    ],
    expenses: [
      { id: 'exp-1', date: '2026-01-15', amount: 5000, category: 'Utilities', method: 'Bank transfer', description: 'January utilities' }
    ]
  };
}

test('demo migration replays sales, payments and expenses exactly once', () => {
  const data = demoWorkspace();
  const first = FinanceApp.ensure(data);
  assert.equal(first.initialized, true);
  assert.equal(first.posted, 3);
  assert.equal(first.failures.length, 0);
  assert.equal(data.finance.demo, true);
  assert.equal(data.finance.replayVersion, 1);
  assert.equal(data.finance.journals.length, 3);

  const overview = F.overview(data.finance);
  assert.equal(overview.receivable, F.toMinor(25000));
  assert.equal(overview.cash, F.toMinor(15000));
  assert.equal(overview.netProfit, F.toMinor(40000));
  assert.equal(F.trialBalance(data.finance).balanced, true);
  assert.equal(F.balanceSheet(data.finance).balanced, true);

  const second = FinanceApp.ensure(data);
  assert.equal(second.posted, 0);
  assert.equal(data.finance.journals.length, 3);
});

test('a real workspace starts with a clean ledger and does not auto-post history', () => {
  const data = demoWorkspace();
  data.settings = { orgName: 'Nyame Land Ltd', siteName: 'Nyame Gardens' };
  const result = FinanceApp.ensure(data);
  assert.equal(result.initialized, true);
  assert.equal(result.posted, 0);
  assert.equal(data.finance.demo, false);
  assert.equal(data.finance.journals.length, 0);
  assert.equal(F.trialBalance(data.finance).balanced, true);
});

test('manual sync posts missing records on demand', () => {
  const data = demoWorkspace();
  data.settings = { orgName: 'Nyame Land Ltd', siteName: 'Nyame Gardens' };
  FinanceApp.ensure(data);
  assert.equal(data.finance.journals.length, 0);
  const result = FinanceApp.sync(data);
  assert.equal(result.posted, 3);
  assert.equal(data.finance.journals.length, 3);
  assert.equal(F.trialBalance(data.finance).balanced, true);
});

test('cash and expense mappings cover the recorded methods and categories', () => {
  assert.equal(FinanceApp.cashAccountFor('Cash'), '1000');
  assert.equal(FinanceApp.cashAccountFor('Mobile Money'), '1020');
  assert.equal(FinanceApp.cashAccountFor('Bank transfer'), '1010');
  assert.equal(FinanceApp.cashAccountFor('Cheque'), '1010');
  assert.equal(FinanceApp.cashAccountFor('Card'), '1010');
  assert.equal(FinanceApp.cashAccountFor('Other'), '1090');
  assert.equal(FinanceApp.cashAccountFor('Unknown'), '1010');
  assert.equal(FinanceApp.expenseAccountFor('Utilities'), '5950');
  assert.equal(FinanceApp.expenseAccountFor('Legal & professional'), '5400');
  assert.equal(FinanceApp.expenseAccountFor('Site maintenance'), '5210');
  assert.equal(FinanceApp.expenseAccountFor('Nope'), '5990');
});

test('editing an expense reverses the old entry and posts the revision', () => {
  const data = demoWorkspace();
  data.settings = { orgName: 'Nyame Land Ltd', siteName: 'Nyame Gardens' };
  FinanceApp.ensure(data);
  FinanceApp.startClean(data);
  const expense = { id: 'exp-9', date: '2026-01-05', amount: 100, category: 'Utilities', method: 'Cash', description: 'Power', ledgerRevision: 0 };
  data.expenses = [expense];
  FinanceApp.recordExpense(data, expense);
  assert.equal(data.finance.journals.length, 1);
  assert.equal(F.accountBalance(data.finance, '5950'), F.toMinor(100));

  const previous = Object.assign({}, expense);
  expense.amount = 150;
  expense.category = 'Transport';
  expense.description = 'Power and transport';
  const journal = FinanceApp.updateExpense(data, expense, previous);
  assert.equal(expense.ledgerRevision, 1);
  assert.equal(data.finance.journals.length, 3);
  assert.equal(data.finance.journals[0].status, 'reversed');
  assert.equal(journal.sourceId, 'exp-9');
  assert.equal(F.accountBalance(data.finance, '5950'), 0);
  assert.equal(F.accountBalance(data.finance, '5960'), F.toMinor(150));
  assert.equal(F.accountBalance(data.finance, '1000'), -F.toMinor(150));
  assert.equal(F.trialBalance(data.finance).balanced, true);
});

test('voiding a sale reverses the receivable and all its receipts', () => {
  const data = demoWorkspace();
  data.expenses = [];
  data.payments.push({ id: 'pay-2', saleId: 'sale-1', amount: 5000, date: '2026-02-05', method: 'Cash' });
  FinanceApp.ensure(data);
  assert.equal(data.finance.journals.length, 3);
  const reversed = FinanceApp.voidSale(data, data.sales[0], 'Buyer cancelled');
  assert.equal(reversed, 3);
  assert.equal(F.accountBalance(data.finance, '1100'), 0);
  assert.equal(F.accountBalance(data.finance, '4000'), 0);
  assert.equal(F.overview(data.finance).cash, 0);
  assert.equal(data.finance.journals.filter((journal) => journal.status === 'reversed').length, 3);
  assert.equal(F.trialBalance(data.finance).rows.length, 0);
  const flow = F.cashFlow(data.finance);
  assert.equal(flow.balanced, true);
  assert.equal(flow.closing, 0);
});

test('posting and reversals are blocked atomically when the period is closed', () => {
  const data = demoWorkspace();
  data.settings = { orgName: 'Nyame Land Ltd', siteName: 'Nyame Gardens' };
  FinanceApp.ensure(data);
  FinanceApp.recordSale(data, data.sales[0]);
  const before = JSON.parse(JSON.stringify(data.finance));
  FinanceApp.closePeriod(data, F.todayISO().slice(0, 7), 'Month-end');
  const closed = JSON.parse(JSON.stringify(data.finance));
  assert.throws(() => FinanceApp.voidSale(data, data.sales[0], 'Cancelled'), (error) => error.code === 'PERIOD_CLOSED');
  assert.deepEqual(data.finance, closed);
  assert.equal(before.journals.length, 1);
});

test('startClean explicitly discards the previous ledger and suppresses replay', () => {
  const data = demoWorkspace();
  FinanceApp.ensure(data);
  assert.equal(data.finance.journals.length, 3);
  const state = FinanceApp.startClean(data);
  assert.equal(state.demo, false);
  assert.equal(state.journals.length, 0);
  assert.equal(state.replayVersion, 1);
  assert.ok(state.audit.some((entry) => entry.action === 'ledger.initialize' && entry.ref === 'CLEAN'));
  const after = FinanceApp.ensure(data);
  assert.equal(after.posted, 0);
  assert.equal(data.finance.journals.length, 0);
});

test('invalid legacy dates are reported instead of silently re-dated', () => {
  const data = demoWorkspace();
  data.sales[0].date = 'not-a-date';
  const result = FinanceApp.ensure(data);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].message, /invalid date/i);
  assert.equal(data.finance.journals.length, 2);
  assert.equal(F.trialBalance(data.finance).balanced, true);
});

test('a plot development cost posts cost of sales and reverses with the sale', () => {
  const data = demoWorkspace();
  data.plots[0].cost = 15000;
  const result = FinanceApp.ensure(data);
  assert.equal(result.posted, 3);
  assert.equal(data.finance.journals.length, 4);
  const cogs = data.finance.journals.find((journal) => journal.idempotencyKey === 'sale-cogs:sale-1');
  assert.ok(cogs);
  assert.equal(cogs.sourceType, 'sale');
  assert.equal(cogs.sourceId, 'sale-1');
  assert.equal(cogs.category, 'non-cash');
  assert.equal(cogs.lines.find((line) => line.accountCode === '5000').debit, F.toMinor(15000));
  assert.equal(cogs.lines.find((line) => line.accountCode === '1200').credit, F.toMinor(15000));

  assert.equal(F.accountBalance(data.finance, '5000'), F.toMinor(15000));
  assert.equal(F.accountBalance(data.finance, '1200'), -F.toMinor(15000));
  const overview = F.overview(data.finance);
  assert.equal(overview.netProfit, F.toMinor(25000));
  assert.equal(F.balanceSheet(data.finance).balanced, true);

  const reversed = FinanceApp.voidSale(data, data.sales[0], 'Buyer cancelled');
  assert.equal(reversed, 3);
  assert.equal(F.accountBalance(data.finance, '5000'), 0);
  assert.equal(F.accountBalance(data.finance, '1200'), 0);
  assert.equal(F.trialBalance(data.finance).balanced, true);
});

test('a plot without a cost posts only the revenue journal', () => {
  const data = demoWorkspace();
  data.plots[0].cost = 0;
  FinanceApp.ensure(data);
  assert.equal(data.finance.journals.length, 3);
  assert.equal(data.finance.journals.filter((journal) => journal.idempotencyKey.startsWith('sale-cogs:')).length, 0);
  assert.equal(F.balanceSheet(data.finance).balanced, true);
});

test('closing a period moves profit to retained earnings until it is reopened', () => {
  const data = demoWorkspace();
  data.settings = { orgName: 'Nyame Land Ltd', siteName: 'Nyame Gardens' };
  FinanceApp.ensure(data);
  FinanceApp.recordSale(data, data.sales[0]);
  FinanceApp.recordPayment(data, data.payments[0]);
  FinanceApp.recordExpense(data, data.expenses[0]);

  const closed = FinanceApp.closePeriod(data, '2026-01', 'Month end');
  assert.ok(closed.closingJournal);
  assert.equal(closed.closingJournal.date, '2026-01-31');
  assert.equal(F.accountBalance(data.finance, '3100'), F.toMinor(40000));
  assert.equal(F.accountBalance(data.finance, '4000'), 0);

  const sheet = F.balanceSheet(data.finance, { asOf: '2026-01-31' });
  assert.equal(sheet.balanced, true);
  assert.equal(sheet.equity.some((row) => row.synthetic), false);

  const reopened = FinanceApp.reopenPeriod(data, '2026-01', 'Correct the month');
  assert.ok(reopened.reversalJournal);
  assert.equal(F.accountBalance(data.finance, '3100'), 0);
  assert.equal(F.accountBalance(data.finance, '4000'), F.toMinor(45000));
  assert.equal(F.incomeStatement(data.finance, { from: '2026-01-01', to: '2026-01-31' }).netProfit, F.toMinor(40000));
  assert.equal(F.trialBalance(data.finance).balanced, true);
});
