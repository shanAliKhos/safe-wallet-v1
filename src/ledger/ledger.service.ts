import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LedgerEntry, LedgerEntryDocument, LedgerEntryType, TransactionType } from './schemas/ledger-entry.schema';
import Decimal from 'decimal.js';

/**
 * Ledger Service - Double-entry bookkeeping
 * All balance changes must go through ledger entries
 * Balances are calculated from ledger, never stored directly
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectModel(LedgerEntry.name) private ledgerModel: Model<LedgerEntryDocument>,
  ) {}

  /**
   * Create a ledger entry (single entry)
   * For double-entry, call createDoubleEntry
   */
  async createEntry(data: {
    walletId: Types.ObjectId;
    userId?: Types.ObjectId;
    type: LedgerEntryType;
    transactionType: TransactionType;
    amount: string;
    currency: string;
    chainId: number;
    tokenAddress: string;
    description: string;
    transferId?: Types.ObjectId;
    withdrawalId?: Types.ObjectId;
    metadata?: Record<string, any>;
    createdBy?: Types.ObjectId;
  }): Promise<LedgerEntryDocument> {
    const entry = new this.ledgerModel({
      ...data,
      isReconciled: false,
    });

    return entry.save();
  }

  /**
   * Create double-entry bookkeeping (debit and credit)
   * Ensures accounting equation always balances
   */
  async createDoubleEntry(data: {
    walletId: Types.ObjectId;
    userId?: Types.ObjectId;
    transactionType: TransactionType;
    amount: string;
    currency: string;
    chainId: number;
    tokenAddress: string;
    description: string;
    transferId?: Types.ObjectId;
    withdrawalId?: Types.ObjectId;
    metadata?: Record<string, any>;
    createdBy?: Types.ObjectId;
  }): Promise<{ debit: LedgerEntryDocument; credit: LedgerEntryDocument }> {
    // For deposits: debit wallet, credit system
    // For withdrawals: credit wallet, debit system
    // This ensures the accounting equation balances

    const debit = await this.createEntry({
      ...data,
      type: LedgerEntryType.DEBIT,
    });

    const credit = await this.createEntry({
      ...data,
      type: LedgerEntryType.CREDIT,
    });

    return { debit, credit };
  }

  /**
   * Calculate current balance from ledger entries
   * This is the source of truth for balances
   */
  async getBalance(
    walletId: Types.ObjectId,
    currency: string,
    chainId: number,
    tokenAddress: string = '0x0',
  ): Promise<string> {
    const entries = await this.ledgerModel
      .find({
        walletId,
        currency,
        chainId,
        tokenAddress: tokenAddress.toLowerCase(),
      })
      .exec();

    let balance = new Decimal(0);

    for (const entry of entries) {
      const amount = new Decimal(entry.amount);
      if (entry.type === LedgerEntryType.DEBIT) {
        balance = balance.plus(amount);
      } else {
        balance = balance.minus(amount);
      }
    }

    return balance.toString();
  }

  /**
   * Get balance for multiple tokens at once
   */
  async getBalances(
    walletId: Types.ObjectId,
    chainId: number,
  ): Promise<Record<string, Record<string, string>>> {
    const entries = await this.ledgerModel
      .find({
        walletId,
        chainId,
      })
      .exec();

    const balances: Record<string, Record<string, string>> = {};

    for (const entry of entries) {
      if (!balances[entry.currency]) {
        balances[entry.currency] = {};
      }
      if (!balances[entry.currency][entry.tokenAddress]) {
        balances[entry.currency][entry.tokenAddress] = '0';
      }

      const current = new Decimal(balances[entry.currency][entry.tokenAddress]);
      const amount = new Decimal(entry.amount);

      if (entry.type === LedgerEntryType.DEBIT) {
        balances[entry.currency][entry.tokenAddress] = current.plus(amount).toString();
      } else {
        balances[entry.currency][entry.tokenAddress] = current.minus(amount).toString();
      }
    }

    return balances;
  }

  /**
   * Get ledger history for a wallet
   */
  async getLedgerHistory(
    walletId: Types.ObjectId,
    options: {
      limit?: number;
      offset?: number;
      currency?: string;
      chainId?: number;
    } = {},
  ): Promise<LedgerEntryDocument[]> {
    const query: any = { walletId };

    if (options.currency) {
      query.currency = options.currency;
    }
    if (options.chainId) {
      query.chainId = options.chainId;
    }

    return this.ledgerModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 100)
      .skip(options.offset || 0)
      .exec();
  }

  /**
   * Reconcile ledger entries (mark as reconciled after blockchain verification)
   */
  async reconcileEntry(entryId: Types.ObjectId): Promise<void> {
    await this.ledgerModel.updateOne(
      { _id: entryId },
      {
        $set: {
          isReconciled: true,
          reconciledAt: new Date(),
        },
      },
    );
  }

  /**
   * Check if wallet has sufficient balance
   */
  async hasSufficientBalance(
    walletId: Types.ObjectId,
    amount: string,
    currency: string,
    chainId: number,
    tokenAddress: string = '0x0',
  ): Promise<boolean> {
    const balance = await this.getBalance(walletId, currency, chainId, tokenAddress);
    return new Decimal(balance).gte(new Decimal(amount));
  }
}

