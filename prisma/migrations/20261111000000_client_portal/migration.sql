-- Client portal: profiles, holdings, documents, resale requests, service requests and watchlist.

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientCode" TEXT NOT NULL,
    "companyName" TEXT,
    "ghanaCard" TEXT,
    "address" TEXT,
    "region" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandHolding" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "listingId" TEXT,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "community" TEXT,
    "sizeAcres" DOUBLE PRECISION NOT NULL,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionPrice" INTEGER,
    "currentValue" INTEGER,
    "titleStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "titleNumber" TEXT,
    "coordinates" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "holdingId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "fileUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResaleRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "holdingId" TEXT,
    "listingId" TEXT,
    "title" TEXT NOT NULL,
    "askingPrice" INTEGER NOT NULL,
    "sizeAcres" DOUBLE PRECISION NOT NULL,
    "region" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "community" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResaleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "holdingId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SURVEY',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "quoteAmount" INTEGER,
    "invoiceNumber" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "assignedToId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceUpdate" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorRole" TEXT NOT NULL DEFAULT 'OFFICE',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandWatch" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandWatch_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "LandReservation" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_clientCode_key" ON "ClientProfile"("clientCode");

-- CreateIndex
CREATE INDEX "ClientProfile_createdAt_idx" ON "ClientProfile"("createdAt");

-- CreateIndex
CREATE INDEX "LandHolding_clientId_status_idx" ON "LandHolding"("clientId", "status");

-- CreateIndex
CREATE INDEX "LandHolding_listingId_idx" ON "LandHolding"("listingId");

-- CreateIndex
CREATE INDEX "ClientDocument_clientId_createdAt_idx" ON "ClientDocument"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientDocument_holdingId_idx" ON "ClientDocument"("holdingId");

-- CreateIndex
CREATE INDEX "ClientDocument_status_idx" ON "ClientDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ResaleRequest_reference_key" ON "ResaleRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ResaleRequest_listingId_key" ON "ResaleRequest"("listingId");

-- CreateIndex
CREATE INDEX "ResaleRequest_clientId_status_idx" ON "ResaleRequest"("clientId", "status");

-- CreateIndex
CREATE INDEX "ResaleRequest_status_createdAt_idx" ON "ResaleRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_reference_key" ON "ServiceRequest"("reference");

-- CreateIndex
CREATE INDEX "ServiceRequest_clientId_status_idx" ON "ServiceRequest"("clientId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_createdAt_idx" ON "ServiceRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_assignedToId_status_idx" ON "ServiceRequest"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "ServiceUpdate_requestId_createdAt_idx" ON "ServiceUpdate"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LandWatch_clientId_listingId_key" ON "LandWatch"("clientId", "listingId");

-- CreateIndex
CREATE INDEX "LandWatch_listingId_idx" ON "LandWatch"("listingId");

-- CreateIndex
CREATE INDEX "LandReservation_clientId_status_idx" ON "LandReservation"("clientId", "status");

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandHolding" ADD CONSTRAINT "LandHolding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandHolding" ADD CONSTRAINT "LandHolding_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "LandListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "LandHolding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleRequest" ADD CONSTRAINT "ResaleRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleRequest" ADD CONSTRAINT "ResaleRequest_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "LandHolding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleRequest" ADD CONSTRAINT "ResaleRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "LandListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleRequest" ADD CONSTRAINT "ResaleRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "LandHolding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceUpdate" ADD CONSTRAINT "ServiceUpdate_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceUpdate" ADD CONSTRAINT "ServiceUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandWatch" ADD CONSTRAINT "LandWatch_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandWatch" ADD CONSTRAINT "LandWatch_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "LandListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandReservation" ADD CONSTRAINT "LandReservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
