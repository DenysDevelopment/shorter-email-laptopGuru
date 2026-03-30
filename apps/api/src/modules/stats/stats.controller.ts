import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '@shorterlink/shared';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@ApiBearerAuth()
@Controller('stats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.DASHBOARD_READ)
  getStats() {
    return this.statsService.getDashboardStats();
  }
}
