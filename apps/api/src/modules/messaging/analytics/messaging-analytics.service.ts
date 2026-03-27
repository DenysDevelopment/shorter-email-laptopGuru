import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MessagingAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    const [totalConversations, totalMessages, byStatus] = await Promise.all([
      this.prisma.conversation.count({ where: { createdAt: dateFilter } }),
      this.prisma.message.count({ where: { createdAt: dateFilter } }),
      this.prisma.conversation.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { createdAt: dateFilter },
      }),
    ]);

    return {
      totalConversations,
      totalMessages,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }

  async getByChannel(from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    const [messageCounts, conversationCounts] = await Promise.all([
      this.prisma.analyticsMessageDaily.groupBy({
        by: ['channelType'],
        _sum: { count: true },
        where: { date: dateFilter },
      }),
      this.prisma.analyticsConversationDaily.groupBy({
        by: ['channelType'],
        _sum: { count: true },
        where: { date: dateFilter },
      }),
    ]);

    const channelMap = new Map<string, { messages: number; conversations: number }>();

    for (const m of messageCounts) {
      channelMap.set(m.channelType, {
        messages: m._sum.count ?? 0,
        conversations: 0,
      });
    }

    for (const c of conversationCounts) {
      const existing = channelMap.get(c.channelType) ?? { messages: 0, conversations: 0 };
      existing.conversations = c._sum.count ?? 0;
      channelMap.set(c.channelType, existing);
    }

    return Array.from(channelMap.entries()).map(([channelType, counts]) => ({
      channelType,
      ...counts,
    }));
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
