import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.landing.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        video: { select: { title: true, thumbnail: true } },
        shortLinks: { select: { code: true, clicks: true } },
        incomingEmail: { select: { customerName: true, customerEmail: true } },
      },
    });
  }
}
