import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnkrQueryService } from './services/ankr-query.service';
import { AnkrTokenService } from './services/ankr-token.service';
import { AnkrNftService } from './services/ankr-nft.service';
import {
  GetBlockchainStatsParams,
  GetBlockchainStatsResponse,
} from './dto/get-blockchain-stats.dto';
import { GetBlocksParams, GetBlocksResponse } from './dto/get-blocks.dto';
import { GetLogsParams, GetLogsResponse } from './dto/get-logs.dto';
import {
  GetTransactionsByHashParams,
  GetTransactionsByHashResponse,
} from './dto/get-transactions-by-hash.dto';
import {
  GetTransactionsByAddressParams,
  GetTransactionsByAddressResponse,
} from './dto/get-transactions-by-address.dto';
import {
  GetInteractionsParams,
  GetInteractionsResponse,
} from './dto/get-interactions.dto';
import {
  GetAccountBalanceParams,
  GetAccountBalanceResponse,
} from './dto/get-account-balance.dto';
import {
  GetCurrenciesParams,
  GetCurrenciesResponse,
} from './dto/get-currencies.dto';
import {
  GetTokenPriceParams,
  GetTokenPriceResponse,
} from './dto/get-token-price.dto';
import {
  GetTokenHoldersParams,
  GetTokenHoldersResponse,
} from './dto/get-token-holders.dto';
import {
  GetTokenHoldersCountParams,
  GetTokenHoldersCountResponse,
} from './dto/get-token-holders-count.dto';
import {
  GetTokenTransfersParams,
  GetTokenTransfersResponse,
} from './dto/get-token-transfers.dto';
import {
  GetTokenPriceHistoryParams,
  GetTokenPriceHistoryResponse,
} from './dto/get-token-price-history.dto';
import {
  GetNFTsByOwnerParams,
  GetNFTsByOwnerResponse,
} from './dto/get-nfts-by-owner.dto';
import {
  GetNFTMetadataParams,
  GetNFTMetadataResponse,
} from './dto/get-nft-metadata.dto';
import {
  GetNFTHoldersParams,
  GetNFTHoldersResponse,
} from './dto/get-nft-holders.dto';
import {
  GetNftTransfersParams,
  GetNftTransfersResponse,
} from './dto/get-nft-transfers.dto';

/**
 * Ankr Service - Unified API
 * 
 * Main service that provides access to all Ankr Advanced API methods.
 * Delegates to specialized services for better code organization:
 * - Query API: Blockchain stats, blocks, logs, transactions
 * - Token API: Balances, prices, holders, transfers
 * - NFT API: Ownership, metadata, transfers
 * 
 * This service maintains backward compatibility while providing
 * a clean, modular architecture for future maintenance.
 * 
 * @see https://www.ankr.com/docs/advanced-api/
 */
@Injectable()
export class AnkrService {
  private readonly logger = new Logger(AnkrService.name);

  // Specialized service instances
  private queryService: AnkrQueryService;
  private tokenService: AnkrTokenService;
  private nftService: AnkrNftService;

  constructor(private configService: ConfigService) {
    // Initialize specialized services
    this.queryService = new AnkrQueryService(configService);
    this.tokenService = new AnkrTokenService(configService);
    this.nftService = new AnkrNftService(configService);
  }

  // ==========================================
  // QUERY API METHODS
  // ==========================================

  /**
   * Retrieves blockchain statistics
   */
  async getBlockchainStats(
    params?: GetBlockchainStatsParams,
  ): Promise<GetBlockchainStatsResponse> {
    return this.queryService.getBlockchainStats(params);
  }

  /**
   * Retrieves the blocks' data for the specified range
   */
  async getBlocks(params: GetBlocksParams): Promise<GetBlocksResponse> {
    return this.queryService.getBlocks(params);
  }

  /**
   * Retrieves historical data (logs) for the specified range of blocks
   */
  async getLogs(params: GetLogsParams): Promise<GetLogsResponse> {
    return this.queryService.getLogs(params);
  }

  /**
   * Retrieves the details of a transaction specified by hash
   */
  async getTransactionsByHash(
    params: GetTransactionsByHashParams,
  ): Promise<GetTransactionsByHashResponse> {
    return this.queryService.getTransactionsByHash(params);
  }

  /**
   * Retrieves the details of transactions specified by address
   */
  async getTransactionsByAddress(
    params: GetTransactionsByAddressParams,
  ): Promise<GetTransactionsByAddressResponse> {
    return this.queryService.getTransactionsByAddress(params);
  }

  /**
   * Retrieves blockchains interacted with a particular address
   */
  async getInteractions(
    params: GetInteractionsParams,
  ): Promise<GetInteractionsResponse> {
    return this.queryService.getInteractions(params);
  }

  // ==========================================
  // TOKEN API METHODS
  // ==========================================

  /**
   * Retrieves account balance
   * Retrieves the balance of the account specified.
   */
  async getAccountBalance(
    params: GetAccountBalanceParams,
  ): Promise<GetAccountBalanceResponse> {
    return this.tokenService.getAccountBalance(params);
  }

  /**
   * Retrieves the blockchain's currencies
   * Retrieves a list of all the currencies used in transactions on a blockchain specified.
   */
  async getCurrencies(
    params: GetCurrenciesParams,
  ): Promise<GetCurrenciesResponse> {
    return this.tokenService.getCurrencies(params);
  }

  /**
   * Retrieves token price
   * Retrieves a USD price of the token specified.
   */
  async getTokenPrice(
    params: GetTokenPriceParams,
  ): Promise<GetTokenPriceResponse> {
    return this.tokenService.getTokenPrice(params);
  }

  /**
   * Retrieves data on token holders
   * Retrieves holders (wallet addresses) and the associated metadata of the tokens specified.
   */
  async getTokenHolders(
    params: GetTokenHoldersParams,
  ): Promise<GetTokenHoldersResponse> {
    return this.tokenService.getTokenHolders(params);
  }

  /**
   * Retrieves the number of token holders
   * Retrieves the number of holders for the tokens specified.
   */
  async getTokenHoldersCount(
    params: GetTokenHoldersCountParams,
  ): Promise<GetTokenHoldersCountResponse> {
    return this.tokenService.getTokenHoldersCount(params);
  }

  /**
   * Retrieves info on token transfers for the wallet address specified
   */
  async getTokenTransfers(
    params: GetTokenTransfersParams,
  ): Promise<GetTokenTransfersResponse> {
    return this.tokenService.getTokenTransfers(params);
  }

  /**
   * Retrieves the historical price of the token specified
   */
  async getTokenPriceHistory(
    params: GetTokenPriceHistoryParams,
  ): Promise<GetTokenPriceHistoryResponse> {
    return this.tokenService.getTokenPriceHistory(params);
  }

  // ==========================================
  // NFT API METHODS
  // ==========================================

  /**
   * Retrieves the account's NFT data
   * Retrieves a list of NFTs (ERC721/ERC1155/ENS/POAP) that belong to the particular account specified
   */
  async getNFTsByOwner(
    params: GetNFTsByOwnerParams,
  ): Promise<GetNFTsByOwnerResponse> {
    return this.nftService.getNFTsByOwner(params);
  }

  /**
   * Retrieves the NFT's metadata
   * Retrieves the metadata that belongs to a particular NFT (ERC721/ERC1155/ENS/POAP)
   */
  async getNFTMetadata(
    params: GetNFTMetadataParams,
  ): Promise<GetNFTMetadataResponse> {
    return this.nftService.getNFTMetadata(params);
  }

  /**
   * Retrieves the NFT's holders data
   * Retrieves a list of holders (wallet addresses) of the NFT specified
   */
  async getNFTHolders(
    params: GetNFTHoldersParams,
  ): Promise<GetNFTHoldersResponse> {
    return this.nftService.getNFTHolders(params);
  }

  /**
   * Retrieves info on NFT transfers
   * Retrieves info on NFT transfers for an address specified
   */
  async getNftTransfers(
    params: GetNftTransfersParams,
  ): Promise<GetNftTransfersResponse> {
    return this.nftService.getNftTransfers(params);
  }
}

