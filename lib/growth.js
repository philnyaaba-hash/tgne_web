import { createHmac, timingSafeEqual } from 'node:crypto';
import { escapeHtml, isEmail } from './validation.js';
import { GHANA_REGIONS } from './ghana-regions.js';

export { GHANA_REGIONS };

export const PROSPECT_STAGES = {
  NEW: 'New',
  RESEARCHED: 'Researched',
  CONTACTED: 'Contacted',
  RESPONDED: 'Replied',
  QUALIFIED: 'Qualified',
  NEGOTIATION: 'In negotiation',
  WON: 'Won',
  LOST: 'Lost',
  SUPPRESSED: 'Suppressed'
};

export const PROSPECT_SOURCES = {
  MANUAL: 'Added manually',
  REFERRAL: 'Referral',
  WEBSITE: 'Website enquiry',
  EVENT: 'Event or exhibition',
  PARTNER: 'Partner introduction',
  PUBLIC_REGISTER: 'Public register',
  EXISTING_CLIENT: 'Existing client',
  IMPORT: 'List import'
};

export const CONSENT_STATUSES = {
  UNKNOWN: 'Not recorded',
  PENDING: 'Requested',
  GRANTED: 'Granted',
  WITHDRAWN: 'Withdrawn'
};

export const LAWFUL_BASES = {
  CONSENT: 'Consent',
  LEGITIMATE_INTEREST: 'Legitimate interest',
  CONTRACT: 'Contract'
};

export const INDUSTRIES = {
  REAL_ESTATE: 'Real estate & land development',
  CONSTRUCTION: 'Construction & civil works',
  ARCHITECTURE: 'Architecture & planning',
  LEGAL: 'Legal services',
  FINANCE: 'Banking & finance',
  HOSPITALITY: 'Hospitality',
  RETAIL: 'Retail & distribution',
  MANUFACTURING: 'Manufacturing',
  TECHNOLOGY: 'Technology',
  LOGISTICS: 'Logistics & transport',
  AGRICULTURE: 'Agriculture',
  GOVERNMENT: 'Government agency',
  NON_PROFIT: 'Non-profit',
  OTHER: 'Other'
};

export const DEFAULT_TARGET = {
  industries: ['REAL_ESTATE', 'CONSTRUCTION', 'ARCHITECTURE', 'LEGAL', 'FINANCE', 'HOSPITALITY'],
  regions: ['Greater Accra', 'Ashanti', 'Eastern', 'Central'],
  minimumScore: 50
};

export const CAMPAIGN_STATUSES = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  SENDING: 'Sending',
  SENT: 'Sent',
  CANCELLED: 'Cancelled'
};

export const GROWTH_SETTING_KEY = 'growth';

export const DEFAULT_GROWTH_SETTINGS = {
  target: DEFAULT_TARGET,
  batchLimit: 40,
  senderName: '',
  replyTo: '',
  footer:
    'You are receiving this message because you asked to hear from us. You can unsubscribe at any time using the link below.'
};

const MAX_SCORE = 100;

function normalized(value) {
  return String(value == null ? '' : value).trim();
}

export function normalizeEmail(value) {
  const email = normalized(value).toLowerCase();
  return isEmail(email) ? email : '';
}

export function normalizedWebsite(value) {
  const raw = normalized(value);
  if (!raw) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function points(reasons, key, label, value, max, detail) {
  const score = Math.max(0, Math.min(max, value));
  reasons.push({ key, label, points: score, max, detail });
  return score;
}

export function bandForScore(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 45) return 'MEDIUM';
  return 'LOW';
}

/**
 * Explainable fit score. Nothing here calls out to a third-party data source;
 * every point is derived from records the team entered themselves.
 */
export function scoreProspect(prospect, target = DEFAULT_TARGET) {
  const reasons = [];
  const industries = Array.isArray(target?.industries) ? target.industries : DEFAULT_TARGET.industries;
  const regions = Array.isArray(target?.regions) ? target.regions : DEFAULT_TARGET.regions;
  let score = 0;

  if (prospect?.industry && industries.includes(prospect.industry)) {
    score += points(reasons, 'industry', 'Target industry', 25, 25, INDUSTRIES[prospect.industry] || prospect.industry);
  } else if (prospect?.industry) {
    score += points(reasons, 'industry', 'Industry outside target profile', 8, 25, INDUSTRIES[prospect.industry] || prospect.industry);
  } else {
    points(reasons, 'industry', 'Industry not recorded', 0, 25, 'Add the sector to improve qualification.');
  }

  if (prospect?.location && regions.includes(prospect.location)) {
    score += points(reasons, 'location', 'Target region', 20, 20, prospect.location);
  } else if (prospect?.location) {
    score += points(reasons, 'location', 'Outside target regions', 8, 20, prospect.location);
  } else {
    points(reasons, 'location', 'Location not recorded', 0, 20, 'City or region is missing.');
  }

  const email = normalizeEmail(prospect?.email);
  const phone = normalized(prospect?.phone);
  if (email && phone) {
    score += points(reasons, 'contact', 'Email and phone available', 20, 20, 'Two direct contact routes.');
  } else if (email) {
    score += points(reasons, 'contact', 'Email available', 15, 20, 'Phone number still needed for follow-up.');
  } else if (phone) {
    score += points(reasons, 'contact', 'Phone available', 6, 20, 'No email address on record.');
  } else {
    points(reasons, 'contact', 'No contact route', 0, 20, 'Add an email address or phone number.');
  }

  if (normalizedWebsite(prospect?.website)) {
    score += points(reasons, 'digital', 'Digital presence', 15, 15, prospect.website);
  } else {
    points(reasons, 'digital', 'No website recorded', 0, 15, 'Verify the business before outreach.');
  }

  const research = normalized(prospect?.researchNotes);
  if (research.length >= 80) {
    score += points(reasons, 'research', 'Research notes captured', 20, 20, research.length + ' characters recorded.');
  } else if (research.length >= 20) {
    score += points(reasons, 'research', 'Basic research captured', 12, 20, 'Add more detail to strengthen the case.');
  } else {
    points(reasons, 'research', 'Little research captured', 0, 20, 'Record why this prospect is relevant.');
  }

  score = Math.max(0, Math.min(MAX_SCORE, score));
  return { score, band: bandForScore(score), reasons };
}

export function consentCoversMarketing(prospect) {
  const purpose = normalized(prospect?.consentPurpose).toUpperCase();
  if (!purpose) return false;
  return purpose.split(/[,\s]+/).includes('MARKETING');
}

export function outreachEligibility(prospect) {
  const reasons = [];
  if (!prospect) {
    return { eligible: false, reasons: ['Prospect not found.'] };
  }
  if (prospect.suppressed) reasons.push('On the do-not-contact list.');
  if (prospect.consentStatus !== 'GRANTED') reasons.push('Marketing consent has not been granted.');
  if (!consentCoversMarketing(prospect)) reasons.push('Recorded consent does not cover marketing email.');
  if (!prospect.consentAt) reasons.push('No consent date is recorded.');
  if (!normalizeEmail(prospect.email)) reasons.push('No valid email address.');
  if (prospect.repliedAt || prospect.stage === 'RESPONDED') reasons.push('They replied — continue the conversation personally.');
  if (['SUPPRESSED', 'LOST'].includes(prospect.stage)) reasons.push('This prospect is closed to outreach.');
  return { eligible: reasons.length === 0, reasons };
}

export function nextAction(prospect) {
  if (!prospect) return '';
  if (prospect.suppressed) return 'Keep on the do-not-contact list.';
  if (prospect.consentStatus !== 'GRANTED') return 'Record consent before any outreach.';
  if (!normalizeEmail(prospect.email)) return 'Add a verified email address.';
  switch (prospect.stage) {
    case 'NEW':
      return 'Research the business and the decision maker.';
    case 'RESEARCHED':
      return 'Prepare a first message tied to their current projects.';
    case 'CONTACTED':
      return 'Schedule a follow-up and note the outcome.';
    case 'RESPONDED':
      return 'Reply personally and move the conversation forward.';
    case 'QUALIFIED':
      return 'Share a proposal or invite them to a site visit.';
    case 'NEGOTIATION':
      return 'Confirm commercial terms and next milestones.';
    case 'WON':
      return 'Hand over to onboarding.';
    case 'LOST':
      return 'Archive the record and note the reason.';
    default:
      return 'Review the record and decide the next step.';
  }
}

export function dedupeProspects(rows = []) {
  const seen = new Set();
  const unique = [];
  const duplicates = [];
  for (const row of rows) {
    const email = normalizeEmail(row?.email);
    const key = email || 'name:' + normalized(row?.company).toLowerCase() + '|' + normalized(row?.contactName).toLowerCase();
    if (seen.has(key)) {
      duplicates.push(row);
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return { unique, duplicates };
}

function signingSecret(provided) {
  const secret = provided || process.env.AUTH_SECRET || '';
  if (secret.length < 32) return '';
  return secret;
}

export function unsubscribeToken(prospectId, { secret } = {}) {
  const id = normalized(prospectId);
  const key = signingSecret(secret);
  if (!id || !key) return '';
  const signature = createHmac('sha256', key).update('unsubscribe:' + id).digest('base64url');
  return id + '.' + signature;
}

export function verifyUnsubscribeToken(token, { secret } = {}) {
  const value = normalized(token);
  const key = signingSecret(secret);
  if (!value || !key) return '';
  const index = value.lastIndexOf('.');
  if (index <= 0) return '';
  const id = value.slice(0, index);
  const signature = value.slice(index + 1);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id) || !/^[A-Za-z0-9_-]{16,64}$/.test(signature)) return '';
  const expected = createHmac('sha256', key).update('unsubscribe:' + id).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return '';
  return timingSafeEqual(left, right) ? id : '';
}

export function renderMergeTags(text, prospect = {}) {
  const values = {
    company: prospect.company || 'there',
    contactname: prospect.contactName || 'there',
    jobtitle: prospect.jobTitle || '',
    location: prospect.location || ''
  };
  return String(text == null ? '' : text).replace(/\{\{\s*(company|contactName|jobTitle|location)\s*\}\}/gi, (match, key) => {
    const value = values[String(key).toLowerCase()];
    return value == null ? '' : String(value);
  });
}

export function campaignPreview(campaign, prospect = {}, org = {}) {
  const subject = renderMergeTags(campaign?.subject, prospect);
  const body = renderMergeTags(campaign?.body, prospect);
  return {
    subject,
    paragraphs: body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
    organization: org.name || 'Your organization'
  };
}

export function buildCampaignEmail({ campaign, prospect, org = {}, unsubscribeUrl, footer }) {
  const subject = renderMergeTags(campaign?.subject, prospect).slice(0, 180);
  const body = renderMergeTags(campaign?.body, prospect);
  const color = org.brandColor || '#125b38';
  const paragraphs = body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const footerText = footer || DEFAULT_GROWTH_SETTINGS.footer;
  const address = [org.legalName || org.name, org.address].filter(Boolean).join(' · ');

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f6f3;font-family:Segoe UI,Arial,sans-serif;color:#1a2920">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f3;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e1e9e3;border-radius:16px;overflow:hidden">
        <tr><td style="padding:18px 26px;border-bottom:3px solid ${escapeHtml(color)};color:#1d3828;font-size:12px;font-weight:700;letter-spacing:.02em">${escapeHtml(org.name || '')}</td></tr>
        <tr><td style="padding:26px;font-size:14px;line-height:1.65;color:#36483d">
          ${paragraphs.map((paragraph) => '<p style="margin:0 0 14px">' + escapeHtml(paragraph).replaceAll('\n', '<br>') + '</p>').join('')}
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e7ede9;color:#7b8980;font-size:11px;line-height:1.6">
            ${escapeHtml(footerText)}
            <br><a href="${escapeHtml(unsubscribeUrl)}" style="color:${escapeHtml(color)}">Unsubscribe from these emails</a>
            ${address ? '<br>' + escapeHtml(address) : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = paragraphs.join('\n\n') + '\n\n' + footerText + '\nUnsubscribe: ' + unsubscribeUrl;
  const replyTo = normalizeEmail(org.email);
  const headers = {
    'List-Unsubscribe': '<' + unsubscribeUrl + '>' + (replyTo ? ', <mailto:' + replyTo + '?subject=unsubscribe>' : '')
  };

  return { to: prospect.email, subject, html, text, headers };
}

export function campaignAudience(prospects, { minScore = 0, stage = '' } = {}) {
  return prospects.filter((prospect) => {
    if (stage && prospect.stage !== stage) return false;
    if (Number(prospect.score || 0) < Number(minScore || 0)) return false;
    return outreachEligibility(prospect).eligible;
  });
}

export function growthStats(prospects = [], campaigns = []) {
  const eligible = prospects.filter((prospect) => outreachEligibility(prospect).eligible);
  const byStage = {};
  for (const prospect of prospects) byStage[prospect.stage] = (byStage[prospect.stage] || 0) + 1;
  return {
    total: prospects.length,
    eligible: eligible.length,
    highIntent: prospects.filter((prospect) => prospect.scoreBand === 'HIGH').length,
    suppressed: prospects.filter((prospect) => prospect.suppressed).length,
    replied: prospects.filter((prospect) => prospect.repliedAt).length,
    needsConsent: prospects.filter((prospect) => !prospect.suppressed && prospect.consentStatus !== 'GRANTED').length,
    campaigns: campaigns.length,
    sentCampaigns: campaigns.filter((campaign) => campaign.status === 'SENT').length,
    byStage
  };
}
