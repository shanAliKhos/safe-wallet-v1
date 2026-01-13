import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChainDocument = Chain & Document;

@Schema({ timestamps: true })
export class Chain {
  @Prop({ required: true, unique: true })
  chainId: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string; // 'eth', 'bsc', etc.

  @Prop({ type: [String], default: [] })
  rpcUrls: string[];

  @Prop({ type: [String], default: [] })
  wsRpcUrls: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  nativeSymbol?: string; // 'ETH', 'BNB', etc.

  @Prop({ default: 18 })
  nativeDecimals?: number;

  @Prop()
  explorerBaseUrl?: string;

  @Prop()
  explorerApiUrl?: string;

  @Prop({ default: false })
  isTestnet?: boolean;

  @Prop()
  type?: string; // 'EVM', 'TRON', etc.

  @Prop({ default: 0 })
  avgRpcLatencyMs?: number;

  @Prop()
  logoUrl?: string;

  @Prop({ default: 0 })
  sortOrder?: number; // For ordering in select boxes
}

export const ChainSchema = SchemaFactory.createForClass(Chain);

// Indexes
ChainSchema.index({ chainId: 1 });
ChainSchema.index({ code: 1 });
ChainSchema.index({ isActive: 1 });

