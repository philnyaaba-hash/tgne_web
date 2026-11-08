import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { INDUSTRIES, normalizedWebsite } from './growth.js';

const MAX_BYTES = 400_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;

const RESERVED_HOSTS = ['localhost', 'localhost.localdomain'];
const RESERVED_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa', '.test', '.invalid', '.onion'];

const INDUSTRY_KEYWORDS = {
  REAL_ESTATE: ['real estate', 'estate', 'property', 'properties', 'land', 'gated', 'housing', 'homes', 'apartments', 'residential', 'developments'],
  CONSTRUCTION: ['construction', 'civil', 'contractor', 'contractors', 'building', 'engineering', 'roads', 'infrastructure'],
  ARCHITECTURE: ['architect', 'architects', 'architecture', 'planning', 'design studio'],
  LEGAL: ['law', 'legal', 'attorney', 'solicitor', 'chambers', 'advocates'],
  FINANCE: ['bank', 'banking', 'finance', 'financial', 'investment', 'insurance', 'microfinance', 'capital'],
  HOSPITALITY: ['hotel', 'resort', 'hospitality', 'lodge', 'restaurant'],
  RETAIL: ['retail', 'shop', 'store', 'supermarket', 'distribution', 'wholesale'],
  MANUFACTURING: ['manufacturing', 'factory', 'industrial', 'production'],
  TECHNOLOGY: ['software', 'technology', 'tech', 'digital', 'ict', 'systems'],
  LOGISTICS: ['logistics', 'transport', 'shipping', 'freight', 'courier'],
  AGRICULTURE: ['agriculture', 'farm', 'agro', 'agribusiness'],
  GOVERNMENT: ['ministry', 'government', 'municipal', 'agency'],
  NON_PROFIT: ['foundation', 'ngo', 'non-profit', 'nonprofit', 'charity']
};

export function isBlockedAddress(address) {
  const value = String(address || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!value) return true;
  const version = isIP(value);
  if (version === 4) return blockedV4(value);
  if (version === 6) return blockedV6(value);
  return true;
}

function blockedV4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return a >= 224;
}

function blockedV6(address) {
  const value = address.split('%')[0];
  if (value === '::' || value === '::1') return true;
  if (/^f[cd]/.test(value)) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith('ff')) return true;
  if (value.startsWith('2002:') || value.startsWith('2001:0')) return true;
  if (value.startsWith('64:ff9b:')) return true;
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice(7);
    if (isIP(mapped) === 4) return blockedV4(mapped);
    const groups = mapped.split(':');
    if (groups.length === 2) {
      const high = Number.parseInt(groups[0], 16);
      const low = Number.parseInt(groups[1], 16);
      if (Number.isFinite(high) && Number.isFinite(low)) {
        return blockedV4([high >> 8, high & 255, low >> 8, low & 255].join('.'));
      }
    }
  }
  return false;
}

export function assertPublicUrl(value) {
  const candidate = normalizedWebsite(value);
  if (!candidate) throw new Error('Enter a website address that starts with http:// or https://.');
  const url = new URL(candidate);
  if (url.username || url.password) throw new Error('Website links cannot include credentials.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only standard web ports (80 or 443) are supported.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) throw new Error('Enter a valid website address.');
  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new Error('That address is not a public website.');
  } else if (RESERVED_HOSTS.includes(host) || RESERVED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new Error('That address is not a public website.');
  }
  return url;
}

async function assertPublicHost(url, lookup) {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return;
  let resolved;
  try {
    resolved = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error('The website could not be reached.');
  }
  const addresses = Array.isArray(resolved) ? resolved : [resolved];
  if (!addresses.length) throw new Error('The website could not be reached.');
  for (const entry of addresses) {
    if (isBlockedAddress(entry?.address)) throw new Error('That address is not a public website.');
  }
}

function decodeEntities(text) {
  return String(text || '').replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (match, code) => {
    const key = code.toLowerCase();
    if (key === 'amp') return '&';
    if (key === 'lt') return '<';
    if (key === 'gt') return '>';
    if (key === 'quot') return '"';
    if (key === 'apos') return "'";
    if (key === 'nbsp') return ' ';
    const numeric = key.startsWith('#x') ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
    return Number.isFinite(numeric) && numeric > 0 && numeric < 0x10000 ? String.fromCharCode(numeric) : match;
  });
}

function attributes(tag) {
  const result = {};
  const pattern = /([a-z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  let match;
  while ((match = pattern.exec(tag))) {
    result[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '');
  }
  return result;
}

function oneLine(value, max = 400) {
  return decodeEntities(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, max);
}

export function inferIndustry(text) {
  const haystack = String(text || '').toLowerCase();
  let best = '';
  let bestHits = 0;
  for (const [industry, words] of Object.entries(INDUSTRY_KEYWORDS)) {
    let hits = 0;
    for (const word of words) {
      const pattern = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (pattern.test(haystack)) hits += 1;
    }
    if (hits > bestHits) {
      best = industry;
      bestHits = hits;
    }
  }
  return { industry: best, signals: bestHits };
}

export function extractSiteProfile(html, baseUrl) {
  const source = String(html || '');
  const titleMatch = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Match = source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let description = '';
  let keywords = '';
  const social = new Set();
  let hasContactPage = false;
  let hasMailto = false;

  const metaPattern = /<meta\b[^>]*>/gi;
  let meta;
  while ((meta = metaPattern.exec(source))) {
    const attrs = attributes(meta[0]);
    const name = (attrs.name || attrs.property || '').toLowerCase();
    if (!description && (name === 'description' || name === 'og:description')) description = oneLine(attrs.content, 500);
    if (!keywords && name === 'keywords') keywords = oneLine(attrs.content, 300);
  }

  const anchorPattern = /<a\b[^>]*>/gi;
  let anchor;
  while ((anchor = anchorPattern.exec(source))) {
    const href = attributes(anchor[0]).href;
    if (!href) continue;
    if (/^mailto:/i.test(href)) {
      hasMailto = true;
      continue;
    }
    let link;
    try {
      link = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (link.protocol !== 'http:' && link.protocol !== 'https:') continue;
    if (/contact|get-in-touch|reach-us/i.test(link.pathname + link.search)) hasContactPage = true;
    const hostname = link.hostname.replace(/^www\./, '').toLowerCase();
    if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com')) social.add('linkedin');
    if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com')) social.add('facebook');
    if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) social.add('instagram');
    if (hostname === 'x.com' || hostname === 'twitter.com') social.add('x');
  }

  const textSample = decodeEntities(
    source
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim().slice(0, 6000);

  const inference = inferIndustry([titleMatch?.[1], description, keywords, h1Match?.[1], textSample].filter(Boolean).join(' '));

  return {
    finalUrl: String(baseUrl || ''),
    title: oneLine(titleMatch?.[1], 200),
    description: description || '',
    keywords: keywords || '',
    h1: oneLine(h1Match?.[1], 200),
    industry: inference.industry,
    industrySignals: inference.signals,
    hasContactPage,
    hasMailto,
    social: [...social],
    textSample
  };
}

async function readLimited(response, maxBytes) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    return (await response.text()).slice(0, maxBytes);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value.slice(0, maxBytes - size);
      chunks.push(chunk);
      size += chunk.length;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

export async function fetchSiteProfile(value, { fetchImpl = fetch, lookup = dnsLookup, timeoutMs = TIMEOUT_MS, maxBytes = MAX_BYTES } = {}) {
  let url = assertPublicUrl(value);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHost(url, lookup);

    let response;
    try {
      response = await fetchImpl(url.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
          'user-agent': 'LandLedgerSiteCheck/1.0'
        }
      });
    } catch {
      throw new Error('The website could not be reached.');
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The website redirected without a destination.');
      if (hop === MAX_REDIRECTS) throw new Error('The website redirected too many times.');
      url = assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error('The website responded with status ' + response.status + '.');
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error('The link does not point to an HTML page.');
    }
    return extractSiteProfile(await readLimited(response, maxBytes), url.toString());
  }
  throw new Error('The website redirected too many times.');
}

export function buildEnrichmentNote(profile, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  const parts = [];
  if (profile?.title) parts.push(profile.title + '.');
  if (profile?.description) parts.push(profile.description);
  if (profile?.industry && profile.industrySignals >= 2) {
    parts.push('Profile suggests ' + (INDUSTRIES[profile.industry] || profile.industry) + '.');
  }
  if (profile?.hasContactPage) parts.push('A contact page was found.');
  if (!parts.length) parts.push('No descriptive content was found on the homepage.');
  return ('Public website check ' + date + ': ' + parts.join(' ')).slice(0, 900);
}

export function mergeResearchNotes(existing, addition, max = 4000) {
  const combined = [String(existing || '').trim(), String(addition || '').trim()].filter(Boolean).join('\n\n');
  return combined.length > max ? combined.slice(combined.length - max) : combined;
}
