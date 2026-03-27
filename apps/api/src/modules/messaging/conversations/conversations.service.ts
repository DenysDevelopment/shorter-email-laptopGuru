import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListConversationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.channelType) where.channel = { type: query.channelType };
    if (query.assigneeId) {
      where.assignments = {
        some: { userId: query.assigneeId, isActive: true },
      };
    }
    if (query.tagIds?.length) {
      where.tags = {
        some: { tagId: { in: query.tagIds } },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          contact: true,
          channel: true,
          tags: { include: { tag: true } },
          assignments: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        skip,
        take: limit,
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      }),
      this.prisma.conversation.count({ where }),
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

  async findOne(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: { include: { channels: true } },
        channel: true,
        tags: { include: { tag: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          include: {
            attachments: true,
            statuses: { orderBy: { timestamp: 'desc' }, take: 1 },
            geolocation: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        notes: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!conversation) throw new NotFoundException(`Conversation ${id} not found`);
    return conversation;
  }

  async update(id: string, dto: UpdateConversationDto) {
    await this.ensureExists(id);

    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'CLOSED' || dto.status === 'RESOLVED') {
        data.closedAt = new Date();
      }
    }
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.subject !== undefined) data.subject = dto.subject;

    return this.prisma.conversation.update({
      where: { id },
      data,
      include: {
        contact: true,
        channel: true,
        tags: { include: { tag: true } },
      },
    });
  }

  async assign(conversationId: string, userId: string, assignedById: string) {
    await this.ensureExists(conversationId);

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Deactivate existing assignments
      await tx.conversationAssignment.updateMany({
        where: { conversationId, isActive: true },
        data: { isActive: false, unassignedAt: new Date() },
      });

      const assignment = await tx.conversationAssignment.create({
        data: {
          conversationId,
          userId,
          assignedBy: assignedById,
          isActive: true,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Update conversation status to OPEN if it was NEW
      await tx.conversation.updateMany({
        where: { id: conversationId, status: 'NEW' },
        data: { status: 'OPEN' },
      });

      return assignment;
    });
  }

  async addTag(conversationId: string, tagId: string, userId: string) {
    await this.ensureExists(conversationId);

    return this.prisma.conversationTag.create({
      data: {
        conversationId,
        tagId,
        addedBy: userId,
      },
      include: { tag: true },
    });
  }

  async removeTag(conversationId: string, tagId: string) {
    await this.ensureExists(conversationId);

    const ct = await this.prisma.conversationTag.findUnique({
      where: { conversationId_tagId: { conversationId, tagId } },
    });
    if (!ct) {
      throw new NotFoundException(
        `Tag ${tagId} not found on conversation ${conversationId}`,
      );
    }

    return this.prisma.conversationTag.delete({
      where: { id: ct.id },
    });
  }

  private async ensureExists(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation) throw new NotFoundException(`Conversation ${id} not found`);
    return conversation;
  }
}
