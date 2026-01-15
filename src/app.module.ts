import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { QueuesModule } from './queues/queues.module';
import { WalletsModule } from './wallets/wallets.module';
import { SafeWalletModule } from './safe-wallet/safe-wallet.module';
import { LedgerModule } from './ledger/ledger.module';
import { KeyManagementModule } from './key-management/key-management.module';
import { HomeModule } from './home/home.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ChainsModule } from './chains/chains.module';
import { CoinsModule } from './coins/coins.module';
import { AnkrModule } from './ankr/ankr.module';
import { BlockchainListenerModule } from './blockchain-listener/blockchain-listener.module';
import { ChainsSeedService } from './chains/chains.seed';
import { CoinsSeedService } from './coins/coins.seed';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    KeyManagementModule,
    LedgerModule,
    SafeWalletModule,
    TransactionsModule,
    // TasksModule,
    QueuesModule,
    UsersModule,
    AuthModule,
    WalletsModule,
    HomeModule,
    ChainsModule,
    CoinsModule,
    AnkrModule,
    BlockchainListenerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private chainsSeedService: ChainsSeedService,
    private coinsSeedService: CoinsSeedService,
  ) {}

  async onModuleInit() {
    // Seed chains and coins on application startup
    try {
      await this.chainsSeedService.seed();
      await this.coinsSeedService.seed();
    } catch (error) {
      console.error('Error seeding chains/coins:', error);
    }
  }
}
