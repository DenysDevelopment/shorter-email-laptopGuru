# YouTube Channel Integration (Per-Company)

**Date:** 2026-04-02
**Status:** Draft

## Summary

Each company (tenant) can connect one YouTube channel via handle/URL in the UI. Videos from the channel are auto-synced hourly via BullMQ cron job and can also be synced manually. No OAuth required — works with public channels using the existing global YouTube Data API v3 key.

## Requirements

- Each company connects exactly one YouTube channel
- Connection via handle (`@channel`) or channel URL — no OAuth
- Auto-sync every hour via BullMQ repeatable job
- Manual sync via "Синхронизировать" button
- New videos appear in existing video library (`/videos`)
- YouTube API key remains global in `.env` (one server key per app)
- Tenant-isolated: companies only see their own videos (already enforced)

## Data Model Changes

### Company model — add two fields:

```prisma
model Company {
  // ... existing fields ...
  youtubeChannelHandle  String?    // e.g. "@shorterlink", "UCxxxxxx"
  youtubeLastSyncAt     DateTime?  // last successful sync timestamp
}
```

No new tables. The existing `Video` model (with `companyId` FK and `@@unique([youtubeId, companyId])`) handles storage.

## API Changes

### New endpoints

All scoped to current company via CLS context (`companyId`).

#### `GET /companies/youtube-channel`

Returns the connected channel info.

**Response:**
```json
{
  "handle": "@shorterlink",
  "channelTitle": "ShorterLink",
  "lastSyncAt": "2026-04-02T12:00:00Z"
}
```
Returns `null` if no channel connected.

#### `PATCH /companies/youtube-channel`

Connect or update the YouTube channel.

**Request body:**
```json
{ "handle": "@shorterlink" }
```

**Behavior:**
1. Normalize handle (strip URL prefix, ensure `@` prefix)
2. Validate channel exists via YouTube API (`channels?forHandle=...`)
3. Save `youtubeChannelHandle` to company
4. Return channel info (title, handle) for UI confirmation

**Errors:**
- `400` — invalid handle format
- `404` — channel not found on YouTube

#### `DELETE /companies/youtube-channel`

Disconnect channel. Sets `youtubeChannelHandle` and `youtubeLastSyncAt` to `null`. Does NOT delete previously synced videos.

#### `POST /videos/sync` (existing, modified)

Currently reads handle from `process.env.YOUTUBE_CHANNEL_HANDLE`. Change to read from `company.youtubeChannelHandle` instead.

**Behavior:**
1. Get `youtubeChannelHandle` from current company
2. If no channel connected — return `400`
3. Fetch all videos from channel via YouTube API
4. Skip existing videos (by `youtubeId + companyId` unique constraint)
5. Re-activate soft-deleted videos if found
6. Update `company.youtubeLastSyncAt`
7. Return `{ imported: number, total: number }`

**Permission:** `videos:write` (already exists)

### YouTube helper refactor

The YouTube helper functions (`resolveChannelUploadsPlaylist`, `fetchChannelVideos`, `fetchVideosBatch`, `fetchVideoInfo`) are currently duplicated between `apps/api/src/modules/videos/videos.service.ts` and `apps/web/src/lib/youtube.ts`.

Move the shared logic to `packages/shared/src/youtube.ts` so both apps can import from `@shorter/shared`. The web app uses these for client-side video preview; the API uses them for sync. Single source of truth.

## BullMQ Cron Job

### Queue: `youtube-sync`

**Setup in `videos.module.ts`:**
```ts
BullModule.registerQueue({ name: 'youtube-sync' })
```

**Processor: `youtube-sync.processor.ts`**

Repeatable job running every hour:
1. Query all companies where `youtubeChannelHandle IS NOT NULL` and `isActive = true`
2. For each company:
   a. Fetch channel videos via YouTube API
   b. Upsert new videos into `Video` table with company's `companyId`
   c. Update `youtubeLastSyncAt`
   d. On error: log warning, continue to next company (don't break the loop)
3. Log summary: `"YouTube sync complete: X companies, Y new videos"`

**Registration:** Register the queue in `videos.module.ts`. The repeatable job is added on module init (via `onModuleInit`) by calling `queue.add('sync-all', {}, { repeat: { every: 60 * 60 * 1000 } })` — idempotent, BullMQ deduplicates repeatable jobs by key.

**Note on CLS context:** The cron processor runs outside HTTP request context, so there's no CLS `companyId`. The processor directly passes `companyId` to queries — no CLS needed here.

### YouTube API quota awareness

YouTube Data API v3 quota: 10,000 units/day.
- `channels.list` = 1 unit
- `playlistItems.list` = 1 unit
- `videos.list` = 1 unit

Per company sync: ~2-3 units (1 channel lookup + 1 playlist page + 1 video batch per 50 videos).
For 100 companies syncing hourly: ~300 units/hour = ~7,200 units/day. Well within limits.

Log a warning if approaching 80% of daily quota (track call count in memory).

## UI

### Settings page: `/videos` (add section to existing page)

Add a "YouTube канал" section at the top of the existing `/videos` page (before the video grid):

**State: No channel connected**
- Input field with placeholder "Введите @handle или URL канала"
- "Подключить" button
- On submit: call `PATCH /companies/youtube-channel`, show channel title for confirmation

**State: Channel connected**
- Card showing: channel title, handle, last sync time
- "Синхронизировать" button — calls `POST /videos/sync`, shows spinner + result toast ("Добавлено X новых видео")
- "Отключить" link — calls `DELETE /companies/youtube-channel` with confirmation dialog

**Validation flow:**
1. User enters handle/URL
2. Frontend calls PATCH endpoint
3. Backend validates via YouTube API
4. On success: shows channel info card
5. On error: shows error message ("Канал не найден")

### Video library (existing `/videos` grid)

No changes to the grid. Synced videos appear alongside manually added ones. Both use the same `Video` model.

## File Changes Summary

### New files:
- `apps/api/src/modules/videos/youtube-sync.processor.ts` — BullMQ cron processor
- `packages/shared/src/youtube.ts` — shared YouTube helper functions

### Modified files:
- `prisma/schema.prisma` — add 2 fields to Company
- `apps/api/src/modules/videos/videos.module.ts` — register `youtube-sync` queue + processor
- `apps/api/src/modules/videos/videos.service.ts` — modify `syncFromChannel()` to read handle from company, add channel CRUD methods, import helpers from shared
- `apps/api/src/modules/videos/videos.controller.ts` — add channel management endpoints
- `apps/web/src/app/(dashboard)/videos/page.tsx` — add YouTube channel section
- `apps/web/src/lib/youtube.ts` — replace with re-export from `@shorter/shared` or remove
- `packages/api-client/` — regenerate (Orval) to include new endpoints

## Out of Scope

- OAuth / Google Sign-In for private channels
- Multiple channels per company
- YouTube Analytics integration
- Webhook-based real-time sync (YouTube push notifications)
- Per-video sync control (include/exclude specific videos)
