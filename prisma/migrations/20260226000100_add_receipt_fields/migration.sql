ALTER TABLE "DocumentRequest"
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "receiptNo" TEXT,
ADD COLUMN     "paymentApprovedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "DocumentRequest_receiptNo_key" ON "DocumentRequest"("receiptNo");
