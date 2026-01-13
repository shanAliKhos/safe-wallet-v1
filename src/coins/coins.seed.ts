import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coin, CoinDocument } from './schemas/coin.schema';
import { ChainsService } from '../chains/chains.service';

@Injectable()
export class CoinsSeedService {
  private readonly logger = new Logger(CoinsSeedService.name);

  constructor(
    @InjectModel(Coin.name) private coinModel: Model<CoinDocument>,
    private chainsService: ChainsService,
  ) {}

  async seed() {
    this.logger.log('Seeding coins...');

    // Get chains
    const ethChain = await this.chainsService.findByCode('eth');
    const bscChain = await this.chainsService.findByCode('bsc');

    if (!ethChain || !bscChain) {
      this.logger.error('Chains not found. Please seed chains first.');
      return;
    }

    const coins = [
      // Ethereum native
      {
        name: 'Ethereum',
        symbol: 'ETH',
        currencyCode: 'ETH',
        chain: ethChain._id,
        contractAddress: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        isActive: true,
        isNative: true,
        sortOrder: 1,
      },
      // BSC native
      {
        name: 'Binance Coin',
        symbol: 'BNB',
        currencyCode: 'BNB',
        chain: bscChain._id,
        contractAddress: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        isActive: true,
        isNative: true,
        sortOrder: 1,
      },
      // Common tokens on Ethereum
      {
        name: 'Tether USD',
        symbol: 'USDT',
        currencyCode: 'USDT-ETH',
        chain: ethChain._id,
        contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        decimals: 6,
        isActive: true,
        isNative: false,
        sortOrder: 2,
      },
      {
        name: 'USD Coin',
        symbol: 'USDC',
        currencyCode: 'USDC-ETH',
        chain: ethChain._id,
        contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        decimals: 6,
        isActive: true,
        isNative: false,
        sortOrder: 3,
      },
      // Common tokens on BSC
      {
        name: 'Tether USD',
        symbol: 'USDT',
        currencyCode: 'USDT-BSC',
        chain: bscChain._id,
        contractAddress: '0x55d398326f99059ff775485246999027b3197955',
        decimals: 18,
        isActive: true,
        isNative: false,
        sortOrder: 2,
      },
      {
        name: 'USD Coin',
        symbol: 'USDC',
        currencyCode: 'USDC-BSC',
        chain: bscChain._id,
        contractAddress: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
        decimals: 18,
        isActive: true,
        isNative: false,
        sortOrder: 3,
      },
    ];

    for (const coinData of coins) {
      const existing = await this.coinModel
        .findOne({
          currencyCode: coinData.currencyCode,
          chain: coinData.chain,
        })
        .exec();
      if (!existing) {
        await this.coinModel.create(coinData);
        this.logger.log(`Created coin: ${coinData.name} (${coinData.currencyCode})`);
      } else {
        this.logger.log(`Coin already exists: ${coinData.name} (${coinData.currencyCode})`);
      }
    }

    this.logger.log('Coins seeding completed');
  }
}

