'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

let modulePromise;

async function limiter() {
  if (!modulePromise) modulePromise = import('../lib/rate-limit.mjs');
  return modulePromise;
}

beforeEach(async () => {
  (await limiter()).resetRateLimits();
});

test('allows requests up to the limit, then blocks with Retry-After', async () => {
  const { checkRateLimit } = await limiter();
  const now = 1_000_000;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = checkRateLimit('login:203.0.113.9', { limit: 3, windowMs: 60_000, now });
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 2 - attempt);
  }
  const blocked = checkRateLimit('login:203.0.113.9', { limit: 3, windowMs: 60_000, now });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfter, 60);
});

test('resets the quota when the window expires', async () => {
  const { checkRateLimit } = await limiter();
  assert.equal(checkRateLimit('verify', { limit: 1, windowMs: 1000, now: 1000 }).allowed, true);
  assert.equal(checkRateLimit('verify', { limit: 1, windowMs: 1000, now: 1500 }).allowed, false);
  assert.equal(checkRateLimit('verify', { limit: 1, windowMs: 1000, now: 2000 }).allowed, true);
});

test('tracks independent keys separately', async () => {
  const { checkRateLimit } = await limiter();
  const now = 500;
  assert.equal(checkRateLimit('a', { limit: 1, windowMs: 1000, now }).allowed, true);
  assert.equal(checkRateLimit('a', { limit: 1, windowMs: 1000, now }).allowed, false);
  assert.equal(checkRateLimit('b', { limit: 1, windowMs: 1000, now }).allowed, true);
});

test('rejects invalid limiter configuration', async () => {
  const { checkRateLimit } = await limiter();
  assert.throws(() => checkRateLimit('x', { limit: 0, windowMs: 1000 }), /positive/);
  assert.throws(() => checkRateLimit('x', { limit: 1, windowMs: 0 }), /positive/);
});

test('reads the first forwarded address, then falls back to x-real-ip', async () => {
  const { clientIp } = await limiter();
  const forwarded = {
    headers: { get: (name) => (name === 'x-forwarded-for' ? '203.0.113.5, 10.0.0.1' : null) }
  };
  assert.equal(clientIp(forwarded), '203.0.113.5');

  const real = {
    headers: { get: (name) => (name === 'x-real-ip' ? '198.51.100.7' : null) }
  };
  assert.equal(clientIp(real), '198.51.100.7');

  assert.equal(clientIp({ headers: { get: () => null } }), 'unknown');
  assert.equal(clientIp(undefined), 'unknown');
});
