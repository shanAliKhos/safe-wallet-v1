import { Blockchain } from './get-nfts-by-owner.dto';

export interface GetNFTHoldersParams {
  blockchain: Blockchain;
  contractAddress: string;
  pageSize?: number; // max: 10000, default: 1000
  pageToken?: string;
}

export interface GetNFTHoldersResponse {
  holders: string[];
  nextPageToken?: string;
}

