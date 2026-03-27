import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChannelType, WebhookEventStatus } from '../../../generated/prisma';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('inbound-messages') private readonly inboundQueue: Queue,
  ) {}

  async processWebhook(
    channelType: ChannelType,
    rawPayload: string,
    externalId?: string,
  ): Promise<{ webhookEventId: string }> {
    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        channelType,
        externalId: externalId ?? undefined,
        payload: rawPayload,
        status: WebhookEventStatus.PENDING,
        attempts: 0,
      },
    });

    this.logger.log(
      `Saved webhook event ${webhookEvent.id} for ${channelType}`,
    );

    await this.inboundQueue.add(
      'process-inbound',
      {
        webhookEventId: webhookEvent.id,
        channelType,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    this.logger.log(
      `Enqueued inbound processing job for webhook event ${webhookEvent.id}`,
    );

    return { webhookEventId: webhookEvent.id };
  }
}
