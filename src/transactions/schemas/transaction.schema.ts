import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum TransactionMode {
  SEND = 'SEND',
  MULTI_SEND = 'MULTI_SEND',
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Wallet', required: true, index: true })
  walletId: Types.ObjectId;

  @Prop({ required: true })
  fromAddress: string; // Wallet address

  @Prop({ required: true })
  toAddress: string; // Recipient address (for multi-send, comma-separated)

  @Prop({ required: true })
  amount: string; // Amount sent (for multi-send, total amount)

  @Prop()
  tokenAddress?: string; // Token address, undefined for native token

  @Prop({ required: true, enum: ['bsc', 'eth'] })
  chain: string;

  @Prop({ required: true, enum: TransactionMode })
  mode: TransactionMode;

  @Prop({ required: true, enum: TransactionStatus, default: TransactionStatus.PENDING, index: true })
  status: TransactionStatus;

  @Prop()
  taskId?: string; // Gelato task ID

  @Prop()
  taskUrl?: string; // Gelato task URL

  @Prop()
  txHash?: string; // Blockchain transaction hash

  @Prop({ type: Object })
  recipients?: Array<{
    recipient: string;
    amount: string;
    tokenAddress?: string;
  }>; // For multi-send transactions

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Additional transaction data

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Indexes for efficient queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ walletId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ taskId: 1 });
TransactionSchema.index({ txHash: 1 });

