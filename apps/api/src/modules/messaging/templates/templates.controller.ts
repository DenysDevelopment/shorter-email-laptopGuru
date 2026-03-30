import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser, JwtUser } from '../../../common/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, CreateTemplateVariableDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('messaging/templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @RequirePermissions('messaging:templates:read')
  findAll(
    @Query('channelId') channelId?: string,
    @Query('status') status?: string,
    @Query('language') language?: string,
  ) {
    return this.templatesService.findAll({
      channelId,
      status,
      language,
    });
  }

  @Post()
  @RequirePermissions('messaging:templates:write')
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: JwtUser) {
    return this.templatesService.create(dto, user.id);
  }

  @Get(':id')
  @RequirePermissions('messaging:templates:read')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('messaging:templates:write')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('messaging:templates:write')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post(':id/variables')
  @RequirePermissions('messaging:templates:write')
  addVariable(@Param('id') id: string, @Body() dto: CreateTemplateVariableDto) {
    return this.templatesService.addVariable(id, dto);
  }
}
