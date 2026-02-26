ALTER TABLE "Student"
ADD COLUMN     "isOnHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "holdReason" TEXT,
ADD COLUMN     "holdUntil" TIMESTAMP(3),
ADD COLUMN     "isDeactivated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deactivatedAt" TIMESTAMP(3);

ALTER TABLE "DocumentRequest"
ADD COLUMN     "paymentVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "paymentVerificationNote" TEXT,
ADD COLUMN     "isOnHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "holdReason" TEXT,
ADD COLUMN     "holdUntil" TIMESTAMP(3);

CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
