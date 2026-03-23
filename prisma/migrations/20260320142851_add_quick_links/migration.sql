-- CreateTable
CREATE TABLE "QuickLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "name" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickLinkVisit" (
    "id" TEXT NOT NULL,
    "quickLinkId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "country" TEXT,
    "city" TEXT,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "deviceType" TEXT,
    "referrer" TEXT,
    "referrerDomain" TEXT,

    CONSTRAINT "QuickLinkVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuickLink_slug_key" ON "QuickLink"("slug");

-- CreateIndex
CREATE INDEX "QuickLink_slug_idx" ON "QuickLink"("slug");

-- CreateIndex
CREATE INDEX "QuickLink_createdAt_idx" ON "QuickLink"("createdAt");

-- CreateIndex
CREATE INDEX "QuickLinkVisit_quickLinkId_idx" ON "QuickLinkVisit"("quickLinkId");

-- CreateIndex
CREATE INDEX "QuickLinkVisit_visitedAt_idx" ON "QuickLinkVisit"("visitedAt");

-- AddForeignKey
ALTER TABLE "QuickLink" ADD CONSTRAINT "QuickLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickLinkVisit" ADD CONSTRAINT "QuickLinkVisit_quickLinkId_fkey" FOREIGN KEY ("quickLinkId") REFERENCES "QuickLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
