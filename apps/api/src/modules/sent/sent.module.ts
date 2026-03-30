import { Module } from '@nestjs/common';
import { SentController } from './sent.controller';
import { SentService } from './sent.service';

@Module({
  controllers: [SentController],
  providers: [SentService],
})
export class SentModule {}
