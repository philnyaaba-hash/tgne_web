'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let growth;

async function load() {
  if (!growth) growth = await import('../lib/growth.js');
  return growth;
}

const SECRET = 'growth-test-secret-value-at-least-32-chars';

function prospect(overrides = {}) {
  return {
    id: 'prospect_123456789',
    company: 'Adom Estates',
    contactName: 'Kwame Mensah',
    email: 'kwame@adom.example',
    phone: '+233 20 000 0000',
    website: 'https://adom.example',
    location: 'Greater Accra',
    industry: 'REAL_ESTATE',
    stage: 'RESEARCHED',
    consentStatus: 'GRANTED',
    consentPurpose: 'MARKETING',
    consentAt: new Date('2026-10-01T12:00:00Z'),
    consentEvidence: 'Signed enquiry form',
    suppressed: false,
    researchNotes: 'Expanding into gated communities across Accra with three new sites planned for 2027.',
    ...overrides
  };
}

function target(overrides = {}) {
  return {
    industries: ['REAL_ESTATE', 'CONSTRUCTION'],
    regions: ['Greater Accra', 'Ashanti'],
    minimumScore: 50,
    ...overrides
  };
}

test('scoring rewards a complete target-profile record', async () => {
  const { scoreProspect } = await load();
  const result = scoreProspect(prospect(), target());
  assert.equal(result.score, 100);
  assert.equal(result.band, 'HIGH');
  assert.equal(result.reasons.reduce((total, reason) => total + reason.points, 0), result.score);
  assert.ok(result.reasons.every((reason) => reason.label && reason.max > 0));
});

test('scoring explains gaps instead of guessing', async () => {
  const { scoreProspect } = await load();
  const result = scoreProspect(
    prospect({ industry: 'RETAIL', location: 'Volta', email: 'not-an-email', phone: null, website: '', researchNotes: '' }),
    target()
  );
  assert.equal(result.band, 'LOW');
  assert.equal(result.score, 8 + 8);
  const contact = result.reasons.find((reason) => reason.key === 'contact');
  assert.equal(contact.points, 0);
  assert.match(contact.detail, /email/i);
});

test('eligibility requires explicit marketing consent and a usable email', async () => {
  const { outreachEligibility } = await load();
  assert.equal(outreachEligibility(prospect()).eligible, true);

  const noConsent = outreachEligibility(prospect({ consentStatus: 'UNKNOWN' }));
  assert.equal(noConsent.eligible, false);
  assert.ok(noConsent.reasons.some((reason) => /consent/i.test(reason)));

  const wrongPurpose = outreachEligibility(prospect({ consentPurpose: 'SERVICE' }));
  assert.equal(wrongPurpose.eligible, false);
  assert.ok(wrongPurpose.reasons.some((reason) => /marketing/i.test(reason)));

  const suppressed = outreachEligibility(prospect({ suppressed: true }));
  assert.equal(suppressed.eligible, false);
  assert.ok(suppressed.reasons.some((reason) => /do-not-contact/i.test(reason)));

  const closed = outreachEligibility(prospect({ stage: 'LOST', suppressed: true }));
  assert.equal(closed.eligible, false);

  const noEmail = outreachEligibility(prospect({ email: '' }));
  assert.equal(noEmail.eligible, false);
});

test('unsubscribe tokens round-trip and reject tampering', async () => {
  const { unsubscribeToken, verifyUnsubscribeToken } = await load();
  const token = unsubscribeToken('prospect_123456789', { secret: SECRET });
  assert.match(token, /\./);
  assert.equal(verifyUnsubscribeToken(token, { secret: SECRET }), 'prospect_123456789');
  assert.equal(verifyUnsubscribeToken(token + 'x', { secret: SECRET }), '');
  assert.equal(verifyUnsubscribeToken(token, { secret: SECRET + 'other' }), '');
  assert.equal(unsubscribeToken('prospect_123456789', { secret: 'too-short' }), '');
});

test('list import de-duplicates by email and falls back to company and contact', async () => {
  const { dedupeProspects } = await load();
  const rows = [
    { company: 'Adom', contactName: 'K', email: 'K@Adom.Example' },
    { company: 'Other', contactName: 'A', email: 'k@adom.example' },
    { company: 'No Mail', contactName: 'N' },
    { company: 'No Mail', contactName: 'N' }
  ];
  const result = dedupeProspects(rows);
  assert.equal(result.unique.length, 2);
  assert.equal(result.duplicates.length, 2);
});

test('campaign email personalises, escapes content, and includes an unsubscribe header', async () => {
  const { buildCampaignEmail } = await load();
  const email = buildCampaignEmail({
    campaign: {
      subject: 'A site for {{company}}',
      body: 'Hello {{contactName}},\n\n<script>alert(1)</script>'
    },
    prospect: prospect(),
    org: { name: 'Asante Land Company', legalName: 'Asante Land Company Limited', address: 'Accra', email: 'hello@asanteland.example', brandColor: '#125b38' },
    unsubscribeUrl: 'https://land.example/unsubscribe?token=abc'
  });
  assert.equal(email.to, 'kwame@adom.example');
  assert.equal(email.subject, 'A site for Adom Estates');
  assert.match(email.html, /Hello Kwame Mensah/);
  assert.ok(!email.html.includes('<script>'));
  assert.match(email.html, /Unsubscribe from these emails/);
  assert.match(email.headers['List-Unsubscribe'], /unsubscribe\?token=abc/);
  assert.match(email.headers['List-Unsubscribe'], /mailto:hello@asanteland\.example/);
  assert.match(email.text, /Unsubscribe: https:\/\/land\.example/);
});

test('audience filtering and statistics only count eligible records', async () => {
  const { campaignAudience, growthStats } = await load();
  const prospects = [
    { ...prospect({ id: 'one' }), score: 80, scoreBand: 'HIGH' },
    { ...prospect({ id: 'two', email: 'two@adom.example', consentStatus: 'UNKNOWN' }), score: 90, scoreBand: 'HIGH' },
    { ...prospect({ id: 'three', email: 'three@adom.example', suppressed: true }), score: 70, scoreBand: 'HIGH' }
  ];
  const audience = campaignAudience(prospects, { minScore: 50 });
  assert.deepEqual(audience.map((item) => item.id), ['one']);

  const stats = growthStats(prospects, [{ status: 'SENT' }, { status: 'DRAFT' }]);
  assert.equal(stats.total, 3);
  assert.equal(stats.eligible, 1);
  assert.equal(stats.highIntent, 3);
  assert.equal(stats.suppressed, 1);
  assert.equal(stats.needsConsent, 1);
  assert.equal(stats.sentCampaigns, 1);
});

test('replies stop automated campaigns so follow-up stays personal', async () => {
  const { outreachEligibility, campaignAudience, nextAction } = await load();
  const replied = { ...prospect(), repliedAt: new Date('2026-10-20T12:00:00Z'), stage: 'RESPONDED', score: 90 };

  const eligibility = outreachEligibility(replied);
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.reasons.some((reason) => /replied/i.test(reason)));
  assert.match(nextAction(replied), /personally/i);
  assert.equal(campaignAudience([replied], { minScore: 0 }).length, 0);
});

test('next action reflects consent and pipeline state', async () => {
  const { nextAction } = await load();
  assert.match(nextAction(prospect({ consentStatus: 'UNKNOWN' })), /consent/i);
  assert.match(nextAction(prospect({ stage: 'QUALIFIED' })), /proposal/i);
  assert.match(nextAction(prospect({ suppressed: true })), /do-not-contact/i);
});
