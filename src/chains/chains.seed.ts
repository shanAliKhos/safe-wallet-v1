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

  /**
   * Get RPC URL from environment variable using pattern: {CHAIN_CODE}_RPC_URL
   * Example: ETH_RPC_URL, BSC_RPC_URL, etc.
   */
  private getRpcUrlFromEnv(chainCode: string): string | undefined {
    const envKey = `${chainCode.toUpperCase()}_RPC_URL`;
    return process.env[envKey];
  }

  /**
   * Get WebSocket RPC URL from environment variable using pattern: {CHAIN_CODE}_WS_RPC_URL
   * Example: ETH_WS_RPC_URL, BSC_WS_RPC_URL, etc.
   */
  private getWsRpcUrlFromEnv(chainCode: string): string | undefined {
    const envKey = `${chainCode.toUpperCase()}_WS_RPC_URL`;
    return process.env[envKey];
  }

  async seed() {
    this.logger.log('Seeding chains...');

    const chains = [
      {
        chainId: 1,
        name: 'Ethereum',
        code: 'eth',
        rpcUrls: this.getRpcUrlFromEnv('eth') ? [this.getRpcUrlFromEnv('eth')!] : [],
        wsRpcUrls: this.getWsRpcUrlFromEnv('eth') ? [this.getWsRpcUrlFromEnv('eth')!] : [],
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
        rpcUrls: this.getRpcUrlFromEnv('bsc') ? [this.getRpcUrlFromEnv('bsc')!] : [],
        wsRpcUrls: this.getWsRpcUrlFromEnv('bsc') ? [this.getWsRpcUrlFromEnv('bsc')!] : [],
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
        if (chainData.rpcUrls.length > 0) {
          this.logger.log(`  RPC URL configured: ${chainData.rpcUrls[0].substring(0, 30)}...`);
        } else {
          this.logger.warn(`  ⚠️  No RPC URL found for ${chainData.code}. Set ${chainData.code.toUpperCase()}_RPC_URL env variable.`);
        }
      } else {
        // Update RPC URLs if they're missing in DB but available in env
        const envRpcUrl = this.getRpcUrlFromEnv(chainData.code);
        const envWsRpcUrl = this.getWsRpcUrlFromEnv(chainData.code);
        
        const needsUpdate = 
          (envRpcUrl && (!existing.rpcUrls || existing.rpcUrls.length === 0 || existing.rpcUrls[0] === '')) ||
          (envWsRpcUrl && (!existing.wsRpcUrls || existing.wsRpcUrls.length === 0 || existing.wsRpcUrls[0] === ''));

        if (needsUpdate) {
          const updateData: any = {};
          if (envRpcUrl && (!existing.rpcUrls || existing.rpcUrls.length === 0 || existing.rpcUrls[0] === '')) {
            updateData.rpcUrls = [envRpcUrl];
          }
          if (envWsRpcUrl && (!existing.wsRpcUrls || existing.wsRpcUrls.length === 0 || existing.wsRpcUrls[0] === '')) {
            updateData.wsRpcUrls = [envWsRpcUrl];
          }
          
          await this.chainModel.updateOne(
            { code: chainData.code },
            { $set: updateData }
          ).exec();
          
          this.logger.log(`Updated RPC URLs for ${chainData.code} from environment variables`);
        } else {
          this.logger.log(`Chain already exists: ${chainData.name} (${chainData.code})`);
        }
      }
    }

    this.logger.log('Chains seeding completed');
  }
}

