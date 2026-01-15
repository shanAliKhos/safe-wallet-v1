export interface GetTokenPriceParams {
  blockchain: string;
  contractAddress?: string;
}

export interface GetTokenPriceResponse {
  blockchain: string;
  contractAddress: string; // Empty string for native coin
  usdPrice: string;
}

