import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SafeApiKit from '@safe-global/api-kit';
import { SafeMultisigTransactionResponse } from '@safe-global/types-kit';

/**
 * Safe API Service
 * Handles interaction with Safe Transaction Service for:
 * - Proposing transactions
 * - Collecting signatures from multiple owners
 * - Retrieving transaction history
 * - Managing delegates
 */
@Injectable()
export class SafeApiService {
  private readonly logger = new Logger(SafeApiService.name);
  private readonly apiKits: Map<number, SafeApiKit> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeApiKits();
  }

  /**
   * Initialize API Kit instances for each supported chain
   */
  private initializeApiKits(): void {
    // Ethereum Mainnet
    this.apiKits.set(1, new SafeApiKit({
      chainId: 1n,
    }));

    // BSC Mainnet
    this.apiKits.set(56, new SafeApiKit({
      chainId: 56n,
    }));

    this.logger.log('Safe API Kits initialized for chains: ETH, BSC');
  }

  /**
   * Get API Kit for specific chain
   */
  getApiKit(chainId: number): SafeApiKit {
    const apiKit = this.apiKits.get(chainId);
    if (!apiKit) {
      throw new Error(`API Kit not initialized for chain ${chainId}`);
    }
    return apiKit;
  }

  /**
   * Propose a transaction to the Safe Transaction Service
   */
  async proposeTransaction(params: {
    chainId: number;
    safeAddress: string;
    safeTransactionData: any;
    safeTxHash: string;
    senderAddress: string;
    senderSignature: string;
    origin?: string;
  }): Promise<void> {
    try {
      const apiKit = this.getApiKit(params.chainId);
      
      await apiKit.proposeTransaction({
        safeAddress: params.safeAddress,
        safeTransactionData: params.safeTransactionData,
        safeTxHash: params.safeTxHash,
        senderAddress: params.senderAddress,
        senderSignature: params.senderSignature,
        origin: params.origin,
      });

      this.logger.log(`Transaction proposed: ${params.safeTxHash}`);
    } catch (error) {
      this.logger.error(`Failed to propose transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Confirm a transaction (add signature)
   */
  async confirmTransaction(params: {
    chainId: number;
    safeTxHash: string;
    signature: string;
  }): Promise<void> {
    try {
      const apiKit = this.getApiKit(params.chainId);
      
      await apiKit.confirmTransaction(params.safeTxHash, params.signature);

      this.logger.log(`Transaction confirmed: ${params.safeTxHash}`);
    } catch (error) {
      this.logger.error(`Failed to confirm transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pending transactions for a Safe
   */
  async getPendingTransactions(params: {
    chainId: number;
    safeAddress: string;
  }): Promise<SafeMultisigTransactionResponse[]> {
    try {
      const apiKit = this.getApiKit(params.chainId);
      
      const pendingTxs = await apiKit.getPendingTransactions(params.safeAddress);

      this.logger.log(`Found ${pendingTxs.results.length} pending transactions for ${params.safeAddress}`);
      return pendingTxs.results;
    } catch (error) {
      this.logger.error(`Failed to get pending transactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(params: {
    chainId: number;
    safeTxHash: string;
  }): Promise<SafeMultisigTransactionResponse> {
    try {
      const apiKit = this.getApiKit(params.chainId);
      
      const transaction = await apiKit.getTransaction(params.safeTxHash);

      this.logger.log(`Retrieved transaction: ${params.safeTxHash}`);
      return transaction;
    } catch (error) {
      this.logger.error(`Failed to get transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all transactions for a Safe
   */
  async getAllTransactions(params: {
    chainId: number;
    safeAddress: string;
  }): Promise<SafeMultisigTransactionResponse[]> {
    try {
      const apiKit = this.getApiKit(params.chainId);
      
      const allTxs = await apiKit.getMultisigTransactions(params.safeAddress);

      this.logger.log(`Found ${allTxs.results.length} total transactions for ${params.safeAddress}`);
      return allTxs.results;
    } catch (error) {
      this.logger.error(`Failed to get all transactions: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get Safe info from Transaction Service
   */
  async getSafeInfo(params: {
    chainId: number;
    safeAddress: string;
  }): Promise<any> {
    try {
      const apiKit = this.getApiKit(params.chainId);
      
      const safeInfo = await apiKit.getSafeInfo(params.safeAddress);

      this.logger.log(`Retrieved Safe info for ${params.safeAddress}`);
      return safeInfo;
    } catch (error) {
      this.logger.error(`Failed to get Safe info: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Propose a message for signing
   */
  async proposeMessage(params: {
    chainId: number;
    safeAddress: string;
    message: string;
    signature: string;
  }): Promise<void> {
    try {
      const apiKit = this.getApiKit(params.chainId);
      
      await apiKit.addMessage(params.safeAddress, {
        message: params.message,
        signature: params.signature,
      });

      this.logger.log(`Message proposed for Safe ${params.safeAddress}`);
    } catch (error) {
      this.logger.error(`Failed to propose message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add signature to a message
   */
  async addMessageSignature(params: {
    chainId: number;
    messageHash: string;
    signature: string;
  }): Promise<void> {
    try {
      const apiKit = this.getApiKit(params.chainId);
      
      await apiKit.addMessageSignature(params.messageHash, params.signature);

      this.logger.log(`Signature added to message: ${params.messageHash}`);
    } catch (error) {
      this.logger.error(`Failed to add message signature: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get messages for a Safe
   */
  async getMessages(params: {
    chainId: number;
    safeAddress: string;
  }): Promise<any[]> {
    try {
      const apiKit = this.getApiKit(params.chainId);
      
      const messages = await apiKit.getMessages(params.safeAddress);

      this.logger.log(`Found ${messages.results.length} messages for ${params.safeAddress}`);
      return messages.results;
    } catch (error) {
      this.logger.error(`Failed to get messages: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get Service Info
   */
  async getServiceInfo(chainId: number): Promise<any> {
    try {
      const apiKit = this.getApiKit(chainId);
      
      const info = await apiKit.getServiceInfo();

      this.logger.log(`Service info retrieved for chain ${chainId}`);
      return info;
    } catch (error) {
      this.logger.error(`Failed to get service info: ${error.message}`, error.stack);
      throw error;
    }
  }
}
