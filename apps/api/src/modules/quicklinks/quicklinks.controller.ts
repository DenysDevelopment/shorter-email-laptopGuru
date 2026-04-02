import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@laptopguru-crm/shared';
import { QuickLinksService } from './quicklinks.service';

@ApiTags('QuickLinks')
@ApiBearerAuth()
@Controller('quicklinks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuickLinksController {
  constructor(private readonly quickLinksService: QuickLinksService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.QUICKLINKS_READ)
  findAll() {
    return this.quickLinksService.findAll();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.QUICKLINKS_WRITE)
  create(
    @Body() body: { slug: string; targetUrl: string; name?: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.quickLinksService.create(body, user.id);
  }

  @Delete()
  @RequirePermissions(PERMISSIONS.QUICKLINKS_WRITE)
  remove(
    @Body() body: { id: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.quickLinksService.remove(body?.id, user);
  }
}
