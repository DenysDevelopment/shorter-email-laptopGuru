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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  JwtUser,
} from '../../../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { ConversationTagDto } from './dto/conversation-tag.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('messaging/conversations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @RequirePermissions('messaging:conversations:read')
  findAll(@Query() query: ListConversationsDto, @CurrentUser() user: JwtUser) {
    return this.conversationsService.findAll(query, user.id);
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
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('messaging:conversations:assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.conversationsService.assign(id, dto.assigneeId, user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('messaging:conversations:read')
  markAsRead(@Param('id') id: string) {
    return this.conversationsService.markAsRead(id);
  }

  @Post(':id/tags')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('messaging:tags:manage')
  addTag(
    @Param('id') id: string,
    @Body() dto: ConversationTagDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.conversationsService.addTag(id, dto.tagId, user.id);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('messaging:tags:manage')
  removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.conversationsService.removeTag(id, tagId);
  }

  @Get(':id/notes')
  @RequirePermissions('messaging:notes:read')
  getNotes(@Param('id') id: string) {
    return this.conversationsService.getNotes(id);
  }

  @Get(':id/lead-data')
  @RequirePermissions('messaging:conversations:read')
  getLeadData(@Param('id') id: string) {
    return this.conversationsService.getLeadData(id);
  }
}
