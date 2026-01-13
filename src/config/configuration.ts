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
  safe: {
    siteSafePrivateKey: process.env.SITE_SAFE_PRIVATE_KEY,
    siteSafeAddress: process.env.SITE_SAFE_ADDRESS,
    gelatoApiKey: process.env.GELATO_API_KEY,
  },
  rpc: {
    eth: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    bsc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
  },
  chains: {
    eth: {
      chainId: 1,
      name: 'Ethereum',
      rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    },
    bsc: {
      chainId: 56,
      name: 'BSC',
      rpc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    },
  },
});
