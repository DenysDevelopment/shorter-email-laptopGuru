-- CreateTable
CREATE TABLE "LandingVisit" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "country" TEXT,
    "city" TEXT,
    "region" TEXT,
    "timezone" TEXT,
    "userAgent" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "os" TEXT,
    "osVersion" TEXT,
    "deviceType" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "pixelRatio" DOUBLE PRECISION,
    "touchSupport" BOOLEAN,
    "referrer" TEXT,
    "referrerDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "timeOnPage" INTEGER,
    "maxScrollDepth" INTEGER,
    "buyButtonClicked" BOOLEAN NOT NULL DEFAULT false,
    "videoPlayed" BOOLEAN NOT NULL DEFAULT false,
    "videoWatchTime" INTEGER,
    "videoCompleted" BOOLEAN NOT NULL DEFAULT false,
    "pageVisible" BOOLEAN NOT NULL DEFAULT true,
    "tabSwitches" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "browserLang" TEXT,
    "platform" TEXT,
    "connectionType" TEXT,

    CONSTRAINT "LandingVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingVisit_landingId_idx" ON "LandingVisit"("landingId");

-- CreateIndex
CREATE INDEX "LandingVisit_visitedAt_idx" ON "LandingVisit"("visitedAt");

-- CreateIndex
CREATE INDEX "LandingVisit_sessionId_idx" ON "LandingVisit"("sessionId");

-- AddForeignKey
ALTER TABLE "LandingVisit" ADD CONSTRAINT "LandingVisit_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "Landing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
