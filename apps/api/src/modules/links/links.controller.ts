import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '@laptopguru-crm/shared';
import { LinksService } from './links.service';

@ApiTags('Links')
@ApiBearerAuth()
@Controller('links')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.LINKS_READ)
  findAll() {
    return this.linksService.findAll();
  }
}
