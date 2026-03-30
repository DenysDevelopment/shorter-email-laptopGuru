import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalEmails,
      unprocessedEmails,
      totalVideos,
      totalLandings,
      totalSent,
      failedSent,
      recentEmails,
    ] = await Promise.all([
      this.prisma.incomingEmail.count({ where: { archived: false } }),
      this.prisma.incomingEmail.count({
        where: { processed: false, archived: false },
      }),
      this.prisma.video.count({ where: { active: true } }),
      this.prisma.landing.count(),
      this.prisma.sentEmail.count(),
      this.prisma.sentEmail.count({ where: { status: 'failed' } }),
      this.prisma.incomingEmail.findMany({
        where: { archived: false },
        orderBy: { receivedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          subject: true,
          processed: true,
          receivedAt: true,
        },
      }),
    ]);

    return {
      totalEmails,
      unprocessedEmails,
      totalVideos,
      totalLandings,
      totalSent,
      failedSent,
      recentEmails,
    };
  }
}
