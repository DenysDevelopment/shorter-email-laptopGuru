import { Module } from '@nestjs/common';
import { QuickLinksController } from './quicklinks.controller';
import { QuickLinksService } from './quicklinks.service';

@Module({
  controllers: [QuickLinksController],
  providers: [QuickLinksService],
})
export class QuickLinksModule {}
