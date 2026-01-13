import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chain, ChainDocument } from './schemas/chain.schema';

@Injectable()
export class ChainsSeedService {
  private readonly logger = new Logger(ChainsSeedService.name);

  constructor(
    @InjectModel(Chain.name) private chainModel: Model<ChainDocument>,
  ) {}

  async seed() {
    this.logger.log('Seeding chains...');

    const chains = [
      {
        chainId: 1,
        name: 'Ethereum',
        code: 'eth',
        rpcUrls: [
            process.env.ETH_RPC_URL || '',
        ],
        wsRpcUrls: [
            process.env.ETH_WS_RPC_URL || '',
        ],  
        isActive: true,
        nativeSymbol: 'ETH',
        nativeDecimals: 18,
        explorerBaseUrl: 'https://etherscan.io',
        isTestnet: false,
        type: 'EVM',
        sortOrder: 1,
      },
      {
        chainId: 56,
        name: 'Binance Smart Chain',
        code: 'bsc',
        rpcUrls: [],
        wsRpcUrls: [],
        isActive: true,
        nativeSymbol: 'BNB',
        nativeDecimals: 18,
        explorerBaseUrl: 'https://bscscan.com',
        isTestnet: false,
        type: 'EVM',
        sortOrder: 2,
      },
    ];

    for (const chainData of chains) {
      const existing = await this.chainModel.findOne({ code: chainData.code }).exec();
      if (!existing) {
        await this.chainModel.create(chainData);
        this.logger.log(`Created chain: ${chainData.name} (${chainData.code})`);
      } else {
        this.logger.log(`Chain already exists: ${chainData.name} (${chainData.code})`);
      }
    }

    this.logger.log('Chains seeding completed');
  }
}

