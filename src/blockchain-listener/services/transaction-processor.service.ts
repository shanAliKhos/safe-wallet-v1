import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BlockchainTransaction, BlockchainTransactionDocument, BlockchainTransactionType, BlockchainTransactionDirection } from '../schemas/blockchain-transaction.schema';
import { ethers } from 'ethers';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WalletTrackerService } from './wallet-tracker.service';

/**
 * Transaction Processor Service
 * 
 * Processes blockchain transactions and stores them if they belong to tracked wallets.
 * Handles:
 * - Native token transfers
 * - ERC20 token transfers
 * - ERC721/ERC1155 NFT transfers
 * - Contract interactions
 */
@Injectable()
export class TransactionProcessorService {
  private readonly logger = new Logger(TransactionProcessorService.name);
  private readonly ERC20_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  private readonly ERC721_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  private readonly ERC1155_TRANSFER_SINGLE_SIGNATURE = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
  private readonly ERC1155_TRANSFER_BATCH_SIGNATURE = '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb';

  constructor(
    @InjectModel(BlockchainTransaction.name)
    private blockchainTransactionModel: Model<BlockchainTransactionDocument>,
    @InjectQueue('transaction-processing')
    private transactionQueue: Queue,
    private walletTracker: WalletTrackerService,
  ) {}

  /**
   * Check if transaction already exists in database
   */
  private async transactionExists(txHash: string, chainCode: string): Promise<boolean> {
    const count = await this.blockchainTransactionModel.countDocuments({
      txHash,
      chainCode,
    });
    return count > 0;
  }

  /**
   * Process a blockchain transaction
   */
  async processTransaction(data: {
    chainCode: string;
    chainId: Types.ObjectId;
    tx: ethers.TransactionResponse;
    block: ethers.Block;
    receipt: ethers.TransactionReceipt | null;
    fromWallet: { walletId: string; userId?: string } | null;
    toWallet: { walletId: string; userId?: string } | null;
  }): Promise<void> {
    try {
      // Check for duplicate
      const exists = await this.transactionExists(data.tx.hash, data.chainCode);
      if (exists) {
        this.logger.debug(`Transaction ${data.tx.hash} already exists, skipping`);
        return;
      }

      // Determine transaction type and process
      const txType = await this.determineTransactionType(data.tx, data.receipt);
      
      // Process based on transaction type
      switch (txType) {
        case BlockchainTransactionType.NATIVE:
          await this.processNativeTransaction(data);
          break;
        case BlockchainTransactionType.ERC20:
          await this.processERC20Transaction(data);
          break;
        case BlockchainTransactionType.ERC721:
          await this.processERC721Transaction(data);
          break;
        case BlockchainTransactionType.ERC1155:
          await this.processERC1155Transaction(data);
          break;
        case BlockchainTransactionType.CONTRACT_CALL:
          await this.processContractCallTransaction(data);
          break;
      }
    } catch (error) {
      this.logger.error(`Error processing transaction ${data.tx.hash}:`, error);
      // Add to queue for retry
      await this.transactionQueue.add('process-transaction', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
    }
  }

  /**
   * Determine transaction type based on transaction data
   */
  private async determineTransactionType(
    tx: ethers.TransactionResponse,
    receipt: ethers.TransactionReceipt | null,
  ): Promise<BlockchainTransactionType> {
    // If no data and no to address, it's a contract creation
    if (!tx.to && tx.data && tx.data !== '0x') {
      return BlockchainTransactionType.CONTRACT_CALL;
    }

    // If no data, it's a native token transfer
    if (!tx.data || tx.data === '0x') {
      return BlockchainTransactionType.NATIVE;
    }

    // Check logs for token transfers
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        const topics = log.topics;
        if (topics.length >= 3) {
          const signature = topics[0];
          
          if (signature === this.ERC20_TRANSFER_SIGNATURE) {
            return BlockchainTransactionType.ERC20;
          }
          
          if (signature === this.ERC721_TRANSFER_SIGNATURE) {
            return BlockchainTransactionType.ERC721;
          }
          
          if (
            signature === this.ERC1155_TRANSFER_SINGLE_SIGNATURE ||
            signature === this.ERC1155_TRANSFER_BATCH_SIGNATURE
          ) {
            return BlockchainTransactionType.ERC1155;
          }
        }
      }
    }

    // Default to contract call
    return BlockchainTransactionType.CONTRACT_CALL;
  }

  /**
   * Process native token transaction (ETH, BNB, etc.)
   */
  private async processNativeTransaction(data: {
    chainCode: string;
    chainId: Types.ObjectId;
    tx: ethers.TransactionResponse;
    block: ethers.Block;
    receipt: ethers.TransactionReceipt | null;
    fromWallet: { walletId: string; userId?: string } | null;
    toWallet: { walletId: string; userId?: string } | null;
  }): Promise<void> {
    const fromAddress = data.tx.from?.toLowerCase() || '';
    const toAddress = data.tx.to?.toLowerCase() || '';
    const value = data.tx.value.toString();
    const gasUsed = data.receipt?.gasUsed?.toString() || '0';
    const gasPrice = data.tx.gasPrice?.toString() || '0';
    const transactionFee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();

    // Create transaction records for both directions if wallets are tracked
    const transactionsToCreate: Partial<BlockchainTransaction>[] = [];

    if (data.fromWallet) {
      transactionsToCreate.push({
        txHash: data.tx.hash,
        blockNumber: data.block.number,
        blockHash: data.block.hash || '',
        chainCode: data.chainCode,
        chainId: data.chainId,
        fromAddress,
        toAddress,
        value,
        gasUsed,
        gasPrice,
        gasLimit: data.tx.gasLimit?.toString() || '0',
        transactionFee,
        transactionIndex: data.tx.index || 0,
        timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
        type: BlockchainTransactionType.NATIVE,
        direction: BlockchainTransactionDirection.OUTGOING,
        walletId: new Types.ObjectId(data.fromWallet.walletId),
        walletAddress: fromAddress,
        confirmations: 0,
        isConfirmed: false,
        isProcessed: false,
        rawData: {
          nonce: data.tx.nonce,
          data: data.tx.data,
        },
        logs: data.receipt?.logs || [],
      });
    }

    if (data.toWallet) {
      transactionsToCreate.push({
        txHash: data.tx.hash,
        blockNumber: data.block.number,
        blockHash: data.block.hash || '',
        chainCode: data.chainCode,
        chainId: data.chainId,
        fromAddress,
        toAddress,
        value,
        gasUsed,
        gasPrice,
        gasLimit: data.tx.gasLimit?.toString() || '0',
        transactionFee,
        transactionIndex: data.tx.index || 0,
        timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
        type: BlockchainTransactionType.NATIVE,
        direction: BlockchainTransactionDirection.INCOMING,
        walletId: new Types.ObjectId(data.toWallet.walletId),
        walletAddress: toAddress,
        confirmations: 0,
        isConfirmed: false,
        isProcessed: false,
        rawData: {
          nonce: data.tx.nonce,
          data: data.tx.data,
        },
        logs: data.receipt?.logs || [],
      });
    }

    // Bulk insert transactions
    if (transactionsToCreate.length > 0) {
      await this.blockchainTransactionModel.insertMany(transactionsToCreate);
      this.logger.debug(
        `Stored ${transactionsToCreate.length} native transaction(s) for tx ${data.tx.hash}`,
      );
    }
  }

  /**
   * Process ERC20 token transaction
   */
  private async processERC20Transaction(data: {
    chainCode: string;
    chainId: Types.ObjectId;
    tx: ethers.TransactionResponse;
    block: ethers.Block;
    receipt: ethers.TransactionReceipt | null;
    fromWallet: { walletId: string; userId?: string } | null;
    toWallet: { walletId: string; userId?: string } | null;
  }): Promise<void> {
    if (!data.receipt || !data.receipt.logs) {
      return;
    }

    // Find Transfer event logs
    const transferLogs = data.receipt.logs.filter(
      (log) => log.topics[0] === this.ERC20_TRANSFER_SIGNATURE && log.topics.length === 3,
    );

    for (const log of transferLogs) {
      const tokenAddress = log.address.toLowerCase();
      const fromAddress = '0x' + log.topics[1].slice(-40).toLowerCase();
      const toAddress = '0x' + log.topics[2].slice(-40).toLowerCase();
      const value = ethers.getBigInt(log.data).toString();

      // Check if addresses are tracked wallets
      const fromWallet = fromAddress !== '0x0000000000000000000000000000000000000000' 
        ? await this.getWalletForAddress(fromAddress, data.chainCode)
        : null;
      const toWallet = await this.getWalletForAddress(toAddress, data.chainCode);

      if (!fromWallet && !toWallet) {
        continue; // Skip if neither wallet is tracked
      }

      const gasUsed = data.receipt.gasUsed?.toString() || '0';
      const gasPrice = data.tx.gasPrice?.toString() || '0';
      const transactionFee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();

      const transactionsToCreate: Partial<BlockchainTransaction>[] = [];

      if (fromWallet) {
        transactionsToCreate.push({
          txHash: data.tx.hash,
          blockNumber: data.block.number,
          blockHash: data.block.hash || '',
          chainCode: data.chainCode,
          chainId: data.chainId,
          fromAddress,
          toAddress,
          value,
          gasUsed,
          gasPrice,
          gasLimit: data.tx.gasLimit?.toString() || '0',
          transactionFee,
          transactionIndex: data.tx.index || 0,
          timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
          type: BlockchainTransactionType.ERC20,
          direction: BlockchainTransactionDirection.OUTGOING,
          tokenAddress,
          walletId: new Types.ObjectId(fromWallet.walletId),
          walletAddress: fromAddress,
          confirmations: 0,
          isConfirmed: false,
          isProcessed: false,
        });
      }

      if (toWallet) {
        transactionsToCreate.push({
          txHash: data.tx.hash,
          blockNumber: data.block.number,
          blockHash: data.block.hash || '',
          chainCode: data.chainCode,
          chainId: data.chainId,
          fromAddress,
          toAddress,
          value,
          gasUsed,
          gasPrice,
          gasLimit: data.tx.gasLimit?.toString() || '0',
          transactionFee,
          transactionIndex: data.tx.index || 0,
          timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
          type: BlockchainTransactionType.ERC20,
          direction: BlockchainTransactionDirection.INCOMING,
          tokenAddress,
          walletId: new Types.ObjectId(toWallet.walletId),
          walletAddress: toAddress,
          confirmations: 0,
          isConfirmed: false,
          isProcessed: false,
        });
      }

      if (transactionsToCreate.length > 0) {
        await this.blockchainTransactionModel.insertMany(transactionsToCreate);
      }
    }
  }

  /**
   * Process ERC721 NFT transaction
   */
  private async processERC721Transaction(data: {
    chainCode: string;
    chainId: Types.ObjectId;
    tx: ethers.TransactionResponse;
    block: ethers.Block;
    receipt: ethers.TransactionReceipt | null;
    fromWallet: { walletId: string; userId?: string } | null;
    toWallet: { walletId: string; userId?: string } | null;
  }): Promise<void> {
    if (!data.receipt?.logs) return;

    const transferLogs = data.receipt.logs.filter(
      (log) => log.topics[0] === this.ERC721_TRANSFER_SIGNATURE && log.topics.length === 4,
    );

    const gasUsed = data.receipt.gasUsed?.toString() || '0';
    const gasPrice = data.tx.gasPrice?.toString() || '0';
    const transactionFee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();

    for (const log of transferLogs) {
      const tokenAddress = log.address.toLowerCase();
      const fromAddress = '0x' + log.topics[1].slice(-40).toLowerCase();
      const toAddress = '0x' + log.topics[2].slice(-40).toLowerCase();
      const tokenId = ethers.toBeHex(log.topics[3]);

      const fromWallet = fromAddress !== '0x0000000000000000000000000000000000000000'
        ? await this.getWalletForAddress(fromAddress, data.chainCode)
        : null;
      const toWallet = await this.getWalletForAddress(toAddress, data.chainCode);

      if (!fromWallet && !toWallet) continue;

      const transactions: Partial<BlockchainTransaction>[] = [];

      if (fromWallet) {
        transactions.push({
          txHash: data.tx.hash,
          blockNumber: data.block.number,
          blockHash: data.block.hash || '',
          chainCode: data.chainCode,
          chainId: data.chainId,
          fromAddress,
          toAddress,
          value: '1',
          gasUsed,
          gasPrice,
          gasLimit: data.tx.gasLimit?.toString() || '0',
          transactionFee,
          transactionIndex: data.tx.index || 0,
          timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
          type: BlockchainTransactionType.ERC721,
          direction: BlockchainTransactionDirection.OUTGOING,
          tokenAddress,
          tokenId,
          walletId: new Types.ObjectId(fromWallet.walletId),
          walletAddress: fromAddress,
          confirmations: 0,
          isConfirmed: false,
          isProcessed: false,
        });
      }

      if (toWallet) {
        transactions.push({
          txHash: data.tx.hash,
          blockNumber: data.block.number,
          blockHash: data.block.hash || '',
          chainCode: data.chainCode,
          chainId: data.chainId,
          fromAddress,
          toAddress,
          value: '1',
          gasUsed,
          gasPrice,
          gasLimit: data.tx.gasLimit?.toString() || '0',
          transactionFee,
          transactionIndex: data.tx.index || 0,
          timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
          type: BlockchainTransactionType.ERC721,
          direction: BlockchainTransactionDirection.INCOMING,
          tokenAddress,
          tokenId,
          walletId: new Types.ObjectId(toWallet.walletId),
          walletAddress: toAddress,
          confirmations: 0,
          isConfirmed: false,
          isProcessed: false,
        });
      }

      if (transactions.length > 0) {
        await this.blockchainTransactionModel.insertMany(transactions);
      }
    }
  }

  /**
   * Process ERC1155 NFT transaction
   */
  private async processERC1155Transaction(data: {
    chainCode: string;
    chainId: Types.ObjectId;
    tx: ethers.TransactionResponse;
    block: ethers.Block;
    receipt: ethers.TransactionReceipt | null;
    fromWallet: { walletId: string; userId?: string } | null;
    toWallet: { walletId: string; userId?: string } | null;
  }): Promise<void> {
    if (!data.receipt?.logs) return;

    const gasUsed = data.receipt.gasUsed?.toString() || '0';
    const gasPrice = data.tx.gasPrice?.toString() || '0';
    const transactionFee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();
    const transactions: Partial<BlockchainTransaction>[] = [];

    // TransferSingle: 0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62
    const singleTransfers = data.receipt.logs.filter(
      (log) => log.topics[0] === this.ERC1155_TRANSFER_SINGLE_SIGNATURE && log.topics.length === 4,
    );

    for (const log of singleTransfers) {
      const tokenAddress = log.address.toLowerCase();
      const fromAddress = '0x' + log.topics[2].slice(-40).toLowerCase();
      const toAddress = '0x' + log.topics[3].slice(-40).toLowerCase();
      const [tokenId, tokenAmount] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256'], log.data);

      const fromWallet = fromAddress !== '0x0000000000000000000000000000000000000000'
        ? await this.getWalletForAddress(fromAddress, data.chainCode)
        : null;
      const toWallet = await this.getWalletForAddress(toAddress, data.chainCode);

      if (!fromWallet && !toWallet) continue;

      if (fromWallet) {
        transactions.push({
          txHash: data.tx.hash,
          blockNumber: data.block.number,
          blockHash: data.block.hash || '',
          chainCode: data.chainCode,
          chainId: data.chainId,
          fromAddress,
          toAddress,
          value: tokenAmount.toString(),
          gasUsed,
          gasPrice,
          gasLimit: data.tx.gasLimit?.toString() || '0',
          transactionFee,
          transactionIndex: data.tx.index || 0,
          timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
          type: BlockchainTransactionType.ERC1155,
          direction: BlockchainTransactionDirection.OUTGOING,
          tokenAddress,
          tokenId: tokenId.toString(),
          tokenAmount: tokenAmount.toString(),
          walletId: new Types.ObjectId(fromWallet.walletId),
          walletAddress: fromAddress,
          confirmations: 0,
          isConfirmed: false,
          isProcessed: false,
        });
      }

      if (toWallet) {
        transactions.push({
          txHash: data.tx.hash,
          blockNumber: data.block.number,
          blockHash: data.block.hash || '',
          chainCode: data.chainCode,
          chainId: data.chainId,
          fromAddress,
          toAddress,
          value: tokenAmount.toString(),
          gasUsed,
          gasPrice,
          gasLimit: data.tx.gasLimit?.toString() || '0',
          transactionFee,
          transactionIndex: data.tx.index || 0,
          timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
          type: BlockchainTransactionType.ERC1155,
          direction: BlockchainTransactionDirection.INCOMING,
          tokenAddress,
          tokenId: tokenId.toString(),
          tokenAmount: tokenAmount.toString(),
          walletId: new Types.ObjectId(toWallet.walletId),
          walletAddress: toAddress,
          confirmations: 0,
          isConfirmed: false,
          isProcessed: false,
        });
      }
    }

    // TransferBatch: 0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb
    const batchTransfers = data.receipt.logs.filter(
      (log) => log.topics[0] === this.ERC1155_TRANSFER_BATCH_SIGNATURE && log.topics.length === 4,
    );

    for (const log of batchTransfers) {
      const tokenAddress = log.address.toLowerCase();
      const fromAddress = '0x' + log.topics[2].slice(-40).toLowerCase();
      const toAddress = '0x' + log.topics[3].slice(-40).toLowerCase();
      const [tokenIds, tokenAmounts] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256[]', 'uint256[]'], log.data);

      const fromWallet = fromAddress !== '0x0000000000000000000000000000000000000000'
        ? await this.getWalletForAddress(fromAddress, data.chainCode)
        : null;
      const toWallet = await this.getWalletForAddress(toAddress, data.chainCode);

      if (!fromWallet && !toWallet) continue;

      for (let i = 0; i < tokenIds.length; i++) {
        const record = {
          txHash: data.tx.hash,
          blockNumber: data.block.number,
          blockHash: data.block.hash || '',
          chainCode: data.chainCode,
          chainId: data.chainId,
          fromAddress,
          toAddress,
          value: tokenAmounts[i].toString(),
          gasUsed,
          gasPrice,
          gasLimit: data.tx.gasLimit?.toString() || '0',
          transactionFee,
          transactionIndex: data.tx.index || 0,
          timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
          type: BlockchainTransactionType.ERC1155,
          tokenAddress,
          tokenId: tokenIds[i].toString(),
          tokenAmount: tokenAmounts[i].toString(),
          confirmations: 0,
          isConfirmed: false,
          isProcessed: false,
        };

        if (fromWallet) {
          transactions.push({
            ...record,
            direction: BlockchainTransactionDirection.OUTGOING,
            walletId: new Types.ObjectId(fromWallet.walletId),
            walletAddress: fromAddress,
          });
        }

        if (toWallet) {
          transactions.push({
            ...record,
            direction: BlockchainTransactionDirection.INCOMING,
            walletId: new Types.ObjectId(toWallet.walletId),
            walletAddress: toAddress,
          });
        }
      }
    }

    if (transactions.length > 0) {
      await this.blockchainTransactionModel.insertMany(transactions);
    }
  }

  /**
   * Process contract call transaction
   */
  private async processContractCallTransaction(data: {
    chainCode: string;
    chainId: Types.ObjectId;
    tx: ethers.TransactionResponse;
    block: ethers.Block;
    receipt: ethers.TransactionReceipt | null;
    fromWallet: { walletId: string; userId?: string } | null;
    toWallet: { walletId: string; userId?: string } | null;
  }): Promise<void> {
    // Store contract interactions for tracked wallets
    if (!data.fromWallet && !data.toWallet) {
      return;
    }

    const fromAddress = data.tx.from?.toLowerCase() || '';
    const gasUsed = data.receipt?.gasUsed?.toString() || '0';
    const gasPrice = data.tx.gasPrice?.toString() || '0';
    const transactionFee = (BigInt(gasUsed) * BigInt(gasPrice)).toString();

    if (data.fromWallet) {
      await this.blockchainTransactionModel.create({
        txHash: data.tx.hash,
        blockNumber: data.block.number,
        blockHash: data.block.hash || '',
        chainCode: data.chainCode,
        chainId: data.chainId,
        fromAddress,
        toAddress: data.tx.to?.toLowerCase() || '',
        value: data.tx.value.toString(),
        gasUsed,
        gasPrice,
        gasLimit: data.tx.gasLimit?.toString() || '0',
        transactionFee,
        transactionIndex: data.tx.index || 0,
        timestamp: data.block.timestamp || Math.floor(Date.now() / 1000),
        type: BlockchainTransactionType.CONTRACT_CALL,
        direction: BlockchainTransactionDirection.OUTGOING,
        walletId: new Types.ObjectId(data.fromWallet.walletId),
        walletAddress: fromAddress,
        confirmations: 0,
        isConfirmed: false,
        isProcessed: false,
        rawData: {
          data: data.tx.data,
        },
      });
    }
  }

  /**
   * Helper: Get wallet for address
   */
  private async getWalletForAddress(
    address: string,
    chainCode: string,
  ): Promise<{ walletId: string; userId?: string } | null> {
    return this.walletTracker.getWalletMetadata(address, chainCode);
  }
}

