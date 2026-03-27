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
import { AutoReplyService } from './auto-reply.service';
import { CreateAutoReplyDto, UpdateAutoReplyDto } from './dto/create-auto-reply.dto';

@ApiTags('Auto Reply')
@ApiBearerAuth()
@Controller('messaging/auto-replies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AutoReplyController {
  constructor(private readonly autoReplyService: AutoReplyService) {}

  @Get()
  @RequirePermissions('messaging:autoreplies:manage')
  findAll(
    @Query('channelId') channelId?: string,
    @Query('trigger') trigger?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.autoReplyService.findAll({ channelId, trigger, isActive });
  }

  @Post()
  @RequirePermissions('messaging:autoreplies:manage')
  create(@Body() dto: CreateAutoReplyDto, @CurrentUser() user: JwtUser) {
    return this.autoReplyService.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('messaging:autoreplies:manage')
  update(@Param('id') id: string, @Body() dto: UpdateAutoReplyDto) {
    return this.autoReplyService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('messaging:autoreplies:manage')
  remove(@Param('id') id: string) {
    return this.autoReplyService.remove(id);
  }

  @Post(':id/toggle')
  @RequirePermissions('messaging:autoreplies:manage')
  toggle(@Param('id') id: string) {
    return this.autoReplyService.toggle(id);
  }
}
