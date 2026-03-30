import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@shorterlink/shared';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('seed-email-channel')
  @RequirePermissions(PERMISSIONS.MESSAGING_CHANNELS_WRITE)
  @HttpCode(200)
  seedEmailChannel() {
    return this.adminService.seedEmailChannel();
  }

  @Get('users')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Post('users')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  createUser(
    @Body() body: { email: string; name?: string; password: string },
  ) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  updateUser(
    @Param('id') id: string,
    @Body() body: { role?: string; permissions?: string[] },
    @CurrentUser() user: JwtUser,
  ) {
    return this.adminService.updateUser(id, body, user.id, user.email);
  }
}
