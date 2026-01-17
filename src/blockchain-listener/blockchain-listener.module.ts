import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChainListenerService } from './services/chain-listener.service';
import { WalletTrackerService } from './services/wallet-tracker.service';
import { TransactionProcessorService } from './services/transaction-processor.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { AnkrVerificationService } from './services/ankr-verification.service';
import { TransactionProcessorQueue } from './processors/transaction-processor.queue';
import { ListenerState, ListenerStateSchema } from './schemas/listener-state.schema';
import { BlockchainTransaction, BlockchainTransactionSchema } from './schemas/blockchain-transaction.schema';
import { Chain, ChainSchema } from '../chains/schemas/chain.schema';
import { Wallet, WalletSchema } from '../wallets/schemas/wallet.schema';
import { BlockchainListenerController } from './blockchain-listener.controller';
import { AnkrModule } from '../ankr/ankr.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ListenerState.name, schema: ListenerStateSchema },
      { name: BlockchainTransaction.name, schema: BlockchainTransactionSchema },
      { name: Chain.name, schema: ChainSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    BullModule.registerQueue({
      name: 'transaction-processing',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 10000, // Keep max 10k completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    }),
    ConfigModule,
    AnkrModule, // Import AnkrModule to use AnkrService
  ],
  controllers: [BlockchainListenerController],
  providers: [
    ChainListenerService,
    WalletTrackerService,
    TransactionProcessorService,
    RateLimiterService,
    AnkrVerificationService,
    TransactionProcessorQueue,
  ],
  exports: [
    ChainListenerService,
    WalletTrackerService,
    TransactionProcessorService,
    AnkrVerificationService,
  ],
})
export class BlockchainListenerModule {}

