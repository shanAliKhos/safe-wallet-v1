/**
 * Blockchain Listener Configuration
 * 
 * Environment-based configuration for blockchain listener settings.
 * Override with environment variables as needed.
 */
export const ListenerConfig = {
  // Poll intervals (milliseconds)
  pollInterval: {
    bsc: parseInt(process.env.BSC_POLL_INTERVAL || '2000', 10),
    eth: parseInt(process.env.ETH_POLL_INTERVAL || '3000', 10),
    polygon: parseInt(process.env.POLYGON_POLL_INTERVAL || '2000', 10),
    avalanche: parseInt(process.env.AVALANCHE_POLL_INTERVAL || '2000', 10),
    arbitrum: parseInt(process.env.ARBITRUM_POLL_INTERVAL || '3000', 10),
    optimism: parseInt(process.env.OPTIMISM_POLL_INTERVAL || '3000', 10),
    default: parseInt(process.env.DEFAULT_POLL_INTERVAL || '3000', 10),
  },
  
  // Batch sizes (blocks per batch)
  batchSize: {
    bsc: parseInt(process.env.BSC_BATCH_SIZE || '10', 10),
    eth: parseInt(process.env.ETH_BATCH_SIZE || '50', 10),
    polygon: parseInt(process.env.POLYGON_BATCH_SIZE || '20', 10),
    avalanche: parseInt(process.env.AVALANCHE_BATCH_SIZE || '20', 10),
    arbitrum: parseInt(process.env.ARBITRUM_BATCH_SIZE || '50', 10),
    optimism: parseInt(process.env.OPTIMISM_BATCH_SIZE || '50', 10),
    default: parseInt(process.env.DEFAULT_BATCH_SIZE || '50', 10),
  },
  
  // Confirmations required
  confirmations: {
    bsc: parseInt(process.env.BSC_CONFIRMATIONS || '15', 10),
    eth: parseInt(process.env.ETH_CONFIRMATIONS || '12', 10),
    polygon: parseInt(process.env.POLYGON_CONFIRMATIONS || '128', 10),
    avalanche: parseInt(process.env.AVALANCHE_CONFIRMATIONS || '12', 10),
    arbitrum: parseInt(process.env.ARBITRUM_CONFIRMATIONS || '12', 10),
    optimism: parseInt(process.env.OPTIMISM_CONFIRMATIONS || '12', 10),
    default: parseInt(process.env.DEFAULT_CONFIRMATIONS || '12', 10),
  },
  
  // Retry configuration
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.RETRY_DELAY || '5000', 10),
  
  // Wallet sync interval (milliseconds)
  walletSyncInterval: parseInt(process.env.WALLET_SYNC_INTERVAL || '60000', 10),
  
  // Stuck listener check interval (milliseconds)
  stuckCheckInterval: parseInt(process.env.STUCK_CHECK_INTERVAL || '300000', 10),
  stuckThreshold: parseInt(process.env.STUCK_THRESHOLD || '300000', 10),
  
  // Reorg detection
  reorgCheckInterval: parseInt(process.env.REORG_CHECK_INTERVAL || '10', 10), // Check every Nth block
  reorgRollbackBlocks: parseInt(process.env.REORG_ROLLBACK_BLOCKS || '10', 10),
};
