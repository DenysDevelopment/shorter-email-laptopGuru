import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminCompaniesController } from './companies/super-admin-companies.controller';
import { SuperAdminCompaniesService } from './companies/super-admin-companies.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SuperAdminCompaniesController],
  providers: [SuperAdminCompaniesService],
})
export class SuperAdminModule {}
