import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChainsController } from './chains.controller';
import { ChainsService } from './chains.service';
import { ChainsSeedService } from './chains.seed';
import { Chain, ChainSchema } from './schemas/chain.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chain.name, schema: ChainSchema }]),
  ],
  controllers: [ChainsController],
  providers: [ChainsService, ChainsSeedService],
  exports: [ChainsService, ChainsSeedService],
})
export class ChainsModule {}
