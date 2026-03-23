import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  await prisma.landing.updateMany({
    where: { slug },
    data: { clicks: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
