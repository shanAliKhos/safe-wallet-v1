import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JsonRpcRequest,
  JsonRpcResponse,
} from '../dto/json-rpc.dto';

/**
 * Base Ankr Service
 * 
 * Provides core HTTP client functionality for all Ankr API services.
 * Handles JSON-RPC requests, authentication, error handling, and logging.
 */
@Injectable()
export class AnkrBaseService {
  protected readonly logger = new Logger(AnkrBaseService.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private requestIdCounter = 1;

  constructor(protected configService: ConfigService) {
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
   * @param method - The Ankr API method name (e.g., 'ankr_getBlocks')
   * @param params - The parameters for the method
   * @returns The response data from Ankr API
   */
  protected async makeRequest<T>(
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
   * Get the result from a JSON-RPC response
   * @param response - The JSON-RPC response
   * @returns The result data
   */
  protected getResult<T>(response: JsonRpcResponse<T>): T {
    if (!response.result) {
      throw new Error('No result in Ankr API response');
    }
    return response.result;
  }

  /**
   * Validate required parameters
   * @param params - Object containing parameters
   * @param requiredFields - Array of required field names
   */
  protected validateRequired(params: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null) {
        throw new BadRequestException(`${field} parameter is required`);
      }
    }
  }
}
