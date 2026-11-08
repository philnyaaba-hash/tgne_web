-- CreateTable
CREATE TABLE "LandListing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "community" TEXT,
    "landType" TEXT NOT NULL DEFAULT 'RESIDENTIAL',
    "titleStatus" TEXT NOT NULL DEFAULT 'REGISTERED',
    "sizeAcres" DOUBLE PRECISION NOT NULL,
    "price" INTEGER NOT NULL,
    "pricePerAcre" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "highlights" TEXT[],
    "imageUrls" TEXT[],
    "coordinates" TEXT,
    "sellerName" TEXT,
    "sellerPhone" TEXT,
    "sellerEmail" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "views" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandReservation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "paymentMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandInquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'BUYING',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandListing_slug_key" ON "LandListing"("slug");

-- CreateIndex
CREATE INDEX "LandListing_status_featured_publishedAt_idx" ON "LandListing"("status", "featured", "publishedAt");

-- CreateIndex
CREATE INDEX "LandListing_region_landType_price_idx" ON "LandListing"("region", "landType", "price");

-- CreateIndex
CREATE UNIQUE INDEX "LandReservation_reference_key" ON "LandReservation"("reference");

-- CreateIndex
CREATE INDEX "LandReservation_listingId_status_idx" ON "LandReservation"("listingId", "status");

-- CreateIndex
CREATE INDEX "LandReservation_email_createdAt_idx" ON "LandReservation"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LandInquiry_status_createdAt_idx" ON "LandInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LandInquiry_listingId_createdAt_idx" ON "LandInquiry"("listingId", "createdAt");

-- AddForeignKey
ALTER TABLE "LandReservation" ADD CONSTRAINT "LandReservation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "LandListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandInquiry" ADD CONSTRAINT "LandInquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "LandListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Permissions
INSERT INTO "Permission" ("id", "key", "module", "action", "description") VALUES
    ('perm_land_view', 'land.view', 'Storefront', 'view', 'View the public land storefront and its listings'),
    ('perm_land_manage', 'land.manage', 'Storefront', 'manage', 'Create, publish and manage land listings and reservations')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "Role" AS role
CROSS JOIN "Permission" AS permission
WHERE role."key" IN ('SUPER_ADMIN', 'OFFICE_MANAGER')
  AND permission."key" IN ('land.view', 'land.manage')
ON CONFLICT DO NOTHING;
