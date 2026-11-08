import { prisma } from './prisma.js';
import { DEFAULT_GROWTH_SETTINGS, GHANA_REGIONS, INDUSTRIES, GROWTH_SETTING_KEY, normalizeEmail } from './growth.js';

export { GROWTH_SETTING_KEY };

function cleanText(value, max, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

export function sanitizeGrowthSettings(input = {}) {
  const target = input?.target && typeof input.target === 'object' ? input.target : {};
  const industries = Array.isArray(target.industries)
    ? [...new Set(target.industries.filter((key) => Object.prototype.hasOwnProperty.call(INDUSTRIES, key)))]
    : DEFAULT_GROWTH_SETTINGS.target.industries;
  const regions = Array.isArray(target.regions)
    ? [...new Set(target.regions.filter((region) => GHANA_REGIONS.includes(region)))]
    : DEFAULT_GROWTH_SETTINGS.target.regions;
  const minimumScore = Number(target.minimumScore);
  return {
    target: {
      industries,
      regions,
      minimumScore: Number.isFinite(minimumScore) ? Math.min(100, Math.max(0, Math.floor(minimumScore))) : DEFAULT_GROWTH_SETTINGS.target.minimumScore
    },
    batchLimit: Math.min(100, Math.max(1, Math.floor(Number(input.batchLimit) || DEFAULT_GROWTH_SETTINGS.batchLimit))),
    senderName: cleanText(input.senderName, 120),
    replyTo: normalizeEmail(input.replyTo),
    footer: cleanText(input.footer, 600) || DEFAULT_GROWTH_SETTINGS.footer
  };
}

export async function getGrowthSettings() {
  try {
    const row = await prisma.setting.findUnique({ where: { key: GROWTH_SETTING_KEY }, select: { value: true } });
    return sanitizeGrowthSettings({ ...DEFAULT_GROWTH_SETTINGS, ...(row?.value || {}), target: { ...DEFAULT_GROWTH_SETTINGS.target, ...(row?.value?.target || {}) } });
  } catch {
    return sanitizeGrowthSettings(DEFAULT_GROWTH_SETTINGS);
  }
}

export async function saveGrowthSettings(tx, value, updatedById) {
  const clean = sanitizeGrowthSettings(value);
  await tx.setting.upsert({
    where: { key: GROWTH_SETTING_KEY },
    update: { value: clean, updatedById },
    create: { key: GROWTH_SETTING_KEY, value: clean, updatedById }
  });
  return clean;
}
