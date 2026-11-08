import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../../lib/office-auth';
import { prisma } from '../../../../../../../lib/prisma';
import { getGrowthSettings } from '../../../../../../../lib/growth-settings';
import { scoreProspect } from '../../../../../../../lib/growth';
import { buildEnrichmentNote, fetchSiteProfile, mergeResearchNotes } from '../../../../../../../lib/site-enrichment';
import { checkRateLimit } from '../../../../../../../lib/rate-limit.mjs';

export const runtime = 'nodejs';

const INCLUDE = {
  owner: { select: { id: true, name: true, jobTitle: true } },
  createdBy: { select: { id: true, name: true } },
  activities: { orderBy: { createdAt: 'desc' }, take: 8 }
};

export async function POST(request, { params }) {
  const auth = await requirePermission('growth.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const quota = checkRateLimit('growth-enrich:' + auth.user.id, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'Too many website checks. Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(quota.retryAfter) } }
    );
  }

  const { id } = await params;
  const existing = await prisma.prospect.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });
  if (!existing.website) return NextResponse.json({ error: 'Add a website address to this prospect first.' }, { status: 400 });

  let profile;
  try {
    profile = await fetchSiteProfile(existing.website);
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'The website could not be checked.' }, { status: 400 });
  }

  const note = buildEnrichmentNote(profile);
  const data = { researchNotes: mergeResearchNotes(existing.researchNotes, note) };
  if (!existing.industry && profile.industry && profile.industrySignals >= 2) data.industry = profile.industry;

  const settings = await getGrowthSettings();
  const scored = scoreProspect({ ...existing, ...data }, settings.target);

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.prospect.update({
      where: { id },
      data: { ...data, score: scored.score, scoreBand: scored.band, scoreReasons: scored.reasons },
      include: INCLUDE
    });
    await tx.prospectActivity.create({
      data: { prospectId: id, userId: auth.user.id, type: 'WEB', summary: 'Public website checked', detail: note }
    });
    await recordAudit(tx, auth.user.id, 'growth.prospect_enriched', 'Prospect', id, {
      url: profile.finalUrl,
      industry: data.industry || existing.industry || null
    });
    return updated;
  });

  return NextResponse.json({
    item,
    profile: {
      finalUrl: profile.finalUrl,
      title: profile.title,
      description: profile.description,
      industry: profile.industry,
      industrySignals: profile.industrySignals,
      hasContactPage: profile.hasContactPage,
      social: profile.social
    }
  });
}
