import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@laptopguru-crm/shared";

export async function GET() {
  const { session, error } = await authorize(PERMISSIONS.VIDEOS_READ);
  if (error) return error;

  const companyId = session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "No company assigned" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { youtubeChannelHandle: true, youtubeLastSyncAt: true },
  });

  if (!company?.youtubeChannelHandle) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    handle: company.youtubeChannelHandle,
    lastSyncAt: company.youtubeLastSyncAt,
  });
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await authorize(PERMISSIONS.VIDEOS_WRITE);
  if (error) return error;

  const companyId = session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "No company assigned" }, { status: 403 });
  }

  const { handle } = await request.json();
  if (!handle || typeof handle !== "string") {
    return NextResponse.json({ error: "Handle is required" }, { status: 400 });
  }

  // Normalize handle
  let normalized = handle.trim();
  const handleMatch = normalized.match(/(?:youtube\.com\/)(@[\w.-]+)/);
  if (handleMatch) {
    normalized = handleMatch[1];
  } else if (!normalized.startsWith("@") && /^[\w.-]+$/.test(normalized)) {
    normalized = `@${normalized}`;
  }

  // Validate channel exists via YouTube API
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API not configured" }, { status: 500 });
  }

  const ytUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(normalized)}&key=${apiKey}`;
  const ytRes = await fetch(ytUrl);
  if (!ytRes.ok) {
    return NextResponse.json({ error: "YouTube API error" }, { status: 502 });
  }
  const ytData = await ytRes.json();
  if (!ytData.items?.length) {
    return NextResponse.json({ error: "Канал не найден" }, { status: 404 });
  }

  const channelTitle = ytData.items[0].snippet.title;
  const thumbnail = ytData.items[0].snippet.thumbnails?.default?.url || "";

  await prisma.company.update({
    where: { id: companyId },
    data: { youtubeChannelHandle: normalized },
  });

  return NextResponse.json({ handle: normalized, channelTitle, thumbnail });
}

export async function DELETE() {
  const { session, error } = await authorize(PERMISSIONS.VIDEOS_WRITE);
  if (error) return error;

  const companyId = session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "No company assigned" }, { status: 403 });
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { youtubeChannelHandle: null, youtubeLastSyncAt: null },
  });

  return NextResponse.json({ ok: true });
}
