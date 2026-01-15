import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnkrService } from './ankr.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AnkrService],
  exports: [AnkrService],
})
export class AnkrModule {}

