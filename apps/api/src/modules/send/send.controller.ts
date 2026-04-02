import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@laptopguru-crm/shared';
import { SendService } from './send.service';

@ApiTags('Send')
@ApiBearerAuth()
@Controller('send')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SendController {
  constructor(private readonly sendService: SendService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.SEND_EXECUTE)
  send(
    @Body() body: { emailId: string; videoId: string; personalNote?: string; buyButtonText?: string; language?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.sendService.sendVideoEmail(body, user.id);
  }
}
