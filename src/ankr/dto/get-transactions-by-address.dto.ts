import { Transaction } from './common.dto';

export interface GetTransactionsByAddressParams {
  address: string;
  blockchain?: string | string[];
  fromBlock?: number | string;
  toBlock?: number | string;
  fromTimestamp?: number;
  toTimestamp?: number;
  includeLogs?: boolean;
  descOrder?: boolean;
  pageSize?: number;
  pageToken?: string;
}

export type { Transaction };

export interface GetTransactionsByAddressResponse {
  transactions: Transaction[];
  nextPageToken?: string;
}

