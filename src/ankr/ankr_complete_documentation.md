# Ankr Complete Documentation Guide

**Version:** 2025
**Last Updated:** January 2025

## Table of Contents

1. [Introduction](#introduction)
2. [Node API](#node-api)
3. [Advanced API](#advanced-api)
4. [Contract Automation](#contract-automation)
5. [Scaling Services](#scaling-services)
6. [Staking Services](#staking-services)
7. [Gaming (Mirage)](#gaming-mirage)
8. [Developer Resources](#developer-resources)

---

## Introduction

### What is Ankr?

Ankr is the leading Web3 infrastructure company providing:
- **70+ blockchain networks** supported
- **99.99% uptime** guaranteed
- **56ms average response time**
- **30+ global bare-metal node regions**
- **8 billion daily RPC requests** handled
- **$83M+ TVL** in staking services
- **18,000+ active users**

### Core Products

1. **Node API** - RPC/REST endpoints for blockchain interaction
2. **Advanced API** - Optimized, indexed blockchain data queries
3. **Contract Automation** - Time-based and event-driven contract execution
4. **Scaling Services** - Rollup-as-a-Service (RaaS) and Sidechains
5. **Liquid Staking** - Stake assets while maintaining liquidity
6. **Mirage Gaming** - Web3 gaming integration platform

---

## Node API

### Overview

Node API is Ankr's gateway for projects to interact with blockchains using RPC (Remote Procedure Call) and REST protocols.

### Key Features

- **HTTPS and WebSockets (WSS)** support
- **Standard, Trace, and Debug** method collections
- **Full and Archive node** access
- **Multi-chain support** for 80+ blockchains

### Supported Chains (Sample)

**EVM-Compatible:**
- Ethereum (Mainnet, Holesky, Sepolia)
- Arbitrum, Arbitrum Nova
- Avalanche (C-Chain, Fuji)
- Base
- BNB Smart Chain
- Blast
- Celo
- Fantom
- Gnosis
- Linea
- Mantle
- Optimism
- Polygon (PoS, zkEVM, Amoy)
- Scroll
- zkSync Era

**Non-EVM:**
- Aptos
- Bitcoin
- Cosmos-based chains
- NEAR
- Polkadot, Kusama
- Solana
- Stellar
- Sui
- TON
- TRON
- XRP

### Service Plans

#### 1. **Public Plan (Free)**
- Free access to public RPC endpoints
- Rate-limited shared infrastructure
- Community support
- Best for: Development, testing, small projects

#### 2. **Premium Plan (Pay-as-you-go)**
- Dedicated endpoints
- Higher rate limits
- Priority support
- Advanced analytics
- Pay only for what you use
- Pricing: Per-request model

#### 3. **Enterprise Plan (Custom)**
- Dedicated infrastructure
- Custom rate limits
- SLA guarantees
- 24/7 premium support
- Custom integrations

### Method Collections

#### Standard Methods
```javascript
// Connect to a blockchain
const provider = new ethers.providers.JsonRpcProvider(
  'https://rpc.ankr.com/eth'
);

// Get block number
const blockNumber = await provider.getBlockNumber();

// Get balance
const balance = await provider.getBalance(address);

// Send transaction
const tx = await wallet.sendTransaction({
  to: recipient,
  value: ethers.utils.parseEther("1.0")
});
```

#### Trace Methods
- `trace_block` - Full externality trace of a block
- `trace_transaction` - Trace specific transaction
- `trace_filter` - Trace with filters

#### Debug Methods
- `debug_traceTransaction` - Debug transaction execution
- `debug_traceBlock` - Debug block execution

### Rate Limits

Rate limits denote the number of requests per time unit:
- **Freemium**: Limited requests per second
- **Premium**: Customizable based on subscription
- **Enterprise**: Unlimited with SLA

### Projects Feature

Organize and manage multiple projects:
- Individual endpoint management
- Per-project analytics
- Enable/disable endpoints
- Usage statistics tracking

### WebSocket Support

```javascript
const ws = new WebSocket('wss://rpc.ankr.com/eth/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({
    method: 'eth_subscribe',
    params: ['newHeads'],
    id: 1,
    jsonrpc: '2.0'
  }));
});
```

---

## Advanced API

### Overview

Advanced API provides optimized, indexed, and cached blockchain data for:
- **Near-instant speeds**
- **Multi-chain queries in single request**
- **Reduced request complexity**
- **Archive data access**

### Supported Chains

**Mainnets (19 chains):**
- Arbitrum
- Avalanche
- Base
- BNB Smart Chain
- Ethereum
- Fantom
- Flare
- Gnosis
- Linea
- Optimism
- Polygon
- Polygon zkEVM
- Scroll
- Stellar
- Story
- Syscoin

**Testnets (7 chains):**
- Avalanche Fuji
- Ethereum Holesky
- Ethereum Sepolia
- Optimism Testnet
- Polygon Amoy
- Story Testnet

### API Methods

#### NFT API Methods

**ankr_getNFTsByOwner**
Retrieves all NFTs owned by an address.

```javascript
const nfts = await provider.getNFTsByOwner({
  blockchain: 'eth',
  walletAddress: '0x...',
  pageSize: 20
});
```

**ankr_getNFTMetadata**
Retrieves metadata for specific NFT.

```javascript
const metadata = await provider.getNFTMetadata({
  blockchain: 'eth',
  contractAddress: '0x...',
  tokenId: '1'
});
```

**ankr_getNftTransfers**
Retrieves NFT transfer history.

```javascript
const transfers = await provider.getNftTransfers({
  blockchain: 'eth',
  address: '0x...',
  fromTimestamp: 1640000000
});
```

#### Token API Methods

**ankr_getAccountBalance**
Retrieves account balance across chains.

```javascript
const balance = await provider.getAccountBalance({
  walletAddress: '0x...',
  blockchain: ['eth', 'bsc', 'polygon']
});
```

**ankr_getCurrencies**
Lists currencies on a blockchain.

```javascript
const currencies = await provider.getCurrencies({
  blockchain: 'eth'
});
```

**ankr_getTokenPrice**
Gets current token price.

```javascript
const price = await provider.getTokenPrice({
  blockchain: 'eth',
  contractAddress: '0x...'
});
```

**ankr_getTokenHolders**
Gets token holder information.

```javascript
const holders = await provider.getTokenHolders({
  blockchain: 'eth',
  contractAddress: '0x...',
  limit: 100
});
```

**ankr_getTokenHoldersCount**
Gets number of token holders.

**ankr_getTokenTransfers**
Retrieves token transfer history.

**ankr_getTokenPriceHistory**
Gets historical price data.

#### Query API Methods

**ankr_getBlockchainStats**
Retrieves blockchain statistics.

```javascript
const stats = await provider.getBlockchainStats({
  blockchain: 'eth'
});
```

**ankr_getBlocks**
Gets full block information (max 100 blocks).

```javascript
const blocks = await provider.getBlocks({
  blockchain: 'eth',
  fromBlock: 18000000,
  toBlock: 18000100
});
```

**ankr_getLogs**
Retrieves historical logs for block range.

**ankr_getTransactionsByHash**
Gets transaction details by hash.

**ankr_getTransactionsByAddress**
Gets transactions for specific address.

**ankr_getInteractions**
Retrieves blockchains interacted with by wallet.

### SDKs and Tools

#### Ankr.js SDK (JavaScript/TypeScript)

**Installation:**
```bash
npm install @ankr.com/ankr.js
# or
yarn add @ankr.com/ankr.js
```

**Usage:**
```javascript
import { AnkrProvider } from '@ankr.com/ankr.js';

const provider = new AnkrProvider('YOUR_ENDPOINT');

// Get NFTs
const nfts = await provider.getNFTsByOwner({
  blockchain: 'eth',
  walletAddress: '0x0E11A192d574b342C51be9e306694C41547185DD'
});

// Get balance
const balance = await provider.getAccountBalance({
  walletAddress: '0x...',
  blockchain: ['eth']
});
```

#### Ankr.py SDK (Python)

```python
from ankr import AnkrProvider

provider = AnkrProvider()

# Get NFTs
nfts = provider.get_nfts_by_owner(
    blockchain='eth',
    wallet_address='0x...'
)

# Get account balance
balance = provider.get_account_balance(
    wallet_address='0x...',
    blockchain=['eth', 'bsc']
)
```

#### Ankr React Hooks

```javascript
import { useGetAccountBalance } from '@ankr.com/react-hooks';

function WalletBalance({ address }) {
  const { data, isLoading } = useGetAccountBalance({
    walletAddress: address,
    blockchain: ['eth', 'polygon']
  });
  
  return (
    <div>
      {isLoading ? 'Loading...' : data.totalBalanceUsd}
    </div>
  );
}
```

### Pricing

API Credits are pegged to USD. Payment options:
- **Pay-as-you-go (PAYG)**: Deposit and pay for usage
- **One-time payments**: USD (via Stripe) or Crypto (via MetaMask)
- **Recurring payments**: Automatic balance top-ups

### Use Cases

1. **DeFi Dashboards** - Display multi-chain portfolio balances
2. **NFT Marketplaces** - Query NFT ownership and metadata
3. **Analytics Platforms** - Track token transfers and holders
4. **Wallet Applications** - Show comprehensive asset information
5. **Trading Bots** - Access real-time price data

---

## Contract Automation

### Overview

Ankr Contract Automation executes smart contract functions based on various triggers, eliminating the need for manual intervention or centralized servers.

### Features

- **Time-based Automation** - Execute at specific times/intervals
- **Custom Logic Automation** - Event-driven execution
- **Reliable Infrastructure** - Ankr's robust global network
- **Dashboard Management** - Easy task monitoring and control

### Time-Based Automation

Execute functions on a schedule:
- **Cron expressions** for complex schedules
- **Fixed intervals** (hourly, daily, weekly)
- **Specific timestamps**

**Example Use Cases:**
- Daily reward distributions
- Weekly token burns
- Monthly governance proposals
- Periodic data updates

**Sample Configuration:**
```javascript
{
  "schedule": "0 0 * * *", // Every day at midnight
  "contractAddress": "0x...",
  "functionName": "distributeRewards",
  "parameters": [],
  "chainId": 1
}
```

### Custom Logic Automation

Execute based on contract events or conditions:
- **Event monitoring** - Trigger on specific events
- **Condition checking** - Execute when conditions met
- **State changes** - React to blockchain state

**Example Use Cases:**
- Liquidation automation in DeFi
- NFT minting triggers
- Cross-chain bridge operations
- Automated market makers (AMM) rebalancing

### Creating Compatible Contracts

**Requirements:**
1. Contract must be verified on blockchain explorer
2. Function must be public/external
3. Proper access control implemented
4. Gas-optimized for automation

**Example Contract:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AutomationExample {
    address public owner;
    uint256 public lastExecuted;
    
    modifier onlyOwnerOrAutomation() {
        require(
            msg.sender == owner || 
            msg.sender == ANKR_AUTOMATION_ADDRESS,
            "Not authorized"
        );
        _;
    }
    
    function executeDaily() external onlyOwnerOrAutomation {
        require(
            block.timestamp >= lastExecuted + 1 days,
            "Too soon"
        );
        
        lastExecuted = block.timestamp;
        // Automation logic here
    }
}
```

### Managing Automation Tasks

Through the Ankr dashboard:
1. **Create Task** - Define trigger and function
2. **Monitor Execution** - View execution history
3. **Pause/Resume** - Control task status
4. **Edit Parameters** - Update task configuration
5. **Delete Task** - Remove automation

### Supported Networks

Contract automation available on major EVM chains:
- Ethereum
- BNB Smart Chain
- Polygon
- Avalanche
- Arbitrum
- Optimism
- And more

---

## Scaling Services

### Overview

Ankr Scaling Services (Asphere) provides infrastructure for launching custom blockchains through:
1. **Rollup-as-a-Service (RaaS)**
2. **Sidechains**
3. **Bitcoin Secured Infrastructure**

### Rollup-as-a-Service (RaaS)

#### What are Rollups?

Rollups are Layer 2 scaling solutions that:
- Process transactions **off-chain**
- Bundle multiple transactions into batches
- Submit condensed data to mainnet
- Reduce gas costs significantly
- Increase transaction throughput

#### Rollup Types

**1. Optimistic Rollups**
- Assume transactions valid by default
- Use fraud proofs for disputes
- 7-day challenge period
- Examples: Optimism, Arbitrum

**2. Zero-Knowledge (ZK) Rollups**
- Use cryptographic proofs (zk-SNARKs/STARKs)
- Immediate finality
- No challenge period
- Higher computational cost
- Examples: zkSync, Polygon zkEVM

#### Supported Rollup Stacks

**Arbitrum Orbit**
- Based on Arbitrum technology
- Customizable L2 or L3 chains
- AnyTrust or Rollup mode
- Full EVM compatibility

**OP Stack (Optimism)**
- Modular, open-source framework
- Battle-tested on Optimism and Base
- Developer-friendly
- Strong Ethereum alignment

**ZK Stack (zkSync)**
- Zero-knowledge proof technology
- Hyperchains architecture
- Fast finality
- Privacy features

**Polygon CDK (Chain Development Kit)**
- Create zkEVM validiums or rollups
- Connect to Polygon ecosystem
- AggLayer for interoperability
- Extensive Web3 support

#### Data Availability Layers

**Arbitrum AnyTrust**
- Data Availability Committee (DAC)
- Trust 1-of-N honest assumption
- Efficient and cost-effective
- Reduced mainnet data posting

**Avail DA**
- Dedicated data availability layer
- Light client verification
- High throughput
- Modular design

**Celestia**
- First modular DA layer
- Data availability sampling
- Sovereign rollups support
- Consensus-free data availability

**EigenDA**
- Built on EigenLayer restaking
- Ethereum-native security
- Linear scaling with operators
- No separate token needed

**NEAR DA**
- Cost-effective DA solution
- ~100x cheaper than Ethereum L1
- Fast and reliable
- Easy integration

### Sidechains

#### What are Sidechains?

Independent blockchains that:
- Run parallel to mainnet
- Connect via two-way bridges
- Have custom consensus rules
- Offer complete flexibility

#### BNB Sidechain Framework

**Architecture Components:**

1. **Parlia Consensus** - Proof-of-Staked-Authority
2. **Fast Finality** - BLS signature aggregation
3. **Native Bridge** - Asset transfer between chains
4. **System Smart Contracts** - Core functionality

**System Smart Contracts:**
```
Staking: 0x0000000000000000000000000000000000001000
SlashingIndicator: 0x0000000000000000000000000000000000001001
SystemReward: 0x0000000000000000000000000000000000001002
```

**Key Features:**
- EVM compatibility
- Customizable genesis
- Modular architecture
- Built-in staking mechanism
- Governance framework
- Runtime upgrades

**Security Measures:**
- Validator set management
- Slashing for misbehavior
- Fast finality guarantees
- Bridge security protocols
- On-chain governance

**Launch Process:**
1. Configure genesis file
2. Set validator nodes
3. Deploy system contracts
4. Initialize bridge (optional)
5. Launch network

**Demo Environment:**
```
Network: BAS devnet
RPC: https://rpc.dev-01.bas.ankr.com/
Explorer: https://explorer.dev-01.bas.ankr.com/
Faucet: https://faucet.dev-01.bas.ankr.com/
Chain ID: 14000
```

#### Polygon Supernets

Legacy sidechain solution (being phased out in favor of Polygon CDK).

### No-Code Deployer

Launch rollups without technical expertise:
- Visual interface
- Pre-configured templates
- One-click deployment
- Automatic infrastructure setup

### Bitcoin Secured Infrastructure

Leverage Bitcoin's security for:
- Enhanced security guarantees
- Bitcoin-based settlement
- Hybrid consensus models

### RaaS Benefits

1. **Speed to Market** - Launch in days, not months
2. **Cost Efficiency** - Pay for infrastructure only
3. **Customization** - Tailor to specific needs
4. **Expertise** - Ankr engineering support
5. **Infrastructure** - Global node network
6. **Scalability** - Handle billions of transactions

### Use Cases

- **Gaming** - High-throughput game chains
- **DeFi** - Application-specific DeFi chains
- **Enterprise** - Private/permissioned chains
- **NFTs** - NFT marketplaces and platforms
- **Social** - Social media applications

### Integration Partners

- Optimism
- Arbitrum
- zkSync
- Polygon
- EigenLayer
- Celestia
- Avail
- NEAR Protocol

---

## Staking Services

### Overview

Ankr Staking provides:
- **Liquid Staking** - Maintain liquidity while staking
- **Delegated Staking** - Choose validators
- **DeFi Integration** - Earn additional yield
- **Bridge & Switch** - Cross-chain capabilities

**Statistics:**
- $83M+ Total Value Locked (TVL)
- 18,000+ active stakers
- 9+ supported tokens
- 99.9% validator uptime

### Liquid Staking

#### Concept

Liquid Staking solves the problem of locked liquidity by providing:
1. **Instant Liquidity** - Receive liquid staking tokens (LSTs)
2. **Continue Earning** - Tokens represent staked value + rewards
3. **DeFi Access** - Use LSTs in DeFi protocols
4. **Flexibility** - Trade or unstake anytime

#### Supported Chains

**Ethereum (ETH → ankrETH)**
- Minimum stake: 0.1 ETH
- Reward-bearing token (grows in value vs ETH)
- EigenLayer restaking support
- ERC-20 compatible

**Avalanche (AVAX → ankrAVAX)**
- Minimum stake: 1 AVAX
- Reward-bearing token
- Elastic supply model
- 14-day unstaking period

**Binance (BNB → ankrBNB)**
- Minimum stake: 0.01 BNB
- Reward-bearing token
- Flash unstake available
- 7-day standard unstaking

**Polygon (POL → ankrPOL)**
- Minimum stake: 1 POL
- Reward-bearing token
- Available on Ethereum and Polygon
- 3-day unstaking period

**Fantom (FTM → ankrFTM)**
- Minimum stake: 1 FTM
- Reward-bearing token
- Instant liquidity
- 7-day unstaking period

**Flow (FLOW → ankrFLOW)**
- Minimum stake: 1 FLOW
- Liquid staking support

#### Token Types

**Reward-Bearing Tokens**
- Token value **increases** over time
- Token **quantity stays same**
- Example: 1 ankrETH > 1 ETH (value grows)
- Tokens: ankrETH, ankrAVAX, ankrBNB, ankrPOL, ankrFTM

**Reward-Earning Tokens (Legacy)**
- Token quantity **increases** via rebasing
- Being phased out
- Examples: aETHb, aAVAXb (discontinued for new stakes)

#### How to Stake

**Example: Ethereum Staking**

1. Visit Ankr Staking platform
2. Connect wallet (MetaMask, WalletConnect, etc.)
3. Select Ethereum
4. Enter amount to stake (min 0.1 ETH)
5. Click "Get ankrETH"
6. Confirm transaction
7. Receive ankrETH in wallet

**Code Example:**
```javascript
import { EthereumSDK } from '@ankr.com/staking-sdk';

const sdk = await EthereumSDK.getInstance();

// Stake 1 ETH
const { txHash } = await sdk.stake(
  new BigNumber(1),
  'aETHc' // ankrETH
);
```

#### How to Unstake

1. Go to Dashboard
2. Select token to unstake
3. Enter amount
4. Confirm transaction
5. Wait for unbonding period
6. Claim unstaked tokens

**Unstaking Periods:**
- Ethereum: Currently locked (until Ethereum enables withdrawals)
- Avalanche: 14 days
- BNB: 7 days (or instant with Flash Unstake)
- Polygon: 3 days
- Fantom: 7 days

### DeFi Integration

Use liquid staking tokens for:

**1. Liquidity Provision**
- Add to DEX pools (Uniswap, PancakeSwap, Curve)
- Earn trading fees + staking rewards
- Example: ankrETH/ETH pool

**2. Yield Farming**
- Stake LP tokens in farms
- Earn additional token rewards
- Compound yields

**3. Lending/Borrowing**
- Use as collateral (Aave, Compound)
- Borrow against staked assets
- Maintain staking rewards

**4. Vaults**
- Auto-compounding strategies
- Optimized yield
- Reduced gas costs

### Liquid Staking SDK

**Installation:**
```bash
npm install @ankr.com/staking-sdk
```

**Supported Networks:**
```javascript
// Avalanche
import { AvalancheSDK } from '@ankr.com/staking-sdk';

// Binance
import { BinanceSDK } from '@ankr.com/staking-sdk';

// Ethereum
import { EthereumSDK } from '@ankr.com/staking-sdk';

// Fantom
import { FantomSDK } from '@ankr.com/staking-sdk';

// Polygon
import { PolygonOnEthereumSDK } from '@ankr.com/staking-sdk';
```

**Basic Operations:**

**Stake:**
```javascript
const sdk = await PolygonOnEthereumSDK.getInstance();
const { txHash } = await sdk.stake(
  new BigNumber(100), 
  'aPOLc'
);
```

**Unstake:**
```javascript
await sdk.unstake(
  new BigNumber(50), 
  'aPOLc'
);
```

**Get History:**
```javascript
const history = await sdk.getTxEventsHistory();
```

**Check Balance:**
```javascript
const balance = await sdk.getBalance('aPOLc');
```

### Smart Contract APIs

Each chain has specific smart contract methods:

**Ethereum:**
- `stakeAndClaimBonds()` - Stake ETH
- `lockShares()` - Lock for extra yield
- `unlockShares()` - Unlock shares

**Avalanche:**
- `stake()` - Stake AVAX
- `unstake()` - Burn ankrAVAX, get AVAX

**Binance:**
- `stake()` - Stake BNB
- `unstakeBonds()` - Initiate unstaking
- `claimBonds()` - Claim unstaked BNB

**Polygon:**
- `stake()` - Stake POL
- `unstake()` - Unstake POL

### RESTful APIs

**Staking Metrics API**
```
GET /v1/metrics/staking
```
Returns staking statistics and metrics.

**Trustless Ratio API**
```
GET /v1/ratio/{token}
```
Returns exchange ratio for liquid staking tokens.

**Validator API**
```
GET /v1/validators
```
Returns validator information and performance.

### Oracles

**Redemption Price Oracle**
- On-chain price feeds
- ankrETH/ETH ratio
- Updated regularly
- Chainlink-compatible

**PancakeSwap Price Oracle**
- DEX price data
- BNB Chain tokens
- TWAP calculations

**APR Oracle**
- Current APR rates
- Historical data
- Multiple chains

### Flash Unstake (BNB)

Instant unstaking with small fee:
1. Go to Unstake page
2. Select "Flash Unstake"
3. Review fee (typically 0.5%)
4. Confirm transaction
5. Receive BNB instantly

### Delegated Staking

**Ankr Delegated Staking:**
- Stake ANKR tokens
- Choose validators
- Earn rewards
- Participate in governance

**Gnosis Delegated Staking:**
- Stake GNO
- Support Gnosis validators
- Earn staking rewards

### Bridge

**Ankr Bridge** enables cross-chain transfers of liquid staking tokens:

Supported Routes:
- Ethereum ↔ BNB Chain
- Ethereum ↔ Polygon
- Ethereum ↔ Avalanche
- BNB Chain ↔ Polygon

**How to Bridge:**
1. Select source and destination chains
2. Enter amount
3. Confirm transaction on source chain
4. Wait for bridge confirmation
5. Receive tokens on destination chain

### Switch

**Ankr Switch** allows swapping between token types:
- Reward-earning ↔ Reward-bearing
- Example: aETHb → ankrETH
- Same asset, different token model

### Staking Fees

- **Ethereum**: 10% of staking rewards
- **Avalanche**: 10% of staking rewards
- **Binance**: 10% of staking rewards
- **Polygon**: 10% of staking rewards
- **Fantom**: 10% of staking rewards

### Security & Audits

All liquid staking contracts audited by:
- Beosin Blockchain Security
- Certik
- PeckShield

Audit reports available at: https://www.ankr.com/docs/staking-extra/audit-reports/

### Compatible Wallets

- MetaMask
- Trust Wallet
- Ledger
- Trezor
- WalletConnect
- Coinbase Wallet
- MyEtherWallet
- And more

---

## Gaming (Mirage)

### Overview

Mirage is Ankr's Web3 gaming platform offering:
- Easy Web3 wallet integration
- NFT and token management
- Blockchain connectivity
- Unity and Unreal Engine support

### Features

1. **Wallet Integration**
   - Multi-wallet support
   - Easy authentication
   - Transaction signing

2. **Asset Management**
   - NFT minting and transfers
   - Token operations
   - Inventory systems

3. **Blockchain Connectivity**
   - RPC access
   - Smart contract interaction
   - Event listening

4. **SDKs**
   - Unity SDK
   - Unreal Engine SDK
   - Cross-platform support

### Use Cases

- Play-to-earn games
- NFT-based gaming assets
- Blockchain-based achievements
- Decentralized game economies
- In-game marketplaces

For detailed documentation: https://mirage.xyz/docs/

---

## Developer Resources

### Documentation

- **Main Docs**: https://www.ankr.com/docs/
- **API Reference**: https://api-docs.ankr.com/reference/
- **GitHub**: https://github.com/Ankr-network/
- **Tutorials**: https://ankr.hashnode.dev/

### SDKs and Libraries

**JavaScript/TypeScript:**
- `@ankr.com/ankr.js` - Advanced API SDK
- `@ankr.com/staking-sdk` - Liquid Staking SDK
- `@ankr.com/react-hooks` - React integration

**Python:**
- `ankr.py` - Python SDK for Advanced API

### Code Examples

#### Basic RPC Connection

```javascript
const ethers = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(
  'https://rpc.ankr.com/eth'
);

async function getLatestBlock() {
  const block = await provider.getBlock('latest');
  console.log('Latest block:', block.number);
}
```

#### Multi-Chain Balance Check

```javascript
import { AnkrProvider } from '@ankr.com/ankr.js';

const provider = new AnkrProvider('YOUR_ENDPOINT');

const balance = await provider.getAccountBalance({
  walletAddress: '0x...',
  blockchain: ['eth', 'bsc', 'polygon', 'avalanche']
});

console.log('Total USD:', balance.totalBalanceUsd);
console.log('Assets:', balance.assets);
```

#### NFT Query

```javascript
const nfts = await provider.getNFTsByOwner({
  blockchain: 'eth',
  walletAddress: '0x...',
  pageSize: 50
});

nfts.assets.forEach(nft => {
  console.log('NFT:', nft.name);
  console.log('Contract:', nft.contractAddress);
  console.log('Token ID:', nft.tokenId);
});
```

#### Liquid Staking

```javascript
import { EthereumSDK } from '@ankr.com/staking-sdk';

const sdk = await EthereumSDK.getInstance();

// Stake ETH
const stakeResult = await sdk.stake(
  new BigNumber(1), // 1 ETH
  'aETHc'
);

console.log('Stake TX:', stakeResult.txHash);

// Check balance
const balance = await sdk.getBalance('aETHc');
console.log('ankrETH Balance:', balance.toString());
```

### Tutorials

#### 1. Build a DeFi Dashboard

**Technologies:** Vite.js, Ankr.js, Tailwind CSS

**Steps:**
1. Set up Vite.js project
2. Install Ankr.js SDK
3. Query multi-chain balances
4. Display portfolio value
5. Show transaction history

**Guide:** https://www.ankr.com/docs/advanced-api/quickstart/defi-dashboard-ankrjs/

#### 2. NFT Smart Contract on Avalanche

**Technologies:** Hardhat, Ethers.js, Ankr RPC

**Steps:**
1. Set up Hardhat project
2. Configure Ankr RPC endpoint
3. Write ERC-721 contract
4. Deploy to Avalanche
5. Mint NFTs

**Guide:** https://www.ankr.com/docs/smart-contract-tutorials/erc-721-smart-contract-on-avalanche/

#### 3. Crowdfunding dApp on Polygon

**Technologies:** React, Hardhat, Ankr

**Steps:**
1. Smart contract development
2. Frontend with React
3. Connect to Polygon via Ankr
4. Implement donation logic
5. Deploy and test

**Guide:** https://www.ankr.com/docs/advanced-tutorials/donation-based-crowdfunding-dapp-on-polygon-with-ankr/

### Best Practices

#### RPC Usage

1. **Use WebSockets for real-time data**
   ```javascript
   const ws = new WebSocket('wss://rpc.ankr.com/eth/ws');
   ```

2. **Implement retry logic**
   ```javascript
   async function withRetry(fn, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await fn();
       } catch (err) {
         if (i === retries - 1) throw err;
         await new Promise(r => setTimeout(r, 1000 * (i + 1)));
       }
     }
   }
   ```

3. **Batch requests when possible**
   ```javascript
   const batch = [
     { method: 'eth_blockNumber', params: [] },
     { method: 'eth_gasPrice', params: [] }
   ];
   ```

4. **Cache responses appropriately**
   ```javascript
   const cache = new Map();
   function getCached(key, ttl) {
     const cached = cache.get(key);
     if (cached && Date.now() - cached.timestamp < ttl) {
       return cached.value;
     }
     return null;
   }
   ```

#### Advanced API

1. **Use pageSize for large datasets**
   ```javascript
   const results = [];
   let pageToken = null;
   
   do {
     const response = await provider.getNFTsByOwner({
       walletAddress: address,
       pageSize: 100,
       pageToken
     });
     results.push(...response.assets);
     pageToken = response.nextPageToken;
   } while (pageToken);
   ```

2. **Query multiple chains efficiently**
   ```javascript
   const balance = await provider.getAccountBalance({
     walletAddress: address,
     blockchain: ['eth', 'bsc', 'polygon'] // Single request
   });
   ```

3. **Handle rate limits gracefully**
   ```javascript
   async function rateLimit(fn, delay = 100) {
     await new Promise(r => setTimeout(r, delay));
     return fn();
   }
   ```

#### Staking Integration

1. **Check network before operations**
   ```javascript
   const network = await provider.getNetwork();
   if (network.chainId !== EXPECTED_CHAIN_ID) {
     await window.ethereum.request({
       method: 'wallet_switchEthereumChain',
       params: [{ chainId: '0x1' }] // Ethereum mainnet
     });
   }
   ```

2. **Handle approvals properly**
   ```javascript
   // Check allowance first
   const allowance = await tokenContract.allowance(
     userAddress,
     stakingContract.address
   );
   
   if (allowance.lt(amount)) {
     const approveTx = await tokenContract.approve(
       stakingContract.address,
       ethers.constants.MaxUint256
     );
     await approveTx.wait();
   }
   ```

3. **Monitor transaction status**
   ```javascript
   const tx = await sdk.stake(amount, 'aETHc');
   
   const receipt = await provider.waitForTransaction(
     tx.txHash,
     1, // confirmations
     30000 // timeout
   );
   
   if (receipt.status === 1) {
     console.log('Stake successful!');
   }
   ```

### Community & Support

**Discord**: https://discord.ankr.com/
**Telegram**: https://t.me/ankrnetwork
**Twitter**: https://twitter.com/ankr
**GitHub**: https://github.com/Ankr-network/
**Support Portal**: https://ankrnetwork.atlassian.net/servicedesk/

### Pricing Summary

#### Node API
- **Public**: Free (rate-limited)
- **Premium**: Pay-per-request from $0.00001
- **Enterprise**: Custom pricing

#### Advanced API
- **Premium**: API Credits system
- **Pay-as-you-go** or **Subscription**
- Pegged to USD

#### Staking
- **Platform Fee**: 10% of rewards
- **Flash Unstake Fee**: ~0.5% (BNB only)
- **Bridge Fee**: Varies by route

#### Scaling Services
- **RaaS**: Custom quotes
- **Enterprise Support**: Included
- **Infrastructure**: Metered usage

---

## Appendices

### Glossary

**API (Application Programming Interface)**: Set of protocols for software communication

**APR/APY**: Annual Percentage Rate/Yield - return on staking

**Archive Node**: Node storing complete blockchain history

**BLS Signature**: Boneh-Lynn-Shacham cryptographic signature

**Consensus**: Agreement mechanism among network nodes

**DAC (Data Availability Committee)**: Validators ensuring data availability

**DApp**: Decentralized Application

**DeFi**: Decentralized Finance

**DePIN**: Decentralized Physical Infrastructure Network

**EVM**: Ethereum Virtual Machine

**Full Node**: Node with current blockchain state

**Gas**: Transaction fee on blockchain

**JSON-RPC**: Remote procedure call protocol using JSON

**L1/L2**: Layer 1 (mainnet) / Layer 2 (scaling solution)

**LST**: Liquid Staking Token

**NFT**: Non-Fungible Token

**Parlia**: Proof-of-Staked-Authority consensus

**RaaS**: Rollup-as-a-Service

**RPC**: Remote Procedure Call

**Slashing**: Penalty for validator misbehavior

**TVL**: Total Value Locked

**Validator**: Node that validates transactions

**WebSocket**: Full-duplex communication protocol

**zk-SNARK/STARK**: Zero-knowledge proof systems

### Contract Addresses (Mainnet)

**Ethereum Liquid Staking:**
```
ankrETH: 0xE95A203B1a91a908F9B9CE46459d101078c2c3cb
Staking Contract: 0x84db6eE82b7Cf3b47E8F19270abdE5718B936670
```

**Avalanche Liquid Staking:**
```
ankrAVAX: 0xc3344870d52688874b06d844E0C36cc39FC727F6
Staking Contract: 0x7BAa1E3bFe49db8361680785182B80BB420A836D
```

**BNB Liquid Staking:**
```
ankrBNB: 0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827
Staking Contract: 0x9e347Af362059bf2E55839002c699F7A5BaFE86E
```

**Polygon Liquid Staking (on Ethereum):**
```
ankrPOL: 0x26dcFbFa8Bc267b250432c01C982Eaf81cC5480C
Staking Contract: 0xCfD4B4Bc15C8bF0Fd820B0D4558c725727B3ce89
```

For complete list: https://www.ankr.com/docs/staking-extra/ls-sc-addresses-mn/

### Chain IDs

```
Ethereum Mainnet: 1
BNB Smart Chain: 56
Polygon: 137
Avalanche C-Chain: 43114
Arbitrum One: 42161
Optimism: 10
Base: 8453
Fantom: 250

Testnets:
Ethereum Sepolia: 11155111
Ethereum Holesky: 17000
BNB Testnet: 97
Polygon Amoy: 80002
Avalanche Fuji: 43113
```

### Public RPC Endpoints

```javascript
// Ethereum
https://rpc.ankr.com/eth

// BNB Smart Chain
https://rpc.ankr.com/bsc

// Polygon
https://rpc.ankr.com/polygon

// Avalanche
https://rpc.ankr.com/avalanche

// Arbitrum
https://rpc.ankr.com/arbitrum

// Optimism
https://rpc.ankr.com/optimism

// Base
https://rpc.ankr.com/base

// Fantom
https://rpc.ankr.com/fantom

// And 70+ more chains...
```

### WebSocket Endpoints

```javascript
// Ethereum
wss://rpc.ankr.com/eth/ws

// BNB Smart Chain
wss://rpc.ankr.com/bsc/ws

// Polygon
wss://rpc.ankr.com/polygon/ws

// Other chains follow same pattern
```

---

## Conclusion

Ankr provides comprehensive Web3 infrastructure covering:

✅ **Node API** - 80+ blockchain RPC access
✅ **Advanced API** - Optimized multi-chain queries
✅ **Contract Automation** - Serverless contract execution
✅ **Scaling Services** - Rollups and sidechains
✅ **Liquid Staking** - $83M+ TVL across 9+ tokens
✅ **Gaming** - Web3 game development tools

**Key Strengths:**
- **Reliability**: 99.99% uptime
- **Speed**: 56ms average response time
- **Scale**: 8 billion daily requests
- **Coverage**: 80+ blockchains
- **Support**: 24/7 enterprise support

**Getting Started:**
1. Sign up at https://www.ankr.com/
2. Get API keys from dashboard
3. Choose your product (RPC, Advanced API, Staking)
4. Follow documentation and tutorials
5. Build amazing Web3 applications!

For questions and support:
- Documentation: https://www.ankr.com/docs/
- Discord: https://discord.ankr.com/
- Telegram: https://t.me/ankrnetwork
- Support: https://ankrnetwork.atlassian.net/servicedesk/

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Compiled by**: Ankr Documentation Team
**License**: Public Documentation

*This documentation is continuously updated. For the latest information, visit https://www.ankr.com/docs/*
