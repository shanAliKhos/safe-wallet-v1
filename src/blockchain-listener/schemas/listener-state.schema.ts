import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ListenerStateDocument = ListenerState & Document;

@Schema({ timestamps: true })
export class ListenerState {
  @Prop({ type: Types.ObjectId, ref: 'Chain', required: true, unique: true, index: true })
  chainId: Types.ObjectId;

  @Prop({ required: true })
  chainCode: string; // 'eth', 'bsc', etc.

  @Prop({ required: true, default: 0 })
  lastProcessedBlock: number;

  @Prop({ required: true, default: 0 })
  lastConfirmedBlock: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isProcessing: boolean;

  @Prop()
  lastError?: string;

  @Prop()
  lastProcessedAt?: Date;

  @Prop({ default: 12 }) // Number of confirmations required
  confirmationsRequired: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ListenerStateSchema = SchemaFactory.createForClass(ListenerState);

// Indexes
ListenerStateSchema.index({ chainCode: 1 });
ListenerStateSchema.index({ isActive: 1, isProcessing: 1 });

