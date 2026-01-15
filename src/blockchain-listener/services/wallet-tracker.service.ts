import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument } from '../../wallets/schemas/wallet.schema';
import { ListenerConfig } from '../config/listener.config';
import Redis from 'ioredis';

/**
 * Wallet Tracker Service
 * 
 * Efficiently tracks 100M+ wallets using Redis for fast lookups.
 * Uses Redis Sets to store wallet addresses per chain for O(1) lookup time.
 * 
 * Architecture:
 * - Redis Set: "wallets:{chainCode}" - Contains all wallet addresses for a chain
 * - Redis Hash: "wallet:{chainCode}:{address}" - Contains wallet metadata
 * - Periodic sync from MongoDB to Redis for new wallets
 */
@Injectable()
export class WalletTrackerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WalletTrackerService.name);
  private redis: Redis;
  private readonly WALLET_SET_PREFIX = 'wallets';
  private readonly WALLET_HASH_PREFIX = 'wallet';
  private readonly SYNC_INTERVAL = ListenerConfig.walletSyncInterval;
  private syncInterval: NodeJS.Timeout;

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    private configService: ConfigService,
  ) {
    const redisHost = this.configService.get<string>('redis.host') || 'localhost';
    const redisPort = this.configService.get<number>('redis.port') || 6379;
    const redisPassword = this.configService.get<string>('redis.password');

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true; // or `return 1;`
        }
        return false;
      },
      lazyConnect: true, // Don't connect immediately
    });

    // Connect with error handling
    this.redis.connect().catch(err => {
      this.logger.error('Initial Redis connection failed:', err);
      this.logger.warn('Will continue with MongoDB fallback');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('✅ Redis connected successfully');
    });

    this.redis.on('reconnecting', () => {
      this.logger.warn('⚠️ Redis reconnecting...');
    });
  }

  async onModuleInit() {
    // Initial sync
    await this.syncWallets();
    
    // Start periodic sync
    this.syncInterval = setInterval(() => {
      this.syncWallets().catch((err) => {
        this.logger.error('Error during periodic wallet sync:', err);
      });
    }, this.SYNC_INTERVAL);
  }

  /**
   * Check if an address belongs to any tracked wallet
   * O(1) lookup time using Redis Set
   */
  async isTrackedWallet(address: string, chainCode: string): Promise<boolean> {
    try {
      const key = `${this.WALLET_SET_PREFIX}:${chainCode}`;
      const isMember = await this.redis.sismember(key, address.toLowerCase());
      return isMember === 1;
    } catch (error) {
      this.logger.error(`Redis error, falling back to MongoDB: ${error.message}`);
      
      // Fallback to MongoDB
      return this.isTrackedWalletFallback(address, chainCode);
    }
  }

  /**
   * Get wallet metadata for an address
   */
  async getWalletMetadata(
    address: string,
    chainCode: string,
  ): Promise<{ walletId: string; userId?: string } | null> {
    try {
      const normalizedAddress = address.toLowerCase();
      const metadata = await this.redis.hgetall(
        `${this.WALLET_HASH_PREFIX}:${chainCode}:${normalizedAddress}`,
      );

      if (metadata && metadata.walletId) {
        return {
          walletId: metadata.walletId,
          userId: metadata.userId || undefined,
        };
      }

      // Fallback to database
      return this.getWalletMetadataFallback(address, chainCode);
    } catch (error) {
      this.logger.error(`Error getting wallet metadata for ${address}:`, error);
      return this.getWalletMetadataFallback(address, chainCode);
    }
  }

  /**
   * Batch check multiple addresses with pipeline optimization
   * More efficient than individual checks
   */
  async batchCheckWallets(
    addresses: string[],
    chainCode: string,
  ): Promise<Map<string, { walletId: string; userId?: string } | null>> {
    const tracked = new Map<string, { walletId: string; userId?: string } | null>();
    
    if (addresses.length === 0) {
      return tracked;
    }

    try {
      const key = `${this.WALLET_SET_PREFIX}:${chainCode}`;
      
      // First, batch check membership (faster)
      const pipeline = this.redis.pipeline();
      addresses.forEach(addr => {
        pipeline.sismember(key, addr.toLowerCase());
      });
      const memberResults = await pipeline.exec();
      
      // Get metadata only for tracked addresses
      const trackedAddresses: string[] = [];
      addresses.forEach((addr, index) => {
        if (memberResults && memberResults[index] && memberResults[index][1] === 1) {
          trackedAddresses.push(addr.toLowerCase());
        }
      });
      
      // Batch get metadata
      if (trackedAddresses.length > 0) {
        const metaPipeline = this.redis.pipeline();
        trackedAddresses.forEach(addr => {
          metaPipeline.hgetall(`${this.WALLET_HASH_PREFIX}:${chainCode}:${addr}`);
        });
        const metaResults = await metaPipeline.exec();
        
        trackedAddresses.forEach((addr, index) => {
          if (metaResults && metaResults[index]) {
            const metadata = metaResults[index][1] as any;
            if (metadata && metadata.walletId) {
              tracked.set(addr, {
                walletId: metadata.walletId,
                userId: metadata.userId,
              });
            }
          }
        });
      }
      
      // Set null for non-matched addresses
      addresses.forEach((addr) => {
        const normalizedAddr = addr.toLowerCase();
        if (!tracked.has(normalizedAddr)) {
          tracked.set(normalizedAddr, null);
        }
      });
      
      return tracked;
    } catch (error) {
      this.logger.error(`Redis batch check failed, using MongoDB: ${error.message}`);
      
      // Fallback to MongoDB batch query
      return this.batchCheckWalletsFallback(addresses, chainCode);
    }
  }

  /**
   * Add a wallet to tracking (called when new wallet is created)
   */
  async addWallet(
    address: string,
    chainCode: string,
    walletId: string,
    userId?: string,
  ): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();
      const pipeline = this.redis.pipeline();

      // Add to set
      pipeline.sadd(`${this.WALLET_SET_PREFIX}:${chainCode}`, normalizedAddress);

      // Set metadata
      const metadata: Record<string, string> = { walletId };
      if (userId) {
        metadata.userId = userId;
      }
      pipeline.hset(`${this.WALLET_HASH_PREFIX}:${chainCode}:${normalizedAddress}`, metadata);

      await pipeline.exec();
      this.logger.debug(`Added wallet ${address} to tracking for chain ${chainCode}`);
    } catch (error) {
      this.logger.error(`Error adding wallet ${address}:`, error);
    }
  }

  /**
   * Remove a wallet from tracking
   */
  async removeWallet(address: string, chainCode: string): Promise<void> {
    try {
      const normalizedAddress = address.toLowerCase();
      const pipeline = this.redis.pipeline();

      pipeline.srem(`${this.WALLET_SET_PREFIX}:${chainCode}`, normalizedAddress);
      pipeline.del(`${this.WALLET_HASH_PREFIX}:${chainCode}:${normalizedAddress}`);

      await pipeline.exec();
      this.logger.debug(`Removed wallet ${address} from tracking for chain ${chainCode}`);
    } catch (error) {
      this.logger.error(`Error removing wallet ${address}:`, error);
    }
  }

  /**
   * Sync wallets from MongoDB to Redis
   * This ensures Redis is up-to-date with the database
   */
  private async syncWallets(): Promise<void> {
    try {
      const totalWallets = await this.walletModel.countDocuments({ isActive: true });
      const BATCH_SIZE = 10000;
      const totalBatches = Math.ceil(totalWallets / BATCH_SIZE);

      this.logger.log(`Starting wallet sync: ${totalWallets} wallets in ${totalBatches} batches`);

      for (let batch = 0; batch < totalBatches; batch++) {
        const skip = batch * BATCH_SIZE;
        const wallets = await this.walletModel
          .find({ isActive: true })
          .skip(skip)
          .limit(BATCH_SIZE)
          .select('address userId _id')
          .lean()
          .exec();

        if (wallets.length === 0) break;

        const pipeline = this.redis.pipeline();
        const chains = ['eth', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'];

        wallets.forEach(wallet => {
          const normalizedAddr = wallet.address.toLowerCase();
          chains.forEach(chainCode => {
            pipeline.sadd(`wallets:${chainCode}`, normalizedAddr);
            pipeline.hset(
              `wallet:${chainCode}:${normalizedAddr}`,
              'walletId', wallet._id.toString(),
              'userId', wallet.userId?.toString() || ''
            );
          });
        });

        await pipeline.exec();
        this.logger.log(`Synced batch ${batch + 1}/${totalBatches}: ${wallets.length} wallets`);
      }

      this.logger.log(`Completed wallet sync: ${totalWallets} total wallets`);
    } catch (error) {
      this.logger.error(`Wallet sync failed: ${error.message}`);
    }
  }

  /**
   * Get Redis health status
   */
  async getRedisHealth(): Promise<{ connected: boolean; walletsCount: Record<string, number> }> {
    try {
      await this.redis.ping();
      
      const chains = ['eth', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'];
      const counts: Record<string, number> = {};
      
      for (const chain of chains) {
        const count = await this.redis.scard(`${this.WALLET_SET_PREFIX}:${chain}`);
        counts[chain] = count;
      }
      
      return {
        connected: true,
        walletsCount: counts,
      };
    } catch (error) {
      return {
        connected: false,
        walletsCount: {},
      };
    }
  }

  /**
   * Fallback methods for when Redis is unavailable
   */
  private async isTrackedWalletFallback(address: string, chainCode: string): Promise<boolean> {
    const normalizedAddress = address.toLowerCase();
    const wallet = await this.walletModel.findOne({
      address: new RegExp(`^${normalizedAddress}$`, 'i'),
      isActive: true,
    });
    
    return !!wallet;
  }

  private async getWalletMetadataFallback(
    address: string,
    chainCode: string,
  ): Promise<{ walletId: string; userId?: string } | null> {
    const normalizedAddress = address.toLowerCase();
    const wallet = await this.walletModel
      .findOne({
        address: normalizedAddress,
        isActive: true,
      })
      .select('_id userId')
      .lean()
      .exec();

    if (!wallet) {
      return null;
    }

    return {
      walletId: wallet._id.toString(),
      userId: wallet.userId?.toString(),
    };
  }

  private async batchCheckWalletsFallback(
    addresses: string[],
    chainCode: string,
  ): Promise<Map<string, { walletId: string; userId?: string } | null>> {
    const result = new Map<string, { walletId: string; userId?: string } | null>();
    const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());

    // Query MongoDB with normalized addresses (assuming addresses are stored in lowercase)
    const wallets = await this.walletModel
      .find({
        address: { $in: normalizedAddresses },
        isActive: true,
      })
      .select('address _id userId')
      .lean()
      .exec();

    const walletMap = new Map(
      wallets.map((w) => [
        w.address.toLowerCase(),
        {
          walletId: w._id.toString(),
          userId: w.userId?.toString(),
        },
      ]),
    );

    normalizedAddresses.forEach((address) => {
      result.set(address, walletMap.get(address) || null);
    });

    return result;
  }

  /**
   * Get statistics about tracked wallets
   */
  async getStats(): Promise<Record<string, number>> {
    try {
      const keys = await this.redis.keys(`${this.WALLET_SET_PREFIX}:*`);
      const stats: Record<string, number> = {};

      for (const key of keys) {
        const chainCode = key.split(':')[1];
        const count = await this.redis.scard(key);
        stats[chainCode] = count;
      }

      return stats;
    } catch (error) {
      this.logger.error('Error getting wallet stats:', error);
      return {};
    }
  }

  async onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    await this.redis.quit();
  }
}

