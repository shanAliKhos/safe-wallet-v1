import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SafeWalletService } from './safe-wallet.service';
import { Wallet, WalletSchema } from '../wallets/schemas/wallet.schema';
import { KeyManagementModule } from '../key-management/key-management.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    KeyManagementModule,
    TransactionsModule,
  ],
  providers: [SafeWalletService],
  exports: [SafeWalletService],
})
export class SafeWalletModule {}

