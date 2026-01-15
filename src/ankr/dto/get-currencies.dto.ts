export interface GetCurrenciesParams {
  blockchain: string;
}

export interface Currency {
  address: string;
  blockchain: string;
  decimals: number;
  name: string;
  symbol: string;
  thumbnail: string;
}

export interface GetCurrenciesResponse {
  currencies: Currency[];
}

