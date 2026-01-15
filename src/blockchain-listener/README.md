# Blockchain Listener System

A high-performance, scalable blockchain listener system designed to handle **100M+ wallets** across multiple blockchains.

## Architecture Overview

The system is built with scalability and performance in mind:

1. **Wallet Tracker Service** - Efficiently tracks wallets using Redis for O(1) lookups
2. **Chain Listener Service** - Polls multiple blockchains concurrently
3. **Transaction Processor** - Processes and stores transactions that belong to tracked wallets
4. **Queue System** - Handles async transaction processing with retries

## Key Features

- ✅ **Multi-chain support** - Listen to multiple blockchains simultaneously
- ✅ **100M+ wallet support** - Redis-based wallet tracking for efficient lookups
- ✅ **Automatic transaction detection** - Detects native, ERC20, ERC721, ERC1155 transactions
- ✅ **Resilient** - Automatic retries, error recovery, and reorg handling
- ✅ **Scalable** - Queue-based processing for high throughput
- ✅ **Database-driven** - Chains and wallets loaded from MongoDB

## Components

### 1. Wallet Tracker Service (`wallet-tracker.service.ts`)

Efficiently tracks wallets using Redis Sets and Hashes:

- **Redis Set**: `wallets:{chainCode}` - Contains all wallet addresses for O(1) lookup
- **Redis Hash**: `wallet:{chainCode}:{address}` - Contains wallet metadata (walletId, userId)
- **Automatic Sync**: Syncs from MongoDB to Redis every minute
- **Batch Operations**: Supports batch checking multiple addresses efficiently

**Performance**:
- O(1) wallet lookup time
- Batch operations reduce Redis round trips
- Fallback to MongoDB if Redis is unavailable

### 2. Chain Listener Service (`chain-listener.service.ts`)

Listens to blockchain events for each configured chain:

- **Block Polling**: Polls every 3 seconds for new blocks
- **Batch Processing**: Processes blocks in batches of 100
- **Concurrent Processing**: Processes transactions in parallel (50 at a time)
- **State Management**: Tracks last processed block per chain
- **Error Recovery**: Automatic retries with exponential backoff

**Features**:
- Starts automatically for all active chains on module init
- Tracks block height and confirmations
- Handles RPC failures gracefully

### 3. Transaction Processor Service (`transaction-processor.service.ts`)

Processes and stores blockchain transactions:

- **Transaction Types**:
  - Native token transfers (ETH, BNB, etc.)
  - ERC20 token transfers
  - ERC721 NFT transfers
  - ERC1155 multi-token transfers
  - Contract calls

- **Storage**:
  - Stores transactions in `blockchain_transactions` collection
  - Creates separate records for incoming/outgoing transactions
  - Links transactions to wallets via `walletId`

### 4. Listener State (`listener-state.schema.ts`)

Tracks the state of each chain listener:

- `lastProcessedBlock` - Last block processed
- `lastConfirmedBlock` - Last confirmed block (with required confirmations)
- `isActive` - Whether listener is active
- `isProcessing` - Prevents concurrent processing
- `confirmationsRequired` - Number of confirmations required (default: 12)

### 5. Blockchain Transaction (`blockchain-transaction.schema.ts`)

Stores blockchain transactions:

- Transaction details (hash, block, addresses, value)
- Gas information (used, price, fee)
- Token information (for ERC20/ERC721/ERC1155)
- Wallet association
- Direction (INCOMING/OUTGOING)

## Database Schema

### ListenerState
```typescript
{
  chainId: ObjectId,
  chainCode: string,
  lastProcessedBlock: number,
  lastConfirmedBlock: number,
  isActive: boolean,
  isProcessing: boolean,
  confirmationsRequired: number
}
```

### BlockchainTransaction
```typescript
{
  txHash: string,
  blockNumber: number,
  chainCode: string,
  fromAddress: string,
  toAddress: string,
  value: string,
  type: 'NATIVE' | 'ERC20' | 'ERC721' | 'ERC1155' | 'CONTRACT_CALL',
  direction: 'INCOMING' | 'OUTGOING',
  walletId: ObjectId,
  tokenAddress?: string,
  // ... more fields
}
```

## Setup

### 1. Install Dependencies

```bash
npm install ioredis
```

### 2. Configure Redis

Ensure Redis is running and configured in your environment:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

### 3. Configure Chains

Chains are loaded from the `chains` collection in MongoDB. Ensure your chains have:
- `rpcUrls` - Array of RPC endpoints
- `code` - Chain code (e.g., 'eth', 'bsc')
- `isActive` - Set to true to enable listening

### 4. Start the Application

The listeners will automatically start when the application starts:

```bash
npm run start:dev
```

## API Endpoints

### Get Listener Status
```http
GET /blockchain-listener/status
```

Returns:
```json
{
  "listeners": [
    {
      "chainCode": "eth",
      "lastProcessedBlock": 18500000,
      "lastConfirmedBlock": 18499988,
      "isActive": true,
      "isProcessing": false
    }
  ],
  "walletStats": {
    "eth": 1000000,
    "bsc": 500000
  }
}
```

### Get Wallet Statistics
```http
GET /blockchain-listener/wallets/stats
```

### Stop Listener
```http
POST /blockchain-listener/chains/:chainCode/stop
```

## Performance Considerations

### For 100M+ Wallets

1. **Redis Memory**: 
   - Each wallet address: ~42 bytes
   - 100M wallets: ~4.2 GB (without metadata)
   - Consider Redis Cluster for horizontal scaling

2. **Database Indexes**:
   - Ensure indexes on `walletAddress`, `chainCode`, `blockNumber`
   - Consider partitioning by chain or date

3. **Processing Rate**:
   - Default: 100 blocks per batch, 50 transactions per batch
   - Adjust `BATCH_SIZE` and `POLL_INTERVAL` based on chain throughput

4. **Queue Processing**:
   - Transaction processing is async via BullMQ
   - Configure queue workers based on your infrastructure

## Monitoring

### Key Metrics to Monitor

1. **Listener Health**:
   - `lastProcessedBlock` vs current block
   - `isProcessing` flag (should not be stuck)
   - `lastError` messages

2. **Wallet Tracker**:
   - Redis memory usage
   - Sync frequency and duration
   - Lookup performance

3. **Transaction Processing**:
   - Queue size and processing rate
   - Failed jobs count
   - Storage growth rate

## Troubleshooting

### Listener Not Processing Blocks

1. Check chain RPC endpoints are accessible
2. Verify `isActive` is true in listener state
3. Check for errors in `lastError` field
4. Ensure Redis is running (for wallet lookups)

### High Memory Usage

1. Reduce `BATCH_SIZE` if processing too many blocks
2. Increase `POLL_INTERVAL` to slow down processing
3. Consider Redis Cluster for wallet tracking
4. Archive old transactions

### Missing Transactions

1. Check `lastProcessedBlock` - may need to catch up
2. Verify wallets are properly synced to Redis
3. Check transaction processor logs for errors
4. Review queue for failed jobs

## Future Enhancements

- [ ] WebSocket support for real-time block notifications
- [ ] Reorg detection and handling
- [ ] Transaction indexing by token address
- [ ] Historical data backfilling
- [ ] Multi-instance support with distributed locking
- [ ] Metrics and alerting integration
- [ ] ERC721/ERC1155 full implementation

## Best Practices

1. **RPC Endpoints**: Use multiple RPC endpoints per chain for redundancy
2. **Confirmations**: Adjust `confirmationsRequired` based on chain security needs
3. **Batch Sizes**: Tune batch sizes based on chain block times
4. **Monitoring**: Set up alerts for listener failures
5. **Backups**: Regularly backup listener state and transactions

## License

Part of the Safe Wallet project.

