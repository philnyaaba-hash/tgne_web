-- Lockout escalation counter: each lockout doubles the cooldown up to a cap.

ALTER TABLE "User" ADD COLUMN "lockoutCount" INTEGER NOT NULL DEFAULT 0;
