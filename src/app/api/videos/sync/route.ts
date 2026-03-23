import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchChannelVideos } from "@/lib/youtube";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const handle = process.env.YOUTUBE_CHANNEL_HANDLE;
  if (!handle) {
    return NextResponse.json({ error: "YOUTUBE_CHANNEL_HANDLE not configured" }, { status: 500 });
  }

  try {
    const videos = await fetchChannelVideos(handle);
    let imported = 0;

    for (const video of videos) {
      const existing = await prisma.video.findUnique({
        where: { youtubeId: video.youtubeId },
      });

      if (existing) {
        if (!existing.active) {
          await prisma.video.update({
            where: { youtubeId: video.youtubeId },
            data: { active: true },
          });
          imported++;
        }
        continue;
      }

      await prisma.video.create({
        data: {
          youtubeId: video.youtubeId,
          title: video.title,
          thumbnail: video.thumbnail,
          duration: video.duration,
          channelTitle: video.channelTitle,
          userId: session.user.id,
        },
      });
      imported++;
    }

    return NextResponse.json({ imported, total: videos.length });
  } catch (error) {
    console.error("[VIDEO SYNC ERROR]", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
