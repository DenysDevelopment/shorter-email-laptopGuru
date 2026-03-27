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
import { BusinessHoursService } from './business-hours.service';
import { CreateScheduleDto, UpdateScheduleDto, CreateSlotDto } from './dto/create-schedule.dto';

@ApiTags('Business Hours')
@ApiBearerAuth()
@Controller('messaging/business-hours')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BusinessHoursController {
  constructor(private readonly businessHoursService: BusinessHoursService) {}

  @Get()
  @RequirePermissions('messaging:hours:manage')
  findAll() {
    return this.businessHoursService.findAll();
  }

  @Get('current')
  @RequirePermissions('messaging:hours:manage')
  checkCurrent() {
    return this.businessHoursService.checkCurrent();
  }

  @Post()
  @RequirePermissions('messaging:hours:manage')
  create(@Body() dto: CreateScheduleDto) {
    return this.businessHoursService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('messaging:hours:manage')
  findOne(@Param('id') id: string) {
    return this.businessHoursService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('messaging:hours:manage')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.businessHoursService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('messaging:hours:manage')
  remove(@Param('id') id: string) {
    return this.businessHoursService.remove(id);
  }

  @Post(':id/slots')
  @RequirePermissions('messaging:hours:manage')
  addSlot(@Param('id') id: string, @Body() dto: CreateSlotDto) {
    return this.businessHoursService.addSlot(id, dto);
  }

  @Delete(':id/slots/:slotId')
  @RequirePermissions('messaging:hours:manage')
  removeSlot(@Param('id') id: string, @Param('slotId') slotId: string) {
    return this.businessHoursService.removeSlot(id, slotId);
  }
}
