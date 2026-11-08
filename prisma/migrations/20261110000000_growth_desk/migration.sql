-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "contactName" TEXT,
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "location" TEXT,
    "industry" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceDetail" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBand" TEXT NOT NULL DEFAULT 'LOW',
    "scoreReasons" JSONB,
    "consentStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "consentPurpose" TEXT,
    "consentAt" TIMESTAMP(3),
    "consentEvidence" TEXT,
    "lawfulBasis" TEXT,
    "suppressed" BOOLEAN NOT NULL DEFAULT false,
    "suppressedAt" TIMESTAMP(3),
    "suppressionReason" TEXT,
    "researchNotes" TEXT,
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectActivity" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preview" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "segmentStage" TEXT,
    "minScore" INTEGER NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "messageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_email_key" ON "Prospect"("email");

-- CreateIndex
CREATE INDEX "Prospect_stage_score_idx" ON "Prospect"("stage", "score");

-- CreateIndex
CREATE INDEX "Prospect_consentStatus_suppressed_idx" ON "Prospect"("consentStatus", "suppressed");

-- CreateIndex
CREATE INDEX "Prospect_ownerId_updatedAt_idx" ON "Prospect"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "ProspectActivity_prospectId_createdAt_idx" ON "ProspectActivity"("prospectId", "createdAt");

-- CreateIndex
CREATE INDEX "OutreachCampaign_status_createdAt_idx" ON "OutreachCampaign"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_prospectId_key" ON "CampaignRecipient"("campaignId", "prospectId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_status_idx" ON "CampaignRecipient"("campaignId", "status");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectActivity" ADD CONSTRAINT "ProspectActivity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectActivity" ADD CONSTRAINT "ProspectActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachCampaign" ADD CONSTRAINT "OutreachCampaign_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachCampaign" ADD CONSTRAINT "OutreachCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "OutreachCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permissions
INSERT INTO "Permission" ("id", "key", "module", "action", "description") VALUES
    ('perm_growth_view', 'growth.view', 'Growth', 'view', 'View prospects and outreach campaigns'),
    ('perm_growth_manage', 'growth.manage', 'Growth', 'manage', 'Manage prospects, consent records, and campaign drafts'),
    ('perm_growth_send', 'growth.send', 'Growth', 'send', 'Approve and send consented outreach campaigns')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" AS role
CROSS JOIN "Permission" AS permission
WHERE role."key" IN ('SUPER_ADMIN', 'OFFICE_MANAGER')
  AND permission."key" IN ('growth.view', 'growth.manage', 'growth.send')
ON CONFLICT DO NOTHING;
