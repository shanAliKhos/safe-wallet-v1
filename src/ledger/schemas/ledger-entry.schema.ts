import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LedgerEntryDocument = LedgerEntry & Document;

export enum LedgerEntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER = 'TRANSFER',
  FEE = 'FEE',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Schema({ timestamps: true })
export class LedgerEntry {
  @Prop({ type: Types.ObjectId, ref: 'Wallet', required: true, index: true })
  walletId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, enum: LedgerEntryType, index: true })
  type: LedgerEntryType;

  @Prop({ required: true, enum: TransactionType, index: true })
  transactionType: TransactionType;

  @Prop({ required: true })
  amount: string; // Store as string to avoid precision loss

  @Prop({ required: true })
  currency: string; // e.g., 'ETH', 'USDT'

  @Prop({ required: true })
  chainId: number; // e.g., 1 for Ethereum, 56 for BSC

  @Prop({ required: true })
  tokenAddress: string; // '0x0' for native token

  @Prop({ type: Types.ObjectId, ref: 'Transfer' })
  transferId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Withdrawal' })
  withdrawalId?: Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  isReconciled: boolean;

  @Prop()
  reconciledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const LedgerEntrySchema = SchemaFactory.createForClass(LedgerEntry);

// Indexes for efficient queries
LedgerEntrySchema.index({ walletId: 1, createdAt: -1 });
LedgerEntrySchema.index({ userId: 1, createdAt: -1 });
LedgerEntrySchema.index({ walletId: 1, currency: 1, chainId: 1 });
LedgerEntrySchema.index({ transferId: 1 });
LedgerEntrySchema.index({ withdrawalId: 1 });

