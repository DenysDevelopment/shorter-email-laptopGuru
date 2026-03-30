import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { SyncService } from './sync.service';

@Controller('messaging/sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Post('email')
  async syncEmail() {
    this.logger.log('Email sync triggered via API');
    const imported = await this.syncService.syncAllEmailChannels();
    return { ok: true, imported };
  }
}
