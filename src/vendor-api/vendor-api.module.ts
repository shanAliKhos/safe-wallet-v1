import { Module } from '@nestjs/common';
import { VendorApiController } from './vendor-api.controller';
import { WalletsModule } from '../wallets/wallets.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CoinsModule } from '../coins/coins.module';
import { SafeWalletModule } from '../safe-wallet/safe-wallet.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    WalletsModule,
    TransactionsModule,
    CoinsModule,
    SafeWalletModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [VendorApiController],
})
export class VendorApiModule {}
