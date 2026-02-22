-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- AlterTable
ALTER TABLE "Student"
ADD COLUMN     "address" TEXT,
ADD COLUMN     "course" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN     "yearLevel" TEXT;

-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'rejected';

-- AlterEnum
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
CREATE TYPE "DocumentType" AS ENUM (
    'transcript_of_records_official',
    'transcript_of_records_unofficial',
    'certificate_of_good_moral_character',
    'diploma',
    'certificate_of_enrollment',
    'certificate_of_grades',
    'honorable_dismissal',
    'certificate_of_transfer_credential',
    'certificate_of_graduation',
    'certificate_of_units_earned'
);
ALTER TABLE "DocumentRequest" ALTER COLUMN "type" TYPE "DocumentType" USING (
    CASE
        WHEN "type"::text = 'transcript_of_records' THEN 'transcript_of_records_official'
        ELSE "type"::text
    END
)::"DocumentType";
DROP TYPE "DocumentType_old";

-- AlterTable
ALTER TABLE "DocumentRequest"
ADD COLUMN     "copies" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "deliveryMethod" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "totalAmount" INTEGER;

-- CreateIndex
CREATE INDEX "DocumentRequest_status_requestedAt_idx" ON "DocumentRequest"("status", "requestedAt");
