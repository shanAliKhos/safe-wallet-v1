import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KeyManagementService } from './key-management.service';

@Module({
  imports: [ConfigModule],
  providers: [KeyManagementService],
  exports: [KeyManagementService],
})
export class KeyManagementModule {}

