import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnkrBaseService } from './ankr-base.service';
import {
  GetAccountBalanceParams,
  GetAccountBalanceResponse,
} from '../dto/get-account-balance.dto';
import {
  GetCurrenciesParams,
  GetCurrenciesResponse,
} from '../dto/get-currencies.dto';
import {
  GetTokenPriceParams,
  GetTokenPriceResponse,
} from '../dto/get-token-price.dto';
import {
  GetTokenHoldersParams,
  GetTokenHoldersResponse,
} from '../dto/get-token-holders.dto';
import {
  GetTokenHoldersCountParams,
  GetTokenHoldersCountResponse,
} from '../dto/get-token-holders-count.dto';
import {
  GetTokenTransfersParams,
  GetTokenTransfersResponse,
} from '../dto/get-token-transfers.dto';
import {
  GetTokenPriceHistoryParams,
  GetTokenPriceHistoryResponse,
} from '../dto/get-token-price-history.dto';

/**
 * Ankr Token API Service
 * 
 * Handles token-related operations:
 * - Account balances (multi-chain)
 * - Token prices (current and historical)
 * - Token holder information
 * - Token transfer history
 * - Blockchain currencies
 * 
 * Perfect for:
 * - Portfolio dashboards
 * - DeFi analytics
 * - Token tracking applications
 * 
 * @see https://www.ankr.com/docs/advanced-api/token-methods/
 */
@Injectable()
export class AnkrTokenService extends AnkrBaseService {
  protected readonly logger = new Logger(AnkrTokenService.name);

  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Retrieves account balance across multiple blockchains
   * Get comprehensive wallet balance including native and token assets
   * 
   * Features:
   * - Multi-chain support in single request
   * - USD valuations included
   * - Native and ERC20 tokens
   * 
   * @param params - Wallet address and blockchain(s)
   * @returns Account balance with USD values
   */
  async getAccountBalance(
    params: GetAccountBalanceParams,
  ): Promise<GetAccountBalanceResponse> {
    this.validateRequired(params, ['walletAddress']);

    const response = await this.makeRequest<GetAccountBalanceResponse>(
      'ankr_getAccountBalance',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves list of currencies used on a blockchain
   * Get all tokens/currencies that have been used in transactions
   * 
   * @param params - Blockchain identifier
   * @returns List of currencies
   */
  async getCurrencies(
    params: GetCurrenciesParams,
  ): Promise<GetCurrenciesResponse> {
    this.validateRequired(params, ['blockchain']);

    const response = await this.makeRequest<GetCurrenciesResponse>(
      'ankr_getCurrencies',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves current USD price of a token
   * Real-time price data from multiple sources
   * 
   * @param params - Blockchain and optional contract address
   * @returns Token price in USD
   */
  async getTokenPrice(
    params: GetTokenPriceParams,
  ): Promise<GetTokenPriceResponse> {
    this.validateRequired(params, ['blockchain']);

    const response = await this.makeRequest<GetTokenPriceResponse>(
      'ankr_getTokenPrice',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves token holders and their balances
   * Get list of wallet addresses holding a specific token
   * 
   * Useful for:
   * - Token distribution analysis
   * - Airdrop planning
   * - Holder verification
   * 
   * @param params - Blockchain, contract address, and pagination
   * @returns List of token holders
   */
  async getTokenHolders(
    params: GetTokenHoldersParams,
  ): Promise<GetTokenHoldersResponse> {
    this.validateRequired(params, ['blockchain', 'contractAddress']);

    const response = await this.makeRequest<GetTokenHoldersResponse>(
      'ankr_getTokenHolders',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves the total number of token holders
   * Get holder count for a specific token
   * 
   * @param params - Blockchain and contract address
   * @returns Holder count
   */
  async getTokenHoldersCount(
    params: GetTokenHoldersCountParams,
  ): Promise<GetTokenHoldersCountResponse> {
    this.validateRequired(params, ['blockchain', 'contractAddress']);

    const response = await this.makeRequest<GetTokenHoldersCountResponse>(
      'ankr_getTokenHoldersCount',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves token transfer history for an address
   * Get all token movements (sent and received)
   * 
   * Features:
   * - Pagination support
   * - Time range filtering
   * - Block range filtering
   * - Multi-blockchain support
   * 
   * @param params - Address and optional filters
   * @returns Token transfer history
   */
  async getTokenTransfers(
    params: GetTokenTransfersParams,
  ): Promise<GetTokenTransfersResponse> {
    this.validateRequired(params, ['address']);

    // Validate timestamps if provided
    if (params.fromTimestamp !== undefined && params.fromTimestamp < 0) {
      throw new BadRequestException('fromTimestamp must be >= 0');
    }
    if (params.toTimestamp !== undefined && params.toTimestamp < 0) {
      throw new BadRequestException('toTimestamp must be >= 0');
    }

    const response = await this.makeRequest<GetTokenTransfersResponse>(
      'ankr_getTokenTransfers',
      params,
    );
    return this.getResult(response);
  }

  /**
   * Retrieves historical price data for a token
   * Get price history for charting and analysis
   * 
   * @param params - Blockchain, contract address, and time range
   * @returns Historical price data
   */
  async getTokenPriceHistory(
    params: GetTokenPriceHistoryParams,
  ): Promise<GetTokenPriceHistoryResponse> {
    this.validateRequired(params, ['blockchain']);

    const response = await this.makeRequest<GetTokenPriceHistoryResponse>(
      'ankr_getTokenPriceHistory',
      params,
    );
    return this.getResult(response);
  }
}
