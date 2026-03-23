-- AlterTable
ALTER TABLE "IncomingEmail" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other';

-- CreateIndex
CREATE INDEX "IncomingEmail_category_idx" ON "IncomingEmail"("category");

-- CreateIndex
CREATE INDEX "IncomingEmail_customerEmail_productUrl_idx" ON "IncomingEmail"("customerEmail", "productUrl");
