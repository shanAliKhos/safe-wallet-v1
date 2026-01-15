export interface GetBlocksParams {
  blockchain: string;
  fromBlock?: number | string;
  toBlock?: number | string;
  includeTxs?: boolean;
  includeLogs?: boolean;
  decodeTxData?: boolean;
  decodeLogs?: boolean;
  descOrder?: boolean;
}

export interface EthBlockDetails {
  difficulty: string;
  extraData: string;
  gasLimit: number;
  gasUsed: number;
  miner: string;
  nonce: string;
  sha3Uncles: string;
  size: string;
  stateRoot: string;
  totalDifficulty: string;
}

export interface BlockDetails {
  ethBlock?: EthBlockDetails;
}

export interface Block {
  blockHash: string;
  blockHeight: string;
  blockchainLogo: string;
  blockchainName: string;
  details: BlockDetails;
  parentHash: string;
  timestamp: string;
  transactionsCount: number;
}

export interface GetBlocksResponse {
  blocks: Block[];
}

