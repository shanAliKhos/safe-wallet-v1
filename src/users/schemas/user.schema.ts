import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as crypto from 'crypto';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phone?: string;

  @Prop({ default: 'user' })
  role?: string;

  @Prop({ default: Date.now })
  lastSignedIn: Date;

  @Prop({ unique: true, sparse: true })
  publicApiKey?: string;

  @Prop({ unique: true, sparse: true })
  privateApiKey?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Pre-save hook to generate API keys
UserSchema.pre('save', async function () {
  if (!this.publicApiKey) {
    this.publicApiKey = 'pub_' + crypto.randomBytes(16).toString('hex');
  }
  if (!this.privateApiKey) {
    this.privateApiKey = 'priv_' + crypto.randomBytes(32).toString('hex');
  }
});

