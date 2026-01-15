# Ankr Advanced API Service

This service provides a complete implementation of the Ankr Advanced API for interacting with multiple blockchains in a single request. Advanced API is a specifically-tailored collection of JSON-RPC API endpoints built to support the most popular Web3 scenarios on multiple chains at almost instant speeds.

## Overview

Advanced API optimizes, indexes, caches, and stores blockchain data to make it access-ready for you. It supports querying across multiple mainnet and testnet chains in a single request.

**Available for:** Freemium and Premium users

## Setup

1. Add your Ankr API token to your `.env` file:
```env
ANKR_API_TOKEN=your_token_here
ANKR_BASE_URL=https://rpc.ankr.com/multichain  # Optional, defaults to this value
```

2. The `AnkrModule` is already imported in `AppModule` and marked as `@Global()`, so you can inject `AnkrService` anywhere in your application.

## Pricing

All Advanced API methods cost **700 API Credits** per request (**$0.00007 USD**).

- Base pricing: **0.10 USD = 1M API Credits**
- Pricing is pegged to USD
- When using ANKR tokens for PAYG, ANKR calculates into API Credits at the latest ANKR/USD exchange rate

The pricing configuration is available in the app configuration under `ankr.pricing`.

## Usage

### Inject the Service

```typescript
import { Injectable } from '@nestjs/common';
import { AnkrService } from './ankr/ankr.service';

@Injectable()
export class YourService {
  constructor(private readonly ankrService: AnkrService) {}

  async someMethod() {
    // Use the service methods here
  }
}
```

### Using Chain Constants

For type-safe chain references, use the exported constants:

```typescript
import { ANKR_MAINNET_CHAINS, ANKR_TESTNET_CHAINS } from './ankr/constants/chains';

// Use constants instead of strings
const stats = await this.ankrService.getBlockchainStats({
  blockchain: ANKR_MAINNET_CHAINS.ETHEREUM
});

const blocks = await this.ankrService.getBlocks({
  blockchain: ANKR_MAINNET_CHAINS.POLYGON,
  fromBlock: 10000000,
  toBlock: 10000010
});
```

## Available Methods

### Query API Methods

#### 1. Get Blockchain Statistics

```typescript
// Get stats for all blockchains
const stats = await this.ankrService.getBlockchainStats();

// Get stats for specific blockchain(s)
const ethStats = await this.ankrService.getBlockchainStats({
  blockchain: 'eth'
});

// Get stats for multiple blockchains
const multiStats = await this.ankrService.getBlockchainStats({
  blockchain: ['eth', 'bsc', 'polygon']
});
```

#### 2. Get Blocks

```typescript
const blocks = await this.ankrService.getBlocks({
  blockchain: 'eth',
  fromBlock: 14500000,
  toBlock: 14500000,
  includeTxs: true,
  includeLogs: true,
  decodeTxData: true,
  decodeLogs: false,
  descOrder: false
});
```

#### 3. Get Logs

```typescript
const logs = await this.ankrService.getLogs({
  blockchain: 'eth',
  fromBlock: '0xdaf6b1', // hex format
  toBlock: 14350010, // decimal format
  address: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
  topics: [
    [],
    ['0x000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff']
  ],
  decodeLogs: true,
  pageSize: 100,
  pageToken: 'next_page_token' // For pagination
});
```

#### 4. Get Transactions by Hash

```typescript
const transactions = await this.ankrService.getTransactionsByHash({
  transactionHash: '0x82c13aaac6f0b6471afb94a3a64ae89d45baa3608ad397621dbb0d847f51196f',
  decodeLogs: true,
  decodeTxData: true,
  includeLogs: true,
  blockchain: ['eth', 'bsc'] // Optional: search across multiple chains
});
```

#### 5. Get Transactions by Address

```typescript
const transactions = await this.ankrService.getTransactionsByAddress({
  address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
  blockchain: 'eth', // Optional: can be string, array, or omitted for all chains
  fromBlock: 10000000,
  toBlock: 'latest',
  fromTimestamp: 1609459200,
  toTimestamp: 1640995200,
  includeLogs: true,
  descOrder: true,
  pageSize: 50,
  pageToken: 'next_page_token' // For pagination
});
```

#### 6. Get Interactions (Blockchains for an Address)

```typescript
const interactions = await this.ankrService.getInteractions({
  address: '0xF977814e90dA44bFA03b6295A0616a897441aceC'
});

// Returns: { blockchains: ['eth', 'bsc', 'polygon', ...] }
```

### Token API Methods

#### 7. Get Account Balance

```typescript
const balance = await this.ankrService.getAccountBalance({
  walletAddress: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
  blockchain: 'eth', // Optional: can be string, array, or omitted for all chains
  pageSize: 100,
  pageToken: 'next_page_token' // For pagination
});
```

#### 8. Get Currencies

```typescript
const currencies = await this.ankrService.getCurrencies({
  blockchain: 'eth' // Required
});
```

#### 9. Get Token Price

```typescript
const price = await this.ankrService.getTokenPrice({
  blockchain: 'eth',
  contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC
});
```

#### 10. Get Token Holders

```typescript
const holders = await this.ankrService.getTokenHolders({
  blockchain: 'eth',
  contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  pageSize: 100,
  pageToken: 'next_page_token' // For pagination
});
```

#### 11. Get Token Holders Count

```typescript
const count = await this.ankrService.getTokenHoldersCount({
  blockchain: 'eth',
  contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
});
```

#### 12. Get Token Transfers

```typescript
const transfers = await this.ankrService.getTokenTransfers({
  address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
  blockchain: 'eth', // Optional: can be string, array, or omitted for all chains
  fromBlock: 10000000,
  toBlock: 'latest',
  pageSize: 100,
  pageToken: 'next_page_token' // For pagination
});
```

#### 13. Get Token Price History

```typescript
const priceHistory = await this.ankrService.getTokenPriceHistory({
  blockchain: 'eth',
  contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  fromTimestamp: 1609459200,
  toTimestamp: 1640995200
});
```

### NFT API Methods

#### 14. Get NFTs by Owner

```typescript
const nfts = await this.ankrService.getNFTsByOwner({
  walletAddress: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
  blockchain: 'eth', // Optional: can be string, array, or omitted for all chains
  pageSize: 100,
  pageToken: 'next_page_token' // For pagination
});
```

#### 15. Get NFT Metadata

```typescript
const metadata = await this.ankrService.getNFTMetadata({
  blockchain: 'eth',
  contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', // BAYC
  tokenId: '1'
});
```

#### 16. Get NFT Holders

```typescript
const holders = await this.ankrService.getNFTHolders({
  blockchain: 'eth',
  contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  pageSize: 100,
  pageToken: 'next_page_token' // For pagination
});
```

#### 17. Get NFT Transfers

```typescript
const transfers = await this.ankrService.getNftTransfers({
  address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
  blockchain: 'eth', // Optional: can be string, array, or omitted for all chains
  pageSize: 100,
  pageToken: 'next_page_token' // For pagination
});
```

## Supported Blockchains

Before making calls, verify the required method's supported chains in its documentation.

### Mainnet Chains

| Chain | Alias |
|-------|-------|
| Arbitrum | `arbitrum` |
| Avalanche | `avalanche` |
| Base | `base` |
| BNB Smart Chain | `bsc` |
| Ethereum | `eth` |
| Fantom | `fantom` |
| Flare | `flare` |
| Gnosis | `gnosis` |
| Optimism | `optimism` |
| Polygon | `polygon` |
| Scroll | `scroll` |
| Stellar | `stellar` |
| Story | `story_mainnet` |
| Syscoin | `syscoin` |
| Telos | `telos` |
| Xai | `xai` |
| X Layer | `xlayer` |

### Testnet Chains

| Chain | Alias |
|-------|-------|
| Avalanche Fuji | `avalanche_fuji` |
| Base Sepolia | `base_sepolia` |
| Ethereum Holesky | `eth_holesky` |
| Ethereum Sepolia | `eth_sepolia` |
| Optimism Testnet | `optimism_testnet` |
| Polygon Amoy | `polygon_amoy` |
| Story Testnet | `story_aeneid_testnet` |

Use the exported constants from `./ankr/constants/chains` for type-safe chain references.

## Error Handling

The service throws `BadRequestException` for:
- Missing required parameters
- Missing API token configuration
- API errors (wrapped with error message and code)

## TypeScript Types

All request parameters and response types are fully typed. Import them from the service:

```typescript
import {
  GetBlockchainStatsParams,
  GetBlockchainStatsResponse,
  GetBlocksParams,
  GetBlocksResponse,
  GetAccountBalanceParams,
  GetAccountBalanceResponse,
  GetNFTsByOwnerParams,
  GetNFTsByOwnerResponse,
  // ... etc
} from './ankr';

// Chain constants
import {
  ANKR_MAINNET_CHAINS,
  ANKR_TESTNET_CHAINS,
  ANKR_SUPPORTED_CHAINS,
  type AnkrSupportedChain
} from './ankr/constants/chains';
```

## API Collections

### Query API
Methods for requesting info on ranges of blocks (max range is 100) for a full list of block metadata:
- `ankr_getBlockchainStats` - Retrieves blockchain statistics
- `ankr_getBlocks` - Retrieves full info of a particular block
- `ankr_getLogs` - Retrieves history data of a particular block range
- `ankr_getTransactionsByHash` - Retrieves the details of a transaction specified by hash
- `ankr_getTransactionsByAddress` - Retrieves the details of a transaction specified by wallet address
- `ankr_getInteractions` - Retrieves blockchains interacted with a particular wallet

### Token API
Methods for requesting token-related data across multiple chains:
- `ankr_getAccountBalance` - Retrieves the balance of a particular account
- `ankr_getCurrencies` - Retrieves a list of currencies used on a particular blockchain
- `ankr_getTokenPrice` - Retrieves the price of a particular token
- `ankr_getTokenHolders` - Retrieves info on holders of a particular token
- `ankr_getTokenHoldersCount` - Retrieves the number of token holders
- `ankr_getTokenTransfers` - Retrieves token transfers info
- `ankr_getTokenPriceHistory` - Retrieves the historical price of the token specified

### NFT API
Methods for requesting NFT-related data across multiple chains:
- `ankr_getNFTsByOwner` - Retrieves an account-associated NFTs
- `ankr_getNFTMetadata` - Retrieves metadata of a particular NFT
- `ankr_getNFTHolders` - Retrieves holders of a particular NFT
- `ankr_getNftTransfers` - Retrieves NFT transfers info of a particular address

## Resources

- [Ankr Advanced API Documentation](https://www.ankr.com/docs/advanced-api/overview/)
- [OpenAPI Specification - NFT API](https://www.ankr.com/docs/advanced-api/nft-api/)
- [OpenAPI Specification - Query API](https://www.ankr.com/docs/advanced-api/query-api/)
- [OpenAPI Specification - Token API](https://www.ankr.com/docs/advanced-api/token-api/)
- [Discord Community](https://discord.gg/ankr)

