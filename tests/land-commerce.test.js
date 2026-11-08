'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let commerce;

async function load() {
  if (!commerce) commerce = await import('../lib/land-commerce.js');
  return commerce;
}

function listingInput(overrides = {}) {
  return {
    title: 'Adenta Ridge residential plots',
    region: 'Greater Accra',
    district: 'Adenta Municipal',
    community: 'Adenta Ridge',
    landType: 'RESIDENTIAL',
    titleStatus: 'REGISTERED',
    status: 'PUBLISHED',
    sizeAcres: 0.5,
    price: 250000,
    summary: 'Serviced residential plots on a graded road.',
    description: 'A compact release of plots on the Adenta ridge with drainage and concrete corner pillars along the access road.',
    highlights: ['Registered title', 'Graded access road'],
    imageUrls: ['/assets/land/residential.png'],
    ...overrides
  };
}

test('listing filters default and clamp unsafe values', async () => {
  const { parseListingFilters } = await load();
  const filters = parseListingFilters({ landType: 'residential', sort: 'price_asc', page: '0', pageSize: '500' });
  assert.equal(filters.landType, 'RESIDENTIAL');
  assert.equal(filters.sort, 'price_asc');
  assert.equal(filters.page, 1);
  assert.equal(filters.pageSize, 24);

  const invalid = parseListingFilters({ landType: 'SPACE', sort: 'random', minPrice: '-5', maxAcres: 'lots' });
  assert.equal(invalid.landType, '');
  assert.equal(invalid.sort, 'featured');
  assert.equal(invalid.minPrice, null);
  assert.equal(invalid.maxAcres, null);

  const defaults = parseListingFilters({});
  assert.equal(defaults.pageSize, 9);
  assert.equal(defaults.minPrice, null);
  assert.equal(defaults.maxPrice, null);
  assert.equal(defaults.minAcres, null);

  const odd = parseListingFilters({ pageSize: 'abc' });
  assert.equal(odd.pageSize, 9);
});

test('listing where clause only exposes published records', async () => {
  const { parseListingFilters, buildListingWhere } = await load();
  const where = buildListingWhere(parseListingFilters({
    q: 'adenta',
    region: 'Greater Accra',
    landType: 'RESIDENTIAL',
    minPrice: '100000',
    maxPrice: '300000',
    minAcres: '0.2'
  }));
  assert.equal(where.status, 'PUBLISHED');
  assert.equal(where.region, 'Greater Accra');
  assert.equal(where.landType, 'RESIDENTIAL');
  assert.deepEqual(where.price, { gte: 100000, lte: 300000 });
  assert.deepEqual(where.sizeAcres, { gte: 0.2 });
  assert.equal(where.OR.length, 5);
  assert.deepEqual(where.OR[0], { title: { contains: 'adenta', mode: 'insensitive' } });
});

test('sort options map to stable Prisma order clauses', async () => {
  const { listingOrderBy } = await load();
  assert.deepEqual(listingOrderBy('newest'), [{ publishedAt: 'desc' }]);
  assert.deepEqual(listingOrderBy('price_asc'), [{ price: 'asc' }]);
  assert.deepEqual(listingOrderBy('size_desc'), [{ sizeAcres: 'desc' }]);
  assert.deepEqual(listingOrderBy('anything'), [{ featured: 'desc' }, { verified: 'desc' }, { publishedAt: 'desc' }]);
});

test('reservation fee is five percent with a two thousand cedi floor', async () => {
  const { reservationAmount } = await load();
  assert.equal(reservationAmount(220000), 11000);
  assert.equal(reservationAmount(145000), 7300);
  assert.equal(reservationAmount(30000), 2000);
  assert.equal(reservationAmount(0), 2000);
  assert.equal(reservationAmount('nope'), 2000);
});

test('reservation references are readable and deterministic from supplied bytes', async () => {
  const { reservationReference } = await load();
  const reference = reservationReference(new Date('2026-03-01T00:00:00Z'), () => Uint8Array.from([0, 1, 2, 3, 4, 5]));
  assert.equal(reference, 'LL-2026-234567');
  assert.match(reference, /^LL-\d{4}-[A-Z0-9]{6}$/);
});

test('reservation validation rejects missing consent and honeypot hits', async () => {
  const { validateReservation } = await load();
  const good = validateReservation({
    buyerName: 'Ama Owusu',
    email: 'Ama@Example.com',
    phone: '+233 24 000 0000',
    paymentMethod: 'MOBILE_MONEY',
    consent: true
  });
  assert.equal(good.ok, true);
  assert.equal(good.value.email, 'ama@example.com');
  assert.equal(good.value.note, '');

  const bad = validateReservation({ buyerName: 'A', email: 'nope', phone: '12', paymentMethod: 'CARD', consent: false, website: 'spam' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.buyerName);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.phone);
  assert.ok(bad.errors.paymentMethod);
  assert.ok(bad.errors.consent);
  assert.ok(bad.errors.form);
});

test('inquiry validation checks type and message length', async () => {
  const { validateInquiry } = await load();
  const good = validateInquiry({ name: 'Kofi Mensah', email: 'kofi@example.com', message: 'I would like to visit the Adenta site this week.', type: 'VIEWING' });
  assert.equal(good.ok, true);
  assert.equal(good.value.type, 'VIEWING');
  assert.equal(good.value.phone, null);

  const bad = validateInquiry({ name: 'K', email: 'x', message: 'short', type: 'SPAM' });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.message);
  assert.ok(bad.errors.type);
});

test('listing validation accepts a complete record', async () => {
  const { validateListing } = await load();
  const result = validateListing(listingInput({ price: '250000.4', sizeAcres: '0.5' }));
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.value.price, 250000);
  assert.equal(result.value.sizeAcres, 0.5);
  assert.equal(result.value.community, 'Adenta Ridge');
  assert.equal(result.value.featured, false);
});

test('listing validation rejects weak copy, bad enums and foreign image paths', async () => {
  const { validateListing } = await load();
  const result = validateListing(listingInput({
    title: 'Land',
    landType: 'SPACE',
    titleStatus: 'UNKNOWN',
    status: 'LIVE',
    sizeAcres: 0,
    price: -1,
    summary: 'too short',
    description: 'too short',
    imageUrls: [
      '/assets/land/residential.png',
      'https://res.cloudinary.com/ea91sdts/image/upload/v1793384456/portrait-african-american-employee-answering-email-laptop-working-website-report-office-entrepreneur-analyzing-paperwork-research-computer-doing-internet-research.jpg',
      'https://cdn.example.com/plot.png',
      '/assets/land/bad name.png'
    ]
  }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.title);
  assert.ok(result.errors.landType);
  assert.ok(result.errors.titleStatus);
  assert.ok(result.errors.status);
  assert.ok(result.errors.sizeAcres);
  assert.ok(result.errors.price);
  assert.ok(result.errors.summary);
  assert.ok(result.errors.description);
  assert.deepEqual(result.value.imageUrls, [
    '/assets/land/residential.png',
    'https://res.cloudinary.com/ea91sdts/image/upload/v1793384456/portrait-african-american-employee-answering-email-laptop-working-website-report-office-entrepreneur-analyzing-paperwork-research-computer-doing-internet-research.jpg'
  ]);
});

test('listing validation caps image and highlight counts', async () => {
  const { validateListing } = await load();
  const images = [];
  for (let index = 0; index < 10; index += 1) images.push('/assets/land/plot-' + index + '.png');
  const highlights = [];
  for (let index = 0; index < 15; index += 1) highlights.push('Highlight ' + index);
  const result = validateListing(listingInput({ imageUrls: images, highlights }));
  assert.equal(result.ok, true);
  assert.equal(result.value.imageUrls.length, 8);
  assert.equal(result.value.highlights.length, 10);
});

test('formatting helpers stay deterministic', async () => {
  const { formatGhs, formatAcres, slugify, labelFor, LAND_TYPES } = await load();
  assert.equal(formatGhs(220000), 'GH₵ 220,000');
  assert.equal(formatGhs('nope'), 'GH₵ 0');
  assert.equal(formatAcres(1), '1 acre');
  assert.equal(formatAcres(2.5), '2.5 acres');
  assert.equal(formatAcres(0), '—');
  assert.equal(slugify('  Adenta Ridge — plots  '), 'adenta-ridge-plots');
  assert.equal(labelFor(LAND_TYPES, 'MIXED_USE'), 'Mixed use');
  assert.equal(labelFor(LAND_TYPES, 'SPACE'), '');
});
