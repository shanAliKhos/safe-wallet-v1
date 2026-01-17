import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnkrBaseService } from './ankr-base.service';
import {
  GetBlockchainStatsParams,
  GetBlockchainStatsResponse,
} from '../dto/get-blockchain-stats.dto';
import { GetBlocksParams, GetBlocksResponse } from '../dto/get-blocks.dto';
import { GetLogsParams, GetLogsResponse } from '../dto/get-logs.dto';
import {
  GetTransactionsByHashParams,
  GetTransactionsByHashResponse,
} from '../dto/get-transactions-by-hash.dto';
import {
  GetTransactionsByAddressParams,
  GetTransactionsByAddressResponse,
} from '../dto/get-transactions-by-address.dto';
import {
  GetInteractionsParams,
  GetInteractionsResponse,
} from '../dto/get-interactions.dto';

/**
 * Ankr Query API Service
 * 
 * Handles blockchain query operations:
 * - Blockchain statistics
 * - Block data retrieval
 * - Historical logs
 * - Transaction details
 * - Wallet interactions
 * 
 * @see https://www.ankr.com/docs/advanced-api/
 */
@Injectable()
export class AnkrQueryService extends AnkrBaseService {
  protected readonly logger = new Logger(AnkrQueryService.name);

  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Retrieves blockchain statistics
   * Get comprehensive stats about supported blockchains
   * 
   * @param params - Optional blockchain filter
   * @returns Blockchain statistics
   */
  async getBlockchainStats(
    params?: GetBlockchainStatsParams,
  ): Promise<GetBlockchainStatsResponse> {
    const response = await this.makeRequest<GetBlockchainStatsResponse>(
      'ankr_getBlockchainStats',
      params || {},
    );
    return this.getResult(response);
  }

  /**
   * Retrieves block data for the specified range
   * Maximum 100 blocks per request
   * 
   * @param params - Blockchain and block range parameters
   * @returns Block data
   */
  async getBlocks(params: GetBlocksParams): Promise<GetBlocksResponse> {
    this.validateRequired(params, ['blockchain']);

    const response = await this.makeRequest<GetBlocksResponse>(
      'ankr_getBlocks',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves historical logs for the specified range of blocks
   * Useful for querying smart contract events
   * 
   * @param params - Log query parameters (addresses, topics, block range)
   * @returns Historical logs
   */
  async getLogs(params: GetLogsParams): Promise<GetLogsResponse> {
    const response = await this.makeRequest<GetLogsResponse>(
      'ankr_getLogs',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves transaction details by hash
   * Get complete transaction information including status and logs
   * 
   * @param params - Transaction hash parameter
   * @returns Transaction details
   */
  async getTransactionsByHash(
    params: GetTransactionsByHashParams,
  ): Promise<GetTransactionsByHashResponse> {
    this.validateRequired(params, ['transactionHash']);

    const response = await this.makeRequest<GetTransactionsByHashResponse>(
      'ankr_getTransactionsByHash',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves transactions for a specific address
   * Get transaction history with pagination support
   * 
   * @param params - Address and optional filters
   * @returns Transaction list
   */
  async getTransactionsByAddress(
    params: GetTransactionsByAddressParams,
  ): Promise<GetTransactionsByAddressResponse> {
    this.validateRequired(params, ['address']);

    const response = await this.makeRequest<GetTransactionsByAddressResponse>(
      'ankr_getTransactionsByAddress',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves blockchains that an address has interacted with
   * Useful for discovering multi-chain wallet activity
   * 
   * @param params - Wallet address
   * @returns List of blockchains interacted with
   */
  async getInteractions(
    params: GetInteractionsParams,
  ): Promise<GetInteractionsResponse> {
    this.validateRequired(params, ['address']);

    const response = await this.makeRequest<GetInteractionsResponse>(
      'ankr_getInteractions',
      params,
    );
    return this.getResult(response);
  }
}
