// Pure helpers shared by the client portal, the client desk and tests.

import { labelFor as labelOf, TITLE_STATUSES } from './land-commerce.js';

export const SERVICE_TYPES = [
  { value: 'WEB_DEVELOPMENT', label: 'Web & software development' },
  { value: 'ICT_SUPPORT', label: 'ICT support & infrastructure' },
  { value: 'GRAPHIC_DESIGN', label: 'Graphic design & branding' },
  { value: 'PRINTING_SIGNAGE', label: 'Printing & signage' },
  { value: 'HOSTING_DIGITAL', label: 'Hosting & digital services' },
  { value: 'EDUCATION_CONSULTANCY', label: 'Education consultancy & training' },
  { value: 'SURVEY', label: 'Surveying & beaconing' },
  { value: 'VALUATION', label: 'Land valuation' },
  { value: 'TITLE_VERIFICATION', label: 'Title verification' },
  { value: 'CONSTRUCTION', label: 'Building & construction' },
  { value: 'FENCING', label: 'Fencing & walling' },
  { value: 'LEGAL', label: 'Legal & documentation' },
  { value: 'SITE_VISIT', label: 'Guided site visit' },
  { value: 'OTHER', label: 'Other land service' }
];

export const SERVICE_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' }
];

export const SERVICE_STATUSES = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'QUOTED', label: 'Quote issued' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

export const RESALE_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'LIVE', label: 'Live on storefront' },
  { value: 'REJECTED', label: 'Needs changes' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'SOLD', label: 'Sold' }
];

export const HOLDING_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RESALE', label: 'Listed for resale' },
  { value: 'SOLD', label: 'Sold' }
];

export const DOCUMENT_TYPES = [
  { value: 'TITLE_DEED', label: 'Title deed' },
  { value: 'SURVEY_PLAN', label: 'Survey plan' },
  { value: 'RECEIPT', label: 'Payment receipt' },
  { value: 'AGREEMENT', label: 'Sale agreement' },
  { value: 'TAX', label: 'Tax / levy document' },
  { value: 'OTHER', label: 'Other document' }
];

export const DOCUMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending review' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'EXPIRED', label: 'Expired' }
];

export const PRIORITY_RANK = { LOW: 0, NORMAL: 1, HIGH: 2, URGENT: 3 };

const SETS = {
  serviceType: new Set(SERVICE_TYPES.map((item) => item.value)),
  priority: new Set(SERVICE_PRIORITIES.map((item) => item.value)),
  serviceStatus: new Set(SERVICE_STATUSES.map((item) => item.value)),
  resaleStatus: new Set(RESALE_STATUSES.map((item) => item.value)),
  holdingStatus: new Set(HOLDING_STATUSES.map((item) => item.value)),
  documentType: new Set(DOCUMENT_TYPES.map((item) => item.value)),
  documentStatus: new Set(DOCUMENT_STATUSES.map((item) => item.value)),
  titleStatus: new Set(TITLE_STATUSES.map((item) => item.value))
};

export function isServiceType(value) { return SETS.serviceType.has(value); }
export function isServicePriority(value) { return SETS.priority.has(value); }
export function isServiceStatus(value) { return SETS.serviceStatus.has(value); }
export function isResaleStatus(value) { return SETS.resaleStatus.has(value); }
export function isHoldingStatus(value) { return SETS.holdingStatus.has(value); }
export function isDocumentType(value) { return SETS.documentType.has(value); }
export function isDocumentStatus(value) { return SETS.documentStatus.has(value); }
export function isClientTitleStatus(value) { return SETS.titleStatus.has(value); }

export function labelFor(options, value) {
  return labelOf(options, value) || String(value || '');
}

export function serviceTypeLabel(value) { return labelFor(SERVICE_TYPES, value); }
export function serviceStatusLabel(value) { return labelFor(SERVICE_STATUSES, value); }
export function resaleStatusLabel(value) { return labelFor(RESALE_STATUSES, value); }
export function holdingStatusLabel(value) { return labelFor(HOLDING_STATUSES, value); }
export function documentTypeLabel(value) { return labelFor(DOCUMENT_TYPES, value); }
export function documentStatusLabel(value) { return labelFor(DOCUMENT_STATUSES, value); }

const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function token(randomBytes) {
  let text = '';
  if (typeof randomBytes === 'function') {
    const bytes = randomBytes(6);
    for (let index = 0; index < 6; index += 1) {
      text += REFERENCE_ALPHABET[bytes[index] % REFERENCE_ALPHABET.length];
    }
  } else {
    for (let index = 0; index < 6; index += 1) {
      text += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
    }
  }
  return text;
}

function reference(prefix, date, randomBytes) {
  return prefix + '-' + new Date(date).getFullYear() + '-' + token(randomBytes);
}

export function clientCode(date = new Date(), randomBytes) {
  return reference('CL', date, randomBytes);
}

export function resaleReference(date = new Date(), randomBytes) {
  return reference('RS', date, randomBytes);
}

export function serviceReference(date = new Date(), randomBytes) {
  return reference('SV', date, randomBytes);
}

export function serviceInvoiceNumber(referenceValue) {
  const match = String(referenceValue || '').match(/^SV-\d{4}-[A-Z0-9]{6}$/);
  return match ? 'SVC-' + String(referenceValue).slice(3) : '';
}

export function invoiceBelongsToReference(invoiceNumber, referenceValue) {
  const number = String(invoiceNumber || '');
  const ref = String(referenceValue || '');
  if (!number || !ref) return false;
  if (ref.startsWith('LL-')) return number === 'INV-' + ref.slice(3);
  if (ref.startsWith('SV-')) return number === serviceInvoiceNumber(ref);
  return false;
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function positiveInteger(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function optionalInteger(value) {
  if (value == null || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
}

function optionalNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function dateOf(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeUrl(value) {
  const url = clean(value, 2000);
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (/^\/[a-z0-9/_-][a-z0-9/._-]*$/i.test(url)) return url;
  return '';
}

export function validateHolding(input = {}) {
  const errors = {};
  const title = clean(input.title, 160);
  const region = clean(input.region, 60);
  const district = clean(input.district, 80);
  const community = clean(input.community, 80);
  const sizeAcres = Number(input.sizeAcres);
  const titleStatus = String(input.titleStatus || 'PENDING').toUpperCase();
  const acquisitionPrice = optionalInteger(input.acquisitionPrice);
  const currentValue = optionalInteger(input.currentValue);
  const titleNumber = clean(input.titleNumber, 80);
  const coordinates = clean(input.coordinates, 80);
  const notes = clean(input.notes, 2000);
  const acquisitionDate = dateOf(input.acquisitionDate);

  if (title.length < 3) errors.title = 'Give the land a short name.';
  if (!region) errors.region = 'Choose a region.';
  if (!district) errors.district = 'Enter the district.';
  if (!Number.isFinite(sizeAcres) || sizeAcres <= 0 || sizeAcres > 100000) errors.sizeAcres = 'Enter the size in acres.';
  if (!isClientTitleStatus(titleStatus)) errors.titleStatus = 'Choose a title status.';
  if (input.acquisitionPrice != null && input.acquisitionPrice !== '' && acquisitionPrice == null) errors.acquisitionPrice = 'Enter a valid amount.';
  if (input.currentValue != null && input.currentValue !== '' && currentValue == null) errors.currentValue = 'Enter a valid amount.';
  if (acquisitionDate === null && input.acquisitionDate) errors.acquisitionDate = 'Enter a valid acquisition date.';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      title,
      region,
      district,
      community: community || null,
      sizeAcres,
      acquisitionDate,
      acquisitionPrice,
      currentValue,
      titleStatus,
      titleNumber: titleNumber || null,
      coordinates: coordinates || null,
      notes: notes || null
    }
  };
}

export function validateResale(input = {}) {
  const errors = {};
  const title = clean(input.title, 160);
  const region = clean(input.region, 60);
  const district = clean(input.district, 80);
  const community = clean(input.community, 80);
  const description = clean(input.description, 4000);
  const askingPrice = positiveInteger(input.askingPrice);
  const sizeAcres = Number(input.sizeAcres);
  const holdingId = clean(input.holdingId, 40);

  if (title.length < 6) errors.title = 'Give the resale a descriptive title.';
  if (!region) errors.region = 'Choose a region.';
  if (!district) errors.district = 'Enter the district.';
  if (askingPrice == null) errors.askingPrice = 'Enter an asking price in cedis.';
  if (!Number.isFinite(sizeAcres) || sizeAcres <= 0 || sizeAcres > 100000) errors.sizeAcres = 'Enter the size in acres.';
  if (description.length < 20) errors.description = 'Describe the land in at least 20 characters.';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      title,
      region,
      district,
      community: community || null,
      description,
      askingPrice,
      sizeAcres,
      holdingId: holdingId || null
    }
  };
}

export function validateService(input = {}) {
  const errors = {};
  const type = String(input.type || '').toUpperCase();
  const title = clean(input.title, 160);
  const description = clean(input.description, 4000);
  const location = clean(input.location, 160);
  const priority = String(input.priority || 'NORMAL').toUpperCase();
  const holdingId = clean(input.holdingId, 40);

  if (!isServiceType(type)) errors.type = 'Choose the service you need.';
  if (title.length < 6) errors.title = 'Give the request a short title.';
  if (description.length < 15) errors.description = 'Tell us what you need in at least 15 characters.';
  if (!isServicePriority(priority)) errors.priority = 'Choose a priority.';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { type, title, description, location: location || null, priority, holdingId: holdingId || null }
  };
}

export function validateDocument(input = {}) {
  const errors = {};
  const name = clean(input.name, 160);
  const type = String(input.type || 'OTHER').toUpperCase();
  const fileUrl = safeUrl(input.fileUrl);
  const holdingId = clean(input.holdingId, 40);
  const issuedAt = dateOf(input.issuedAt);

  if (name.length < 3) errors.name = 'Give the document a name.';
  if (!isDocumentType(type)) errors.type = 'Choose a document type.';
  if (!fileUrl) errors.fileUrl = 'Paste a secure https link or an /uploads path.';
  if (issuedAt === null && input.issuedAt) errors.issuedAt = 'Enter a valid issue date.';

  return { ok: Object.keys(errors).length === 0, errors, value: { name, type, fileUrl, holdingId: holdingId || null, issuedAt } };
}

export function validateQuote(input = {}) {
  const amount = positiveInteger(input.amount);
  const note = clean(input.note, 1000);
  const scheduledFor = dateOf(input.scheduledFor);
  return { ok: amount != null, amount, note, scheduledFor };
}

export function portfolioSummary(holdings = []) {
  return holdings.reduce((summary, holding) => {
    const acres = Number(holding.sizeAcres) || 0;
    const acquired = Number(holding.acquisitionPrice) || 0;
    const current = Number(holding.currentValue) || acquired;
    summary.acres += acres;
    summary.acquisitionValue += acquired;
    summary.currentValue += current;
    summary.count += 1;
    return summary;
  }, { count: 0, acres: 0, acquisitionValue: 0, currentValue: 0, gain: 0 });
}

export function withGain(summary) {
  return { ...summary, gain: summary.currentValue - summary.acquisitionValue };
}
