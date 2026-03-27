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
import { CurrentUser, JwtUser } from '../../../common/decorators/current-user.decorator';
import { QuickRepliesService } from './quick-replies.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';

@ApiTags('Quick Replies')
@ApiBearerAuth()
@Controller('messaging/quick-replies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuickRepliesController {
  constructor(private readonly quickRepliesService: QuickRepliesService) {}

  @Get()
  @RequirePermissions('messaging:templates:read')
  findAll() {
    return this.quickRepliesService.findAll();
  }

  @Post()
  @RequirePermissions('messaging:templates:write')
  create(@Body() dto: CreateQuickReplyDto, @CurrentUser() user: JwtUser) {
    return this.quickRepliesService.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('messaging:templates:write')
  update(@Param('id') id: string, @Body() dto: UpdateQuickReplyDto) {
    return this.quickRepliesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('messaging:templates:write')
  remove(@Param('id') id: string) {
    return this.quickRepliesService.remove(id);
  }
}
