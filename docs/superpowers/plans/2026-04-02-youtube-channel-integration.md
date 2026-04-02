# YouTube Channel Integration (Per-Company) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each company connect one YouTube channel and auto-sync videos from it hourly + on-demand.

**Architecture:** Add `youtubeChannelHandle` and `youtubeLastSyncAt` fields to the `Company` model. Modify the existing `VideosService` to read the handle from company instead of `.env`. Add a BullMQ repeatable job for hourly auto-sync. Add a YouTube channel management section to the `/videos` page UI.

**Tech Stack:** Prisma (PostgreSQL), NestJS, BullMQ, Next.js 16 (App Router), Tailwind CSS

---

## File Structure

### New files:
- `apps/api/src/modules/videos/youtube-sync.processor.ts` — BullMQ processor for hourly cron sync
- `apps/api/src/modules/videos/dto/update-youtube-channel.dto.ts` — DTO for channel handle validation
- `apps/web/src/app/api/youtube-channel/route.ts` — Next.js API proxy for GET/PATCH/DELETE channel
- `apps/web/src/components/dashboard/videos/youtube-channel-card.tsx` — UI component for channel management

### Modified files:
- `prisma/schema.prisma` — add 2 fields to Company model
- `apps/api/src/modules/videos/videos.module.ts` — register BullMQ queue + processor
- `apps/api/src/modules/videos/videos.service.ts` — add channel CRUD methods, modify `syncFromChannel()` to read handle from company
- `apps/api/src/modules/videos/videos.controller.ts` — add channel management endpoints
- `apps/web/src/app/(dashboard)/videos/page.tsx` — integrate YouTube channel card
- `apps/web/src/app/api/videos/sync/route.ts` — read handle from company instead of `.env`

---

### Task 1: Prisma schema — add YouTube fields to Company

**Files:**
- Modify: `prisma/schema.prisma` (Company model, lines 21-60)

- [ ] **Step 1: Add fields to Company model**

In `prisma/schema.prisma`, add two fields to the `Company` model after the `updatedAt` field (line 29):

```prisma
  youtubeChannelHandle  String?
  youtubeLastSyncAt     DateTime?
```

The full Company model will look like:
```prisma
model Company {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  youtubeChannelHandle  String?
  youtubeLastSyncAt     DateTime?

  users              User[]
  // ... rest of relations unchanged
}
```

- [ ] **Step 2: Generate and apply migration**

Run:
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK
npx prisma migrate dev --name add-youtube-channel-to-company
```

Expected: Migration creates successfully, adds two nullable columns to Company table.

- [ ] **Step 3: Regenerate Prisma clients**

Run:
```bash
npx prisma generate
```

Expected: Both Prisma clients (api + web) regenerated with new Company fields.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add youtubeChannelHandle and youtubeLastSyncAt to Company model"
```

---

### Task 2: API — YouTube channel CRUD methods in VideosService

**Files:**
- Create: `apps/api/src/modules/videos/dto/update-youtube-channel.dto.ts`
- Modify: `apps/api/src/modules/videos/videos.service.ts`

- [ ] **Step 1: Create DTO for channel handle**

Create `apps/api/src/modules/videos/dto/update-youtube-channel.dto.ts`:

```typescript
import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateYoutubeChannelDto {
  @ApiProperty({ example: '@shorterlink', description: 'YouTube channel handle or URL' })
  @IsString()
  @IsNotEmpty()
  handle: string;
}
```

- [ ] **Step 2: Add helper to extract channel handle from various inputs**

In `apps/api/src/modules/videos/videos.service.ts`, add a new top-level helper function after the existing `fetchVideoInfo` function (after line 139):

```typescript
/** Extract a clean @handle from a handle string or YouTube channel URL. */
function normalizeChannelHandle(input: string): string {
  const trimmed = input.trim();

  // Already a handle like @something
  if (/^@[\w.-]+$/.test(trimmed)) return trimmed;

  // URL like https://youtube.com/@handle or youtube.com/channel/UCxxx
  const handleMatch = trimmed.match(
    /(?:youtube\.com\/)(@[\w.-]+)/,
  );
  if (handleMatch) return handleMatch[1];

  // Raw text without @ — add it
  if (/^[\w.-]+$/.test(trimmed)) return `@${trimmed}`;

  throw new BadRequestException('Invalid YouTube channel handle or URL');
}
```

- [ ] **Step 3: Add channel info fetch helper**

In `apps/api/src/modules/videos/videos.service.ts`, add another top-level helper after `normalizeChannelHandle`:

```typescript
interface YouTubeChannelInfo {
  handle: string;
  title: string;
  thumbnail: string;
}

async function fetchChannelInfo(handle: string): Promise<YouTubeChannelInfo> {
  const apiKey = getApiKey();
  const clean = handle.startsWith('@') ? handle : `@${handle}`;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(clean)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new InternalServerErrorException(`YouTube API error: ${res.status}`);
  const data = await res.json();
  if (!data.items?.length) throw new NotFoundException(`YouTube channel not found: ${clean}`);
  const item = data.items[0];
  return {
    handle: clean,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.default?.url || '',
  };
}
```

- [ ] **Step 4: Add channel CRUD methods to VideosService**

In `apps/api/src/modules/videos/videos.service.ts`, add three new methods to the `VideosService` class (after the `remove` method):

```typescript
  /** Get the connected YouTube channel for current company. */
  async getYoutubeChannel() {
    const companyId = this.cls.get<string>('companyId');
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { youtubeChannelHandle: true, youtubeLastSyncAt: true },
    });

    if (!company?.youtubeChannelHandle) return null;

    try {
      const info = await fetchChannelInfo(company.youtubeChannelHandle);
      return {
        handle: company.youtubeChannelHandle,
        channelTitle: info.title,
        thumbnail: info.thumbnail,
        lastSyncAt: company.youtubeLastSyncAt,
      };
    } catch {
      // Channel exists in DB but can't be fetched — return what we have
      return {
        handle: company.youtubeChannelHandle,
        channelTitle: null,
        thumbnail: null,
        lastSyncAt: company.youtubeLastSyncAt,
      };
    }
  }

  /** Connect a YouTube channel to current company. Validates channel exists. */
  async updateYoutubeChannel(handleInput: string) {
    const handle = normalizeChannelHandle(handleInput);
    const info = await fetchChannelInfo(handle);

    const companyId = this.cls.get<string>('companyId');
    await this.prisma.company.update({
      where: { id: companyId },
      data: { youtubeChannelHandle: handle },
    });

    return {
      handle,
      channelTitle: info.title,
      thumbnail: info.thumbnail,
    };
  }

  /** Disconnect YouTube channel from current company. */
  async removeYoutubeChannel() {
    const companyId = this.cls.get<string>('companyId');
    await this.prisma.company.update({
      where: { id: companyId },
      data: { youtubeChannelHandle: null, youtubeLastSyncAt: null },
    });
    return { ok: true };
  }
```

- [ ] **Step 5: Modify `syncFromChannel` to read handle from company**

In `apps/api/src/modules/videos/videos.service.ts`, replace the existing `syncFromChannel` method (lines 217-264) with:

```typescript
  /** Sync all videos from the company's connected YouTube channel. */
  async syncFromChannel(userId: string) {
    const companyId = this.cls.get<string>('companyId');
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { youtubeChannelHandle: true },
    });

    if (!company?.youtubeChannelHandle) {
      throw new BadRequestException('No YouTube channel connected');
    }

    try {
      const videos = await fetchChannelVideos(company.youtubeChannelHandle);
      let imported = 0;

      for (const video of videos) {
        const existing = await this.prisma.video.findUnique({
          where: { youtubeId_companyId: { youtubeId: video.youtubeId, companyId } },
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

        await this.prisma.video.create({
          data: {
            youtubeId: video.youtubeId,
            title: video.title,
            thumbnail: video.thumbnail,
            duration: video.duration,
            channelTitle: video.channelTitle,
            userId,
            companyId,
          },
        });
        imported++;
      }

      await this.prisma.company.update({
        where: { id: companyId },
        data: { youtubeLastSyncAt: new Date() },
      });

      return { imported, total: videos.length };
    } catch (error) {
      this.logger.error('Video sync failed', error);
      throw new InternalServerErrorException('Video sync failed');
    }
  }
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/videos/
git commit -m "feat: add YouTube channel CRUD methods and per-company sync"
```

---

### Task 3: API — YouTube channel controller endpoints

**Files:**
- Modify: `apps/api/src/modules/videos/videos.controller.ts`

- [ ] **Step 1: Add channel management endpoints**

In `apps/api/src/modules/videos/videos.controller.ts`, add the import for the new DTO and add three new endpoints. The full file should be:

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { VideosService } from './videos.service';
import { AddVideoDto } from './dto/add-video.dto';
import { UpdateYoutubeChannelDto } from './dto/update-youtube-channel.dto';

@ApiTags('Videos')
@ApiBearerAuth()
@Controller('videos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  @RequirePermissions('videos:read')
  findAll() {
    return this.videosService.findAll();
  }

  @Post()
  @RequirePermissions('videos:write')
  addVideo(@Body() dto: AddVideoDto, @CurrentUser() user: JwtUser) {
    return this.videosService.addVideo(dto.url, user.id);
  }

  @Delete(':id')
  @RequirePermissions('videos:write')
  remove(@Param('id') id: string) {
    return this.videosService.remove(id);
  }

  @Post('sync')
  @RequirePermissions('videos:write')
  sync(@CurrentUser() user: JwtUser) {
    return this.videosService.syncFromChannel(user.id);
  }

  @Get('youtube-channel')
  @RequirePermissions('videos:read')
  getYoutubeChannel() {
    return this.videosService.getYoutubeChannel();
  }

  @Patch('youtube-channel')
  @RequirePermissions('videos:write')
  updateYoutubeChannel(@Body() dto: UpdateYoutubeChannelDto) {
    return this.videosService.updateYoutubeChannel(dto.handle);
  }

  @Delete('youtube-channel')
  @RequirePermissions('videos:write')
  removeYoutubeChannel() {
    return this.videosService.removeYoutubeChannel();
  }
}
```

**Important:** The `youtube-channel` routes must be defined BEFORE the `:id` route, otherwise NestJS will treat `youtube-channel` as an `:id` parameter. Ensure `@Delete(':id')` comes AFTER `@Delete('youtube-channel')`. Reorder the methods so all youtube-channel endpoints come before the `:id` route:

```typescript
  // YouTube channel management — MUST be before :id routes
  @Get('youtube-channel')
  ...
  @Patch('youtube-channel')
  ...
  @Delete('youtube-channel')
  ...

  // Generic :id routes
  @Delete(':id')
  ...
```

- [ ] **Step 2: Verify the API compiles**

Run:
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK && npx turbo build --filter=@shorterlink/api
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/videos/videos.controller.ts
git commit -m "feat: add YouTube channel management API endpoints"
```

---

### Task 4: BullMQ YouTube sync processor

**Files:**
- Create: `apps/api/src/modules/videos/youtube-sync.processor.ts`
- Modify: `apps/api/src/modules/videos/videos.module.ts`

- [ ] **Step 1: Create the BullMQ processor**

Create `apps/api/src/modules/videos/youtube-sync.processor.ts`:

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

// Re-use the same YouTube helpers from the service file.
// They are module-level functions, so we import the service and call its methods instead.
// The processor calls prisma directly since it runs outside HTTP context (no CLS).

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

          // For cron sync, there's no userId — use null-safe approach
          // Find the first admin user of this company to attribute the import
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
        // Continue to next company — don't break the loop
      }
    }

    this.logger.log(
      `YouTube sync complete: ${companies.length} companies, ${totalImported} new videos`,
    );
  }
}
```

- [ ] **Step 2: Update videos.module.ts to register the queue and processor**

Replace the contents of `apps/api/src/modules/videos/videos.module.ts` with:

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { YouTubeSyncProcessor } from './youtube-sync.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'youtube-sync' }),
  ],
  controllers: [VideosController],
  providers: [VideosService, YouTubeSyncProcessor],
  exports: [VideosService],
})
export class VideosModule implements OnModuleInit {
  constructor(
    @InjectQueue('youtube-sync') private readonly youtubeSyncQueue: Queue,
  ) {}

  async onModuleInit() {
    // Add repeatable job — idempotent, BullMQ deduplicates by repeat key
    await this.youtubeSyncQueue.add(
      'sync-all',
      {},
      { repeat: { every: 60 * 60 * 1000 } }, // every hour
    );
  }
}
```

- [ ] **Step 3: Verify the API compiles**

Run:
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK && npx turbo build --filter=@shorterlink/api
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/videos/
git commit -m "feat: add BullMQ hourly YouTube sync processor"
```

---

### Task 5: Web API routes — YouTube channel proxy

**Files:**
- Create: `apps/web/src/app/api/youtube-channel/route.ts`
- Modify: `apps/web/src/app/api/videos/sync/route.ts`

- [ ] **Step 1: Create Next.js API route for YouTube channel management**

Create `apps/web/src/app/api/youtube-channel/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

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
```

- [ ] **Step 2: Modify sync route to read handle from company**

Replace `apps/web/src/app/api/videos/sync/route.ts` with:

```typescript
import { NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { fetchChannelVideos } from "@/lib/youtube";
import { PERMISSIONS } from "@shorterlink/shared";

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
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/youtube-channel/ apps/web/src/app/api/videos/sync/route.ts
git commit -m "feat: add YouTube channel web API routes, update sync to use company handle"
```

---

### Task 6: Frontend — YouTube channel card component

**Files:**
- Create: `apps/web/src/components/dashboard/videos/youtube-channel-card.tsx`

- [ ] **Step 1: Create the YouTube channel management component**

Create `apps/web/src/components/dashboard/videos/youtube-channel-card.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

interface ChannelInfo {
  handle: string;
  channelTitle?: string | null;
  thumbnail?: string | null;
  lastSyncAt?: string | null;
}

interface SyncResult {
  imported: number;
  total: number;
}

export function YouTubeChannelCard({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const fetchChannel = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube-channel");
      const data = await res.json();
      setChannel(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchChannel();
  }, [fetchChannel]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setConnecting(true);

    try {
      const res = await fetch("/api/youtube-channel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка подключения");
      } else {
        setChannel(data);
        setHandle("");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Отключить YouTube канал? Ранее загруженные видео останутся.")) return;

    try {
      await fetch("/api/youtube-channel", { method: "DELETE" });
      setChannel(null);
    } catch {
      setError("Ошибка отключения");
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setError("");

    try {
      const res = await fetch("/api/videos/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка синхронизации");
      } else {
        setSyncResult(data);
        onSyncComplete?.();
        fetchChannel(); // refresh lastSyncAt
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return null;

  // No channel connected — show connect form
  if (!channel) {
    return (
      <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">YouTube канал</h2>
        <p className="text-sm text-gray-500 mb-4">
          Подключите YouTube канал, чтобы автоматически загружать видео.
        </p>
        <form onSubmit={handleConnect} className="flex gap-3">
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@handle или ссылка на канал"
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-muted outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={connecting || !handle.trim()}
            className="bg-brand hover:bg-brand-hover text-white font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {connecting ? "Проверка..." : "Подключить"}
          </button>
        </form>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  // Channel connected — show info card
  return (
    <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {channel.thumbnail && (
            <img
              src={channel.thumbnail}
              alt=""
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {channel.channelTitle || channel.handle}
            </h2>
            <p className="text-xs text-gray-400">
              {channel.handle}
              {channel.lastSyncAt && (
                <> &middot; Синхр. {new Date(channel.lastSyncAt).toLocaleString("ru-RU")}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-brand hover:bg-brand-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {syncing ? "Синхронизация..." : "Синхронизировать"}
          </button>
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-2"
          >
            Отключить
          </button>
        </div>
      </div>

      {syncResult && (
        <p className="text-sm text-green-600 mt-3">
          Добавлено {syncResult.imported} новых видео (всего на канале: {syncResult.total})
        </p>
      )}
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/dashboard/videos/youtube-channel-card.tsx
git commit -m "feat: add YouTubeChannelCard component"
```

---

### Task 7: Frontend — Integrate channel card into videos page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/videos/page.tsx`

- [ ] **Step 1: Add the YouTube channel card to the videos page**

In `apps/web/src/app/(dashboard)/videos/page.tsx`, add the import at the top (after the existing imports, line 6):

```typescript
import { YouTubeChannelCard } from "@/components/dashboard/videos/youtube-channel-card";
```

Then, inside the JSX, add `<YouTubeChannelCard>` right after the `<h1>` header div (after line 60, before the `<form>`):

```tsx
      <YouTubeChannelCard onSyncComplete={fetchVideos} />
```

The relevant section will look like:

```tsx
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Видео</h1>
      </div>

      <YouTubeChannelCard onSyncComplete={fetchVideos} />

      <form onSubmit={handleAdd} className="mb-8">
```

- [ ] **Step 2: Verify the web app compiles**

Run:
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK && npx turbo build --filter=web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/videos/page.tsx
git commit -m "feat: integrate YouTube channel card into videos page"
```

---

### Task 8: Manual smoke test

- [ ] **Step 1: Start dev environment**

Run:
```bash
cd /Users/denysmaksymuck/Desktop/strony/shorterLINK && npx turbo dev
```

- [ ] **Step 2: Test channel connection**

1. Navigate to `/videos`
2. Verify the "YouTube канал" card shows with connect form
3. Enter a valid YouTube handle (e.g. `@Google`)
4. Click "Подключить"
5. Verify channel info card appears with title and avatar

- [ ] **Step 3: Test manual sync**

1. Click "Синхронизировать"
2. Verify spinner shows, then result message ("Добавлено X новых видео")
3. Verify videos appear in the grid below

- [ ] **Step 4: Test disconnect**

1. Click "Отключить"
2. Confirm dialog
3. Verify connect form reappears
4. Verify previously synced videos remain in the grid

- [ ] **Step 5: Test error handling**

1. Enter invalid handle (e.g. `@nonexistent_channel_xyz_abc_123`)
2. Click "Подключить"
3. Verify error message "Канал не найден" shows

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: YouTube channel integration — per-company channel connection with auto-sync"
```
