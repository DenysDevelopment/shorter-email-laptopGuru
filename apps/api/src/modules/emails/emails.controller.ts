import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  JwtUser,
} from '../../common/decorators/current-user.decorator';
import { EmailsService } from './emails.service';
import { ListEmailsDto } from './dto/list-emails.dto';
import { UpdateEmailDto } from './dto/update-email.dto';

@ApiTags('Emails')
@ApiBearerAuth()
@Controller('emails')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get()
  @RequirePermissions('emails:read')
  findAll(@Query() query: ListEmailsDto) {
    return this.emailsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('emails:read')
  findOne(@Param('id') id: string) {
    return this.emailsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('emails:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmailDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.emailsService.update(id, dto, user.id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('emails:write')
  async sync() {
    const imported = await this.emailsService.syncEmails();
    return { imported };
  }
}
