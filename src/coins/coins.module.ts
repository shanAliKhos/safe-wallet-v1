import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinsController } from './coins.controller';
import { CoinsService } from './coins.service';
import { CoinsSeedService } from './coins.seed';
import { Coin, CoinSchema } from './schemas/coin.schema';
import { ChainsModule } from '../chains/chains.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Coin.name, schema: CoinSchema }]),
    ChainsModule,
  ],
  controllers: [CoinsController],
  providers: [CoinsService, CoinsSeedService],
  exports: [CoinsService, CoinsSeedService],
})
export class CoinsModule {}

