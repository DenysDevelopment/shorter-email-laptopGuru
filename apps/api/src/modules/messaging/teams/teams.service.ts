import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const teams = await this.prisma.team.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return teams.map((t) => ({
      ...t,
      memberCount: t._count.members,
      _count: undefined,
    }));
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    return team;
  }

  async create(dto: CreateTeamDto) {
    return this.prisma.team.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: { _count: { select: { members: true } } },
    });
  }

  async update(id: string, dto: UpdateTeamDto) {
    await this.ensureExists(id);
    return this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { _count: { select: { members: true } } },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.team.delete({ where: { id } });
  }

  async addMember(teamId: string, dto: AddTeamMemberDto) {
    await this.ensureExists(teamId);

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: dto.userId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this team');
    }

    return this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId,
        role: dto.role ?? 'MEMBER',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async removeMember(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    return this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });
  }

  private async ensureExists(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    return team;
  }
}
