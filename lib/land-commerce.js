// Pure helpers shared by the public storefront, its APIs and tests.

export const LAND_TYPES = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MIXED_USE', label: 'Mixed use' },
  { value: 'AGRICULTURAL', label: 'Agricultural' },
  { value: 'INDUSTRIAL', label: 'Industrial' }
];

export const TITLE_STATUSES = [
  { value: 'REGISTERED', label: 'Registered title' },
  { value: 'INDENTURE', label: 'Indenture' },
  { value: 'CUSTOMARY', label: 'Customary / family land' },
  { value: 'PENDING', label: 'Title in progress' }
];

export const LISTING_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'ARCHIVED', label: 'Archived' }
];

export const RESERVATION_STATUSES = [
  { value: 'PENDING', label: 'Awaiting payment' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'COMPLETED', label: 'Completed' }
];

export const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'MOBILE_MONEY', label: 'Mobile money' },
  { value: 'OFFICE_PAYMENT', label: 'Pay at the office' }
];

export const INQUIRY_TYPES = [
  { value: 'BUYING', label: 'Buying land' },
  { value: 'SELLING', label: 'Selling land' },
  { value: 'VIEWING', label: 'Booking a site visit' },
  { value: 'GENERAL', label: 'General enquiry' }
];

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured first' },
  { value: 'newest', label: 'Newest listings' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'size_desc', label: 'Largest land first' }
];

const VALUE_SETS = {
  landType: new Set(LAND_TYPES.map((item) => item.value)),
  titleStatus: new Set(TITLE_STATUSES.map((item) => item.value)),
  listingStatus: new Set(LISTING_STATUSES.map((item) => item.value)),
  reservationStatus: new Set(RESERVATION_STATUSES.map((item) => item.value)),
  paymentMethod: new Set(PAYMENT_METHODS.map((item) => item.value)),
  inquiryType: new Set(INQUIRY_TYPES.map((item) => item.value))
};

export function labelFor(options, value) {
  return (options.find((item) => item.value === value) || {}).label || '';
}

export function isLandType(value) {
  return VALUE_SETS.landType.has(value);
}

export function isTitleStatus(value) {
  return VALUE_SETS.titleStatus.has(value);
}

export function isListingStatus(value) {
  return VALUE_SETS.listingStatus.has(value);
}

export function isReservationStatus(value) {
  return VALUE_SETS.reservationStatus.has(value);
}

export function isPaymentMethod(value) {
  return VALUE_SETS.paymentMethod.has(value);
}

export function isInquiryType(value) {
  return VALUE_SETS.inquiryType.has(value);
}

export function formatGhs(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'GH₵ 0';
  return 'GH₵ ' + Math.round(amount).toLocaleString('en-US');
}

export function formatAcres(value) {
  const acres = Number(value);
  if (!Number.isFinite(acres) || acres <= 0) return '—';
  const rounded = Math.round(acres * 100) / 100;
  return rounded.toLocaleString('en-US') + (rounded === 1 ? ' acre' : ' acres');
}

export function formatDate(value, options) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', options || { day: 'numeric', month: 'long', year: 'numeric' });
}

export function pricePerAcre(price, sizeAcres) {
  const size = Number(sizeAcres);
  if (!Number.isFinite(size) || size <= 0) return 0;
  return Math.round(Number(price) / size);
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function numberParam(value, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return integer ? Math.floor(number) : number;
}

export function parseListingFilters(input = {}) {
  const get = (key) => {
    if (input instanceof URLSearchParams) return input.get(key);
    if (input && typeof input.get === 'function') return input.get(key);
    return input ? input[key] : undefined;
  };
  const text = (key, max) => String(get(key) || '').trim().slice(0, max);
  const landType = text('landType', 24).toUpperCase();
  const titleStatus = text('titleStatus', 24).toUpperCase();
  const sort = text('sort', 24);
  const page = numberParam(get('page'), { min: 1, max: 10000, integer: true }) || 1;
  const requestedPageSize = get('pageSize');
  const pageSize = requestedPageSize == null || requestedPageSize === ''
    ? 9
    : Math.min(24, Math.max(1, Math.floor(Number(requestedPageSize)) || 9));
  const minPrice = numberParam(get('minPrice'), { min: 0, integer: true });
  const maxPrice = numberParam(get('maxPrice'), { min: 0, integer: true });
  const minAcres = numberParam(get('minAcres'), { min: 0 });
  const maxAcres = numberParam(get('maxAcres'), { min: 0 });

  return {
    q: text('q', 80),
    region: text('region', 60),
    landType: isLandType(landType) ? landType : '',
    titleStatus: isTitleStatus(titleStatus) ? titleStatus : '',
    minPrice,
    maxPrice,
    minAcres,
    maxAcres,
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : 'featured',
    page,
    pageSize
  };
}

export function buildListingWhere(filters) {
  const where = { status: 'PUBLISHED' };
  if (filters.region) where.region = filters.region;
  if (filters.landType) where.landType = filters.landType;
  if (filters.titleStatus) where.titleStatus = filters.titleStatus;
  if (filters.minPrice != null || filters.maxPrice != null) {
    where.price = {};
    if (filters.minPrice != null) where.price.gte = filters.minPrice;
    if (filters.maxPrice != null) where.price.lte = filters.maxPrice;
  }
  if (filters.minAcres != null || filters.maxAcres != null) {
    where.sizeAcres = {};
    if (filters.minAcres != null) where.sizeAcres.gte = filters.minAcres;
    if (filters.maxAcres != null) where.sizeAcres.lte = filters.maxAcres;
  }
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { region: { contains: filters.q, mode: 'insensitive' } },
      { district: { contains: filters.q, mode: 'insensitive' } },
      { community: { contains: filters.q, mode: 'insensitive' } },
      { summary: { contains: filters.q, mode: 'insensitive' } }
    ];
  }
  return where;
}

export function listingOrderBy(sort) {
  if (sort === 'newest') return [{ publishedAt: 'desc' }];
  if (sort === 'price_asc') return [{ price: 'asc' }];
  if (sort === 'price_desc') return [{ price: 'desc' }];
  if (sort === 'size_desc') return [{ sizeAcres: 'desc' }];
  return [{ featured: 'desc' }, { verified: 'desc' }, { publishedAt: 'desc' }];
}

export function reservationAmount(price) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return 2000;
  return Math.max(2000, Math.round((value * 0.05) / 100) * 100);
}

const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function reservationReference(date = new Date(), randomBytes) {
  const year = new Date(date).getFullYear();
  let token = '';
  if (typeof randomBytes === 'function') {
    const bytes = randomBytes(6);
    for (let index = 0; index < 6; index += 1) {
      token += REFERENCE_ALPHABET[bytes[index] % REFERENCE_ALPHABET.length];
    }
  } else {
    for (let index = 0; index < 6; index += 1) {
      token += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
    }
  }
  return 'LL-' + year + '-' + token;
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function emailOf(value) {
  const email = clean(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function phoneOf(value) {
  const phone = clean(value, 40);
  return /^[+()\d\s.-]{7,40}$/.test(phone) ? phone : '';
}

function isAllowedListingImageUrl(value) {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  if (!url) return false;

  if (/^\/assets\/land\/[a-z0-9._-]+\.(png|jpg|jpeg|webp)$/i.test(url)) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return parsed.protocol === 'https:' && (hostname === 'res.cloudinary.com' || hostname.endsWith('.res.cloudinary.com'));
  } catch {
    return false;
  }
}

export function validateReservation(input = {}) {
  const errors = {};
  const buyerName = clean(input.buyerName, 120);
  const email = emailOf(input.email);
  const phone = phoneOf(input.phone);
  const paymentMethod = String(input.paymentMethod || '').toUpperCase();
  const note = clean(input.note, 500);

  if (buyerName.length < 3) errors.buyerName = 'Enter your full name.';
  if (!email) errors.email = 'Enter a valid email address.';
  if (!phone) errors.phone = 'Enter a phone number we can reach you on.';
  if (!isPaymentMethod(paymentMethod)) errors.paymentMethod = 'Choose how you would like to pay.';
  if (input.consent !== true) errors.consent = 'Confirm that we may contact you about this reservation.';
  if (clean(input.website, 120)) errors.form = 'The form could not be submitted.';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { buyerName, email, phone, paymentMethod, note, consent: input.consent === true }
  };
}

export function validateInquiry(input = {}) {
  const errors = {};
  const rawName = typeof input.name === 'string' ? input.name.trim() : '';
  const rawEmail = typeof input.email === 'string' ? input.email.trim() : '';
  const rawPhone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const rawMessage = typeof input.message === 'string' ? input.message.trim() : '';
  const name = clean(rawName, 120);
  const email = emailOf(rawEmail);
  const phone = clean(rawPhone, 40);
  const message = clean(rawMessage, 2000);
  const requestedType = String(input.type || 'BUYING').toUpperCase();
  const type = isInquiryType(requestedType) ? requestedType : '';

  if (rawName.length > 120) errors.name = 'Keep your name under 120 characters.';
  else if (name.length < 2) errors.name = 'Enter your name.';
  if (rawEmail.length > 200) errors.email = 'Keep your email address under 200 characters.';
  else if (!email) errors.email = 'Enter a valid email address.';
  if (rawPhone.length > 40) errors.phone = 'Keep your phone number under 40 characters.';
  else if (phone && !phoneOf(phone)) errors.phone = 'Enter a valid phone number.';
  if (rawMessage.length > 2000) errors.message = 'Keep your message under 2,000 characters.';
  else if (message.length < 10) errors.message = 'Tell us a little more so we can help.';
  if (!type) errors.type = 'Choose an enquiry type.';
  if (clean(input.website, 120)) errors.form = 'The form could not be submitted.';

  return { ok: Object.keys(errors).length === 0, errors, value: { name, email, phone: phone || null, message, type } };
}

export function validateListing(input = {}) {
  const errors = {};
  const title = clean(input.title, 140);
  const region = clean(input.region, 60);
  const district = clean(input.district, 80);
  const community = clean(input.community, 80);
  const summary = clean(input.summary, 400);
  const description = clean(input.description, 10000);
  const sizeAcres = Number(input.sizeAcres);
  const price = Number(input.price);
  const landType = String(input.landType || '').toUpperCase();
  const titleStatus = String(input.titleStatus || '').toUpperCase();
  const status = String(input.status || 'DRAFT').toUpperCase();
  const coordinates = clean(input.coordinates, 80);
  const highlights = (Array.isArray(input.highlights) ? input.highlights : [])
    .map((item) => clean(item, 120))
    .filter(Boolean)
    .slice(0, 10);
  const imageUrls = (Array.isArray(input.imageUrls) ? input.imageUrls : [])
    .map((item) => clean(item, 500))
    .filter(isAllowedListingImageUrl)
    .slice(0, 8);

  if (title.length < 6) errors.title = 'Give the listing a descriptive title.';
  if (!region) errors.region = 'Choose a region.';
  if (!district) errors.district = 'Enter the district.';
  if (!isLandType(landType)) errors.landType = 'Choose a land type.';
  if (!isTitleStatus(titleStatus)) errors.titleStatus = 'Choose the title status.';
  if (!isListingStatus(status)) errors.status = 'Choose a listing status.';
  if (!Number.isFinite(sizeAcres) || sizeAcres <= 0 || sizeAcres > 100000) errors.sizeAcres = 'Enter the size in acres.';
  if (!Number.isFinite(price) || price <= 0 || price > 2_000_000_000) errors.price = 'Enter a valid price in cedis.';
  if (summary.length < 20) errors.summary = 'Write a short summary of at least 20 characters.';
  if (description.length < 40) errors.description = 'Write a fuller description of at least 40 characters.';
  if (!imageUrls.length) errors.imageUrls = 'Add at least one storefront image from the land asset library.';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      title,
      region,
      district,
      community: community || null,
      landType,
      titleStatus,
      status,
      sizeAcres,
      price: Math.round(price),
      summary,
      description,
      highlights,
      imageUrls,
      coordinates: coordinates || null,
      verified: input.verified === true,
      featured: input.featured === true
    }
  };
}

export function reservationLabel(status) {
  return labelFor(RESERVATION_STATUSES, status) || status;
}
