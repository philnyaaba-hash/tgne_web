export const VISIT_CATEGORIES = [
  'BUSINESS',
  'CLIENT',
  'CONTRACTOR',
  'SUPPLIER',
  'JOB_APPLICANT',
  'GOVERNMENT',
  'DELIVERY',
  'INTERVIEW',
  'GUEST',
  'OTHER'
];

export const VISIT_CATEGORY_LABELS = {
  BUSINESS: 'Business visitor',
  CLIENT: 'Client / customer',
  CONTRACTOR: 'Contractor',
  SUPPLIER: 'Supplier',
  JOB_APPLICANT: 'Job applicant',
  GOVERNMENT: 'Government official',
  DELIVERY: 'Delivery personnel',
  INTERVIEW: 'Interview candidate',
  GUEST: 'Guest',
  OTHER: 'Other'
};

export const VISIT_STATUS_LABELS = {
  EXPECTED: 'Expected',
  AWAITING_APPROVAL: 'Awaiting approval',
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Checked out',
  OVERDUE: 'Overdue',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  DENIED: 'Denied'
};

export const IDENTIFICATION_TYPES = ['National ID', 'Passport', 'Driver licence', 'Staff ID', 'Other'];

export function requiredString(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function optionalString(value, max = 500) {
  const text = requiredString(value, max);
  return text || null;
}

export function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function cleanEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

export function isPhone(value) {
  return typeof value === 'string' && /^[+()\d\s.-]{7,40}$/.test(value.trim());
}

export function parseDate(value, { required = false } = {}) {
  if (value == null || value === '') return required ? new Date(NaN) : null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(NaN) : date;
}

export function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

export function effectiveVisitStatus(visit, now = new Date()) {
  if (visit.status === 'CHECKED_IN' && visit.expectedCheckout && new Date(visit.expectedCheckout) < now) return 'OVERDUE';
  if (visit.status === 'EXPECTED' && visit.expectedCheckout && new Date(visit.expectedCheckout) < now) return 'EXPIRED';
  if (visit.status === 'AWAITING_APPROVAL' && visit.expectedArrival && new Date(visit.expectedArrival) < new Date(now.getTime() - 24 * 60 * 60 * 1000)) return 'EXPIRED';
  return visit.status;
}

export function csvCell(value) {
  let text = String(value == null ? '' : value);
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function toCsv(headers, rows) {
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function fileResponse(data, fileName, mimeType) {
  const buffer = Buffer.from(String(data), 'base64');
  return new Response(buffer, {
    headers: {
      'content-type': mimeType,
      'content-disposition': 'inline; filename="' + fileName.replaceAll(/["\\\r\n]/g, '_') + '"',
      'content-length': String(buffer.length),
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, max-age=300'
    }
  });
}
