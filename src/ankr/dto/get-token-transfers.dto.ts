export interface GetTokenTransfersParams {
  address: string | string[];
  blockchain?: string | string[];
  descOrder?: boolean;
  fromBlock?: number | string;
  toBlock?: number | string;
  fromTimestamp?: number;
  toTimestamp?: number;
  pageSize?: number;
  pageToken?: string;
}

export interface TokenTransfer {
  blockHeight: number;
  blockchain: string;
  contractAddress: string;
  fromAddress: string;
  thumbnail: string;
  timestamp: number;
  toAddress: string;
  tokenDecimals: number;
  tokenName: string;
  tokenSymbol: string;
  transactionHash: string;
  value: string;
  valueRawInteger: string;
}

export interface GetTokenTransfersResponse {
  transfers: TokenTransfer[];
  nextPageToken?: string;
}

