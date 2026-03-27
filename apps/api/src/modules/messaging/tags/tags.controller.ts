import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@ApiTags('Tags')
@ApiBearerAuth()
@Controller('messaging/tags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @RequirePermissions('messaging:tags:read')
  findAll() {
    return this.tagsService.findAll();
  }

  @Post()
  @RequirePermissions('messaging:tags:write')
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('messaging:tags:read')
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('messaging:tags:write')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('messaging:tags:write')
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}
