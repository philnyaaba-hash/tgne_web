'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let portal;

async function load() {
  if (!portal) portal = await import('../lib/client-portal.js');
  return portal;
}

function bytes(values) {
  return () => Uint8Array.from(values);
}

test('client references use year and a human-safe token', async () => {
  const { clientCode, resaleReference, serviceReference } = await load();
  const date = new Date('2026-05-10T12:00:00Z');
  assert.equal(clientCode(date, bytes([0, 1, 2, 3, 4, 5])), 'CL-2026-234567');
  assert.equal(resaleReference(date, bytes([5, 4, 3, 2, 1, 0])), 'RS-2026-765432');
  assert.equal(serviceReference(date, bytes([0, 0, 0, 0, 0, 0])), 'SV-2026-222222');
  assert.match(resaleReference(), /^RS-\d{4}-[2-9A-HJ-NP-Z]{6}$/);
});

test('service references map to deterministic service invoices', async () => {
  const { serviceInvoiceNumber, invoiceBelongsToReference } = await load();
  assert.equal(serviceInvoiceNumber('SV-2026-ABC234'), 'SVC-2026-ABC234');
  assert.equal(serviceInvoiceNumber('sv-2026-abc234'), '');
  assert.equal(serviceInvoiceNumber('SV-2026-ABC'), '');
  assert.equal(serviceInvoiceNumber(''), '');
  assert.equal(invoiceBelongsToReference('SVC-2026-ABC234', 'SV-2026-ABC234'), true);
  assert.equal(invoiceBelongsToReference('INV-2026-ABC234', 'LL-2026-ABC234'), true);
  assert.equal(invoiceBelongsToReference('INV-2026-ABC234', 'SV-2026-ABC234'), false);
});

test('holding validation checks land facts and optional values', async () => {
  const { validateHolding } = await load();
  const ok = validateHolding({
    title: 'Aburi plot',
    region: 'Eastern',
    district: 'Akuapem South',
    sizeAcres: '2.5',
    titleStatus: 'REGISTERED',
    acquisitionPrice: '45000',
    currentValue: '52000',
    acquisitionDate: '2025-03-01'
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.sizeAcres, 2.5);
  assert.equal(ok.value.acquisitionPrice, 45000);
  assert.equal(ok.value.titleStatus, 'REGISTERED');
  assert.ok(ok.value.acquisitionDate instanceof Date);

  const bad = validateHolding({ title: 'A', region: '', district: '', sizeAcres: 0, titleStatus: 'NOPE', currentValue: 'abc' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.title);
  assert.ok(bad.errors.region);
  assert.ok(bad.errors.district);
  assert.ok(bad.errors.sizeAcres);
  assert.ok(bad.errors.titleStatus);
  assert.ok(bad.errors.currentValue);
});

test('resale validation requires a price, size and description', async () => {
  const { validateResale } = await load();
  const ok = validateResale({
    title: 'Aburi resale plot',
    region: 'Eastern',
    district: 'Akuapem South',
    askingPrice: '60000',
    sizeAcres: '2.5',
    description: 'A surveyed plot with a registered title and motorable access.'
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.askingPrice, 60000);

  const bad = validateResale({ title: 'short', askingPrice: 0, sizeAcres: -1, description: 'too short' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.title);
  assert.ok(bad.errors.askingPrice);
  assert.ok(bad.errors.sizeAcres);
  assert.ok(bad.errors.description);
});

test('service validation accepts known work types only', async () => {
  const { SERVICE_TYPES, validateService } = await load();
  const ok = validateService({ type: 'CONSTRUCTION', title: 'Build a two-bedroom home', description: 'Foundation, walls and roof on the Aburi plot.' });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.priority, 'NORMAL');
  assert.equal(validateService({ type: 'WEB_DEVELOPMENT', title: 'Company website refresh', description: 'Redesign our company site and improve the mobile experience.' }).ok, true);
  assert.equal(SERVICE_TYPES.find((type) => type.value === 'GRAPHIC_DESIGN').label, 'Graphic design & branding');
  const bad = validateService({ type: 'ROCKET', title: 'x', description: 'y', priority: 'NOW' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.type);
  assert.ok(bad.errors.title);
  assert.ok(bad.errors.description);
  assert.ok(bad.errors.priority);
});

test('document links must be https or a local upload path', async () => {
  const { validateDocument } = await load();
  assert.equal(validateDocument({ name: 'Title deed', type: 'TITLE_DEED', fileUrl: 'https://files.example.com/deed.pdf' }).ok, true);
  assert.equal(validateDocument({ name: 'Survey plan', type: 'SURVEY_PLAN', fileUrl: '/uploads/plans/aburi.pdf' }).ok, true);
  const bad = validateDocument({ name: 'Deed', type: 'TITLE_DEED', fileUrl: 'javascript:alert(1)' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.fileUrl);
  assert.equal(validateDocument({ name: 'Deed', type: 'NOPE', fileUrl: 'https://files.example.com/deed.pdf' }).ok, false);
});

test('quotes must be positive and portfolio totals net out', async () => {
  const { validateQuote, portfolioSummary, withGain } = await load();
  assert.equal(validateQuote({ amount: '1200' }).ok, true);
  assert.equal(validateQuote({ amount: 0 }).ok, false);
  assert.equal(validateQuote({ amount: -10 }).ok, false);

  const summary = withGain(portfolioSummary([
    { sizeAcres: 2, acquisitionPrice: 40000, currentValue: 50000, status: 'ACTIVE' },
    { sizeAcres: 1.5, acquisitionPrice: 30000, currentValue: 28000, status: 'ACTIVE' }
  ]));
  assert.equal(summary.count, 2);
  assert.equal(summary.acres, 3.5);
  assert.equal(summary.acquisitionValue, 70000);
  assert.equal(summary.currentValue, 78000);
  assert.equal(summary.gain, 8000);
  assert.deepEqual(portfolioSummary([]), { count: 0, acres: 0, acquisitionValue: 0, currentValue: 0, gain: 0 });
});
