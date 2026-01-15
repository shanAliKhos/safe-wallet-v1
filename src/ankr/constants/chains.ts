/**
 * Ankr Advanced API Supported Chains
 * 
 * These are the chain aliases supported by Ankr Advanced API.
 * Use these constants when making API calls that require a blockchain parameter.
 */

/**
 * Mainnet Chain Aliases
 */
export const ANKR_MAINNET_CHAINS = {
  ARBITRUM: 'arbitrum',
  AVALANCHE: 'avalanche',
  BASE: 'base',
  BNB_SMART_CHAIN: 'bsc',
  ETHEREUM: 'eth',
  FANTOM: 'fantom',
  FLARE: 'flare',
  GNOSIS: 'gnosis',
  OPTIMISM: 'optimism',
  POLYGON: 'polygon',
  SCROLL: 'scroll',
  STELLAR: 'stellar',
  STORY: 'story_mainnet',
  SYSCOIN: 'syscoin',
  TELOS: 'telos',
  XAI: 'xai',
  X_LAYER: 'xlayer',
} as const;

/**
 * Testnet Chain Aliases
 */
export const ANKR_TESTNET_CHAINS = {
  AVALANCHE_FUJI: 'avalanche_fuji',
  BASE_SEPOLIA: 'base_sepolia',
  ETHEREUM_HOLESKY: 'eth_holesky',
  ETHEREUM_SEPOLIA: 'eth_sepolia',
  OPTIMISM_TESTNET: 'optimism_testnet',
  POLYGON_AMOY: 'polygon_amoy',
  STORY_TESTNET: 'story_aeneid_testnet',
} as const;

/**
 * All supported chain aliases (mainnet and testnet)
 */
export const ANKR_SUPPORTED_CHAINS = {
  ...ANKR_MAINNET_CHAINS,
  ...ANKR_TESTNET_CHAINS,
} as const;

/**
 * Type for mainnet chain values
 */
export type AnkrMainnetChain =
  (typeof ANKR_MAINNET_CHAINS)[keyof typeof ANKR_MAINNET_CHAINS];

/**
 * Type for testnet chain values
 */
export type AnkrTestnetChain =
  (typeof ANKR_TESTNET_CHAINS)[keyof typeof ANKR_TESTNET_CHAINS];

/**
 * Type for all supported chain values
 */
export type AnkrSupportedChain =
  | AnkrMainnetChain
  | AnkrTestnetChain;

/**
 * Array of all mainnet chain aliases
 */
export const ANKR_MAINNET_CHAINS_ARRAY = Object.values(ANKR_MAINNET_CHAINS);

/**
 * Array of all testnet chain aliases
 */
export const ANKR_TESTNET_CHAINS_ARRAY = Object.values(ANKR_TESTNET_CHAINS);

/**
 * Array of all supported chain aliases
 */
export const ANKR_SUPPORTED_CHAINS_ARRAY = Object.values(ANKR_SUPPORTED_CHAINS);

