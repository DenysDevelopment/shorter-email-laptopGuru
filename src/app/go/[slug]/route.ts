import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function parseUA(ua: string) {
  const browser =
    ua.match(/Edg\//i) ? "Edge" :
    ua.match(/OPR\//i) ? "Opera" :
    ua.match(/(?:Chrome|CriOS)\//i) && !ua.match(/Edg\//i) ? "Chrome" :
    ua.match(/(?:Firefox|FxiOS)\//i) ? "Firefox" :
    ua.match(/Safari\//i) && !ua.match(/Chrome/i) ? "Safari" : "Other";
  const os =
    ua.match(/Windows/i) ? "Windows" :
    ua.match(/Mac OS X|macOS/i) ? "macOS" :
    ua.match(/Android/i) ? "Android" :
    ua.match(/iPhone|iPad|iPod/i) ? "iOS" :
    ua.match(/Linux/i) ? "Linux" : "Other";
  const isMobile = /Mobile|Android|iPhone|iPod/i.test(ua);
  const isTablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua);
  return { browser, os, deviceType: isTablet ? "tablet" : isMobile ? "mobile" : "desktop" };
}

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const link = await prisma.quickLink.findUnique({ where: { slug } });
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Increment click counter
  await prisma.quickLink.update({
    where: { id: link.id },
    data: { clicks: { increment: 1 } },
  });

  // Log visit with analytics
  const ua = request.headers.get("user-agent") || "";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || request.headers.get("cf-connecting-ip")
    || null;
  const ref = request.headers.get("referer") || null;
  const parsed = parseUA(ua);

  // Fire and forget — don't block redirect
  (async () => {
    let country: string | null = null, city: string | null = null;
    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country,city`, { signal: AbortSignal.timeout(2000) });
        if (geo.ok) { const d = await geo.json(); country = d.country; city = d.city; }
      } catch { /* */ }
    }
    await prisma.quickLinkVisit.create({
      data: {
        quickLinkId: link.id,
        ip, country, city,
        userAgent: ua.slice(0, 500),
        ...parsed,
        referrer: ref?.slice(0, 500) || null,
        referrerDomain: extractDomain(ref),
      },
    });
  })().catch(() => {});

  return NextResponse.redirect(link.targetUrl);
}
