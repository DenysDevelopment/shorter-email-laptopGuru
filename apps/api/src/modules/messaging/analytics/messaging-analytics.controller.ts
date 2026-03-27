import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { MessagingAnalyticsService } from './messaging-analytics.service';

@ApiTags('Messaging Analytics')
@ApiBearerAuth()
@Controller('messaging/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MessagingAnalyticsController {
  constructor(private readonly analyticsService: MessagingAnalyticsService) {}

  @Get('overview')
  @RequirePermissions('messaging:analytics:read')
  getOverview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getOverview(from, to);
  }

  @Get('by-channel')
  @RequirePermissions('messaging:analytics:read')
  getByChannel(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getByChannel(from, to);
  }

  @Get('response-times')
  @RequirePermissions('messaging:analytics:read')
  getResponseTimes(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
  ) {
    return this.analyticsService.getResponseTimes(from, to, userId);
  }

  @Get('operators')
  @RequirePermissions('messaging:analytics:read')
  getOperatorStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getOperatorStats(from, to);
  }
}
