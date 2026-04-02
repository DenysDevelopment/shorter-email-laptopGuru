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
    await this.youtubeSyncQueue.add(
      'sync-all',
      {},
      { repeat: { every: 60 * 60 * 1000 } },
    );
  }
}
