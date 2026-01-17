import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Wallet, WalletDocument } from '../wallets/schemas/wallet.schema';
import { WalletLevel } from '../wallets/schemas/wallet.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
  ) {}

  async create(registerDto: { name: string; email: string; password: string; phone?: string }): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const createdUser = new this.userModel({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      phone: registerDto.phone,
      role: 'user',
    });
    return createdUser.save();
  }

  async findOne(email: string): Promise<UserDocument | undefined> {
    const user = await this.userModel.findOne({ email }).exec();
    return user || undefined;
  }

  async findById(id: string): Promise<UserDocument | undefined> {
    const user = await this.userModel.findById(id).exec();
    return user || undefined;
  }

  async findByApiKey(apiKey: string): Promise<UserDocument | undefined> {
    const user = await this.userModel.findOne({
      $or: [
        { publicApiKey: apiKey },
        { privateApiKey: apiKey },
      ],
    }).exec();
    return user || undefined;
  }

  async getVendorWallet(userId: string): Promise<WalletDocument | null> {
    return this.walletModel.findOne({
      userId: userId,
      level: WalletLevel.VENDOR,
    }).exec();
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.findOne(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      // Update last signed in
      user.lastSignedIn = new Date();
      await user.save();
      
      const { password: _, ...result } = user.toObject();
      return result;
    }
    return null;
  }
}

