'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let accounts;

async function load() {
  if (!accounts) accounts = await import('../lib/land-accounts.js');
  return accounts;
}

test('reservation references map to deterministic invoice numbers', async () => {
  const { reservationInvoiceNumber } = await load();
  assert.equal(reservationInvoiceNumber('LL-2026-ABC234'), 'INV-2026-ABC234');
  assert.equal(reservationInvoiceNumber(' ll-2026-xyz789 '), 'INV-2026-XYZ789');
  assert.equal(reservationInvoiceNumber(''), '');
  assert.equal(reservationInvoiceNumber('LL-2026-ABC'), '');
  assert.equal(reservationInvoiceNumber('INV-2026-ABC234'), '');
  assert.equal(reservationInvoiceNumber(null), '');
});

test('reservation payment methods map onto ledger methods', async () => {
  const { accountsPaymentMethod } = await load();
  assert.equal(accountsPaymentMethod('BANK_TRANSFER'), 'BANK_TRANSFER');
  assert.equal(accountsPaymentMethod('MOBILE_MONEY'), 'MOBILE_MONEY');
  assert.equal(accountsPaymentMethod('OFFICE_PAYMENT'), 'CASH');
  assert.equal(accountsPaymentMethod('CARD'), 'CASH');
  assert.equal(accountsPaymentMethod(''), 'CASH');
});

test('accounts state follows the reservation and invoice lifecycle', async () => {
  const { accountsStateFor } = await load();
  assert.equal(accountsStateFor('PENDING', null).key, 'WAITING');
  assert.equal(accountsStateFor('CONFIRMED', null).key, 'ATTENTION');
  assert.equal(accountsStateFor('CONFIRMED', { status: 'SENT' }, 0).key, 'INVOICED');
  assert.equal(accountsStateFor('CONFIRMED', { status: 'VOID' }, 0).key, 'ATTENTION');
  assert.equal(accountsStateFor('COMPLETED', { status: 'PAID' }, 1).key, 'SETTLED');
  assert.equal(accountsStateFor('COMPLETED', { status: 'SENT' }, 1).key, 'ATTENTION');
  assert.equal(accountsStateFor('COMPLETED', null, 0).key, 'ATTENTION');
  assert.equal(accountsStateFor('CANCELLED', null).key, 'VOID');
  assert.equal(accountsStateFor('CANCELLED', { status: 'VOID' }).key, 'VOID');
  assert.equal(accountsStateFor('CANCELLED', { status: 'SENT' }).key, 'ATTENTION');
  assert.equal(accountsStateFor('CANCELLED', { status: 'PAID' }).label, 'Refund review');
  assert.equal(accountsStateFor('UNKNOWN', null).key, 'ATTENTION');
});
