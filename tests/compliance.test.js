'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let catalog;

async function load() {
  if (!catalog) catalog = await import('../lib/compliance-ghana.js');
  return catalog;
}

const byKey = async (key) => (await load()).COMPLIANCE_OBLIGATIONS.find((item) => item.key === key);
const utc = (year, month, day) => new Date(Date.UTC(year, month, day, 12));

test('monthly obligations fall due in the following month', async () => {
  const { currentCycle } = await load();
  const paye = await byKey('paye');
  const november = currentCycle(paye, utc(2026, 10, 6));

  assert.equal(november.period, '2026-11');
  assert.equal(november.dueDate.toISOString(), '2026-12-15T12:00:00.000Z');

  const december = currentCycle(paye, utc(2026, 11, 31));
  assert.equal(december.period, '2026-12');
  assert.equal(december.dueDate.toISOString(), '2027-01-15T12:00:00.000Z');
});

test('VAT is due on the last day of the following month', async () => {
  const { currentCycle } = await load();
  const vat = await byKey('vat');
  const cycle = currentCycle(vat, utc(2026, 10, 6));
  assert.equal(cycle.dueDate.toISOString(), '2026-12-31T12:00:00.000Z');

  const january = currentCycle(vat, utc(2028, 0, 10));
  assert.equal(january.dueDate.toISOString(), '2028-02-29T12:00:00.000Z');
});

test('quarterly and annual obligations use the current cycle', async () => {
  const { currentCycle } = await load();
  const provisional = await byKey('cit_provisional');
  const quarterly = currentCycle(provisional, utc(2026, 10, 6));
  assert.equal(quarterly.period, '2026-Q4');
  assert.equal(quarterly.dueDate.toISOString(), '2026-12-31T12:00:00.000Z');

  const annualReturn = await byKey('orc_annual_return');
  const annual = currentCycle(annualReturn, utc(2026, 10, 6));
  assert.equal(annual.period, '2026');
  assert.equal(annual.dueDate.toISOString(), '2026-06-30T12:00:00.000Z');
});

test('one-time and per-transaction obligations have no computed due date', async () => {
  const { currentCycle } = await load();
  const tin = currentCycle(await byKey('gra_tin'), utc(2026, 10, 6));
  assert.deepEqual(tin, { period: 'ONCE', dueDate: null });

  const stamp = currentCycle(await byKey('stamp_duty'), utc(2026, 10, 6));
  assert.deepEqual(stamp, { period: 'ONGOING', dueDate: null });
});

test('effectively overdue items are computed without changing filed items', async () => {
  const { effectiveStatus } = await load();
  const now = utc(2026, 10, 6);

  assert.equal(effectiveStatus({ status: 'PENDING', dueDate: utc(2026, 10, 1) }, now), 'OVERDUE');
  assert.equal(effectiveStatus({ status: 'PENDING', dueDate: utc(2026, 10, 6) }, now), 'PENDING');
  assert.equal(effectiveStatus({ status: 'PENDING', dueDate: utc(2026, 10, 20) }, now), 'PENDING');
  assert.equal(effectiveStatus({ status: 'PENDING', dueDate: null }, now), 'PENDING');
  assert.equal(effectiveStatus({ status: 'FILED', dueDate: utc(2026, 9, 1) }, now), 'FILED');
  assert.equal(effectiveStatus({ status: 'WAIVED', dueDate: utc(2026, 9, 1) }, now), 'WAIVED');
});

test('stats separate overdue, upcoming and filed items', async () => {
  const { complianceStats } = await load();
  const now = utc(2026, 10, 6);
  const stats = complianceStats([
    { id: 'a', status: 'PENDING', dueDate: utc(2026, 10, 1) },
    { id: 'b', status: 'IN_PROGRESS', dueDate: utc(2026, 10, 20) },
    { id: 'c', status: 'FILED', dueDate: utc(2026, 9, 15), filedAt: utc(2026, 9, 14) },
    { id: 'd', status: 'WAIVED', dueDate: utc(2026, 10, 1) },
    { id: 'e', status: 'PENDING', dueDate: null }
  ], now);

  assert.deepEqual(stats, { score: 75, overdue: 1, dueSoon: 1, filedThisYear: 1, open: 3 });
});

test('catalog entries are complete and uniquely keyed', async () => {
  const { COMPLIANCE_CATEGORIES, COMPLIANCE_FREQUENCIES, COMPLIANCE_OBLIGATIONS } = await load();
  const keys = new Set();

  for (const item of COMPLIANCE_OBLIGATIONS) {
    assert.ok(item.title && item.authority && item.statute, item.key + ' is missing statutory details');
    assert.ok(COMPLIANCE_CATEGORIES[item.category], item.key + ' has an unknown category');
    assert.ok(COMPLIANCE_FREQUENCIES[item.frequency], item.key + ' has an unknown frequency');
    assert.ok(!keys.has(item.key), 'duplicate catalog key ' + item.key);
    keys.add(item.key);

    if (item.schedule.kind === 'monthly') {
      assert.ok(item.schedule.dueDay, item.key + ' needs a monthly due day');
    }
    if (item.schedule.kind === 'quarterly') {
      assert.equal(item.schedule.months.length, 4, item.key + ' needs four quarterly months');
    }
    if (item.schedule.kind === 'annual') {
      assert.ok(item.schedule.month >= 0 && item.schedule.month <= 11, item.key + ' has an invalid month');
      assert.ok(item.schedule.day >= 1 && item.schedule.day <= 31, item.key + ' has an invalid day');
    }
    if (item.portal) assert.match(item.portal, /^https:\/\//, item.key + ' portal must be https');
  }

  assert.ok(COMPLIANCE_OBLIGATIONS.length >= 15);
  for (const key of ['paye', 'vat', 'ssnit_tier1', 'orc_annual_return', 'dpc_registration', 'reac_firm_licence', 'stamp_duty']) {
    assert.ok(keys.has(key), 'catalog is missing ' + key);
  }
});
