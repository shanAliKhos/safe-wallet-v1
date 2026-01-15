import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
} from './dto/json-rpc.dto';

@Injectable()
export class AnkrService {
  private readonly logger = new Logger(AnkrService.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private requestIdCounter = 1;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ankr.baseUrl') || '';
    this.apiToken = this.configService.get<string>('ankr.apiToken') || '';

    if (!this.apiToken) {
      this.logger.warn(
        'ANKR_API_TOKEN is not set. Ankr Query API calls will fail.',
      );
    }
  }

  /**
   * Make a JSON-RPC request to Ankr API
   */
  private async makeRequest<T>(
    method: string,
    params?: any,
  ): Promise<JsonRpcResponse<T>> {
    if (!this.apiToken) {
      throw new BadRequestException('Ankr API token is not configured');
    }

    // Ankr Advanced API endpoint format: https://rpc.ankr.com/multichain/{token}
    const url = `${this.baseUrl}/${this.apiToken}`;
    const request: JsonRpcRequest = {
      id: this.requestIdCounter++,
      jsonrpc: '2.0',
      method,
      params: params || {},
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(
          `Ankr API request failed with status ${response.status}: ${response.statusText}`,
        );
      }

      const data: JsonRpcResponse<T> = await response.json();

      if (data.error) {
        throw new Error(
          `Ankr API error: ${data.error.message} (code: ${data.error.code})`,
        );
      }

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Ankr API request failed: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Retrieves blockchain statistics
   */
  async getBlockchainStats(
    params?: GetBlockchainStatsParams,
  ): Promise<GetBlockchainStatsResponse> {
    const response = await this.makeRequest<GetBlockchainStatsResponse>(
      'ankr_getBlockchainStats',
      params || {},
    );
    return response.result!;
  }

  /**
   * Retrieves the blocks' data for the specified range
   */
  async getBlocks(params: GetBlocksParams): Promise<GetBlocksResponse> {
    if (!params.blockchain) {
      throw new BadRequestException('blockchain parameter is required');
    }

    const response = await this.makeRequest<GetBlocksResponse>(
      'ankr_getBlocks',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves historical data (logs) for the specified range of blocks
   */
  async getLogs(params: GetLogsParams): Promise<GetLogsResponse> {
    const response = await this.makeRequest<GetLogsResponse>(
      'ankr_getLogs',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves the details of a transaction specified by hash
   */
  async getTransactionsByHash(
    params: GetTransactionsByHashParams,
  ): Promise<GetTransactionsByHashResponse> {
    if (!params.transactionHash) {
      throw new BadRequestException('transactionHash parameter is required');
    }

    const response = await this.makeRequest<GetTransactionsByHashResponse>(
      'ankr_getTransactionsByHash',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves the details of transactions specified by address
   */
  async getTransactionsByAddress(
    params: GetTransactionsByAddressParams,
  ): Promise<GetTransactionsByAddressResponse> {
    if (!params.address) {
      throw new BadRequestException('address parameter is required');
    }

    const response = await this.makeRequest<GetTransactionsByAddressResponse>(
      'ankr_getTransactionsByAddress',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves blockchains interacted with a particular address
   */
  async getInteractions(
    params: GetInteractionsParams,
  ): Promise<GetInteractionsResponse> {
    if (!params.address) {
      throw new BadRequestException('address parameter is required');
    }

    const response = await this.makeRequest<GetInteractionsResponse>(
      'ankr_getInteractions',
      params,
    );
    return response.result!;
  }

  /**
   * Token API Methods
   */

  /**
   * Retrieves account balance
   * Retrieves the balance of the account specified.
   */
  async getAccountBalance(
    params: GetAccountBalanceParams,
  ): Promise<GetAccountBalanceResponse> {
    if (!params.walletAddress) {
      throw new BadRequestException('walletAddress parameter is required');
    }

    const response = await this.makeRequest<GetAccountBalanceResponse>(
      'ankr_getAccountBalance',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves the blockchain's currencies
   * Retrieves a list of all the currencies used in transactions on a blockchain specified.
   */
  async getCurrencies(
    params: GetCurrenciesParams,
  ): Promise<GetCurrenciesResponse> {
    if (!params.blockchain) {
      throw new BadRequestException('blockchain parameter is required');
    }

    const response = await this.makeRequest<GetCurrenciesResponse>(
      'ankr_getCurrencies',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves token price
   * Retrieves a USD price of the token specified.
   */
  async getTokenPrice(
    params: GetTokenPriceParams,
  ): Promise<GetTokenPriceResponse> {
    if (!params.blockchain) {
      throw new BadRequestException('blockchain parameter is required');
    }

    const response = await this.makeRequest<GetTokenPriceResponse>(
      'ankr_getTokenPrice',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves data on token holders
   * Retrieves holders (wallet addresses) and the associated metadata of the tokens specified.
   */
  async getTokenHolders(
    params: GetTokenHoldersParams,
  ): Promise<GetTokenHoldersResponse> {
    if (!params.blockchain) {
      throw new BadRequestException('blockchain parameter is required');
    }
    if (!params.contractAddress) {
      throw new BadRequestException('contractAddress parameter is required');
    }

    const response = await this.makeRequest<GetTokenHoldersResponse>(
      'ankr_getTokenHolders',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves the number of token holders
   * Retrieves the number of holders for the tokens specified.
   */
  async getTokenHoldersCount(
    params: GetTokenHoldersCountParams,
  ): Promise<GetTokenHoldersCountResponse> {
    if (!params.blockchain) {
      throw new BadRequestException('blockchain parameter is required');
    }
    if (!params.contractAddress) {
      throw new BadRequestException('contractAddress parameter is required');
    }

    const response = await this.makeRequest<GetTokenHoldersCountResponse>(
      'ankr_getTokenHoldersCount',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves info on token transfers for the wallet address specified
   */
  async getTokenTransfers(
    params: GetTokenTransfersParams,
  ): Promise<GetTokenTransfersResponse> {
    if (!params.address) {
      throw new BadRequestException('address parameter is required');
    }

    const response = await this.makeRequest<GetTokenTransfersResponse>(
      'ankr_getTokenTransfers',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves the historical price of the token specified
   */
  async getTokenPriceHistory(
    params: GetTokenPriceHistoryParams,
  ): Promise<GetTokenPriceHistoryResponse> {
    if (!params.blockchain) {
      throw new BadRequestException('blockchain parameter is required');
    }

    const response = await this.makeRequest<GetTokenPriceHistoryResponse>(
      'ankr_getTokenPriceHistory',
      params,
    );
    return response.result!;
  }

  /**
   * NFT API Methods
   */

  /**
   * Retrieves the account's NFT data
   * Retrieves a list of NFTs (ERC721/ERC1155/ENS/POAP) that belong to the particular account specified
   */
  async getNFTsByOwner(
    params: GetNFTsByOwnerParams,
  ): Promise<GetNFTsByOwnerResponse> {
    if (!params.walletAddress) {
      throw new BadRequestException('walletAddress parameter is required');
    }

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
    return response.result!;
  }

  /**
   * Retrieves the NFT's metadata
   * Retrieves the metadata that belongs to a particular NFT (ERC721/ERC1155/ENS/POAP)
   */
  async getNFTMetadata(
    params: GetNFTMetadataParams,
  ): Promise<GetNFTMetadataResponse> {
    if (!params.blockchain) {
      throw new BadRequestException('blockchain parameter is required');
    }
    if (!params.contractAddress) {
      throw new BadRequestException('contractAddress parameter is required');
    }
    if (params.tokenId === undefined || params.tokenId === null) {
      throw new BadRequestException('tokenId parameter is required');
    }

    const response = await this.makeRequest<GetNFTMetadataResponse>(
      'ankr_getNFTMetadata',
      params,
    );
    return response.result!;
  }

  /**
   * Retrieves the NFT's holders data
   * Retrieves a list of holders (wallet addresses) of the NFT specified
   */
  async getNFTHolders(
    params: GetNFTHoldersParams,
  ): Promise<GetNFTHoldersResponse> {
    if (!params.blockchain) {
      throw new BadRequestException('blockchain parameter is required');
    }
    if (!params.contractAddress) {
      throw new BadRequestException('contractAddress parameter is required');
    }

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
    return response.result!;
  }

  /**
   * Retrieves info on NFT transfers
   * Retrieves info on NFT transfers for an address specified
   */
  async getNftTransfers(
    params: GetNftTransfersParams,
  ): Promise<GetNftTransfersResponse> {
    if (!params.address) {
      throw new BadRequestException('address parameter is required');
    }

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
    return response.result!;
  }
}

