import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesDto } from './dto/list-messages.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByConversation(conversationId: string, query: ListMessagesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          attachments: true,
          reactions: true,
          statuses: { orderBy: { timestamp: 'desc' }, take: 1 },
          geolocation: true,
          senderUser: { select: { id: true, name: true, email: true } },
          contact: { select: { id: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    senderId: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true, channel: true },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // Create the message record
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        channelId: conversation.channelId,
        direction: 'OUTBOUND',
        contentType: dto.contentType ?? 'TEXT',
        body: dto.body,
        senderId,
        contactId: conversation.contactId,
        attachments: dto.attachments?.length
          ? {
              create: dto.attachments.map((a) => ({
                fileName: a.fileName,
                mimeType: a.mimeType,
                fileSize: 0,
                storageKey: a.storageKey,
                storageUrl: a.storageUrl,
                thumbnailKey: a.thumbnailKey,
              })),
            }
          : undefined,
      },
      include: {
        attachments: true,
        senderUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Create initial status event
    await this.prisma.messageStatusEvent.create({
      data: {
        messageId: message.id,
        status: 'QUEUED',
      },
    });

    // Create outbound job for async delivery
    await this.prisma.outboundJob.create({
      data: {
        messageId: message.id,
        channelType: conversation.channel.type,
        recipientId: conversation.contactId,
        payload: JSON.stringify({
          messageId: message.id,
          conversationId,
          channelId: conversation.channelId,
          contentType: dto.contentType ?? 'TEXT',
          body: dto.body,
          attachments: dto.attachments,
        }),
        status: 'PENDING',
      },
    });

    // Update conversation timestamp and status
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        status: conversation.status === 'NEW' ? 'OPEN' : undefined,
      },
    });

    return message;
  }
}
