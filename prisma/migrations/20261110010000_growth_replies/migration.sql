-- Reply tracking on prospects. Replies stop automated campaign email so the
-- conversation continues personally.
ALTER TABLE "Prospect"
  ADD COLUMN "repliedAt" TIMESTAMP(3),
  ADD COLUMN "lastReplySummary" TEXT;
