import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

interface YouTubeVideoInfo {
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: string | null;
  channelTitle: string | null;
}

function getApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured');
  return apiKey;
}

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

async function resolveChannelUploadsPlaylist(handle: string): Promise<string> {
  const apiKey = getApiKey();
  const clean = handle.startsWith('@') ? handle : `@${handle}`;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent(clean)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();
  if (!data.items?.length) throw new Error(`Channel not found: ${clean}`);
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function fetchVideosBatch(ids: string[]): Promise<YouTubeVideoInfo[]> {
  if (ids.length === 0) return [];
  const apiKey = getApiKey();
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids.join(',')}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    youtubeId: item.id as string,
    title: item.snippet.title,
    thumbnail:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url ||
      `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
    duration: item.contentDetails?.duration
      ? parseDuration(item.contentDetails.duration)
      : null,
    channelTitle: item.snippet.channelTitle || null,
  }));
}

async function fetchChannelVideos(handle: string): Promise<YouTubeVideoInfo[]> {
  const apiKey = getApiKey();
  const uploadsPlaylistId = await resolveChannelUploadsPlaylist(handle);
  const videoIds: string[] = [];
  let nextPageToken: string | undefined;
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
    const data = await res.json();
    for (const item of data.items || []) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (videoId) videoIds.push(videoId);
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  const allVideos: YouTubeVideoInfo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const videos = await fetchVideosBatch(batch);
    allVideos.push(...videos);
  }
  return allVideos;
}

@Processor('youtube-sync')
export class YouTubeSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(YouTubeSyncProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log('Starting YouTube sync for all companies...');

    const companies = await this.prisma.company.findMany({
      where: {
        youtubeChannelHandle: { not: null },
        isActive: true,
      },
      select: { id: true, youtubeChannelHandle: true },
    });

    if (companies.length === 0) {
      this.logger.log('No companies with YouTube channels configured');
      return;
    }

    let totalImported = 0;

    for (const company of companies) {
      if (!company.youtubeChannelHandle) continue;

      try {
        const videos = await fetchChannelVideos(company.youtubeChannelHandle);
        let imported = 0;

        for (const video of videos) {
          const existing = await this.prisma.video.findUnique({
            where: {
              youtubeId_companyId: {
                youtubeId: video.youtubeId,
                companyId: company.id,
              },
            },
          });

          if (existing) {
            if (!existing.active) {
              await this.prisma.video.update({
                where: { id: existing.id },
                data: { active: true },
              });
              imported++;
            }
            continue;
          }

          const adminUser = await this.prisma.user.findFirst({
            where: { companyId: company.id, role: 'ADMIN' },
            select: { id: true },
          });

          await this.prisma.video.create({
            data: {
              youtubeId: video.youtubeId,
              title: video.title,
              thumbnail: video.thumbnail,
              duration: video.duration,
              channelTitle: video.channelTitle,
              userId: adminUser?.id ?? '',
              companyId: company.id,
            },
          });
          imported++;
        }

        await this.prisma.company.update({
          where: { id: company.id },
          data: { youtubeLastSyncAt: new Date() },
        });

        if (imported > 0) {
          this.logger.log(
            `Company ${company.id}: imported ${imported} new videos from ${company.youtubeChannelHandle}`,
          );
        }
        totalImported += imported;
      } catch (error) {
        this.logger.warn(
          `Failed to sync YouTube for company ${company.id} (${company.youtubeChannelHandle}): ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    this.logger.log(
      `YouTube sync complete: ${companies.length} companies, ${totalImported} new videos`,
    );
  }
}
