export function campaignAudienceWhere(campaign) {
  const where = {
    suppressed: false,
    consentStatus: 'GRANTED',
    consentAt: { not: null },
    consentEvidence: { not: null },
    consentPurpose: { contains: 'MARKETING' },
    email: { not: null },
    repliedAt: null,
    score: { gte: Number(campaign?.minScore || 0) }
  };
  if (campaign?.segmentStage) {
    where.stage = campaign.segmentStage;
  } else {
    where.stage = { notIn: ['LOST', 'SUPPRESSED', 'RESPONDED'] };
  }
  return where;
}
