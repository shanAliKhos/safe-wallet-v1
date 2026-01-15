import { Blockchain } from './get-nfts-by-owner.dto';

export interface GetNftTransfersParams {
  address: string | string[]; // single address or array of addresses (required)
  blockchain?: Blockchain | Blockchain[];
  descOrder?: boolean;
  fromBlock?: number; // inclusive; >= 0
  toBlock?: number; // inclusive; >= 0
  fromTimestamp?: number; // inclusive; >= 0
  toTimestamp?: number; // inclusive; >= 0
  pageSize?: number; // max: 10000, default: 100
  pageToken?: string;
}

export interface NFTTransfer {
  blockHeight: number;
  blockchain: Blockchain;
  collectionName?: string;
  collectionSymbol?: string;
  contractAddress: string;
  fromAddress: string;
  imageUrl?: string;
  name?: string;
  timestamp: number;
  toAddress: string;
  tokenId: string;
  transactionHash: string;
  type: 'ERC721' | 'ERC1155';
  value: string;
}

export interface GetNftTransfersResponse {
  transfers: NFTTransfer[];
  nextPageToken?: string;
}

