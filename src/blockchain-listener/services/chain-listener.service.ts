import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chain, ChainDocument } from '../../chains/schemas/chain.schema';
import { ListenerState, ListenerStateDocument } from '../schemas/listener-state.schema';
import { WalletTrackerService } from './wallet-tracker.service';
import { TransactionProcessorService } from './transaction-processor.service';
import { RateLimiterService } from './rate-limiter.service';
import { ListenerConfig } from '../config/listener.config';
import { ethers } from 'ethers';

/**
 * Chain Listener Service
 * 
 * Listens to blockchain events for a specific chain.
 * Handles:
 * - Block polling
 * - Transaction processing
 * - Reorg detection
 * - Error recovery
 */
interface ActiveListener {
  chainCode: string;
  provider: ethers.JsonRpcProvider;
  listenerState: ListenerStateDocument;
  currentBlock?: number;
  currentRpcUrl?: string;
}

@Injectable()
export class ChainListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChainListenerService.name);
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private activeListeners: Map<string, ActiveListener> = new Map();
  private processingPromises: Map<string, Promise<void>> = new Map();
  private pollingLoops: Map<string, Promise<void>> = new Map();
  private readonly POLL_INTERVAL = ListenerConfig.pollInterval.default;
  private readonly BATCH_SIZE = ListenerConfig.batchSize.default;
  private readonly MAX_RETRIES = ListenerConfig.maxRetries;
  private readonly RETRY_DELAY = ListenerConfig.retryDelay;

  // RPC Circuit Breaker
  private rpcHealth: Map<string, Map<string, { 
    failures: number; 
    broken: boolean; 
    recoveryTime?: number 
  }>> = new Map();
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIMEOUT = 5 * 60 * 1000;

  // Performance metrics
  private metrics = {
    blocksProcessed: new Map<string, number>(),
    transactionsFound: new Map<string, number>(),
    walletsMatched: new Map<string, number>(),
    averageProcessTime: new Map<string, number>(),
    errors: new Map<string, number>(),
  };

  // Chain-specific configurations (using environment-based config)
  private readonly CHAIN_CONFIG = {
    bsc: {
      batchSize: ListenerConfig.batchSize.bsc,
      pollInterval: ListenerConfig.pollInterval.bsc,
      confirmations: ListenerConfig.confirmations.bsc,
    },
    eth: {
      batchSize: ListenerConfig.batchSize.eth,
      pollInterval: ListenerConfig.pollInterval.eth,
      confirmations: ListenerConfig.confirmations.eth,
    },
    polygon: {
      batchSize: ListenerConfig.batchSize.polygon,
      pollInterval: ListenerConfig.pollInterval.polygon,
      confirmations: ListenerConfig.confirmations.polygon,
    },
    avalanche: {
      batchSize: ListenerConfig.batchSize.avalanche,
      pollInterval: ListenerConfig.pollInterval.avalanche,
      confirmations: ListenerConfig.confirmations.avalanche,
    },
    arbitrum: {
      batchSize: ListenerConfig.batchSize.arbitrum,
      pollInterval: ListenerConfig.pollInterval.arbitrum,
      confirmations: ListenerConfig.confirmations.arbitrum,
    },
    optimism: {
      batchSize: ListenerConfig.batchSize.optimism,
      pollInterval: ListenerConfig.pollInterval.optimism,
      confirmations: ListenerConfig.confirmations.optimism,
    },
    default: {
      batchSize: ListenerConfig.batchSize.default,
      pollInterval: ListenerConfig.pollInterval.default,
      confirmations: ListenerConfig.confirmations.default,
    },
  };

  private getChainConfig(chainCode: string) {
    return this.CHAIN_CONFIG[chainCode] || this.CHAIN_CONFIG.default;
  }

  constructor(
    @InjectModel(Chain.name) private chainModel: Model<ChainDocument>,
    @InjectModel(ListenerState.name) private listenerStateModel: Model<ListenerStateDocument>,
    private walletTracker: WalletTrackerService,
    private transactionProcessor: TransactionProcessorService,
    private rateLimiter: RateLimiterService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeListeners();
    
    // Start stuck listener checker
    setInterval(() => {
      this.checkForStuckListeners().catch(err => {
        this.logger.error('Error checking for stuck listeners:', err);
      });
    }, ListenerConfig.stuckCheckInterval);
  }

  async onModuleDestroy() {
    // Stop all listeners
    for (const chainCode of this.activeListeners.keys()) {
      await this.stopListener(chainCode);
    }
    this.activeListeners.clear();
    this.providers.clear();
  }

  /**
   * Initialize listeners for all active chains
   */
  private async initializeListeners(): Promise<void> {
    try {
      const chains = await this.chainModel.find({ isActive: true }).lean().exec();

      for (const chain of chains) {
        await this.startListener(chain);
      }

      this.logger.log(`Initialized ${chains.length} chain listeners`);
    } catch (error) {
      this.logger.error('Error initializing listeners:', error);
    }
  }

  /**
   * Start listening to a specific chain
   */
  async startListener(chain: ChainDocument | any): Promise<void> {
    const chainCode = chain.code.toLowerCase();
    
    if (this.activeListeners.has(chainCode)) {
      this.logger.warn(`Listener already running for chain: ${chainCode}`);
      return;
    }

    try {
      // Initialize or get listener state
      let listenerState = await this.listenerStateModel.findOne({ chainCode }).exec();
      
      if (!listenerState) {
        listenerState = new this.listenerStateModel({
          chainId: chain._id,
          chainCode,
          lastProcessedBlock: 0,
          lastConfirmedBlock: 0,
          isActive: true,
          isProcessing: false,
          confirmationsRequired: 12,
        });
        await listenerState.save();
      }

      // Initialize provider - try database first, then fallback to env vars
      let rpcUrl = chain.rpcUrls?.[0];
      
      // Fallback to environment variable if RPC URL is missing from database
      if (!rpcUrl || rpcUrl === '') {
        // Try config service first (for configured chains like eth, bsc)
        let envRpcUrl = this.configService.get<string>(`rpc.${chainCode}`);
        
        // If not in config, try direct env var pattern: {CHAIN_CODE}_RPC_URL
        if (!envRpcUrl) {
          const envKey = `${chainCode.toUpperCase()}_RPC_URL`;
          envRpcUrl = process.env[envKey];
        }
        
        if (envRpcUrl) {
          rpcUrl = envRpcUrl;
          this.logger.log(`Using RPC URL from environment variable for ${chainCode}`);
          
          // Update chain document with RPC URL from env for future use
          if (!chain.rpcUrls || chain.rpcUrls.length === 0 || chain.rpcUrls[0] === '') {
            await this.chainModel.updateOne(
              { code: chainCode },
              { $set: { rpcUrls: [envRpcUrl] } }
            ).exec();
            this.logger.log(`Updated chain ${chainCode} with RPC URL from environment`);
          }
        }
      }
      
      if (!rpcUrl || rpcUrl === '') {
        this.logger.warn(`No RPC URL configured for chain: ${chainCode}. Set ${chainCode.toUpperCase()}_RPC_URL environment variable or configure in database.`);
        return;
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      this.providers.set(chainCode, provider);

      // Test connection
      try {
        const currentBlock = await provider.getBlockNumber();
        this.logger.log(`Connected to ${chainCode} RPC: ${rpcUrl} (current block: ${currentBlock})`);
      } catch (error) {
        this.logger.error(`Failed to connect to ${chainCode} RPC:`, error);
        return;
      }

      // Create active listener entry
      const activeListener: ActiveListener = {
        chainCode,
        provider,
        listenerState,
        currentRpcUrl: rpcUrl,
      };
      this.activeListeners.set(chainCode, activeListener);

      // Start polling loop - use recursive setTimeout instead of setInterval
      // This ensures we wait for processing to complete before scheduling next poll
      const config = this.getChainConfig(chainCode);
      
      const scheduleNextPoll = async () => {
        if (!this.activeListeners.has(chainCode)) {
          return; // Listener stopped
        }
        
        try {
          await this.pollAndProcessChain(chainCode);
        } catch (error) {
          this.logger.error(`Polling error for ${chainCode}: ${error.message}`);
        }
        
        // Schedule next poll after interval (only if listener is still active)
        if (this.activeListeners.has(chainCode)) {
          setTimeout(scheduleNextPoll, config.pollInterval);
        }
      };
      
      // Start polling loop
      setTimeout(scheduleNextPoll, config.pollInterval);

      this.pollingLoops.set(chainCode, Promise.resolve());  // Store for tracking
      
      this.logger.log(`Started listener for chain: ${chainCode}`);

      // Process immediately
      this.pollAndProcessChain(chainCode).catch((err) => {
        this.logger.error(`Error in initial chain processing ${chainCode}:`, err);
      });
    } catch (error) {
      this.logger.error(`Error starting listener for ${chainCode}:`, error);
    }
  }

  /**
   * Stop listening to a specific chain
   */
  async stopListener(chainCode: string): Promise<void> {
    const listener = this.activeListeners.get(chainCode);
    if (listener) {
      // Mark as inactive to stop polling loop
      listener.listenerState.isActive = false;
      await listener.listenerState.save();
      
      this.activeListeners.delete(chainCode);
      this.providers.delete(chainCode);
      this.pollingLoops.delete(chainCode);
      this.logger.log(`Stopped listener for chain: ${chainCode}`);
    }
  }


  /**
   * Poll and process chain (with concurrency protection)
   */
  private async pollAndProcessChain(chainCode: string): Promise<void> {
    // Use Promise lock to prevent concurrent processing
    if (this.processingPromises.has(chainCode)) {
      // Silently skip - processing is already in progress
      // This is expected behavior when processing takes longer than poll interval
      return;
    }

    const listener = this.activeListeners.get(chainCode);
    if (!listener) return;

    const promise = (async () => {
      try {
        await this.processChain(chainCode, listener.listenerState);
      } catch (error) {
        this.logger.error(`Error processing chain ${chainCode}:`, error);
        throw error;
      }
    })()
      .then(() => {
        this.processingPromises.delete(chainCode);
      })
      .catch((error) => {
        this.processingPromises.delete(chainCode);
      });

    this.processingPromises.set(chainCode, promise);
    await promise;
  }


  /**
   * Process blocks for a chain
   */
  private async processChain(
    chainCode: string,
    listenerState: ListenerStateDocument,
  ): Promise<void> {
    const listener = this.activeListeners.get(chainCode);
    if (!listener) return;

    const provider = listener.provider;
    const config = this.getChainConfig(chainCode);
    
    try {
      const currentBlock = await provider.getBlockNumber();
      listener.currentBlock = currentBlock;
      
      const lastProcessed = listenerState.lastProcessedBlock || 0;
      const confirmationsRequired = config.confirmations;
      
      // Calculate confirmed block (avoid unconfirmed blocks)
      const confirmedBlock = Math.max(0, currentBlock - confirmationsRequired);
      
      if (confirmedBlock <= lastProcessed) {
        this.logger.debug(`${chainCode}: No new confirmed blocks (current: ${currentBlock}, confirmed: ${confirmedBlock}, lastProcessed: ${lastProcessed})`);
        return;
      }
      
      // Limit blocks to process in one go
      const maxBlocksPerPoll = config.batchSize;
      const toBlock = Math.min(
        confirmedBlock,
        lastProcessed + maxBlocksPerPoll
      );
      
      this.logger.log(
        `${chainCode}: Processing blocks ${lastProcessed + 1} to ${toBlock} (current: ${currentBlock}, confirmed: ${confirmedBlock})`
      );
      
      // Check for reorgs (every Nth block based on config)
      if (lastProcessed > 0 && lastProcessed % ListenerConfig.reorgCheckInterval === 0) {
        const hasReorg = await this.detectReorg(chainCode, provider, lastProcessed);
        if (hasReorg) {
          await this.handleReorg(chainCode, listenerState);
          return; // Skip this iteration, reprocess on next poll
        }
      }
      
      await this.processBlockRange(
        chainCode,
        lastProcessed + 1,
        toBlock
      );
      
      // Update state
      listenerState.lastProcessedBlock = toBlock;
      listenerState.lastConfirmedBlock = confirmedBlock;
      listenerState.lastProcessedAt = new Date();
      listenerState.lastError = undefined;
      listenerState.confirmationsRequired = confirmationsRequired;
      await listenerState.save();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing chain ${chainCode}:`, errorMessage);
      
      listenerState.lastError = errorMessage;
      await listenerState.save();
    }
  }

  /**
   * Process a range of blocks (public method for manual reprocessing)
   */
  async processBlockRange(chainCode: string, fromBlock: number, toBlock: number): Promise<void> {
    const listener = this.activeListeners.get(chainCode);
    if (!listener) {
      throw new Error(`Listener not found for chain: ${chainCode}`);
    }

    await this.processBlockRangeInternal(chainCode, listener.provider, fromBlock, toBlock, listener.listenerState);
  }

  /**
   * Internal method to process a range of blocks
   */
  private async processBlockRangeInternal(
    chainCode: string,
    provider: ethers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number,
    listenerState: ListenerStateDocument,
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await this.processBlocks(chainCode, provider, fromBlock, toBlock, listenerState);
      
      const processTime = Date.now() - startTime;
      this.logger.log(`${chainCode}: Processed blocks ${fromBlock}-${toBlock} in ${processTime}ms`);
      
      // Update metrics
      this.updateMetrics(
        chainCode,
        toBlock - fromBlock + 1,
        result.transactionsFound || 0,
        result.walletsMatched || 0,
        processTime
      );
    } catch (error) {
      const errors = this.metrics.errors.get(chainCode) || 0;
      this.metrics.errors.set(chainCode, errors + 1);
      throw error;
    }
  }

  /**
   * Process a range of blocks
   */
  private async processBlocks(
    chainCode: string,
    provider: ethers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number,
    listenerState: ListenerStateDocument,
  ): Promise<{ transactionsFound: number; walletsMatched: number }> {
    let transactionsFound = 0;
    let walletsMatched = 0;
    
    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
      let retries = 0;
      let success = false;

      while (retries < this.MAX_RETRIES && !success) {
        try {
          const result = await this.processBlock(chainCode, provider, blockNumber, listenerState);
          transactionsFound += result.transactionsFound || 0;
          walletsMatched += result.walletsMatched || 0;
          success = true;
        } catch (error) {
          retries++;
          if (retries >= this.MAX_RETRIES) {
            this.logger.error(
              `Failed to process block ${blockNumber} after ${this.MAX_RETRIES} retries:`,
              error,
            );
            throw error;
          }
          await this.delay(this.RETRY_DELAY * retries);
        }
      }
    }
    
    return { transactionsFound, walletsMatched };
  }

  /**
   * Get block with rate limiting
   */
  private async getBlockWithRateLimit(
    chainCode: string,
    blockNumber: number,
  ): Promise<ethers.Block> {
    const listener = this.activeListeners.get(chainCode);
    const chain = await this.chainModel.findOne({ code: chainCode }).exec();
    
    if (!listener || !chain) {
      throw new Error(`Listener/chain not found for ${chainCode}`);
    }

    const healthyUrls = this.getHealthyRpcEndpoints(chainCode, chain.rpcUrls);
    if (healthyUrls.length === 0) {
      throw new Error(`All RPC endpoints down for ${chainCode}`);
    }

    const selectedUrl = healthyUrls[Math.floor(Math.random() * healthyUrls.length)];

    await this.rateLimiter.waitForSlot(chainCode);

    try {
      // Switch provider if needed
      if (listener.currentRpcUrl !== selectedUrl) {
        listener.provider = new ethers.JsonRpcProvider(selectedUrl);
        listener.currentRpcUrl = selectedUrl;
        this.logger.log(`Switched RPC endpoint for ${chainCode} to ${selectedUrl}`);
      }

      const block = await listener.provider.getBlock(blockNumber, true);
      this.recordRPCSuccess(chainCode, selectedUrl);
      return block;
    } catch (error) {
      this.recordRPCFailure(chainCode, selectedUrl);
      this.logger.error(`RPC error on ${selectedUrl}:`, error);
      throw error;
    } finally {
      this.rateLimiter.releaseSlot(chainCode);
    }
  }

  /**
   * Process a single block
   */
  private async processBlock(
    chainCode: string,
    provider: ethers.JsonRpcProvider,
    blockNumber: number,
    listenerState: ListenerStateDocument,
  ): Promise<{ transactionsFound: number; walletsMatched: number }> {
    const block = await this.getBlockWithRateLimit(chainCode, blockNumber);
    
    if (!block || !block.transactions) {
      return { transactionsFound: 0, walletsMatched: 0 };
    }

    // Process transactions in parallel (with concurrency limit)
    // block.transactions can be string[] or TransactionResponse[], we need TransactionResponse[]
    // When getBlock is called with true, it returns TransactionResponse[]
    const transactions = (block.transactions as unknown as ethers.TransactionResponse[]) || [];
    const batchSize = 50; // Process 50 transactions at a time
    
    let transactionsFound = 0;
    let walletsMatched = 0;

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((tx) =>
          this.processTransaction(chainCode, provider, tx, block, listenerState),
        ),
      );
      
      // Count processed transactions
      transactionsFound += batch.length;
      // Count unique wallets (simplified - actual count would require tracking)
      walletsMatched += results.filter(r => r && r.walletMatched).length;
    }
    
    return { transactionsFound, walletsMatched };
  }

  /**
   * Process a single transaction
   */
  private async processTransaction(
    chainCode: string,
    provider: ethers.JsonRpcProvider,
    tx: ethers.TransactionResponse,
    block: ethers.Block,
    listenerState: ListenerStateDocument,
  ): Promise<{ walletMatched: boolean }> {
    try {
      // Check if transaction involves tracked wallets
      const fromAddress = tx.from?.toLowerCase();
      const toAddress = tx.to?.toLowerCase();

      if (!fromAddress && !toAddress) {
        return { walletMatched: false }; // Contract creation, skip
      }

      // Batch check addresses
      const addressesToCheck: string[] = [];
      if (fromAddress) addressesToCheck.push(fromAddress);
      if (toAddress) addressesToCheck.push(toAddress);

      const walletMap = await this.walletTracker.batchCheckWallets(
        addressesToCheck,
        chainCode,
      );

      const fromWallet = fromAddress ? walletMap.get(fromAddress) : null;
      const toWallet = toAddress ? walletMap.get(toAddress) : null;

      // Only process if transaction involves at least one tracked wallet
      if (!fromWallet && !toWallet) {
        return { walletMatched: false };
      }

      // Get transaction receipt for gas info (with rate limiting)
      let receipt: ethers.TransactionReceipt | null = null;
      try {
        await this.rateLimiter.waitForSlot(chainCode);
        try {
          receipt = await provider.getTransactionReceipt(tx.hash);
        } finally {
          this.rateLimiter.releaseSlot(chainCode);
        }
      } catch (error) {
        this.logger.warn(`Failed to get receipt for tx ${tx.hash}:`, error);
      }

      // Process the transaction
      await this.transactionProcessor.processTransaction({
        chainCode,
        chainId: listenerState.chainId,
        tx,
        block,
        receipt,
        fromWallet: fromWallet || null,
        toWallet: toWallet || null,
      });
      
      return { walletMatched: true };
    } catch (error) {
      this.logger.error(`Error processing transaction ${tx.hash}:`, error);
      // Don't throw - continue processing other transactions
      return { walletMatched: false };
    }
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all active listeners
   */
  getAllActiveListeners(): ActiveListener[] {
    return Array.from(this.activeListeners.values());
  }

  /**
   * Get listener status for all chains
   */
  async getListenerStatus(): Promise<any[]> {
    const states = await this.listenerStateModel.find().populate('chainId').exec();
    return states.map((state) => {
      const listener = this.activeListeners.get(state.chainCode);
      return {
        chainCode: state.chainCode,
        chainId: state.chainId,
        lastProcessedBlock: state.lastProcessedBlock,
        lastConfirmedBlock: state.lastConfirmedBlock,
        currentBlock: listener?.currentBlock || 0,
        isActive: state.isActive,
        isProcessing: state.isProcessing,
        lastError: state.lastError,
        lastProcessedAt: state.lastProcessedAt,
      };
    });
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(
    chainCode: string,
    blocksCount: number,
    transactionsCount: number,
    walletsCount: number,
    processTime: number,
  ) {
    this.metrics.blocksProcessed.set(
      chainCode,
      (this.metrics.blocksProcessed.get(chainCode) || 0) + blocksCount
    );
    
    this.metrics.transactionsFound.set(
      chainCode,
      (this.metrics.transactionsFound.get(chainCode) || 0) + transactionsCount
    );
    
    this.metrics.walletsMatched.set(
      chainCode,
      (this.metrics.walletsMatched.get(chainCode) || 0) + walletsCount
    );
    
    const avgTime = this.metrics.averageProcessTime.get(chainCode) || 0;
    this.metrics.averageProcessTime.set(
      chainCode,
      (avgTime + processTime) / 2 // Simple moving average
    );
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      blocksProcessed: Object.fromEntries(this.metrics.blocksProcessed),
      transactionsFound: Object.fromEntries(this.metrics.transactionsFound),
      walletsMatched: Object.fromEntries(this.metrics.walletsMatched),
      averageProcessTime: Object.fromEntries(this.metrics.averageProcessTime),
      errors: Object.fromEntries(this.metrics.errors),
    };
  }

  /**
   * Check for stuck listeners and alert
   * Call this periodically (e.g., every 5 minutes)
   */
  private async checkForStuckListeners(): Promise<void> {
    const states = await this.listenerStateModel.find({ isActive: true }).exec();
    const now = Date.now();
    
    for (const state of states) {
      const listener = this.activeListeners.get(state.chainCode);
      if (!listener) continue;
      
      // Check if listener hasn't processed in 5 minutes
      if (state.lastProcessedAt) {
        const timeSinceLastProcess = now - state.lastProcessedAt.getTime();
        
        if (timeSinceLastProcess > ListenerConfig.stuckThreshold) {
          this.logger.error(
            `⚠️ ALERT: Listener stuck for ${state.chainCode}! ` +
            `Last processed ${Math.round(timeSinceLastProcess / 1000)}s ago`
          );
          
          // Try to restart listener
          await this.stopListener(state.chainCode);
          
          const chain = await this.chainModel.findOne({ code: state.chainCode }).exec();
          if (chain) {
            await this.startListener(chain);
            this.logger.log(`Restarted stuck listener for ${state.chainCode}`);
          }
        }
      }
      
      // Check if blocks behind is too high
      if (listener.currentBlock) {
        const blocksBehind = listener.currentBlock - state.lastProcessedBlock;
        
        if (blocksBehind > 1000) {
          this.logger.warn(
            `⚠️ WARNING: ${state.chainCode} is ${blocksBehind} blocks behind!`
          );
        }
      }
    }
  }

  /**
   * Detect blockchain reorganizations
   * Compare stored block hashes with current chain
   */
  private async detectReorg(
    chainCode: string,
    provider: ethers.JsonRpcProvider,
    lastProcessedBlock: number,
  ): Promise<boolean> {
    try {
      // Check last 10 blocks for reorg
      const blocksToCheck = Math.min(10, lastProcessedBlock);
      const startBlock = Math.max(1, lastProcessedBlock - blocksToCheck);
      
      // Get stored block hashes from database
      const storedBlocks = await this.getStoredBlockHashes(chainCode, startBlock, lastProcessedBlock);
      
      // Compare with current chain
      for (const storedBlock of storedBlocks) {
        const currentBlock = await provider.getBlock(storedBlock.number);
        
        if (currentBlock && currentBlock.hash !== storedBlock.hash) {
          this.logger.warn(
            `Reorg detected on ${chainCode} at block ${storedBlock.number}: ` +
            `stored ${storedBlock.hash} vs current ${currentBlock.hash}`
          );
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error detecting reorg for ${chainCode}:`, error);
      return false;
    }
  }

  /**
   * Get stored block hashes from database
   */
  private async getStoredBlockHashes(
    chainCode: string,
    startBlock: number,
    endBlock: number,
  ): Promise<Array<{ number: number; hash: string }>> {
    // This would require storing block hashes in the database
    // For now, return empty array - this is a placeholder for future implementation
    // You could store block hashes in ListenerState metadata or a separate collection
    return [];
  }

  /**
   * Handle blockchain reorganization
   */
  private async handleReorg(
    chainCode: string,
    listenerState: ListenerStateDocument,
  ): Promise<void> {
    this.logger.warn(`Handling reorg for ${chainCode}`);
    
    // Roll back to safe block (based on config)
    const safeBlock = Math.max(0, listenerState.lastProcessedBlock - ListenerConfig.reorgRollbackBlocks);
    
    // Mark transactions as potentially invalid
    await this.markTransactionsAsReorged(chainCode, safeBlock, listenerState.lastProcessedBlock);
    
    // Reset last processed block
    listenerState.lastProcessedBlock = safeBlock;
    await listenerState.save();
    
    this.logger.log(`Rolled back ${chainCode} to block ${safeBlock}`);
  }

  /**
   * Mark transactions as reorged
   */
  private async markTransactionsAsReorged(
    chainCode: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<void> {
    // This would require updating transactions in the database
    // For now, this is a placeholder - you'd need to update BlockchainTransaction schema
    // to include a 'isReorged' flag or similar
    this.logger.warn(`Marking transactions as reorged for ${chainCode} blocks ${fromBlock}-${toBlock}`);
  }

  /**
   * RPC Circuit Breaker methods
   */
  private recordRPCFailure(chainCode: string, endpoint: string): void {
    if (!this.rpcHealth.has(chainCode)) {
      this.rpcHealth.set(chainCode, new Map());
    }
    
    const chainRpcs = this.rpcHealth.get(chainCode)!;
    const health = chainRpcs.get(endpoint) || { failures: 0, broken: false };
    health.failures++;
    
    if (health.failures >= this.FAILURE_THRESHOLD) {
      health.broken = true;
      health.recoveryTime = Date.now() + this.RECOVERY_TIMEOUT;
      this.logger.warn(`RPC endpoint broken: ${endpoint} (${health.failures} failures)`);
    }
    
    chainRpcs.set(endpoint, health);
  }

  private recordRPCSuccess(chainCode: string, endpoint: string): void {
    if (!this.rpcHealth.has(chainCode)) return;
    
    const chainRpcs = this.rpcHealth.get(chainCode)!;
    const health = chainRpcs.get(endpoint);
    if (health) {
      health.failures = 0;
      health.broken = false;
    }
  }

  private getHealthyRpcEndpoints(chainCode: string, allEndpoints: string[]): string[] {
    if (!this.rpcHealth.has(chainCode)) return allEndpoints;
    
    const chainRpcs = this.rpcHealth.get(chainCode)!;
    const now = Date.now();
    
    return allEndpoints.filter(endpoint => {
      const health = chainRpcs.get(endpoint);
      if (!health || !health.broken) return true;
      
      // Try recovery after timeout
      if (health.recoveryTime && now > health.recoveryTime) {
        health.broken = false;
        health.failures = 0;
        this.logger.log(`RPC endpoint recovered: ${endpoint}`);
        return true;
      }
      
      return false;
    });
  }
}

