export interface GetTokenPriceHistoryParams {
  blockchain: string;
  contractAddress?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  interval?: number;
  limit?: number;
  syncCheck?: boolean;
}

export interface PriceQuote {
  timestamp: number;
  blockHeight: number;
  usdPrice: string;
}

export interface SyncStatus {
  timestamp: number;
  lag: string;
  status: string;
}

export interface GetTokenPriceHistoryResponse {
  quotes: PriceQuote[];
  syncStatus: SyncStatus;
}

