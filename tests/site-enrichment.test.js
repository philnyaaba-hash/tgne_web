'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let enrichment;

async function load() {
  if (!enrichment) enrichment = await import('../lib/site-enrichment.js');
  return enrichment;
}

const PUBLIC_LOOKUP = async () => [{ address: '93.184.216.34', family: 4 }];

test('private, loopback, link-local, and reserved addresses are blocked', async () => {
  const { isBlockedAddress } = await load();
  for (const address of [
    '127.0.0.1', '10.1.2.3', '172.20.1.1', '192.168.1.1', '169.254.169.254',
    '0.0.0.0', '100.64.0.1', '224.0.0.1', '::1', 'fd00::1', 'fe80::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1'
  ]) {
    assert.equal(isBlockedAddress(address), true, address + ' should be blocked');
  }
  for (const address of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111']) {
    assert.equal(isBlockedAddress(address), false, address + ' should be allowed');
  }
});

test('only plain public http(s) URLs are accepted', async () => {
  const { assertPublicUrl } = await load();
  assert.equal(assertPublicUrl('https://adom.example').hostname, 'adom.example');
  assert.equal(assertPublicUrl('adom.example').protocol, 'https:');

  for (const value of [
    'ftp://adom.example', 'http://user:pass@adom.example', 'http://localhost',
    'http://app.local', 'http://127.0.0.1', 'http://[::1]', 'http://10.0.0.5',
    'https://adom.example:8080'
  ]) {
    assert.throws(() => assertPublicUrl(value), /public website|credentials|standard web ports|starts with/, value);
  }
});

test('homepage profile extracts summary, contact and industry signals without emails', async () => {
  const { extractSiteProfile } = await load();
  const html = `<!doctype html><html><head>
    <title>Adom Estates | Gated Communities in Accra</title>
    <meta name="description" content="Adom Estates develops gated housing and residential land across Greater Accra." />
    <meta name="keywords" content="real estate, property, land" />
  </head><body>
    <h1>Adom Estates</h1>
    <a href="/contact-us">Contact us</a>
    <a href="https://www.linkedin.com/company/adom">LinkedIn</a>
    <a href="mailto:hello@adom.example">Email</a>
    <p>We build homes and apartments for families in Accra.</p>
  </body></html>`;
  const profile = extractSiteProfile(html, 'https://adom.example/');

  assert.equal(profile.title, 'Adom Estates | Gated Communities in Accra');
  assert.match(profile.description, /gated housing/);
  assert.equal(profile.industry, 'REAL_ESTATE');
  assert.ok(profile.industrySignals >= 2);
  assert.equal(profile.hasContactPage, true);
  assert.equal(profile.hasMailto, true);
  assert.deepEqual(profile.social, ['linkedin']);
  assert.ok(!JSON.stringify(profile).includes('hello@adom.example'));
});

test('fetch follows only public redirects and refuses non-HTML responses', async () => {
  const { fetchSiteProfile } = await load();

  const redirected = [];
  const redirectFetch = async (url) => {
    redirected.push(url);
    return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } });
  };
  await assert.rejects(
    () => fetchSiteProfile('https://adom.example', { fetchImpl: redirectFetch, lookup: PUBLIC_LOOKUP }),
    /public website/
  );
  assert.equal(redirected.length, 1);

  const binaryFetch = async () => new Response('%PDF-1.4', { status: 200, headers: { 'content-type': 'application/pdf' } });
  await assert.rejects(
    () => fetchSiteProfile('https://adom.example', { fetchImpl: binaryFetch, lookup: PUBLIC_LOOKUP }),
    /HTML page/
  );
});

test('hosts that resolve to private addresses are rejected before any request', async () => {
  const { fetchSiteProfile } = await load();
  let requested = 0;
  await assert.rejects(
    () => fetchSiteProfile('https://internal.example', {
      fetchImpl: async () => { requested += 1; return new Response('ok'); },
      lookup: async () => [{ address: '10.0.0.5', family: 4 }]
    }),
    /public website/
  );
  assert.equal(requested, 0);
});

test('website check fills a profile and keeps research notes bounded', async () => {
  const { fetchSiteProfile, buildEnrichmentNote, mergeResearchNotes } = await load();
  const html = '<html><head><title>Adom Estates</title><meta name="description" content="Property developer in Accra." /></head><body>Real estate and land development.</body></html>';
  const profile = await fetchSiteProfile('https://adom.example', {
    fetchImpl: async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }),
    lookup: PUBLIC_LOOKUP
  });
  assert.equal(profile.title, 'Adom Estates');
  assert.equal(profile.industry, 'REAL_ESTATE');

  const note = buildEnrichmentNote(profile, new Date('2026-11-06T12:00:00Z'));
  assert.match(note, /^Public website check 2026-11-06:/);
  assert.match(note, /Adom Estates/);

  const merged = mergeResearchNotes('x'.repeat(4000), note, 4000);
  assert.equal(merged.length, 4000);
  assert.ok(merged.endsWith(note));
});
