export interface GetTokenHoldersParams {
  blockchain: string;
  contractAddress: string;
  pageSize?: number;
  pageToken?: string;
}

export interface TokenHolder {
  balance: string;
  balanceRawInteger: string;
  holderAddress: string;
}

export interface GetTokenHoldersResponse {
  blockchain: string;
  contractAddress: string;
  holders: TokenHolder[];
  holdersCount: number;
  nextPageToken?: string;
  tokenDecimals: number;
}

