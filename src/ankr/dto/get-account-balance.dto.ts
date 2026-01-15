export interface GetAccountBalanceParams {
  walletAddress: string;
  blockchain?: string | string[];
  nativeFirst?: boolean;
  onlyWhitelisted?: boolean;
  pageSize?: number;
  pageToken?: string;
}

export interface Asset {
  balance: string;
  balanceRawInteger: string;
  balanceUsd: string;
  blockchain: string;
  contractAddress: string;
  holderAddress: string;
  thumbnail: string;
  tokenDecimals: number;
  tokenName: string;
  tokenPrice: string;
  tokenSymbol: string;
  tokenType: string;
}

export interface GetAccountBalanceResponse {
  assets: Asset[];
  nextPageToken?: string;
  totalBalanceUsd: string;
}

