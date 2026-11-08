import { prisma } from './prisma';

export const SETTING_KEYS = ['organization', 'card', 'notifications', 'security', 'print'];

export const DEFAULT_SETTINGS = {
  organization: {
    name: 'Asante Land Company',
    legalName: 'Asante Land Company Limited',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoLetter: 'A',
    brandColor: '#125b38',
    timezone: 'Africa/Accra'
  },
  card: {
    templateName: 'Standard temporary visitor',
    headerText: 'TEMPORARY VISITOR',
    footerText: 'This card remains the property of the organization and must be returned at reception.',
    instructions: 'Wear this badge visibly at all times. Access is limited to the host, department, and assigned areas.',
    accessZones: 'Reception · Meeting rooms',
    showPhoto: true,
    showHost: true,
    showQr: true,
    accentColor: '#125b38',
    paperSize: 'CR80',
    autoPrint: false
  },
  notifications: {
    emailEnabled: true,
    notifyHostOnRegister: true,
    notifyVisitorOnRegister: true,
    notifyOpsOnApprovalRequired: true,
    notifyVisitorOnDecision: true,
    notifyHostOnCheckIn: true,
    notifyVisitorOnCheckOut: true,
    opsEmail: '',
    replyTo: '',
    fallbackRecipient: ''
  },
  security: {
    defaultVisitMinutes: 120,
    qrFallbackHours: 8,
    requireApprovalForCategories: [],
    photoRequired: false,
    consentVersion: '2026-11',
    allowWalkIns: true
  },
  print: {
    autoPrint: false,
    cardWidthMm: 86,
    cardHeightMm: 54,
    printerName: '',
    copies: 1
  }
};

function merge(defaults, value) {
  if (Array.isArray(defaults)) return Array.isArray(value) ? value : defaults;
  if (defaults && typeof defaults === 'object') {
    const output = { ...defaults };
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const key of Object.keys(defaults)) {
        if (key in value) output[key] = merge(defaults[key], value[key]);
      }
    }
    return output;
  }
  return value === undefined ? defaults : value;
}

export async function getSettings() {
  let rows = [];
  try {
    rows = await prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } }, select: { key: true, value: true } });
  } catch {
    rows = [];
  }
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, merge(DEFAULT_SETTINGS[key], stored[key])]));
}

export async function getSetting(key) {
  const settings = await getSettings();
  return settings[key] || merge(DEFAULT_SETTINGS[key], null);
}

export async function saveSetting(tx, key, value, updatedById) {
  if (!SETTING_KEYS.includes(key)) throw new Error('Unknown setting group.');
  const merged = merge(DEFAULT_SETTINGS[key], value);
  return tx.setting.upsert({
    where: { key },
    update: { value: merged, updatedById },
    create: { key, value: merged, updatedById }
  });
}

export function publicSettings(settings) {
  return {
    organization: settings.organization,
    card: settings.card,
    print: settings.print,
    security: {
      defaultVisitMinutes: settings.security.defaultVisitMinutes,
      qrFallbackHours: settings.security.qrFallbackHours,
      requireApprovalForCategories: settings.security.requireApprovalForCategories,
      photoRequired: settings.security.photoRequired,
      consentVersion: settings.security.consentVersion,
      allowWalkIns: settings.security.allowWalkIns
    },
    notifications: {
      emailEnabled: settings.notifications.emailEnabled,
      notifyHostOnRegister: settings.notifications.notifyHostOnRegister,
      notifyVisitorOnRegister: settings.notifications.notifyVisitorOnRegister,
      notifyOpsOnApprovalRequired: settings.notifications.notifyOpsOnApprovalRequired,
      notifyVisitorOnDecision: settings.notifications.notifyVisitorOnDecision,
      notifyHostOnCheckIn: settings.notifications.notifyHostOnCheckIn,
      notifyVisitorOnCheckOut: settings.notifications.notifyVisitorOnCheckOut,
      opsEmail: settings.notifications.opsEmail,
      replyTo: settings.notifications.replyTo,
      fallbackRecipient: settings.notifications.fallbackRecipient
    }
  };
}
