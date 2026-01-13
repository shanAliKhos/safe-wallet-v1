import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ChainDocument } from '../../chains/schemas/chain.schema';

export type CoinDocument = Coin & Document;

@Schema({ timestamps: true })
export class Coin {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true, unique: true })
  currencyCode: string; // 'ETH', 'BNB', 'USDT', etc.

  @Prop({ type: Types.ObjectId, ref: 'Chain', required: true, index: true })
  chain: ChainDocument | Types.ObjectId;

  @Prop({ required: true })
  contractAddress: string; // '0x0000000000000000000000000000000000000000' for native tokens

  @Prop({ default: 18 })
  decimals: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isNative: boolean; // true for native tokens like ETH, BNB

  @Prop({ type: Number, default: 0 })
  price: number;

  @Prop({ default: 0 })
  minimalTransfer: number;

  @Prop()
  logoUrl?: string;

  @Prop({ default: 0 })
  sortOrder?: number; // For ordering in select boxes

  @Prop()
  description?: string;
}

export const CoinSchema = SchemaFactory.createForClass(Coin);

// Indexes
CoinSchema.index({ chain: 1, isActive: 1 });
CoinSchema.index({ currencyCode: 1 });
CoinSchema.index({ contractAddress: 1 });
CoinSchema.index({ isNative: 1 });

