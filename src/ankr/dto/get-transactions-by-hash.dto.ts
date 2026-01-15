import { Event, EventInput, Log, Method, MethodInput, Transaction } from './common.dto';

export interface GetTransactionsByHashParams {
  blockchain?: string | string[];
  transactionHash: string;
  decodeLogs?: boolean;
  decodeTxData?: boolean;
  includeLogs?: boolean;
}

export type { Event, EventInput, Log, Method, MethodInput, Transaction };

export interface GetTransactionsByHashResponse {
  transactions: Transaction[];
}

