import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class QuickRepliesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.msgQuickReply.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async create(dto: { shortcut: string; title: string; body: string }, userId: string) {
    if (!dto.shortcut.startsWith('/')) {
      throw new BadRequestException('Shortcut must start with /');
    }

    const existing = await this.prisma.msgQuickReply.findUnique({
      where: { shortcut: dto.shortcut },
    });
    if (existing) {
      throw new ConflictException(`Shortcut "${dto.shortcut}" already exists`);
    }

    return this.prisma.msgQuickReply.create({
      data: {
        shortcut: dto.shortcut,
        title: dto.title,
        body: dto.body,
        createdBy: userId,
      },
    });
  }

  async update(id: string, dto: { shortcut?: string; title?: string; body?: string }) {
    await this.ensureExists(id);

    if (dto.shortcut !== undefined) {
      if (!dto.shortcut.startsWith('/')) {
        throw new BadRequestException('Shortcut must start with /');
      }
      const existing = await this.prisma.msgQuickReply.findUnique({
        where: { shortcut: dto.shortcut },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Shortcut "${dto.shortcut}" already exists`);
      }
    }

    return this.prisma.msgQuickReply.update({
      where: { id },
      data: {
        ...(dto.shortcut !== undefined && { shortcut: dto.shortcut }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.msgQuickReply.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const reply = await this.prisma.msgQuickReply.findUnique({ where: { id } });
    if (!reply) throw new NotFoundException(`Quick reply ${id} not found`);
    return reply;
  }
}
