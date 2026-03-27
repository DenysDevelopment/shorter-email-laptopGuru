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
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@ApiTags('Internal Notes')
@ApiBearerAuth()
@Controller('messaging')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('conversations/:conversationId/notes')
  @RequirePermissions('messaging:notes:read')
  findByConversation(@Param('conversationId') conversationId: string) {
    return this.notesService.findByConversation(conversationId);
  }

  @Post('conversations/:conversationId/notes')
  @RequirePermissions('messaging:notes:write')
  create(
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notesService.create(conversationId, dto.body, user.id);
  }

  @Patch('notes/:id')
  @RequirePermissions('messaging:notes:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notesService.update(id, dto.body, user.id);
  }

  @Delete('notes/:id')
  @RequirePermissions('messaging:notes:write')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.notesService.remove(id, user.id);
  }
}
