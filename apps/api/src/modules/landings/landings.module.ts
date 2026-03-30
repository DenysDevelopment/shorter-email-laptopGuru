import { Module } from '@nestjs/common';
import { LandingsController } from './landings.controller';
import { LandingsService } from './landings.service';

@Module({
  controllers: [LandingsController],
  providers: [LandingsService],
})
export class LandingsModule {}
