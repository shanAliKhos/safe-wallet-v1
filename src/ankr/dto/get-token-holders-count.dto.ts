export interface GetTokenHoldersCountParams {
  blockchain: string;
  contractAddress: string;
  pageSize?: number;
  pageToken?: string;
}

export interface HolderCountHistory {
  holderCount: number;
  lastUpdatedAt: string;
  totalAmount: string;
  totalAmountRawInteger: string;
}

export interface GetTokenHoldersCountResponse {
  blockchain: string;
  contractAddress: string;
  holderCountHistory: HolderCountHistory[];
  nextPageToken?: string;
  tokenDecimals: number;
}

