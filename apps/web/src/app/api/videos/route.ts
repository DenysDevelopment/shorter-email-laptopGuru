import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { extractYoutubeId, fetchVideoInfo } from "@/lib/youtube";
import { PERMISSIONS } from "@shorterlink/shared";

export async function GET() {
  const { error } = await authorize(PERMISSIONS.VIDEOS_READ);
  if (error) return error;

  const videos = await prisma.video.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(videos);
}

export async function POST(request: NextRequest) {
  const { session, error } = await authorize(PERMISSIONS.VIDEOS_WRITE);
  if (error) return error;

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL обов'язковий" }, { status: 400 });
  }

  const youtubeId = extractYoutubeId(url);
  if (!youtubeId) {
    return NextResponse.json({ error: "Невірне YouTube посилання" }, { status: 400 });
  }

  // Check if already exists
  const existing = await prisma.video.findUnique({ where: { youtubeId } });
  if (existing) {
    if (!existing.active) {
      // Reactivate
      const video = await prisma.video.update({
        where: { youtubeId },
        data: { active: true },
      });
      return NextResponse.json(video);
    }
    return NextResponse.json({ error: "Відео вже додано" }, { status: 409 });
  }

  const info = await fetchVideoInfo(youtubeId);

  const video = await prisma.video.create({
    data: {
      youtubeId: info.youtubeId,
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      channelTitle: info.channelTitle,
      userId: session.user.id,
    },
  });

  return NextResponse.json(video, { status: 201 });
}
