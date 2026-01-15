import { Blockchain, NFTTrait } from './get-nfts-by-owner.dto';

export interface GetNFTMetadataParams {
  blockchain: Blockchain;
  contractAddress: string;
  tokenId: string | number;
  forceFetch?: boolean;
  skipSyncCheck?: boolean;
}

export interface NFTMetadata {
  blockchain: Blockchain;
  collectionName?: string;
  collectionSymbol?: string;
  contractAddress: string;
  contractType: number; // 0 = ERC721, 1 = ERC1155
  tokenId: string;
}

export interface NFTAttributes {
  contractType: number;
  description?: string;
  imageUrl?: string;
  name?: string;
  tokenUrl?: string;
  traits?: NFTTrait[];
}

export interface GetNFTMetadataResponse {
  metadata: NFTMetadata;
  attributes: NFTAttributes;
}

