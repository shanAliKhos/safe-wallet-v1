import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument, TransactionStatus, TransactionMode } from './schemas/transaction.schema';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {}

  /**
   * Create a new transaction record
   */
  async createTransaction(data: {
    userId: string;
    walletId: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    tokenAddress?: string;
    chain: 'bsc' | 'eth';
    mode: TransactionMode;
    taskId?: string;
    taskUrl?: string;
    recipients?: Array<{
      recipient: string;
      amount: string;
      tokenAddress?: string;
    }>;
    metadata?: Record<string, any>;
  }): Promise<TransactionDocument> {
    const transaction = new this.transactionModel({
      userId: new Types.ObjectId(data.userId),
      walletId: new Types.ObjectId(data.walletId),
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      amount: data.amount,
      tokenAddress: data.tokenAddress,
      chain: data.chain,
      mode: data.mode,
      status: TransactionStatus.PENDING,
      taskId: data.taskId,
      taskUrl: data.taskUrl,
      recipients: data.recipients,
      metadata: data.metadata,
    });

    return transaction.save();
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    txHash?: string,
  ): Promise<TransactionDocument | null> {
    const update: any = { status };
    if (txHash) {
      update.txHash = txHash;
    }

    return this.transactionModel
      .findByIdAndUpdate(
        transactionId,
        { $set: update },
        { new: true },
      )
      .exec();
  }

  /**
   * Get transactions for a user
   */
  async getUserTransactions(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: TransactionStatus;
      chain?: string;
    } = {},
  ): Promise<TransactionDocument[]> {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (options.status) {
      query.status = options.status;
    }
    if (options.chain) {
      query.chain = options.chain;
    }

    return this.transactionModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.offset || 0)
      .exec();
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<TransactionDocument | null> {
    return this.transactionModel.findById(transactionId).exec();
  }

  /**
   * Get transaction by task ID
   */
  async getTransactionByTaskId(taskId: string): Promise<TransactionDocument | null> {
    return this.transactionModel.findOne({ taskId }).exec();
  }

  /**
   * Get transaction count for a user
   */
  async getUserTransactionCount(
    userId: string,
    status?: TransactionStatus,
  ): Promise<number> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }
    return this.transactionModel.countDocuments(query).exec();
  }
}

