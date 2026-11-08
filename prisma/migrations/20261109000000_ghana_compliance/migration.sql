-- CreateTable
CREATE TABLE "ComplianceObligation" (
    "id" TEXT NOT NULL,
    "catalogKey" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "statute" TEXT,
    "frequency" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "evidenceUrl" TEXT,
    "ownerId" TEXT,
    "filedAt" TIMESTAMP(3),
    "filedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceObligation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceObligation_catalogKey_period_key" ON "ComplianceObligation"("catalogKey", "period");

-- CreateIndex
CREATE INDEX "ComplianceObligation_dueDate_status_idx" ON "ComplianceObligation"("dueDate", "status");

-- CreateIndex
CREATE INDEX "ComplianceObligation_category_status_idx" ON "ComplianceObligation"("category", "status");

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_filedById_fkey" FOREIGN KEY ("filedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permissions
INSERT INTO "Permission" ("id", "key", "module", "action", "description") VALUES
    ('perm_compliance_view', 'compliance.view', 'Compliance', 'view', 'View Ghana compliance obligations and filings'),
    ('perm_compliance_manage', 'compliance.manage', 'Compliance', 'manage', 'Record filings, assign owners, and manage compliance obligations')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" AS role
CROSS JOIN "Permission" AS permission
WHERE role."key" IN ('SUPER_ADMIN', 'OFFICE_MANAGER', 'ACCOUNTANT')
  AND permission."key" IN ('compliance.view', 'compliance.manage')
ON CONFLICT DO NOTHING;
