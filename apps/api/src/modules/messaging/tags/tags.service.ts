import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate, paginatedResponse } from '../../../common/dto/pagination.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 50) {
    const [data, total] = await Promise.all([
      this.prisma.tag.findMany({
        include: { _count: { select: { conversations: true } } },
        orderBy: { name: 'asc' },
        ...paginate(page, limit),
      }),
      this.prisma.tag.count(),
    ]);
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { conversations: true } } },
    });
    if (!tag) throw new NotFoundException(`Tag ${id} not found`);
    return tag;
  }

  async create(data: { name: string; color?: string }) {
    return this.prisma.tag.create({ data });
  }

  async update(id: string, data: { name?: string; color?: string }) {
    await this.ensureExists(id);
    return this.prisma.tag.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.tag.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException(`Tag ${id} not found`);
    return tag;
  }
}
