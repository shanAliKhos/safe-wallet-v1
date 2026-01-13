import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { HomeController } from './home.controller';
import { WalletsModule } from '../wallets/wallets.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    WalletsModule,
    UsersModule,
    JwtModule,
    ConfigModule,
  ],
  controllers: [HomeController],
})
export class HomeModule {}

