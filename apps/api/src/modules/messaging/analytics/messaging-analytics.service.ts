import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MessagingAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);
    const hasDateFilter = !!(from || to);

    const conversationWhere = hasDateFilter ? { createdAt: dateFilter } : {};

    const [
      totalConversations,
      openConversations,
      closedConversations,
      totalMessages,
      newContacts,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: conversationWhere }),
      this.prisma.conversation.count({
        where: {
          status: { in: ['NEW', 'OPEN', 'WAITING_REPLY'] },
          ...conversationWhere,
        },
      }),
      this.prisma.conversation.count({
        where: {
          status: { in: ['CLOSED', 'RESOLVED'] },
          ...conversationWhere,
        },
      }),
      this.prisma.message.count({
        where: hasDateFilter ? { createdAt: dateFilter } : {},
      }),
      this.prisma.contact.count({
        where: hasDateFilter ? { createdAt: dateFilter } : {},
      }),
    ]);

    // Calculate avg response time from analytics table
    let avgResponseTime = 0;
    if (hasDateFilter) {
      const responseStats = await this.prisma.analyticsResponseTime.aggregate({
        where: { date: dateFilter },
        _avg: { avgResponseMs: true },
      });
      avgResponseTime = (responseStats._avg.avgResponseMs || 0) / 1000;
    }

    return {
      totalConversations,
      totalMessages,
      avgResponseTime,
      openConversations,
      closedConversations,
      newContacts,
    };
  }

  async getByChannel(from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);
    const hasDateFilter = !!(from || to);
    const dateWhere = hasDateFilter ? { date: dateFilter } : {};

    const [convByChannel, msgByChannel, rtByChannel] = await Promise.all([
      this.prisma.analyticsConversationDaily.groupBy({
        by: ['channelType'],
        where: dateWhere,
        _sum: { count: true },
      }),
      this.prisma.analyticsMessageDaily.groupBy({
        by: ['channelType'],
        where: dateWhere,
        _sum: { count: true },
      }),
      this.prisma.analyticsResponseTime.groupBy({
        by: ['channelType'],
        where: dateWhere,
        _avg: { avgResponseMs: true },
      }),
    ]);

    // Merge all stats by channel type
    const channelTypes = new Set<string>();
    convByChannel.forEach((c) => channelTypes.add(c.channelType));
    msgByChannel.forEach((m) => channelTypes.add(m.channelType));
    rtByChannel.forEach((r) => channelTypes.add(r.channelType));

    const stats = Array.from(channelTypes).map((channelType) => {
      const conv = convByChannel.find((c) => c.channelType === channelType);
      const msg = msgByChannel.find((m) => m.channelType === channelType);
      const rt = rtByChannel.find((r) => r.channelType === channelType);

      return {
        channelType,
        conversations: conv?._sum.count || 0,
        messages: msg?._sum.count || 0,
        avgResponseTime: (rt?._avg.avgResponseMs || 0) / 1000,
      };
    });

    // Sort by conversations desc
    stats.sort((a, b) => b.conversations - a.conversations);

    return stats;
  }

  async getResponseTimes(from?: string, to?: string, userId?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    const records = await this.prisma.analyticsResponseTime.findMany({
      where: {
        date: dateFilter,
        ...(userId && { userId }),
      },
      orderBy: { date: 'asc' },
    });

    if (records.length === 0) {
      return { avgResponseMs: 0, medianResponseMs: 0, p95ResponseMs: 0, sampleCount: 0 };
    }

    const totalSamples = records.reduce((sum, r) => sum + r.sampleCount, 0);
    const weightedAvg =
      records.reduce((sum, r) => sum + r.avgResponseMs * r.sampleCount, 0) / (totalSamples || 1);

    const medians = records.filter((r) => r.medianResponseMs !== null).map((r) => r.medianResponseMs!);
    const p95s = records.filter((r) => r.p95ResponseMs !== null).map((r) => r.p95ResponseMs!);

    return {
      avgResponseMs: Math.round(weightedAvg),
      medianResponseMs: medians.length > 0 ? Math.round(median(medians)) : null,
      p95ResponseMs: p95s.length > 0 ? Math.max(...p95s) : null,
      sampleCount: totalSamples,
      daily: records.map((r) => ({
        date: r.date,
        channelType: r.channelType,
        avgResponseMs: r.avgResponseMs,
        medianResponseMs: r.medianResponseMs,
        p95ResponseMs: r.p95ResponseMs,
        sampleCount: r.sampleCount,
      })),
    };
  }

  async getOperatorStats(from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    const [assignments, messageCounts, responseTimes] = await Promise.all([
      this.prisma.conversationAssignment.groupBy({
        by: ['userId'],
        _count: { id: true },
        where: {
          isActive: true,
          createdAt: dateFilter,
        },
      }),
      this.prisma.message.groupBy({
        by: ['senderId'],
        _count: { id: true },
        where: {
          direction: 'OUTBOUND',
          senderId: { not: null },
          createdAt: dateFilter,
        },
      }),
      this.prisma.analyticsResponseTime.groupBy({
        by: ['userId'],
        _avg: { avgResponseMs: true },
        _sum: { sampleCount: true },
        where: {
          date: dateFilter,
          userId: { not: null },
        },
      }),
    ]);

    const operatorMap = new Map<
      string,
      { assignedConversations: number; messagesSent: number; avgResponseMs: number | null }
    >();

    for (const a of assignments) {
      operatorMap.set(a.userId, {
        assignedConversations: a._count.id,
        messagesSent: 0,
        avgResponseMs: null,
      });
    }

    for (const m of messageCounts) {
      if (!m.senderId) continue;
      const existing = operatorMap.get(m.senderId) ?? {
        assignedConversations: 0,
        messagesSent: 0,
        avgResponseMs: null,
      };
      existing.messagesSent = m._count.id;
      operatorMap.set(m.senderId, existing);
    }

    for (const r of responseTimes) {
      if (!r.userId) continue;
      const existing = operatorMap.get(r.userId) ?? {
        assignedConversations: 0,
        messagesSent: 0,
        avgResponseMs: null,
      };
      existing.avgResponseMs = r._avg.avgResponseMs ? Math.round(r._avg.avgResponseMs) : null;
      operatorMap.set(r.userId, existing);
    }

    const userIds = Array.from(operatorMap.keys());
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return Array.from(operatorMap.entries()).map(([userId, stats]) => ({
      userId,
      name: userMap.get(userId)?.name ?? null,
      email: userMap.get(userId)?.email ?? null,
      ...stats,
    }));
  }

  private buildDateFilter(from?: string, to?: string) {
    if (!from && !to) return undefined;
    return {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
