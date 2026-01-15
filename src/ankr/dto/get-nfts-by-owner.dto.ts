export type Blockchain =
  | 'arbitrum'
  | 'avalanche'
  | 'base'
  | 'bsc'
  | 'eth'
  | 'fantom'
  | 'flare'
  | 'gnosis'
  | 'optimism'
  | 'polygon'
  | 'scroll'
  | 'stellar'
  | 'story_mainnet'
  | 'syscoin'
  | 'telos'
  | 'xai'
  | 'xlayer'
  | 'avalanche_fuji'
  | 'base_sepolia'
  | 'eth_holesky'
  | 'eth_sepolia'
  | 'optimism_testnet'
  | 'polygon_amoy'
  | 'story_aeneid_testnet';

export interface NFTFilter {
  [contractAddress: string]: string[];
}

export interface GetNFTsByOwnerParams {
  walletAddress: string;
  blockchain?: Blockchain | Blockchain[];
  pageSize?: number; // default=10, max=50
  pageToken?: string;
  filter?: NFTFilter[];
}

export interface NFTTrait {
  bunny_id?: string;
  count?: number;
  display_type?: string;
  frequency?: string;
  mp_score?: string;
  rarity?: string;
  trait_type?: string;
  value?: string;
}

export interface NFTAsset {
  blockchain: Blockchain;
  collectionName?: string;
  contractAddress: string;
  contractType: number; // 0 = ERC721, 1 = ERC1155
  imageUrl?: string;
  name?: string;
  quantity?: string;
  symbol?: string;
  tokenId: string;
  tokenUrl?: string;
  traits?: NFTTrait[];
}

export interface GetNFTsByOwnerResponse {
  assets: NFTAsset[];
  nextPageToken?: string;
  owner: string;
}

