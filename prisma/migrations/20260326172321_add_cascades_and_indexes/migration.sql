-- DropForeignKey
ALTER TABLE "Landing" DROP CONSTRAINT "Landing_userId_fkey";

-- DropForeignKey
ALTER TABLE "LandingVisit" DROP CONSTRAINT "LandingVisit_landingId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "QuickLink" DROP CONSTRAINT "QuickLink_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuickLinkVisit" DROP CONSTRAINT "QuickLinkVisit_quickLinkId_fkey";

-- DropForeignKey
ALTER TABLE "SentEmail" DROP CONSTRAINT "SentEmail_userId_fkey";

-- DropForeignKey
ALTER TABLE "ShortLink" DROP CONSTRAINT "ShortLink_landingId_fkey";

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_userId_fkey";

-- CreateIndex
CREATE INDEX "AnalyticsConversationDaily_date_channelType_idx" ON "AnalyticsConversationDaily"("date", "channelType");

-- CreateIndex
CREATE INDEX "AnalyticsMessageDaily_date_channelType_idx" ON "AnalyticsMessageDaily"("date", "channelType");

-- CreateIndex
CREATE INDEX "AnalyticsResponseTime_date_channelType_idx" ON "AnalyticsResponseTime"("date", "channelType");

-- CreateIndex
CREATE INDEX "IncomingEmail_from_idx" ON "IncomingEmail"("from");

-- CreateIndex
CREATE INDEX "IncomingEmail_receivedAt_idx" ON "IncomingEmail"("receivedAt");

-- CreateIndex
CREATE INDEX "Landing_userId_idx" ON "Landing"("userId");

-- CreateIndex
CREATE INDEX "QuickLink_userId_idx" ON "QuickLink"("userId");

-- CreateIndex
CREATE INDEX "SentEmail_userId_idx" ON "SentEmail"("userId");

-- CreateIndex
CREATE INDEX "ShortLink_createdAt_idx" ON "ShortLink"("createdAt");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landing" ADD CONSTRAINT "Landing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortLink" ADD CONSTRAINT "ShortLink_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentEmail" ADD CONSTRAINT "SentEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickLink" ADD CONSTRAINT "QuickLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickLinkVisit" ADD CONSTRAINT "QuickLinkVisit_quickLinkId_fkey" FOREIGN KEY ("quickLinkId") REFERENCES "QuickLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingVisit" ADD CONSTRAINT "LandingVisit_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
