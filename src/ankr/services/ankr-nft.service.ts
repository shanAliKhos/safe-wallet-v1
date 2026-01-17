import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnkrBaseService } from './ankr-base.service';
import {
  GetNFTsByOwnerParams,
  GetNFTsByOwnerResponse,
} from '../dto/get-nfts-by-owner.dto';
import {
  GetNFTMetadataParams,
  GetNFTMetadataResponse,
} from '../dto/get-nft-metadata.dto';
import {
  GetNFTHoldersParams,
  GetNFTHoldersResponse,
} from '../dto/get-nft-holders.dto';
import {
  GetNftTransfersParams,
  GetNftTransfersResponse,
} from '../dto/get-nft-transfers.dto';

/**
 * Ankr NFT API Service
 * 
 * Handles NFT-related operations:
 * - NFT ownership queries
 * - NFT metadata retrieval
 * - NFT holder information
 * - NFT transfer history
 * 
 * Supports:
 * - ERC-721 tokens
 * - ERC-1155 tokens
 * - ENS domains
 * - POAP badges
 * 
 * Perfect for:
 * - NFT marketplaces
 * - Portfolio applications
 * - NFT analytics platforms
 * - Wallet displays
 * 
 * @see https://www.ankr.com/docs/advanced-api/nft-methods/
 */
@Injectable()
export class AnkrNftService extends AnkrBaseService {
  protected readonly logger = new Logger(AnkrNftService.name);

  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Retrieves all NFTs owned by a wallet address
   * Get comprehensive NFT portfolio across blockchains
   * 
   * Includes:
   * - ERC-721 (unique NFTs)
   * - ERC-1155 (semi-fungible tokens)
   * - ENS domains
   * - POAP badges
   * 
   * @param params - Wallet address and optional filters
   * @returns List of NFTs with metadata
   */
  async getNFTsByOwner(
    params: GetNFTsByOwnerParams,
  ): Promise<GetNFTsByOwnerResponse> {
    this.validateRequired(params, ['walletAddress']);

    // Validate pageSize: default=10, max=50
    if (params.pageSize !== undefined) {
      if (params.pageSize < 1 || params.pageSize > 50) {
        throw new BadRequestException(
          'pageSize must be between 1 and 50 (default: 10)',
        );
      }
    }

    const response = await this.makeRequest<GetNFTsByOwnerResponse>(
      'ankr_getNFTsByOwner',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves metadata for a specific NFT
   * Get detailed information about an NFT including:
   * - Name and description
   * - Image/media URLs
   * - Attributes/traits
   * - Contract info
   * 
   * @param params - Blockchain, contract address, and token ID
   * @returns NFT metadata
   */
  async getNFTMetadata(
    params: GetNFTMetadataParams,
  ): Promise<GetNFTMetadataResponse> {
    this.validateRequired(params, ['blockchain', 'contractAddress', 'tokenId']);

    if (params.tokenId === undefined || params.tokenId === null) {
      throw new BadRequestException('tokenId parameter is required');
    }

    const response = await this.makeRequest<GetNFTMetadataResponse>(
      'ankr_getNFTMetadata',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves list of holders for an NFT collection
   * Get all wallet addresses holding NFTs from a contract
   * 
   * Useful for:
   * - Community analysis
   * - Airdrop campaigns
   * - Holder verification
   * - Collection statistics
   * 
   * @param params - Blockchain, contract address, and pagination
   * @returns List of NFT holders
   */
  async getNFTHolders(
    params: GetNFTHoldersParams,
  ): Promise<GetNFTHoldersResponse> {
    this.validateRequired(params, ['blockchain', 'contractAddress']);

    // Validate pageSize: max: 10000, default: 1000
    if (params.pageSize !== undefined) {
      if (params.pageSize < 1 || params.pageSize > 10000) {
        throw new BadRequestException(
          'pageSize must be between 1 and 10000 (default: 1000)',
        );
      }
    }

    const response = await this.makeRequest<GetNFTHoldersResponse>(
      'ankr_getNFTHolders',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves NFT transfer history for an address
   * Get all NFT movements (sent, received, minted, burned)
   * 
   * Features:
   * - Pagination support
   * - Time range filtering
   * - Block range filtering
   * - Multi-blockchain support
   * 
   * Perfect for:
   * - NFT activity tracking
   * - Transfer verification
   * - History displays
   * - Analytics
   * 
   * @param params - Address and optional filters
   * @returns NFT transfer history
   */
  async getNftTransfers(
    params: GetNftTransfersParams,
  ): Promise<GetNftTransfersResponse> {
    this.validateRequired(params, ['address']);

    // Validate pageSize: max: 10000, default: 100
    if (params.pageSize !== undefined) {
      if (params.pageSize < 1 || params.pageSize > 10000) {
        throw new BadRequestException(
          'pageSize must be between 1 and 10000 (default: 100)',
        );
      }
    }

    // Validate block numbers and timestamps are non-negative
    if (params.fromBlock !== undefined && params.fromBlock < 0) {
      throw new BadRequestException('fromBlock must be >= 0');
    }
    if (params.toBlock !== undefined && params.toBlock < 0) {
      throw new BadRequestException('toBlock must be >= 0');
    }
    if (params.fromTimestamp !== undefined && params.fromTimestamp < 0) {
      throw new BadRequestException('fromTimestamp must be >= 0');
    }
    if (params.toTimestamp !== undefined && params.toTimestamp < 0) {
      throw new BadRequestException('toTimestamp must be >= 0');
    }

    const response = await this.makeRequest<GetNftTransfersResponse>(
      'ankr_getNftTransfers',
      params,
    );
    return this.getResult(response);
  }
}
