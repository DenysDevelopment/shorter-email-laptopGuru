import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ContactsService } from './contacts.service';
import { CreateContactDto, ContactChannelDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { SearchContactsDto } from './dto/search-contacts.dto';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('messaging/contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @RequirePermissions('messaging:contacts:read')
  findAll(@Query() query: SearchContactsDto) {
    return this.contactsService.findAll(query);
  }

  @Post()
  @RequirePermissions('messaging:contacts:write')
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('messaging:contacts:read')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('messaging:contacts:write')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Post(':id/channels')
  @RequirePermissions('messaging:contacts:write')
  addChannel(@Param('id') id: string, @Body() dto: ContactChannelDto) {
    return this.contactsService.addChannel(id, dto);
  }

  @Post('merge')
  @RequirePermissions('messaging:contacts:write')
  merge(
    @Body() body: { sourceId: string; targetId: string },
    @CurrentUser() user: JwtUser,
  ) {
    return this.contactsService.mergeContacts(body.sourceId, body.targetId, user.id);
  }
}
