import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { VideosService } from './videos.service';
import { AddVideoDto } from './dto/add-video.dto';

@ApiTags('Videos')
@ApiBearerAuth()
@Controller('videos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  @RequirePermissions('videos:read')
  findAll() {
    return this.videosService.findAll();
  }

  @Post()
  @RequirePermissions('videos:write')
  addVideo(@Body() dto: AddVideoDto, @CurrentUser() user: JwtUser) {
    return this.videosService.addVideo(dto.url, user.id);
  }

  @Delete(':id')
  @RequirePermissions('videos:write')
  remove(@Param('id') id: string) {
    return this.videosService.remove(id);
  }

  @Post('sync')
  @RequirePermissions('videos:write')
  sync(@CurrentUser() user: JwtUser) {
    return this.videosService.syncFromChannel(user.id);
  }
}
