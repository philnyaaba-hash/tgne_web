'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let modules;

async function load() {
  if (!modules) {
    modules = {
      intents: await import('../lib/assistant/intents.js'),
      data: await import('../lib/assistant/data.js'),
      answers: await import('../lib/assistant/answers.js'),
      engine: await import('../lib/assistant/index.js')
    };
  }
  return modules;
}

const NOW = new Date(2026, 10, 5, 14, 30);

test('parses topics and ranges from natural questions', async () => {
  const { parseQuestion } = await load().then((loaded) => loaded.intents);

  assert.deepEqual(pick(parseQuestion('Who is on site right now?')), { topic: 'visitors', range: 'today' });
  assert.deepEqual(pick(parseQuestion('How much did we collect this month?')), { topic: 'finance', range: 'month' });
  assert.deepEqual(pick(parseQuestion('Any overdue field tasks?')), { topic: 'survey', range: 'all' });
  assert.deepEqual(pick(parseQuestion('How many staff do we have?')), { topic: 'staff', range: 'all' });
  assert.deepEqual(pick(parseQuestion('What changed this week?')), { topic: 'audit', range: 'week' });
  assert.deepEqual(pick(parseQuestion('Am I clocked in?')), { topic: 'attendance', range: 'today' });
  assert.deepEqual(pick(parseQuestion('Who is in today?')), { topic: 'attendance', range: 'today' });
  assert.deepEqual(pick(parseQuestion('Give me a workspace overview')), { topic: 'overview', range: 'today' });
  assert.deepEqual(pick(parseQuestion('hello')), { topic: 'help', range: 'today' });
});

test('filters capabilities and suggestions by office permissions', async () => {
  const { canUseTopic, assistantStatus } = await load().then((loaded) => loaded.intents);
  const user = { name: 'Ama Boateng', permissions: ['visitors.view', 'attendance.view'] };

  assert.equal(canUseTopic(user, 'visitors'), true);
  assert.equal(canUseTopic(user, 'attendance'), true);
  assert.equal(canUseTopic(user, 'overview'), true);
  assert.equal(canUseTopic(user, 'finance'), false);
  assert.equal(canUseTopic(user, 'staff'), false);

  const status = assistantStatus(user);
  assert.match(status.greeting, /Hi Ama/);
  assert.deepEqual(status.capabilities.map((entry) => entry.key), ['visitors', 'attendance', 'overview']);
  assert.ok(status.suggestions.some((suggestion) => /on site/i.test(suggestion)));
  assert.ok(!status.suggestions.some((suggestion) => /outstanding/i.test(suggestion)));

  const limited = assistantStatus({ name: 'Kofi', permissions: [] });
  assert.deepEqual(limited.capabilities.map((entry) => entry.key), ['attendance', 'overview']);
});

test('builds calendar ranges from a fixed date', async () => {
  const { rangeBounds } = await load().then((loaded) => loaded.data);

  const today = rangeBounds('today', NOW);
  assert.equal(today.from.getDate(), 5);
  assert.equal(today.from.getHours(), 0);
  assert.equal(today.to.getDate(), 5);
  assert.equal(today.label, 'today');

  const week = rangeBounds('week', NOW);
  assert.equal(week.from.getDay(), 1);
  assert.equal(week.from.getDate(), 2);

  const month = rangeBounds('month', NOW);
  assert.equal(month.from.getDate(), 1);
  assert.equal(month.from.getMonth(), 10);

  const year = rangeBounds('year', NOW);
  assert.equal(year.from.getMonth(), 0);
  assert.equal(year.from.getDate(), 1);

  assert.equal(rangeBounds('all', NOW).from, null);
});

test('formats counts, money, and attendance answers', async () => {
  const { formatCount, formatMoney, attendanceAnswer } = await load().then((loaded) => loaded.answers);

  assert.equal(formatCount(1, 'visit'), '1 visit');
  assert.equal(formatCount(2, 'visit'), '2 visits');
  assert.equal(formatMoney(1234.5), 'GH₵ 1,234.50');

  const answer = attendanceAnswer({
    canViewAll: false,
    label: 'today',
    range: 'today',
    myRecord: { status: 'LATE', checkInAt: new Date(2026, 10, 5, 8, 5), checkOutAt: null }
  });
  assert.equal(answer, 'You are clocked in since 08:05 (late).');
});

test('formats a visitor snapshot with names and counts', async () => {
  const { visitorAnswer } = await load().then((loaded) => loaded.answers);
  const answer = visitorAnswer({
    label: 'today',
    insideCount: 2,
    inside: [{ visitor: { fullName: 'Ama Mensah' }, host: { name: 'Kofi Boateng' }, checkedInAt: new Date(2026, 10, 5, 9, 12) }],
    awaitingCount: 1,
    awaiting: [{ visitor: { fullName: 'Yaw Owusu' }, host: null }],
    overdueCount: 0,
    rangeTotal: 5,
    statuses: { CHECKED_IN: 2, CHECKED_OUT: 3 }
  });

  assert.match(answer, /2 visitors on site right now/);
  assert.match(answer, /Ama Mensah — host Kofi Boateng, in since 09:12/);
  assert.match(answer, /…and 1 more\./);
  assert.match(answer, /1 visit awaiting approval/);
  assert.match(answer, /5 visits recorded today/);
});

test('restricted topics never touch the database', async () => {
  const { answerQuestion } = await load().then((loaded) => loaded.engine);
  const explodingDb = new Proxy({}, { get() { throw new Error('database should not be queried'); } });
  const result = await answerQuestion({
    question: 'What is outstanding?',
    user: { id: 'u1', name: 'Ama', permissions: ['attendance.view'] },
    db: explodingDb,
    now: NOW
  });

  assert.equal(result.data.restricted, true);
  assert.match(result.answer, /does not include access to finance desk/i);
});

test('answers visitor questions from a stubbed database', async () => {
  const { answerQuestion } = await load().then((loaded) => loaded.engine);
  const db = {
    visit: {
      count: async ({ where }) => {
        if (where.expectedCheckout) return 0;
        if (where.status === 'CHECKED_IN') return 2;
        if (where.status === 'AWAITING_APPROVAL') return 1;
        return 5;
      },
      findMany: async ({ where }) => where.status === 'CHECKED_IN'
        ? [{ visitor: { fullName: 'Ama Mensah' }, host: { name: 'Kofi Boateng' }, checkedInAt: new Date(2026, 10, 5, 9, 12) }]
        : [{ visitor: { fullName: 'Yaw Owusu' }, host: null, createdAt: new Date(2026, 10, 5, 10, 0) }],
      groupBy: async () => [{ status: 'CHECKED_IN', _count: { _all: 2 } }, { status: 'CHECKED_OUT', _count: { _all: 3 } }]
    }
  };

  const result = await answerQuestion({
    question: 'Who is on site?',
    user: { id: 'u1', name: 'Ama', permissions: ['visitors.view'] },
    db,
    now: NOW
  });

  assert.equal(result.topic, 'visitors');
  assert.equal(result.generatedBy, 'local');
  assert.match(result.answer, /2 visitors on site right now/);
  assert.match(result.answer, /1 visit awaiting approval/);
  assert.deepEqual(result.suggestions.slice(0, 1), ['Who is on site right now?']);
});

test('LLM adapter keeps the same answer contract', async () => {
  const { createLlmAdapter } = await load().then((loaded) => loaded.engine);
  const adapter = createLlmAdapter({
    model: 'test-model',
    buildContext: async () => ({ visitsToday: 5 }),
    complete: async ({ prompt }) => {
      assert.match(prompt, /visitsToday/);
      return 'There were 5 visits today.';
    }
  });

  const result = await adapter.answer({ question: 'How many visits today?', user: { permissions: [] }, db: {}, now: NOW });
  assert.equal(result.answer, 'There were 5 visits today.');
  assert.equal(result.generatedBy, 'test-model');
});

test('parses client and storefront pipeline questions', async () => {
  const { parseQuestion } = await load().then((loaded) => loaded.intents);

  assert.deepEqual(pick(parseQuestion('How many clients do we have?')), { topic: 'clients', range: 'month' });
  assert.deepEqual(pick(parseQuestion('Any new buyers this month?')), { topic: 'clients', range: 'month' });
  assert.deepEqual(pick(parseQuestion('How many holdings are tracked?')), { topic: 'clients', range: 'month' });
  assert.deepEqual(pick(parseQuestion('How is the reservation pipeline?')), { topic: 'pipeline', range: 'week' });
  assert.deepEqual(pick(parseQuestion('Any new reservations this week?')), { topic: 'pipeline', range: 'week' });
  assert.deepEqual(pick(parseQuestion('How many listings are published?')), { topic: 'pipeline', range: 'week' });
});

test('exposes route prompts only for permitted client and pipeline topics', async () => {
  const { canUseTopic, assistantStatus } = await load().then((loaded) => loaded.intents);
  const user = { name: 'Ama', permissions: ['client.view'] };

  assert.equal(canUseTopic(user, 'clients'), true);
  assert.equal(canUseTopic(user, 'pipeline'), false);

  const status = assistantStatus(user);
  assert.deepEqual(status.prompts.clients, [
    'How many clients do we have?',
    'Any new clients this month?',
    'How many holdings are tracked?'
  ]);
  assert.equal(status.prompts.pipeline, undefined);
  assert.equal(status.prompts.visitors, undefined);
});

test('formats client and pipeline answers', async () => {
  const { clientAnswer, pipelineAnswer } = await load().then((loaded) => loaded.answers);

  const client = clientAnswer({
    label: 'this month',
    total: 12,
    newClients: 3,
    holdings: 20,
    linkedReservations: 5,
    regions: [{ name: 'Greater Accra', count: 7 }]
  });
  assert.match(client, /12 clients on record, holding 20 land holdings\./);
  assert.match(client, /3 new clients this month\./);
  assert.match(client, /5 reservations linked to client files\./);
  assert.match(client, /Greater Accra 7\./);

  const pipeline = pipelineAnswer({
    label: 'this week',
    reservations: { PENDING: 2, CONFIRMED: 1, COMPLETED: 4, CANCELLED: 1 },
    pendingValue: 45000,
    newReservations: 3,
    inquiries: { NEW: 5 },
    published: 8,
    featured: 2
  });
  assert.match(pipeline, /2 awaiting payment, 1 confirmed, 4 completed, 1 cancelled\./);
  assert.match(pipeline, /GH₵ 45,000\.00 awaiting payment\./);
  assert.match(pipeline, /3 new reservations this week\./);
  assert.match(pipeline, /5 new inquiries from the storefront\./);
  assert.match(pipeline, /8 published listings \(2 featured\)\./);
});

test('answers client questions from a stubbed database', async () => {
  const { answerQuestion } = await load().then((loaded) => loaded.engine);
  const db = {
    clientProfile: {
      count: async (arg) => (arg && arg.where && arg.where.createdAt ? 3 : 12),
      groupBy: async () => [{ region: 'Greater Accra', _count: { _all: 7 } }]
    },
    landHolding: { count: async () => 20 },
    landReservation: { count: async () => 5 }
  };

  const result = await answerQuestion({
    question: 'How many clients do we have?',
    user: { id: 'u1', name: 'Ama', permissions: ['client.view'] },
    db,
    now: NOW
  });

  assert.equal(result.topic, 'clients');
  assert.match(result.answer, /12 clients on record/);
  assert.match(result.answer, /3 new clients this month/);
  assert.deepEqual(result.suggestions.slice(0, 1), ['How many clients do we have?']);
});

test('answers pipeline questions from a stubbed database', async () => {
  const { answerQuestion } = await load().then((loaded) => loaded.engine);
  const db = {
    landReservation: {
      groupBy: async () => [{ status: 'PENDING', _count: { _all: 2 } }, { status: 'CONFIRMED', _count: { _all: 1 } }],
      aggregate: async () => ({ _sum: { amount: 45000 } }),
      count: async () => 3
    },
    landInquiry: { groupBy: async () => [{ status: 'NEW', _count: { _all: 5 } }] },
    landListing: { count: async ({ where }) => (where && where.featured ? 2 : 8) }
  };

  const result = await answerQuestion({
    question: 'How is the reservation pipeline?',
    user: { id: 'u1', name: 'Ama', permissions: ['land.view'] },
    db,
    now: NOW
  });

  assert.equal(result.topic, 'pipeline');
  assert.match(result.answer, /2 awaiting payment, 1 confirmed, 0 completed\./);
  assert.match(result.answer, /GH₵ 45,000\.00 awaiting payment\./);
});

test('restricted pipeline topics never touch the database', async () => {
  const { answerQuestion } = await load().then((loaded) => loaded.engine);
  const explodingDb = new Proxy({}, { get() { throw new Error('database should not be queried'); } });

  const result = await answerQuestion({
    question: 'How is the reservation pipeline?',
    user: { id: 'u1', name: 'Ama', permissions: [] },
    db: explodingDb,
    now: NOW
  });

  assert.equal(result.data.restricted, true);
  assert.match(result.answer, /does not include access to land storefront/i);
});

function pick(parsed) {
  return { topic: parsed.topic, range: parsed.range };
}
