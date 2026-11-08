/* LandLedger — core state, helpers, icons and routing */
'use strict';

const S = window.LandStore;
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

let data = S.load();

const state = {
  route: 'dashboard',
  lastRoute: null,
  mapStatus: 'all',
  mapQuery: '',
  selectedPlotId: null,
  plotsQuery: '',
  plotsStatus: 'all',
  plotsBlock: 'all',
  plotsPage: 1,
  salesQuery: '',
  salesStatus: 'all',
  salesPage: 1,
  receiptsQuery: '',
  receiptsStatus: 'all',
  receiptId: null,
  receiptMode: 'receipt',
  buyersQuery: '',
  buyersPage: 1,
  complaintQuery: '',
  complaintStatus: 'all',
  staffQuery: '',
  staffStatus: 'all',
  leadQuery: '',
  leadStatus: 'all',
  taskStatus: 'open',
  reportStart: '',
  reportEnd: '',
  reportType: 'overview',
  reportQuery: '',
  documentQuery: '',
  maintenanceStatus: 'all',
  accountingMonth: 'all',
  accountingType: 'all',
  accountingQuery: '',
  financeJournalQuery: '',
  financeJournalSource: 'all',
  financeJournalStatus: 'all',
  financeJournalPage: 1,
  financeAccountQuery: '',
  financeAccountType: 'all',
  financeGlAccount: 'all',
  financeGlFrom: '',
  financeGlTo: '',
  financeGlPage: 1,
  financeStatement: 'pl',
  financeFrom: '',
  financeTo: '',
  financeAuditQuery: '',
  financeAuditAction: 'all',
  financeReplayFailures: [],
  manualJournal: null,
  expenseEvidenceDraft: [],
  clientVaultKey: null,
  clientVaultIntent: null,
  clientVaultBuyerId: null,
  clientVaultCache: {},
  wizard: null,
  message: null,
  confirmResolver: null,
  pendingImport: null,
  modalLastFocus: null,
  modalOnClose: null,
  notifOpen: false,
    notifOpen: false,
  userMenuOpen: false,
};

const PAGE_SIZE = { plots: 12, sales: 12, buyers: 9 };
const BUYER_SAMPLE_PHOTOS = [
  'https://res.cloudinary.com/ea91sdts/image/upload/v1793384456/portrait-african-american-employee-answering-email-laptop-working-website-report-office-entrepreneur-analyzing-paperwork-research-computer-doing-internet-research.jpg',
  'https://res.cloudinary.com/ea91sdts/image/upload/v1793375861/Screenshot_7.png',
  'https://res.cloudinary.com/ea91sdts/image/upload/v1793375861/Screenshot_5.png',
  'https://res.cloudinary.com/ea91sdts/image/upload/v1791880435/samples/man-portrait.jpg',
  'https://res.cloudinary.com/ea91sdts/image/upload/v1791880433/samples/smile.jpg',
  'https://res.cloudinary.com/ea91sdts/image/upload/v1791880439/main-sample.png',
  'https://res.cloudinary.com/ea91sdts/image/upload/v1793391300/ddddd.jpg',
  'https://res.cloudinary.com/ea91sdts/image/upload/v1793391007/cx.jpg',
  'https://res.cloudinary.com/ea91sdts/image/upload/v1793391736/mn.jpg'
];
const DEFAULT_BUYER_PHOTOS = {
  'Abena Asante': BUYER_SAMPLE_PHOTOS[0],
  'Abena Danso': BUYER_SAMPLE_PHOTOS[1],
  'Abena Sarpong': BUYER_SAMPLE_PHOTOS[2],
  'Adwoa Frimpong': BUYER_SAMPLE_PHOTOS[7],
  'Adwoa Yeboah': BUYER_SAMPLE_PHOTOS[6],
  'Afia Nyarko': BUYER_SAMPLE_PHOTOS[8],
  'Afia Sarpong': BUYER_SAMPLE_PHOTOS[3],
  'Akosua Badu': BUYER_SAMPLE_PHOTOS[4],
  'Akosua Nyarko': BUYER_SAMPLE_PHOTOS[5]
};
const REPLACED_DUPLICATE_BUYER_PHOTOS = [
  { name: 'Abena Sarpong', previous: 'https://res.cloudinary.com/ea91sdts/image/upload/v1793391007/xss.jpg', replacement: BUYER_SAMPLE_PHOTOS[2] },
  { name: 'Afia Sarpong', previous: BUYER_SAMPLE_PHOTOS[0], replacement: BUYER_SAMPLE_PHOTOS[3] },
  { name: 'Afia Nyarko', previous: BUYER_SAMPLE_PHOTOS[2], replacement: BUYER_SAMPLE_PHOTOS[8] },
  { name: 'Afia Nyarko', previous: 'https://res.cloudinary.com/ea91sdts/image/upload/v1793391007/xss.jpg', replacement: BUYER_SAMPLE_PHOTOS[8] },
  { name: 'Afia Nyarko', previous: '', replacement: BUYER_SAMPLE_PHOTOS[8] },
  { name: 'Akosua Badu', previous: BUYER_SAMPLE_PHOTOS[1], replacement: BUYER_SAMPLE_PHOTOS[4] },
  { name: 'Akosua Nyarko', previous: BUYER_SAMPLE_PHOTOS[2], replacement: BUYER_SAMPLE_PHOTOS[5] },
  { name: 'Adwoa Yeboah', previous: BUYER_SAMPLE_PHOTOS[1], replacement: BUYER_SAMPLE_PHOTOS[6] },
  { name: 'Adwoa Frimpong', previous: BUYER_SAMPLE_PHOTOS[0], replacement: BUYER_SAMPLE_PHOTOS[7] }
];
const addedDefaultBuyerPhotos = data.buyers.reduce((changed, buyer) => {
  const replacement = REPLACED_DUPLICATE_BUYER_PHOTOS.find((entry) => entry.name === buyer.name && buyer.photo === entry.previous);
  if (replacement) {
    buyer.photo = replacement.replacement;
    return true;
  }
  const photo = DEFAULT_BUYER_PHOTOS[buyer.name];
  if (!photo || buyer.photo) return changed;
  buyer.photo = photo;
  return true;
}, false);
if (addedDefaultBuyerPhotos) {
  const result = S.save(data);
  if (!result.ok) handleSaveResult(result);
}

/* ---------------- Utilities ---------------- */
const esc = (value) =>
  String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (value) => 'GH₵ ' + Math.round(Number(value) || 0).toLocaleString('en-GH');

const moneyCompact = (value) => {
  const n = Math.round(Number(value) || 0);
  if (n >= 1000000) return 'GH₵ ' + (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return 'GH₵ ' + Math.round(n / 1000) + 'K';
  return 'GH₵ ' + n.toLocaleString('en-GH');
};

function fmtDate(value) {
  const d = S.parseDate(value);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateShort(value) {
  const d = S.parseDate(value);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}
function buyerPhotoSrc(buyer) {
  const photo = buyer && typeof buyer.photo === 'string' ? buyer.photo.trim() : '';
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(photo)) return photo;
  try {
    const url = new URL(photo);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' ? url.href : '';
  } catch (err) {
    return '';
  }
}
function buyerAvatarHTML(buyer, className, extraAttrs) {
  const name = buyer && buyer.name ? buyer.name : '?';
  const photo = buyerPhotoSrc(buyer);
  return '<span class="' + (className || 'cell-avatar') + (photo ? ' avatar-photo' : '') + '"' + (extraAttrs || '') + '>' +
    esc(initials(name)) +
    (photo ? '<img src="' + esc(photo) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
    '</span>';
}
function relTime(value) {
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  if (!Number.isFinite(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return fmtDateShort(d);
}
function todayValue() {
  return S.dateOnly(new Date());
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function phoneDigits(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '233' + digits.slice(1);
  return digits;
}
function phoneHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? 'tel:' + digits : '';
}
function statusLabel(status) {
  return ({ paid: 'Paid', partial: 'Part paid', overdue: 'Overdue', available: 'Available', reserved: 'Reserved', sold: 'Sold' })[status] || status;
}
function statusBadge(status) {
  return '<span class="badge ' + esc(status) + '">' + esc(statusLabel(status)) + '</span>';
}
function saleForPlot(plot) {
  if (!plot || !plot.saleId) return null;
  return S.decorateSale(data, S.saleById(data, plot.saleId));
}
function salesForBuyer(buyerId) {
  return S.decoratedSales(data).filter((sale) => sale.buyerId === buyerId);
}
function buyerBalance(buyerId) {
  return salesForBuyer(buyerId).reduce((sum, sale) => sum + sale.balance, 0);
}
function plotMatches(plot) {
  const query = state.mapQuery.trim().toLowerCase();
  if (state.mapStatus !== 'all' && plot.status !== state.mapStatus) return false;
  if (!query) return true;
  const sale = saleForPlot(plot);
  const hay = [plot.code, plot.label, plot.block, plot.size, sale && sale.buyer ? sale.buyer.name : ''].join(' ').toLowerCase();
  return hay.includes(query);
}
function saleSearchText(sale) {
  return [sale.receiptNo, sale.buyer ? sale.buyer.name : '', sale.buyer ? sale.buyer.phone : '', sale.plot ? sale.plot.label : '', sale.plot ? sale.plot.code : '', sale.plot ? sale.plot.block : '']
    .join(' ')
    .toLowerCase();
}
function buyerSearchText(buyer) {
  return [buyer.name, buyer.phone, buyer.email, buyer.business, buyer.idNumber, buyer.nextOfKin].join(' ').toLowerCase();
}
function selectedReceiptSale() {
  const sale = state.receiptId ? S.decorateSale(data, S.saleById(data, state.receiptId)) : null;
  return sale || null;
}

/* ---------------- Icons ---------------- */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  map: '<path d="M9 20 3 17V4l6 3 6-3 6 3v13l-6-3-6 3Z"/><path d="M9 7v13M15 4v13"/>',
  plots: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  sales: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
  receipts: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
  buyers: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="m15 9-3 3 3 3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowUpRight: '<path d="M7 17 17 7M7 7h10v10"/>',
  arrowDownLeft: '<path d="M17 7 7 17M17 17H7V7"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  wallet: '<path d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6"/><path d="M17 14h.01"/>',
  trendUp: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  paperclip: '<path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  whatsapp: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1 1 21 11.5Z"/><path d="M8.5 8.5c.4-.9 1.2-.8 1.5 0l.6 1.4c.1.3 0 .6-.2.8l-.6.6a5 5 0 0 0 2.9 2.9l.6-.6c.2-.2.5-.3.8-.2l1.4.6c.8.3.9 1.1 0 1.5-1.4.6-3.2.1-5-1.7s-2.3-3.6-1.7-5Z"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  mapPin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6.4 0 10 6 10 6a18 18 0 0 1-3.3 3.9"/><path d="M6.6 6.6A18 18 0 0 0 2 12s3.6 6 10 6a9.9 9.9 0 0 0 4.3-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.8 12.2 8.7-8.7M15 4.5 18.5 8M17.5 2l4 4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.4L3 16"/><path d="M3 21v-5h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>',
  creditCard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M12 8H8a2.5 2.5 0 1 1 0-5c2 0 4 5 4 5ZM12 8h4a2.5 2.5 0 1 0 0-5c-2 0-4 5-4 5Z"/>'
};

function icon(name, size) {
  const body = ICONS[name] || ICONS.info;
  return '<svg viewBox="0 0 24 24" width="' + (size || 18) + '" height="' + (size || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
}

function initIcons(root) {
  $$('[data-icon]', root || document).forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
}

/* ---------------- Routing ---------------- */
const ROUTES = ['dashboard', 'tasks', 'reports', 'office-reports', 'map', 'plots', 'office-survey', 'leads', 'sales', 'receipts', 'buyers', 'complaints', 'documents', 'maintenance', 'accounting', 'finance', 'finance-accounts', 'finance-journals', 'finance-ledger', 'finance-statements', 'finance-audit', 'office-finance', 'staff', 'office-overview', 'office-compliance', 'office-growth', 'office-clients', 'office-land', 'office-visitors', 'office-verify', 'office-staff', 'office-attendance', 'office-organization', 'office-roles', 'office-audit', 'office-settings', 'settings', 'client-home', 'client-portfolio', 'client-buy', 'client-resale', 'client-services', 'client-payments', 'client-documents', 'client-support'];
const PAGE_META = {
  dashboard: ['Workspace', 'Dashboard'],
  tasks: ['Workspace', 'Tasks & Reminders'],
  reports: ['Workspace', 'Reports'],
  map: ['Land', 'Land map'],
  plots: ['Land', 'Plots'],
  leads: ['Business', 'Leads & Enquiries'],
  sales: ['Business', 'Sales'],
  receipts: ['Business', 'Receipts'],
  buyers: ['Business', 'Buyers'],
  complaints: ['Business', 'Customer complaints'],
  documents: ['Business', 'Document Register'],
  maintenance: ['Land', 'Maintenance'],
  accounting: ['Business', 'Accounting'],
  finance: ['Finance', 'Finance overview'],
  'finance-accounts': ['Finance', 'Chart of accounts'],
  'finance-journals': ['Finance', 'Journal entries'],
  'finance-ledger': ['Finance', 'General ledger'],
  'finance-statements': ['Finance', 'Financial statements'],
  'finance-audit': ['Finance', 'Periods & audit'],
  staff: ['Business', 'Staff & HRM'],
  settings: ['System', 'Workspace settings'],
  'office-overview': ['Office', 'Office overview'],
  'office-compliance': ['Office', 'Ghana compliance'],
  'office-growth': ['Office', 'Growth & outreach'],
  'office-clients': ['Office', 'Client desk'],
  'office-land': ['Office', 'Land storefront'],
  'office-visitors': ['Office', 'Visitor operations'],
  'office-verify': ['Office', 'Access verification'],
  'office-staff': ['Office', 'Staff directory'],
  'office-attendance': ['Office', 'Attendance'],
  'office-organization': ['Office', 'Departments & rooms'],
  'office-reports': ['Office', 'Visitor reports'],
  'office-finance': ['Office', 'Finance desk'],
  'office-survey': ['Office', 'Surveying'],
  'office-roles': ['Office', 'Roles & security'],
  'office-audit': ['Office', 'Audit history'],
  'office-settings': ['Office', 'Settings'],
  'client-home': ['My land', 'Overview'],
  'client-portfolio': ['My land', 'My portfolio'],
  'client-buy': ['My land', 'Buy land'],
  'client-resale': ['My land', 'Resell land'],
  'client-services': ['My land', 'Land services'],
  'client-payments': ['My land', 'Payments'],
  'client-documents': ['My land', 'Documents'],
  'client-support': ['My land', 'Support']
};

const OFFICE_ROUTES = {
  'office-overview': 'overview',
  'office-compliance': 'compliance',
  'office-growth': 'growth',
  'office-clients': 'clients',
  'office-land': 'land',
  'office-visitors': 'visitors',
  'office-verify': 'verify',
  'office-staff': 'staff',
  'office-attendance': 'attendance',
  'office-organization': 'organization',
  'office-reports': 'reports',
  'office-finance': 'finance',
  'office-survey': 'survey',
  'office-roles': 'roles',
  'office-audit': 'audit',
  'office-settings': 'settings',
  'client-home': 'client-overview',
  'client-portfolio': 'client-portfolio',
  'client-buy': 'client-buy',
  'client-resale': 'client-resale',
  'client-services': 'client-services',
  'client-payments': 'client-payments',
  'client-documents': 'client-documents',
  'client-support': 'client-support'
};

function defaultRoute() {
  const user = Auth.user();
  return user && user.roleKey === 'CLIENT' ? 'client-home' : 'dashboard';
}

function currentRoute() {
  const raw = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
  const fallback = defaultRoute();
  const user = Auth.user();
  if (user && user.roleKey === 'CLIENT') {
    return raw.indexOf('client-') === 0 && ROUTES.includes(raw) && canRoute(raw) ? raw : fallback;
  }
  const route = ROUTES.includes(raw) ? raw : fallback;
  if (canRoute(route)) return route;
  return canRoute(fallback) ? fallback : 'dashboard';
}

// /dashboard, /dashboard# and /dashboard#/dashboard all mean the same panel.
// Write the resolved route into the hash so the address always names the panel.
function canonicalHash() {
  const route = currentRoute();
  const raw = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
  if (raw !== route) {
    history.replaceState(null, '', location.pathname + location.search + '#/' + route);
  }
  return route;
}

function go(route) {
  if (!canRoute(route)) {
    toast('Your role does not have access to that page.', 'warn');
    return;
  }
  closeMobileMenu();
  hideSearch();
  hideNotif();
  hideUserMenu();
  if (location.hash === '#/' + route) render();
  else location.hash = '#/' + route;
}

function viewOffice(route) {
  const panel = OFFICE_ROUTES[route] || 'overview';
  const title = (PAGE_META[route] || PAGE_META['office-overview'])[1];
  return '<iframe class="office-embed-frame" src="/office/embed?panel=' + panel + '" title="' + title + '" loading="eager" allow="camera; clipboard-write"></iframe>';
}

function render() {
  state.route = currentRoute();
  const route = state.route;
  let html = '';
  if (route === 'dashboard') html = viewDashboard();
  else if (route === 'tasks') html = viewTasks();
  else if (route === 'reports') html = viewReports();
  else if (route === 'map') html = viewMap();
  else if (route === 'plots') html = viewPlots();
  else if (route === 'leads') html = viewLeads();
  else if (route === 'sales') html = viewSales();
  else if (route === 'receipts') html = viewReceipts();
  else if (route === 'buyers') html = viewBuyers();
  else if (route === 'complaints') html = viewComplaints();
  else if (route === 'accounting') html = viewAccounting();
  else if (route === 'finance') html = viewFinanceOverview();
  else if (route === 'finance-accounts') html = viewFinanceAccounts();
  else if (route === 'finance-journals') html = viewFinanceJournals();
  else if (route === 'finance-ledger') html = viewFinanceLedger();
  else if (route === 'finance-statements') html = viewFinanceStatements();
  else if (route === 'finance-audit') html = viewFinanceAudit();
  else if (route === 'staff') html = viewStaff();
  else if (route === 'documents') html = viewEstateDocuments();
  else if (route === 'maintenance') html = viewMaintenance();
  else if (route === 'settings') html = viewSettings();
  else if (route.indexOf('office-') === 0 || route.indexOf('client-') === 0) html = viewOffice(route);

  const view = $('#view');
  view.classList.toggle('office-view', route.indexOf('office-') === 0 || route.indexOf('client-') === 0);
  view.innerHTML = html;
  if (state.lastRoute !== route) view.scrollTop = 0;
  state.lastRoute = route;
  updateChrome();
  initIcons(view);
  document.title = 'Land Management System — ' + PAGE_META[route][1];
}

function refresh() {
  render();
}

function updateChrome() {
  ensureComplaintNavLink();
  const route = state.route;
  const meta = PAGE_META[route] || PAGE_META.dashboard;
  const eyebrow = $('#pageEyebrow');
  const title = $('#pageTitle');
  if (eyebrow) eyebrow.textContent = meta[0];
  if (title) title.textContent = meta[1];

  $$('.nav-item').forEach((el) => {
    const allowed = canRoute(el.dataset.route);
    el.hidden = !allowed;
    el.classList.toggle('active', allowed && el.dataset.route === route);
  });
  $$('.nav-section').forEach((section) => {
    section.hidden = !$$('.nav-item', section).some((item) => !item.hidden);
  });
  const systemLabel = $('#systemNavLabel');
  if (systemLabel) systemLabel.hidden = !can('settings.view');
  const topNew = $('#topNewSale');
  if (topNew) topNew.hidden = !can('sales.create');

  const org = data.settings.orgName || 'Land Management System';
  const orgName = $('#orgName');
  if (orgName) orgName.textContent = org;
  const orgInitials = initials(org);
  const orgAvatar = $('#orgAvatar');
  if (orgAvatar) orgAvatar.textContent = orgInitials;
  const user = Auth.user();
  const workspaceRole = $('#workspaceRole');
  if (workspaceRole) workspaceRole.textContent = user ? user.label : 'Workspace';
  const userInitials = user ? user.initials : orgInitials;
  const avatar = $('#avatarBtn');
  if (avatar) {
    avatar.textContent = userInitials;
    avatar.title = user ? user.name + ' — ' + user.label : org + ' — workspace';
    avatar.setAttribute('aria-label', user ? user.initials + ' account menu for ' + user.name + ', ' + user.label : 'Account menu');
  }
  const menuAvatar = $('#userMenuAvatar');
  if (menuAvatar) menuAvatar.textContent = userInitials;
  const menuName = $('#userMenuName');
  if (menuName) menuName.textContent = user ? user.name : org;
  const topName = $('#topUserName');
  if (topName) topName.textContent = user ? user.name : org;
  const topRole = $('#topUserRole');
  if (topRole) topRole.textContent = user ? user.label : 'Workspace';
  const menuRole = $('#userMenuRole');
  if (menuRole) menuRole.textContent = user ? user.label + ' access' : 'Workspace';
  const menuSettings = $('#userMenuSettings');
  if (menuSettings) menuSettings.hidden = !can('settings.view');
  const plotCount = $('#navPlotCount');
  if (plotCount) plotCount.textContent = data.plots.filter((p) => p.status === 'available').length;

  const overdue = S.stats(data).overdue;
  const openComplaints = (data.complaints || []).filter((complaint) => !['Resolved', 'Closed'].includes(complaint.status)).length;
  const alertCount = overdue.length + (can('complaints.view') ? openComplaints : 0);
  const badge = $('#notifBadge');
  const badgeText = alertCount > 99 ? '99+' : String(alertCount);
  if (badge) {
    badge.hidden = alertCount === 0;
    badge.textContent = badgeText;
  }
  const notifBtn = $('#notifBtn');
  if (notifBtn) {
    notifBtn.setAttribute('aria-label', alertCount ? 'Alerts, ' + badgeText + ' open' : 'Alerts, none');
  }
  renderNotifList();
}

function ensureComplaintNavLink() {
  const content = $('.nav-section[data-section="business"] .nav-section-content');
  if (!content || content.querySelector('[data-route="complaints"]')) return;
  const link = document.createElement('a');
  link.className = 'nav-item';
  link.href = '#/complaints';
  link.dataset.route = 'complaints';
  link.setAttribute('role', 'listitem');
  link.innerHTML = '<span class="nav-ico">' + icon('message', 18) + '</span><span class="nav-label">Complaints</span>';
  const documents = content.querySelector('[data-route="documents"]');
  content.insertBefore(link, documents || null);
}

/* ---------------- Mobile menu, search, notifications ---------------- */
function syncSidebarToggle() {
  const collapsed = document.body.classList.contains('sidebar-collapsed');
  const expanded = window.matchMedia('(max-width: 1024px)').matches
    ? document.body.classList.contains('menu-open')
    : !collapsed;
  const btn = $('#menuBtn');
  if (btn) {
    btn.setAttribute('aria-expanded', String(expanded));
    btn.setAttribute('aria-label', expanded ? 'Hide sidebar' : 'Show sidebar');
    btn.setAttribute('title', (expanded ? 'Hide' : 'Show') + ' sidebar (Ctrl+B)');
  }
  const inner = $('#sidebarCollapse');
  if (inner) {
    inner.setAttribute('aria-label', expanded ? 'Hide sidebar' : 'Show sidebar');
    inner.setAttribute('title', expanded ? 'Hide sidebar' : 'Show sidebar');
  }
}
function toggleDesktopSidebar() {
  if (!window.matchMedia('(min-width: 1025px)').matches) return false;
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  try { localStorage.setItem('landledger.sidebar.v1', collapsed ? '1' : '0'); } catch (e) {}
  syncSidebarToggle();
  return true;
}
function restoreSidebarState() {
  let stored = null;
  try { stored = localStorage.getItem('landledger.sidebar.v1'); } catch (e) {}
  if (stored === '1') document.body.classList.add('sidebar-collapsed');
  syncSidebarToggle();
}
function openMobileMenu() {
  document.body.classList.add('menu-open');
  const scrim = $('#sidebarScrim');
  if (scrim) scrim.hidden = false;
  syncSidebarToggle();
}
function closeMobileMenu() {
  document.body.classList.remove('menu-open');
  const scrim = $('#sidebarScrim');
  if (scrim) scrim.hidden = true;
  syncSidebarToggle();
}
function toggleMobileMenu() {
  if (toggleDesktopSidebar()) return;
  if (document.body.classList.contains('menu-open')) closeMobileMenu();
  else openMobileMenu();
}

function hideSearch() {
  const panel = $('#searchResults');
  if (panel) panel.hidden = true;
}
function hideNotif() {
  state.notifOpen = false;
  const panel = $('#notifPanel');
  if (panel) panel.hidden = true;
  const btn = $('#notifBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function toggleNotif() {
  state.notifOpen = !state.notifOpen;
  const panel = $('#notifPanel');
  if (panel) panel.hidden = !state.notifOpen;
  const btn = $('#notifBtn');
  if (btn) btn.setAttribute('aria-expanded', String(state.notifOpen));
  if (state.notifOpen) renderNotifList();
}
function hideUserMenu() {
  state.userMenuOpen = false;
  const menu = $('#userMenu');
  if (menu) menu.hidden = true;
  const btn = $('#avatarBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function toggleUserMenu() {
  state.userMenuOpen = !state.userMenuOpen;
  const menu = $('#userMenu');
  if (menu) menu.hidden = !state.userMenuOpen;
  const btn = $('#avatarBtn');
  if (btn) btn.setAttribute('aria-expanded', String(state.userMenuOpen));
}
function renderNotifList() {
  const list = $('#notifList');
  if (!list) return;
  const overdue = S.stats(data).overdue.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 6);
  const complaints = can('complaints.view')
    ? (data.complaints || []).filter((complaint) => !['Resolved', 'Closed'].includes(complaint.status)).slice(0, 6)
    : [];
  if (!overdue.length && !complaints.length) {
    list.innerHTML = '<div class="notif-empty">' + icon('checkCircle', 22) + '<p style="margin-top:7px">No overdue payments. You are all caught up.</p></div>';
    return;
  }
  list.innerHTML = overdue
    .map(
      (sale) => '<button type="button" class="notif-item" data-action="open-notif-sale" data-sale-id="' + esc(sale.id) + '">' +
        buyerAvatarHTML(sale.buyer, 'ni-avatar') +
        '<span class="ni-copy"><strong>' + esc(sale.buyer ? sale.buyer.name : 'Unknown buyer') + '</strong><small>' + esc(sale.plot ? sale.plot.label : '') + ' · ' + sale.daysOverdue + ' days overdue</small></span>' +
        '<span class="ni-amt">' + money(sale.balance) + '</span>' +
      '</button>'
    )
    .join('') + complaints
      .map((complaint) => {
        const buyer = S.buyerById(data, complaint.buyerId);
        return '<button type="button" class="notif-item" data-action="open-notif-complaint" data-complaint-id="' + esc(complaint.id) + '">' +
          buyerAvatarHTML(buyer, 'ni-avatar') +
          '<span class="ni-copy"><strong>' + esc(complaint.subject) + '</strong><small>' + esc(buyer ? buyer.name : 'Unknown buyer') + ' · ' + esc(complaint.status) + '</small></span>' +
          '<span class="ni-amt">' + esc(complaint.priority) + '</span>' +
        '</button>';
      })
      .join('');
}

/* ---------------- Boot ---------------- */
function enterWorkspace() {
  const user = Auth.user();
  if (user) document.body.dataset.role = user.id;
  Auth.hideLogin();

  if (!state.selectedPlotId) {
    const demoPlot = data.plots.find((p) => p.code === 'P-014') || data.plots[0];
    state.selectedPlotId = demoPlot ? demoPlot.id : null;
  }
  if (!state.receiptId) {
    const recent = S.decoratedSales(data).sort((a, b) => S.parseDate(b.date) - S.parseDate(a.date))[0];
    state.receiptId = recent ? recent.id : null;
  }
  state.route = canonicalHash();
  hideUserMenu();
  render();
}

function bindWorkspaceEvents() {
  restoreSidebarState();
  const menuBtn = $('#menuBtn');
  if (menuBtn) menuBtn.addEventListener('click', toggleMobileMenu);
  const sidebarCollapse = $('#sidebarCollapse');
  if (sidebarCollapse) sidebarCollapse.addEventListener('click', () => {
    if (!toggleDesktopSidebar()) closeMobileMenu();
  });
  const scrim = $('#sidebarScrim');
  if (scrim) scrim.addEventListener('click', closeMobileMenu);
  const notifBtn = $('#notifBtn');
  if (notifBtn) notifBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleNotif(); });
  const avatarBtn = $('#avatarBtn');
  if (avatarBtn) avatarBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleUserMenu(); });

  window.addEventListener('hashchange', () => {
    if (!Auth.isAuthenticated()) return;
    closeMobileMenu();
    hideSearch();
    hideNotif();
    hideUserMenu();
    canonicalHash();
    render();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeMobileMenu();
  });

  document.addEventListener('keydown', (e) => {
    const key = String(e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && key === 'k') {
      e.preventDefault();
      const input = $('#globalSearch');
      if (input) { input.focus(); input.select(); }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && key === 'b') {
      e.preventDefault();
      if (!toggleDesktopSidebar()) {
        if (document.body.classList.contains('menu-open')) closeMobileMenu();
        else openMobileMenu();
      }
      return;
    }
    if (e.key === 'Escape') {
      if (document.body.classList.contains('menu-open')) closeMobileMenu();
      hideSearch();
      hideNotif();
      hideUserMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.global-search')) hideSearch();
    if (!e.target.closest('.notif-wrap')) hideNotif();
    if (!e.target.closest('.user-wrap')) hideUserMenu();
  });

  const globalSearch = $('#globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('input', () => handleGlobalSearch(globalSearch.value));
    globalSearch.addEventListener('focus', () => { if (globalSearch.value.trim()) handleGlobalSearch(globalSearch.value); });
  }

  // Sidebar section toggles
  $$('.nav-section-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      btn.closest('.nav-section').setAttribute('aria-expanded', String(!expanded));
    });
  });
}

function initFinance() {
  if (!window.FinanceApp) return;
  try {
    const result = FinanceApp.ensure(data);
    state.financeReplayFailures = result.failures || [];
    if (result.changed) {
      const saved = S.save(data);
      if (!saved.ok) handleSaveResult(saved);
    }
    if (result.posted > 0) {
      console.info('Finance ledger initialised with ' + result.posted + ' journal' + (result.posted === 1 ? '' : 's') + '.');
    }
  } catch (err) {
    console.error('Finance initialisation failed.', err);
    state.financeReplayFailures = [{ message: err && err.message ? err.message : String(err) }];
  }
}

function initApp() {
  initFinance();
  initIcons(document);
  if (window.CommandPalette && window.CommandPalette.initTheme) {
    window.CommandPalette.initTheme();
  }
  Auth.init({
    onLogin: (role) => {
      enterWorkspace();
      toast('Signed in as ' + role.label + '.');
    },
    onLogout: () => {
      lockClientVault(true);
      closeModal();
      state.wizard = null;
      hideSearch();
      hideNotif();
      hideUserMenu();
      closeMobileMenu();
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      toast('Signed out.');
    }
  });
  bindWorkspaceEvents();
  Auth.showChecking();
  Auth.restore().then((restored) => {
    if (restored) enterWorkspace();
    else Auth.showLogin();
  });
}

document.addEventListener('DOMContentLoaded', initApp);

function updateSidebarStats() {

  if (!Auth.isAuthenticated()) return;

  const stats = S.stats(data);

  const collected = $('#sidebarCollected');

  const outstanding = $('#sidebarOutstanding');

  const available = $('#sidebarAvailable');

  const overdue = $('#sidebarOverdue');

  if (collected) collected.textContent = money(stats.collected);

  if (outstanding) outstanding.textContent = money(stats.outstanding);

  if (available) available.textContent = stats.available;

  if (overdue) overdue.textContent = stats.overdue.length;

}



function updateSidebarActivity() {

  const list = $('#sidebarActivityList');

  if (!list) return;

  const activities = (data.activities || []).slice(0, 5);

  if (!activities.length) {

    list.innerHTML = '<div class="sidebar-activity-item" style="justify-content:center;color:var(--muted)"><small>No activity yet</small></div>';

    return;

  }

  list.innerHTML = activities.map(a => {

    const ico = a.type === 'sale' ? 'sales' : a.type === 'payment' ? 'wallet' : a.type === 'reminder' ? 'bell' : 'plots';

    return '<div class="sidebar-activity-item">' +

      '<span class="sidebar-activity-ico">' + icon(ico, 11) + '</span>' +

      '<div class="sidebar-activity-copy">' +

        '<strong>' + esc(a.text) + '</strong>' +

        '<small>' + esc(a.detail || '') + ' �� ' + esc(relTime(a.at)) + '</small>' +

      '</div>' +

    '</div>';

  }).join('');

}



function copyToClipboard(text, label) {

  if (navigator.clipboard && navigator.clipboard.writeText) {

    navigator.clipboard.writeText(text).then(() => {

      toast(label + ' copied to clipboard', 'copy');

    }).catch(() => fallbackCopy(text, label));

  } else {

    fallbackCopy(text, label);

  }

}



function fallbackCopy(text, label) {

  const temp = document.createElement('textarea');

  temp.value = text;

  document.body.appendChild(temp);

  temp.select();

  try {

    document.execCommand('copy');

    toast(label + ' copied to clipboard', 'copy');

  } catch (e) {

    toast('Could not copy ' + String(label || '').toLowerCase(), 'error');

  }

  temp.remove();

}



function toastProgress(message, progress) {

  const root = $('#toastRoot');

  if (!root) return;

  const id = 'toast-progress-' + Date.now();

  const el = document.createElement('div');

  el.id = id;

  el.className = 'toast progress';

  el.innerHTML = '<span class="t-ico">' + icon('refresh', 13) + '</span><span>' + esc(message) + '</span>' +

    '<div class="toast-progress"><div class="toast-progress-bar" style="width:' + progress + '%"></div></div>';

  root.appendChild(el);

  return {

    update: (p, msg) => {

      const bar = $('#' + id + ' .toast-progress-bar');

      const text = $('#' + id + ' span:not(.t-ico)');

      if (bar) bar.style.width = p + '%';

      if (text && msg) text.textContent = msg;

    },

    done: (msg) => {

      const bar = $('#' + id + ' .toast-progress-bar');

      const text = $('#' + id + ' span:not(.t-ico)');

      if (bar) bar.style.width = '100%';

      if (text && msg) text.textContent = msg;

      setTimeout(() => {

        el.classList.add('out');

        setTimeout(() => el.remove(), 260);

      }, 1500);

    }

  };

}
