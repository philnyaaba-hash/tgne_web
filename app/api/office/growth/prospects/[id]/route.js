import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import {
  CONSENT_STATUSES,
  INDUSTRIES,
  LAWFUL_BASES,
  PROSPECT_SOURCES,
  PROSPECT_STAGES,
  consentCoversMarketing,
  normalizeEmail,
  normalizedWebsite,
  scoreProspect
} from '../../../../../../lib/growth';
import { getGrowthSettings } from '../../../../../../lib/growth-settings';
import { isPhone, optionalString, parseDate } from '../../../../../../lib/validation';

export const runtime = 'nodejs';

const INCLUDE = {
  owner: { select: { id: true, name: true, jobTitle: true } },
  createdBy: { select: { id: true, name: true } },
  activities: { orderBy: { createdAt: 'desc' }, take: 8 }
};

export async function PATCH(request, { params }) {
  const auth = await requirePermission('growth.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ error: 'Request must be a JSON object.' }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.prospect.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });

  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (has('company')) {
    const company = optionalString(input.company, 160);
    if (!company || company.length < 2) return NextResponse.json({ error: 'Enter the company or organisation name.' }, { status: 400 });
    data.company = company;
  }
  if (has('contactName')) data.contactName = optionalString(input.contactName, 120);
  if (has('jobTitle')) data.jobTitle = optionalString(input.jobTitle, 120);
  if (has('phone')) {
    const phone = optionalString(input.phone, 40);
    if (phone && !isPhone(phone)) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
    data.phone = phone;
  }
  if (has('location')) data.location = optionalString(input.location, 120);
  if (has('sourceDetail')) data.sourceDetail = optionalString(input.sourceDetail, 300);
  if (has('notes')) data.notes = optionalString(input.notes, 4000);
  if (has('researchNotes')) data.researchNotes = optionalString(input.researchNotes, 4000);
  if (has('ownerId')) {
    const ownerId = optionalString(input.ownerId, 50);
    if (ownerId) {
      const owner = await prisma.user.findFirst({ where: { id: ownerId, status: 'ACTIVE' }, select: { id: true } });
      if (!owner) return NextResponse.json({ error: 'Selected owner is unavailable.' }, { status: 400 });
    }
    data.ownerId = ownerId;
  }
  if (has('industry')) {
    const industry = optionalString(input.industry, 40);
    if (industry && !INDUSTRIES[industry]) return NextResponse.json({ error: 'Choose a valid industry.' }, { status: 400 });
    data.industry = industry;
  }
  if (has('source')) {
    const source = optionalString(input.source, 30);
    if (source && !PROSPECT_SOURCES[source]) return NextResponse.json({ error: 'Choose a valid source.' }, { status: 400 });
    data.source = source || existing.source;
  }
  if (has('email')) {
    const email = input.email ? normalizeEmail(input.email) : '';
    if (input.email && !email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    if (email && email !== existing.email) {
      const conflict = await prisma.prospect.findUnique({ where: { email }, select: { id: true, company: true } });
      if (conflict) return NextResponse.json({ error: 'That email is already on the prospect list (' + conflict.company + ').' }, { status: 409 });
    }
    data.email = email || null;
  }
  if (has('website')) {
    if (input.website && !normalizedWebsite(input.website)) return NextResponse.json({ error: 'Website must be a valid http(s) address.' }, { status: 400 });
    data.website = input.website ? normalizedWebsite(input.website) : null;
  }

  const consentStatus = has('consentStatus') ? optionalString(input.consentStatus, 20) : existing.consentStatus;
  if (!CONSENT_STATUSES[consentStatus]) return NextResponse.json({ error: 'Choose a valid consent status.' }, { status: 400 });

  if (has('consentStatus')) {
    data.consentStatus = consentStatus;
    if (consentStatus === 'GRANTED') {
      const lawfulBasis = has('lawfulBasis') ? optionalString(input.lawfulBasis, 30) : existing.lawfulBasis;
      if (!['CONSENT', 'LEGITIMATE_INTEREST'].includes(lawfulBasis)) {
        return NextResponse.json({ error: 'Choose consent or legitimate interest as the lawful basis.' }, { status: 400 });
      }
      const purpose = 'MARKETING';
      const evidence = has('consentEvidence') ? optionalString(input.consentEvidence, 2000) : existing.consentEvidence;
      if (!evidence || evidence.length < 5) {
        return NextResponse.json({ error: 'Record where and how consent was captured.' }, { status: 400 });
      }
      let consentAt = existing.consentAt;
      if (has('consentDate') && input.consentDate) {
        const parsed = parseDate(input.consentDate);
        if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: 'Enter a valid consent date.' }, { status: 400 });
        if (parsed.getTime() > Date.now() + 86400000) return NextResponse.json({ error: 'Consent date cannot be in the future.' }, { status: 400 });
        if (existing.suppressed && existing.suppressedAt && parsed.getTime() <= new Date(existing.suppressedAt).getTime()) {
          return NextResponse.json({ error: 'New consent must be dated after the opt-out.' }, { status: 400 });
        }
        consentAt = parsed;
      }
      data.lawfulBasis = lawfulBasis;
      data.consentPurpose = purpose;
      data.consentAt = consentAt || new Date();
      data.consentEvidence = evidence;
    } else if (consentStatus === 'WITHDRAWN') {
      data.lawfulBasis = has('lawfulBasis') ? optionalString(input.lawfulBasis, 30) || existing.lawfulBasis : existing.lawfulBasis;
      data.suppressed = true;
      data.suppressedAt = new Date();
      data.suppressionReason = optionalString(input.suppressionReason, 300) || 'Consent withdrawn';
      data.stage = 'SUPPRESSED';
    } else {
      if (has('lawfulBasis')) data.lawfulBasis = optionalString(input.lawfulBasis, 30);
      if (has('consentPurpose')) data.consentPurpose = optionalString(input.consentPurpose, 120);
      if (has('consentEvidence')) data.consentEvidence = optionalString(input.consentEvidence, 2000);
    }
  } else if (has('lawfulBasis') || has('consentPurpose') || has('consentEvidence')) {
    if (existing.consentStatus === 'GRANTED') {
      return NextResponse.json({ error: 'Change the consent status before editing a granted consent record.' }, { status: 400 });
    }
    if (has('lawfulBasis')) {
      const lawfulBasis = optionalString(input.lawfulBasis, 30);
      if (lawfulBasis && !LAWFUL_BASES[lawfulBasis]) return NextResponse.json({ error: 'Choose a valid lawful basis.' }, { status: 400 });
      data.lawfulBasis = lawfulBasis;
    }
    if (has('consentPurpose')) data.consentPurpose = optionalString(input.consentPurpose, 120);
    if (has('consentEvidence')) data.consentEvidence = optionalString(input.consentEvidence, 2000);
  }

  if (has('stage')) {
    const stage = optionalString(input.stage, 30);
    if (!PROSPECT_STAGES[stage]) return NextResponse.json({ error: 'Choose a valid stage.' }, { status: 400 });
    if (existing.suppressed && stage !== 'SUPPRESSED') {
      return NextResponse.json({ error: 'Remove this prospect from the do-not-contact list before reopening it.' }, { status: 409 });
    }
    if (stage === 'SUPPRESSED') {
      data.stage = 'SUPPRESSED';
      data.suppressed = true;
      data.suppressedAt = existing.suppressedAt || new Date();
      data.suppressionReason = existing.suppressionReason || 'Marked as suppressed';
    } else if (!data.stage) {
      data.stage = stage;
    }
  }

  if (has('suppressed')) {
    if (input.suppressed === true) {
      data.suppressed = true;
      data.suppressedAt = existing.suppressedAt || new Date();
      data.suppressionReason = optionalString(input.suppressionReason, 300) || existing.suppressionReason || 'Marked as do not contact';
      data.stage = 'SUPPRESSED';
    } else if (input.suppressed === false) {
      if (consentStatus !== 'GRANTED' || !consentCoversMarketing({ consentPurpose: data.consentPurpose || existing.consentPurpose })) {
        return NextResponse.json({ error: 'Record marketing consent before removing the do-not-contact entry.' }, { status: 400 });
      }
      data.suppressed = false;
      data.suppressedAt = null;
      data.suppressionReason = null;
      if (existing.stage === 'SUPPRESSED') data.stage = 'NEW';
    }
  }

  const clearingReply = has('clearReply') && input.clearReply === true;
  if (clearingReply) {
    data.repliedAt = null;
    data.lastReplySummary = null;
    if (existing.stage === 'RESPONDED') data.stage = 'CONTACTED';
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const merged = { ...existing, ...data };
  const settings = await getGrowthSettings();
  const scored = scoreProspect(merged, settings.target);

  const activityType = clearingReply ? 'NOTE' : has('consentStatus') ? 'CONSENT' : has('suppressed') || has('stage') ? 'STAGE' : 'NOTE';
  const activitySummary = clearingReply
    ? 'Reply cleared; automated outreach may resume'
    : activityType === 'CONSENT'
      ? 'Consent ' + consentStatus.toLowerCase()
      : activityType === 'STAGE'
        ? 'Stage changed to ' + (PROSPECT_STAGES[merged.stage] || merged.stage)
        : 'Prospect details updated';

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.prospect.update({
      where: { id },
      data: { ...data, score: scored.score, scoreBand: scored.band, scoreReasons: scored.reasons },
      include: INCLUDE
    });
    if (has('consentStatus') || has('suppressed') || has('stage') || clearingReply) {
      await tx.prospectActivity.create({
        data: {
          prospectId: id,
          userId: auth.user.id,
          type: activityType,
          summary: activitySummary,
          detail: activityType === 'CONSENT' ? optionalString(input.consentEvidence, 1000) : optionalString(input.suppressionReason, 500)
        }
      });
    }
    await recordAudit(tx, auth.user.id, 'growth.prospect_updated', 'Prospect', id, {
      consentStatus: updated.consentStatus,
      stage: updated.stage,
      suppressed: updated.suppressed
    });
    return updated;
  });

  return NextResponse.json({ item });
}
