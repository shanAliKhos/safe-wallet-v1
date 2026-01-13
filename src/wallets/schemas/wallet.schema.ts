import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

export enum WalletLevel {
  SITE = 1, // Level 1: Site Safe (master platform wallet)
  VENDOR = 2, // Level 2: Vendor Safe (created on user registration)
  USER = 3, // Level 3: User Safe (created via API)
}

export enum WalletType {
  EVM = 'EVM',
  TRON = 'TRON',
}

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  address: string; // Safe wallet address (same across chains)

  @Prop({ required: true, unique: true, index: true })
  eosAddress: string; // EOA (Externally Owned Account) address for signing

  @Prop({ required: true })
  encryptedPrivateKey: string; // Encrypted private key (NEVER plaintext)

  @Prop()
  mnemonic?: string; // Optional mnemonic (also should be encrypted in production)

  @Prop({ required: true, enum: WalletType })
  type: WalletType;

  @Prop({ required: true, enum: WalletLevel, index: true })
  level: WalletLevel;

  @Prop({ required: true })
  label: string;

  @Prop({ default: 'transfer' })
  purpose: string;

  @Prop({ unique: true, sparse: true, index: true })
  trackingId?: string;

  @Prop()
  callbackUrl?: string;

  // Safe wallet configuration
  @Prop({ type: Object, required: true })
  safeConfig: {
    owners: string[];
    threshold: number;
    safeAccountConfig: any;
    safeDeploymentConfig: any;
    deployments: Record<string, {
      chainId: number;
      safeAddress: string;
      isDeployed: boolean;
      txHash?: string;
      deployedAt?: Date;
    }>;
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deactivatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

// Indexes
WalletSchema.index({ userId: 1, level: 1 });
// Note: trackingId, address, and eosAddress indexes are already defined in @Prop decorators above

