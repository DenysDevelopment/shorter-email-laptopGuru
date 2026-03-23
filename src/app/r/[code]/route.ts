import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const shortLink = await prisma.shortLink.findUnique({
    where: { code },
    include: { landing: true },
  });

  if (!shortLink) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Increment click counter
  await prisma.shortLink.update({
    where: { id: shortLink.id },
    data: { clicks: { increment: 1 } },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/l/${shortLink.landing.slug}`);
}
