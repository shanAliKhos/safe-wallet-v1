import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlockchainTransactionDocument = BlockchainTransaction & Document;

export enum BlockchainTransactionType {
  NATIVE = 'NATIVE', // Native token transfer (ETH, BNB, etc.)
  ERC20 = 'ERC20', // ERC20 token transfer
  ERC721 = 'ERC721', // NFT transfer
  ERC1155 = 'ERC1155', // Multi-token NFT transfer
  CONTRACT_CALL = 'CONTRACT_CALL', // Contract interaction
}

export enum BlockchainTransactionDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

@Schema({ timestamps: true })
export class BlockchainTransaction {
  // Transaction identifiers
  @Prop({ required: true, unique: true, index: true })
  txHash: string;

  @Prop({ required: true, index: true })
  blockNumber: number;

  @Prop({ required: true, index: true })
  blockHash: string;

  @Prop({ required: true, index: true })
  chainCode: string; // 'eth', 'bsc', etc.

  @Prop({ type: Types.ObjectId, ref: 'Chain', required: true, index: true })
  chainId: Types.ObjectId;

  // Transaction details
  @Prop({ required: true, index: true })
  fromAddress: string;

  @Prop({ required: true, index: true })
  toAddress: string;

  @Prop({ required: true })
  value: string; // Amount in wei/smallest unit

  @Prop({ default: '0' })
  gasUsed: string;

  @Prop({ default: '0' })
  gasPrice: string;

  @Prop({ default: '0' })
  gasLimit: string;

  @Prop({ default: '0' })
  transactionFee: string; // gasUsed * gasPrice

  @Prop({ required: true })
  transactionIndex: number;

  @Prop({ required: true })
  timestamp: number; // Block timestamp

  @Prop({ required: true, enum: BlockchainTransactionType })
  type: BlockchainTransactionType;

  @Prop({ required: true, enum: BlockchainTransactionDirection })
  direction: BlockchainTransactionDirection;

  // Token information (for ERC20/ERC721/ERC1155)
  @Prop({ index: true })
  tokenAddress?: string;

  @Prop()
  tokenSymbol?: string;

  @Prop()
  tokenName?: string;

  @Prop()
  tokenDecimals?: number;

  // NFT information (for ERC721/ERC1155)
  @Prop()
  tokenId?: string;

  @Prop()
  tokenAmount?: string; // For ERC1155

  @Prop({ default: false })
  isReorged: boolean;

  @Prop()
  reorgRolledBackAt?: Date;

  // Wallet association
  @Prop({ type: Types.ObjectId, ref: 'Wallet', index: true })
  walletId?: Types.ObjectId;

  @Prop({ index: true })
  walletAddress?: string; // The wallet address this transaction belongs to

  // Status
  @Prop({ default: 0 })
  confirmations: number;

  @Prop({ default: true })
  isConfirmed: boolean;

  @Prop({ default: false })
  isProcessed: boolean; // Whether we've processed this transaction

  @Prop()
  processedAt?: Date;

  // Additional data
  @Prop({ type: Object })
  rawData?: Record<string, any>; // Full transaction data

  @Prop({ type: Object })
  logs?: any[]; // Transaction logs

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BlockchainTransactionSchema = SchemaFactory.createForClass(BlockchainTransaction);

// Compound indexes for efficient queries
BlockchainTransactionSchema.index({ chainCode: 1, blockNumber: -1 });
BlockchainTransactionSchema.index({ chainCode: 1, fromAddress: 1, blockNumber: -1 });
BlockchainTransactionSchema.index({ chainCode: 1, toAddress: 1, blockNumber: -1 });
BlockchainTransactionSchema.index({ walletId: 1, blockNumber: -1 });
BlockchainTransactionSchema.index({ walletAddress: 1, chainCode: 1, blockNumber: -1 });
BlockchainTransactionSchema.index({ txHash: 1, chainCode: 1 });
BlockchainTransactionSchema.index({ isProcessed: 1, chainCode: 1 });
BlockchainTransactionSchema.index({ tokenAddress: 1, chainCode: 1 });

