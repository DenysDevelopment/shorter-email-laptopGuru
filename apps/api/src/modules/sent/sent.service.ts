import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.sentEmail.findMany({
      orderBy: { sentAt: 'desc' },
      include: {
        landing: {
          select: {
            slug: true,
            title: true,
            video: { select: { title: true } },
          },
        },
        sentBy: { select: { name: true, email: true } },
      },
    });
  }
}
