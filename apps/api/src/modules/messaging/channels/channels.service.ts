import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { CreateChannelDto, ChannelConfigItemDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  async findAll() {
    return this.prisma.channel.findMany({
      include: { config: { select: { id: true, key: true, value: true, isSecret: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        config: { select: { id: true, key: true, value: true, isSecret: true } },
      },
    });
    if (!channel) throw new NotFoundException(`Channel ${id} not found`);

    return {
      ...channel,
      config: channel.config.map((c) => ({
        ...c,
        value: c.isSecret ? '********' : c.value,
      })),
    };
  }

  async create(dto: CreateChannelDto) {
    return this.prisma.channel.create({
      data: {
        name: dto.name,
        type: dto.type,
        isActive: dto.isActive ?? true,
        config: dto.config?.length
          ? {
              create: dto.config.map((c) => ({
                key: c.key,
                value: c.value,
                isSecret: c.isSecret ?? false,
              })),
            }
          : undefined,
      },
      include: { config: true },
    });
  }

  async update(id: string, dto: UpdateChannelDto) {
    await this.ensureExists(id);
    return this.prisma.channel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { config: true },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.channel.delete({ where: { id } });
  }

  async upsertConfig(channelId: string, items: ChannelConfigItemDto[]) {
    await this.ensureExists(channelId);

    const results = await Promise.all(
      items.map((item) =>
        this.prisma.channelConfig.upsert({
          where: { channelId_key: { channelId, key: item.key } },
          update: {
            value: item.value,
            isSecret: item.isSecret ?? false,
          },
          create: {
            channelId,
            key: item.key,
            value: item.value,
            isSecret: item.isSecret ?? false,
          },
        }),
      ),
    );

    return results;
  }

  async testConnection(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { config: true },
    });
    if (!channel) throw new NotFoundException(`Channel ${channelId} not found`);

    const provider = this.providerRegistry.get(channel.type);
    if (!provider) {
      return { success: false, error: `No provider registered for ${channel.type}` };
    }

    const configMap = new Map(channel.config.map((c) => [c.key, c.value]));

    try {
      const valid = await provider.testConnection(configMap);
      return { success: valid, error: valid ? undefined : 'Connection test failed' };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async ensureExists(id: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException(`Channel ${id} not found`);
    return channel;
  }
}
