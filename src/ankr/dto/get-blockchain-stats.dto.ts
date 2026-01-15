export interface GetBlockchainStatsParams {
  blockchain?: string | string[];
}

export interface BlockchainStat {
  blockchain: string;
  totalTransactionsCount: number;
  totalEventsCount: number;
  latestBlockNumber: number;
  blockTimeMs: number;
  nativeCoinUsdPrice: string;
}

export interface GetBlockchainStatsResponse {
  stats: BlockchainStat[];
}

