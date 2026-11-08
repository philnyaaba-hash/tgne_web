import { NextResponse } from 'next/server';
import { recordAudit, requireAnyPermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { DEFAULT_SETTINGS, getSettings, saveSetting, SETTING_KEYS } from '../../../../lib/settings';
import { emailConfigured } from '../../../../lib/notifications';
import { clampInt, cleanEmail, isEmail, requiredString, VISIT_CATEGORIES } from '../../../../lib/validation';

export const runtime = 'nodejs';

function boolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function text(value, max, fallback) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

const LOGO_MARK = /^[\p{L}\p{N}]{1,2}$/u;

function normalizedWebsite(value) {
  const raw = text(value, 200, '');
  if (!raw) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'https://' + raw;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function sanitize(group, value) {
  const defaults = DEFAULT_SETTINGS[group];
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  if (group === 'organization') {
    const email = cleanEmail(input.email);
    const logoLetter = text(input.logoLetter, 2, defaults.logoLetter).toUpperCase();
    const timezone = text(input.timezone, 80, defaults.timezone);
    return {
      ...defaults,
      name: requiredString(input.name, 120) || defaults.name,
      legalName: text(input.legalName, 150, defaults.legalName),
      address: text(input.address, 300, defaults.address),
      phone: text(input.phone, 40, defaults.phone),
      email: isEmail(email) ? email : '',
      website: normalizedWebsite(input.website),
      logoLetter: LOGO_MARK.test(logoLetter) ? logoLetter : defaults.logoLetter,
      brandColor: /^#[0-9a-fA-F]{6}$/.test(input.brandColor || '') ? input.brandColor : defaults.brandColor,
      timezone: isValidTimeZone(timezone) ? timezone : defaults.timezone
    };
  }
  if (group === 'card') {
    return {
      ...defaults,
      templateName: text(input.templateName, 120, defaults.templateName),
      headerText: text(input.headerText, 60, defaults.headerText),
      footerText: text(input.footerText, 300, defaults.footerText),
      instructions: text(input.instructions, 300, defaults.instructions),
      accessZones: text(input.accessZones, 300, defaults.accessZones),
      showPhoto: boolean(input.showPhoto, defaults.showPhoto),
      showHost: boolean(input.showHost, defaults.showHost),
      showQr: boolean(input.showQr, defaults.showQr),
      accentColor: /^#[0-9a-fA-F]{6}$/.test(input.accentColor || '') ? input.accentColor : defaults.accentColor,
      paperSize: ['CR80', 'A6', 'A4'].includes(input.paperSize) ? input.paperSize : defaults.paperSize,
      autoPrint: boolean(input.autoPrint, defaults.autoPrint)
    };
  }
  if (group === 'notifications') {
    const opsEmail = cleanEmail(input.opsEmail);
    const replyTo = cleanEmail(input.replyTo);
    const fallbackRecipient = cleanEmail(input.fallbackRecipient);
    return {
      ...defaults,
      emailEnabled: boolean(input.emailEnabled, defaults.emailEnabled),
      notifyHostOnRegister: boolean(input.notifyHostOnRegister, defaults.notifyHostOnRegister),
      notifyVisitorOnRegister: boolean(input.notifyVisitorOnRegister, defaults.notifyVisitorOnRegister),
      notifyOpsOnApprovalRequired: boolean(input.notifyOpsOnApprovalRequired, defaults.notifyOpsOnApprovalRequired),
      notifyVisitorOnDecision: boolean(input.notifyVisitorOnDecision, defaults.notifyVisitorOnDecision),
      notifyHostOnCheckIn: boolean(input.notifyHostOnCheckIn, defaults.notifyHostOnCheckIn),
      notifyVisitorOnCheckOut: boolean(input.notifyVisitorOnCheckOut, defaults.notifyVisitorOnCheckOut),
      opsEmail: isEmail(opsEmail) ? opsEmail : '',
      replyTo: isEmail(replyTo) ? replyTo : '',
      fallbackRecipient: isEmail(fallbackRecipient) ? fallbackRecipient : ''
    };
  }
  if (group === 'security') {
    const categories = Array.isArray(input.requireApprovalForCategories)
      ? [...new Set(input.requireApprovalForCategories.filter((item) => VISIT_CATEGORIES.includes(item)))]
      : defaults.requireApprovalForCategories;
    return {
      ...defaults,
      defaultVisitMinutes: clampInt(input.defaultVisitMinutes, 15, 60 * 24 * 14, defaults.defaultVisitMinutes),
      qrFallbackHours: clampInt(input.qrFallbackHours, 1, 72, defaults.qrFallbackHours),
      requireApprovalForCategories: categories,
      photoRequired: boolean(input.photoRequired, defaults.photoRequired),
      consentVersion: text(input.consentVersion, 40, defaults.consentVersion),
      allowWalkIns: boolean(input.allowWalkIns, defaults.allowWalkIns)
    };
  }
  return {
    ...defaults,
    autoPrint: boolean(input.autoPrint, defaults.autoPrint),
    cardWidthMm: clampInt(input.cardWidthMm, 40, 210, defaults.cardWidthMm),
    cardHeightMm: clampInt(input.cardHeightMm, 30, 297, defaults.cardHeightMm),
    printerName: text(input.printerName, 120, defaults.printerName),
    copies: clampInt(input.copies, 1, 10, defaults.copies)
  };
}

export async function GET() {
  const auth = await requireAnyPermission(['settings.manage', 'cards.configure', 'notifications.manage', 'visitors.card.print']);
  if (auth.response) return auth.response;
  const settings = await getSettings();
  const canManage = auth.user.permissions.includes('settings.manage');
  const canConfigureCards = canManage || auth.user.permissions.includes('cards.configure') || auth.user.permissions.includes('visitors.card.print');
  const canManageNotifications = canManage || auth.user.permissions.includes('notifications.manage');
  let visible = settings;
  if (!canManage) {
    visible = { organization: settings.organization };
    if (canConfigureCards) {
      visible.card = settings.card;
      visible.print = settings.print;
    }
    if (canManageNotifications) visible.notifications = settings.notifications;
  }
  return NextResponse.json({
    settings: visible,
    canManage,
    canConfigureCards,
    canManageNotifications,
    emailConfigured: emailConfigured(),
    emailFromConfigured: Boolean(process.env.EMAIL_FROM),
    allowedGroups: SETTING_KEYS
  });
}

const GROUP_PERMISSIONS = {
  organization: ['settings.manage'],
  security: ['settings.manage'],
  card: ['settings.manage', 'cards.configure'],
  print: ['settings.manage', 'cards.configure'],
  notifications: ['settings.manage', 'notifications.manage']
};

export async function PATCH(request) {
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const group = input?.group;
  if (!SETTING_KEYS.includes(group)) return NextResponse.json({ error: 'Unknown settings group.' }, { status: 400 });
  const auth = await requireAnyPermission(GROUP_PERMISSIONS[group] || ['settings.manage']);
  if (auth.response) return auth.response;
  if (group === 'organization') {
    const value = input.value && typeof input.value === 'object' && !Array.isArray(input.value) ? input.value : {};
    if (value.email && !isEmail(cleanEmail(value.email))) {
      return NextResponse.json({ error: 'Enter a valid organization email address.' }, { status: 400 });
    }
    if (value.website && !normalizedWebsite(value.website)) {
      return NextResponse.json({ error: 'Enter a valid website address, for example https://asanteland.com.' }, { status: 400 });
    }
    if (value.timezone && !isValidTimeZone(String(value.timezone).trim())) {
      return NextResponse.json({ error: 'Choose a valid timezone, for example Africa/Accra.' }, { status: 400 });
    }
    if (value.logoLetter && !LOGO_MARK.test(String(value.logoLetter).trim())) {
      return NextResponse.json({ error: 'The logo mark must be one or two letters or numbers.' }, { status: 400 });
    }
    if (value.brandColor && !/^#[0-9a-fA-F]{6}$/.test(String(value.brandColor))) {
      return NextResponse.json({ error: 'Choose a six-digit brand color such as #125b38.' }, { status: 400 });
    }
  }
  const value = sanitize(group, input.value);
  await prisma.$transaction(async (tx) => {
    await saveSetting(tx, group, value, auth.user.id);
    await recordAudit(tx, auth.user.id, 'settings.updated', 'Setting', group, { group });
  });
  const settings = await getSettings();
  return NextResponse.json({ settings, saved: group });
}
