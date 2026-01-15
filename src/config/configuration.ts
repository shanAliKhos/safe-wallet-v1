export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/safe-wallet',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-here-change-in-production',
  },
  gelatoApiKey: process.env.GELATO_API_KEY,
  rpc: {
    eth: process.env.ETH_RPC_URL,
    bsc: process.env.BSC_RPC_URL,
  },
  ankr: {
    apiToken: process.env.ANKR_API_TOKEN,
    httpUrl: process.env.ANKR_HTTP_URL,
    wsUrl: process.env.ANKR_WS_URL, 
    apiUrl: process.env.ANKR_API_URL,
    baseUrl: process.env.ANKR_BASE_URL || 'https://rpc.ankr.com/multichain',
    pricing: {
      // Base pricing: 0.10 USD = 1M API Credits
      creditsPerUSD: 10000000, // 10M credits per USD
      usdPerMillionCredits: 0.10,
      // NFT API Methods - 700 credits per request ($0.00007)
      nft: {
        getNFTsByOwner: { credits: 700, usd: 0.00007 },
        getNFTMetadata: { credits: 700, usd: 0.00007 },
        getNFTHolders: { credits: 700, usd: 0.00007 },
        getNftTransfers: { credits: 700, usd: 0.00007 },
      },
      // Query API Methods - 700 credits per request ($0.00007)
      query: {
        getBlockchainStats: { credits: 700, usd: 0.00007 },
        getBlocks: { credits: 700, usd: 0.00007 },
        getLogs: { credits: 700, usd: 0.00007 },
        getTransactionsByHash: { credits: 700, usd: 0.00007 },
        getInteractions: { credits: 700, usd: 0.00007 },
        getTransactionsByAddress: { credits: 700, usd: 0.00007 },
      },
      // Token API Methods - 700 credits per request ($0.00007)
      token: {
        getAccountBalance: { credits: 700, usd: 0.00007 },
        getCurrencies: { credits: 700, usd: 0.00007 },
        getTokenPrice: { credits: 700, usd: 0.00007 },
        getTokenHolders: { credits: 700, usd: 0.00007 },
        getTokenHoldersCount: { credits: 700, usd: 0.00007 },
        getTokenTransfers: { credits: 700, usd: 0.00007 },
        getTokenPriceHistory: { credits: 700, usd: 0.00007 },
      },
    },
  },
});
