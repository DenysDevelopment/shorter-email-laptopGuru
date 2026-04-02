import { NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { fetchChannelVideos } from "@/lib/youtube";
import { PERMISSIONS } from "@laptopguru-crm/shared";

export async function POST() {
  const { session, error } = await authorize(PERMISSIONS.VIDEOS_WRITE);
  if (error) return error;

  const companyId = session.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "No company assigned" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { youtubeChannelHandle: true },
  });

  if (!company?.youtubeChannelHandle) {
    return NextResponse.json({ error: "YouTube канал не подключен" }, { status: 400 });
  }

  try {
    const videos = await fetchChannelVideos(company.youtubeChannelHandle);
    let imported = 0;

    for (const video of videos) {
      const existing = await prisma.video.findUnique({
        where: { youtubeId_companyId: { youtubeId: video.youtubeId, companyId } },
      });

      if (existing) {
        if (!existing.active) {
          await prisma.video.update({
            where: { id: existing.id },
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
          companyId,
        },
      });
      imported++;
    }

    await prisma.company.update({
      where: { id: companyId },
      data: { youtubeLastSyncAt: new Date() },
    });

    return NextResponse.json({ imported, total: videos.length });
  } catch (err) {
    console.error("[VIDEO SYNC ERROR]", err);
    return NextResponse.json({ error: "Ошибка синхронизации видео" }, { status: 500 });
  }
}
