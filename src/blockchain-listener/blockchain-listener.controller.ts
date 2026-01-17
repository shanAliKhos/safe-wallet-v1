import { Controller, Get, Post, Param, Body, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChainListenerService } from './services/chain-listener.service';
import { WalletTrackerService } from './services/wallet-tracker.service';
import { AnkrVerificationService } from './services/ankr-verification.service';
import { ListenerState, ListenerStateDocument } from './schemas/listener-state.schema';
import { BlockchainTransaction, BlockchainTransactionDocument } from './schemas/blockchain-transaction.schema';
import { Chain, ChainDocument } from '../chains/schemas/chain.schema';

@Controller('blockchain-listener')
export class BlockchainListenerController {
  private readonly logger = new Logger(BlockchainListenerController.name);

  constructor(
    private chainListenerService: ChainListenerService,
    private walletTrackerService: WalletTrackerService,
    private ankrVerificationService: AnkrVerificationService,
    @InjectModel(Chain.name) private chainModel: Model<ChainDocument>,
    @InjectModel(ListenerState.name) private listenerStateModel: Model<ListenerStateDocument>,
    @InjectModel(BlockchainTransaction.name) private transactionModel: Model<BlockchainTransactionDocument>,
  ) {}

  @Get('status')
  async getStatus() {
    const listenerStatus = await this.chainListenerService.getListenerStatus();
    const walletStats = await this.walletTrackerService.getStats();
    
    return {
      listeners: listenerStatus,
      walletStats,
    };
  }

  @Get('wallets/stats')
  async getWalletStats() {
    return this.walletTrackerService.getStats();
  }

  @Post('chains/:chainCode/start')
  async startListener(@Param('chainCode') chainCode: string) {
    try {
      const chain = await this.chainModel.findOne({ 
        code: chainCode.toLowerCase() 
      }).exec();
      
      if (!chain) {
        return {
          status: 'error',
          message: `Chain not found: ${chainCode}`,
          code: 404
        };
      }

      const listenerState = await this.listenerStateModel
        .findOne({ chainCode: chain.code.toLowerCase() })
        .exec();

      if (listenerState?.isActive) {
        return {
          status: 'warning',
          message: `Listener already running for chain: ${chainCode}`,
          chainCode: chain.code,
        };
      }

      await this.chainListenerService.startListener(chain);

      const status = await this.chainListenerService.getListenerStatus();
      const chainStatus = status.find(s => s.chainCode === chain.code);

      return {
        status: 'success',
        message: `Listener started for ${chainCode}`,
        chainCode: chain.code,
        currentBlock: chainStatus?.currentBlock || 0,
        lastProcessedBlock: chainStatus?.lastProcessedBlock || 0,
      };
    } catch (error) {
      this.logger.error(`Error starting listener for ${chainCode}:`, error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        chainCode
      };
    }
  }

  @Post('chains/:chainCode/stop')
  async stopListener(@Param('chainCode') chainCode: string) {
    await this.chainListenerService.stopListener(chainCode);
    return {
      message: `Stopped listener for chain: ${chainCode}`,
    };
  }

  @Get('health')
  async getHealth() {
    const listeners = this.chainListenerService.getAllActiveListeners();
    const states = await this.listenerStateModel.find().exec();
    const redisHealth = await this.walletTrackerService.getRedisHealth();
    
    const health = states.map(state => {
      const listener = listeners.find(l => l.chainCode === state.chainCode);
      const currentBlock = listener?.currentBlock || 0;
      const blocksBehind = currentBlock - state.lastProcessedBlock;
      
      let status = 'healthy';
      if (!state.isActive) status = 'inactive';
      else if (blocksBehind > 1000) status = 'degraded';
      else if (blocksBehind > 100) status = 'lagging';
      else if (state.lastProcessedAt && (Date.now() - state.lastProcessedAt.getTime()) > 300000) status = 'stuck';
      
      return {
        chainCode: state.chainCode,
        status,
        isActive: state.isActive,
        lastProcessedBlock: state.lastProcessedBlock,
        currentBlock: currentBlock,
        blocksBehind: blocksBehind,
        lastProcessedAt: state.lastProcessedAt,
        lastError: state.lastError,
        confirmationsRequired: state.confirmationsRequired,
      };
    });
    
    const allHealthy = health.every(h => h.status === 'healthy' || h.status === 'inactive');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      redis: redisHealth,
      listeners: health,
    };
  }

  @Get('metrics')
  async getMetrics() {
    const states = await this.listenerStateModel.find().exec();
    const transactions = await this.transactionModel.aggregate([
      {
        $group: {
          _id: '$chainCode',
          count: { $sum: 1 },
          lastTransaction: { $max: '$timestamp' },
        },
      },
    ]);
    
    const walletStats = await this.walletTrackerService.getStats();
    const performanceMetrics = this.chainListenerService.getMetrics();
    
    return {
      listeners: states.map(s => ({
        chainCode: s.chainCode,
        blocksProcessed: s.lastProcessedBlock,
        lastProcessedAt: s.lastProcessedAt,
      })),
      transactions: transactions,
      wallets: walletStats,
      performance: performanceMetrics,
      timestamp: new Date(),
    };
  }

  @Post('chains/:chainCode/reprocess')
  async reprocessBlocks(
    @Param('chainCode') chainCode: string,
    @Body() body: { fromBlock: number; toBlock: number },
  ) {
    this.logger.log(`Manual reprocess requested for ${chainCode}: ${body.fromBlock} to ${body.toBlock}`);
    
    await this.chainListenerService.processBlockRange(
      chainCode,
      body.fromBlock,
      body.toBlock,
    );
    
    return {
      message: `Reprocessing blocks ${body.fromBlock} to ${body.toBlock} for ${chainCode}`,
    };
  }

  /**
   * ANKR VERIFICATION ENDPOINTS
   */

  @Get('verification/status')
  async getVerificationStatus() {
    const stats = await this.ankrVerificationService.getVerificationStats();
    return {
      status: 'ok',
      verificationStats: stats,
      description: 'Ankr Advanced API verification service status',
    };
  }

  @Post('verification/trigger')
  async triggerVerification(
    @Body() body?: { chainCode?: string },
  ) {
    this.logger.log(`Manual verification triggered for ${body?.chainCode || 'all chains'}`);
    
    await this.ankrVerificationService.triggerManualVerification(body?.chainCode);
    
    return {
      status: 'success',
      message: `Verification triggered for ${body?.chainCode || 'all chains'}`,
      timestamp: new Date(),
    };
  }

  @Post('verification/wallet')
  async verifyWallet(
    @Body() body: { 
      walletAddress: string; 
      chainCode: string; 
      fromTimestamp?: number; 
      toTimestamp?: number 
    },
  ) {
    this.logger.log(`Verifying wallet ${body.walletAddress} on ${body.chainCode}`);
    
    const result = await this.ankrVerificationService.verifyWalletTransactions(
      body.walletAddress,
      body.chainCode,
      body.fromTimestamp,
      body.toTimestamp,
    );
    
    return {
      status: 'success',
      walletAddress: body.walletAddress,
      chainCode: body.chainCode,
      result,
      timestamp: new Date(),
    };
  }
}
