import {
  Controller,
  Get,
  Patch,
  Post,
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
import { ConversationsService } from './conversations.service';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('messaging/conversations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @RequirePermissions('messaging:conversations:read')
  findAll(@Query() query: ListConversationsDto) {
    return this.conversationsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('messaging:conversations:read')
  findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('messaging:conversations:write')
  update(@Param('id') id: string, @Body() dto: UpdateConversationDto) {
    return this.conversationsService.update(id, dto);
  }

  @Post(':id/assign')
  @RequirePermissions('messaging:conversations:write')
  assign(
    @Param('id') id: string,
    @Body() body: { userId: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.conversationsService.assign(id, body.userId, user.id);
  }

  @Post(':id/tags')
  @RequirePermissions('messaging:conversations:write')
  addTag(
    @Param('id') id: string,
    @Body() body: { tagId: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.conversationsService.addTag(id, body.tagId, user.id);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('messaging:conversations:write')
  removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.conversationsService.removeTag(id, tagId);
  }
}
