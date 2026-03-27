import { Module } from '@nestjs/common';
import { MessagingAnalyticsController } from './messaging-analytics.controller';
import { MessagingAnalyticsService } from './messaging-analytics.service';

@Module({
  controllers: [MessagingAnalyticsController],
  providers: [MessagingAnalyticsService],
  exports: [MessagingAnalyticsService],
})
export class MessagingAnalyticsModule {}
