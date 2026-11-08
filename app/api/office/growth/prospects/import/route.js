import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { INDUSTRIES, PROSPECT_SOURCES, dedupeProspects, normalizeEmail, normalizedWebsite, scoreProspect } from '../../../../../../lib/growth';
import { getGrowthSettings } from '../../../../../../lib/growth-settings';
import { isPhone, optionalString, requiredString } from '../../../../../../lib/validation';

export const runtime = 'nodejs';

const MAX_ROWS = 200;

export async function POST(request) {
  const auth = await requirePermission('growth.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || !Array.isArray(input.rows)) {
    return NextResponse.json({ error: 'Provide a rows array to import.' }, { status: 400 });
  }
  if (!input.rows.length) return NextResponse.json({ error: 'There are no rows to import.' }, { status: 400 });
  if (input.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: 'Import at most ' + MAX_ROWS + ' rows at a time.' }, { status: 400 });
  }

  const invalid = [];
  const valid = [];
  input.rows.forEach((row, index) => {
    if (!row || typeof row !== 'object') {
      invalid.push('Row ' + (index + 1) + ': not a record.');
      return;
    }
    const company = requiredString(row.company, 160);
    if (company.length < 2) {
      invalid.push('Row ' + (index + 1) + ': company name is required.');
      return;
    }
    const email = row.email ? normalizeEmail(row.email) : '';
    if (row.email && !email) {
      invalid.push('Row ' + (index + 1) + ': invalid email address.');
      return;
    }
    const phone = optionalString(row.phone, 40);
    if (phone && !isPhone(phone)) {
      invalid.push('Row ' + (index + 1) + ': invalid phone number.');
      return;
    }
    const industry = optionalString(row.industry, 40);
    if (industry && !INDUSTRIES[industry]) {
      invalid.push('Row ' + (index + 1) + ': unknown industry "' + industry + '".');
      return;
    }
    if (row.website && !normalizedWebsite(row.website)) {
      invalid.push('Row ' + (index + 1) + ': invalid website.');
      return;
    }
    valid.push({
      company,
      contactName: optionalString(row.contactName, 120),
      jobTitle: optionalString(row.jobTitle, 120),
      email: email || null,
      phone,
      website: row.website ? normalizedWebsite(row.website) : null,
      location: optionalString(row.location, 120),
      industry,
      source: PROSPECT_SOURCES[row.source] ? row.source : 'IMPORT',
      sourceDetail: optionalString(input.sourceDetail, 300) || 'Imported list',
      researchNotes: optionalString(row.researchNotes, 4000),
      notes: optionalString(row.notes, 4000)
    });
  });

  const { unique, duplicates } = dedupeProspects(valid);
  const emails = unique.map((row) => row.email).filter(Boolean);
  const existing = emails.length
    ? await prisma.prospect.findMany({ where: { email: { in: emails } }, select: { email: true } })
    : [];
  const existingEmails = new Set(existing.map((row) => row.email));

  const settings = await getGrowthSettings();
  const fresh = unique.filter((row) => !row.email || !existingEmails.has(row.email));
  const skipped = unique.length - fresh.length;

  if (fresh.length) {
    await prisma.$transaction(async (tx) => {
      await tx.prospect.createMany({
        data: fresh.map((row) => {
          const scored = scoreProspect(row, settings.target);
          return {
            ...row,
            stage: 'NEW',
            consentStatus: 'UNKNOWN',
            score: scored.score,
            scoreBand: scored.band,
            scoreReasons: scored.reasons,
            createdById: auth.user.id
          };
        }),
        skipDuplicates: true
      });
      await recordAudit(tx, auth.user.id, 'growth.prospects_imported', 'Prospect', null, {
        created: fresh.length,
        skipped: skipped + duplicates.length,
        invalid: invalid.length
      });
    });
  }

  return NextResponse.json({
    created: fresh.length,
    skipped: skipped + duplicates.length,
    duplicates: duplicates.length,
    existing: skipped,
    invalid
  });
}
