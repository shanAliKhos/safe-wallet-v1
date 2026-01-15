export interface EventInput {
  indexed: boolean;
  name: string;
  size: number;
  type: string;
  valueDecoded: string;
}

export interface Event {
  anonymous: boolean;
  id: string;
  inputs: EventInput[];
  name: string;
  signature: string;
  string: string;
  verified: boolean;
}

export interface Log {
  address: string;
  blockHash: string;
  blockNumber: string;
  data: string;
  event?: Event;
  logIndex: string;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: string;
}

export interface MethodInput {
  name: string;
  size: number;
  type: string;
  valueDecoded: string;
}

export interface Method {
  id: string;
  inputs: MethodInput[];
  name: string;
  signature: string;
  string: string;
  verified: boolean;
}

export interface Transaction {
  blockHash: string;
  blockNumber: string;
  blockchain: string;
  contractAddress?: string;
  cumulativeGasUsed: string;
  from: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  hash: string;
  input: string;
  logs?: Log[];
  logsBloom: string;
  method?: Method;
  nonce: string;
  r: string;
  s: string;
  status: string;
  timestamp: string;
  to?: string;
  transactionHash: string;
  transactionIndex: string;
  type: string;
  v: string;
  value: string;
}

