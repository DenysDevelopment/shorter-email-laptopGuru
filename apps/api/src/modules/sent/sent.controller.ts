import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '@laptopguru-crm/shared';
import { SentService } from './sent.service';

@ApiTags('Sent')
@ApiBearerAuth()
@Controller('sent')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SentController {
  constructor(private readonly sentService: SentService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SENT_READ)
  findAll() {
    return this.sentService.findAll();
  }
}
