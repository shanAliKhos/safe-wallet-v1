import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument, WalletLevel } from './schemas/wallet.schema';
import { SafeWalletService } from '../safe-wallet/safe-wallet.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    private safeWalletService: SafeWalletService,
    private ledgerService: LedgerService,
  ) {}

  /**
   * Create Level 3 wallet (User Safe) via API
   */
  async createUserWallet(userId: string, dto: CreateWalletDto): Promise<WalletDocument> {
    return this.safeWalletService.createUserSafe(userId, dto);
  }

  /**
   * Get wallet by ID
   */
  async getWalletById(walletId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findById(walletId).exec();
    if (!wallet) {
      throw new NotFoundException(`Wallet not found: ${walletId}`);
    }
    return wallet;
  }

  /**
   * Get wallet by address
   */
  async getWalletByAddress(address: string): Promise<WalletDocument | null> {
    return this.safeWalletService.getWalletByAddress(address);
  }

  /**
   * Get vendor wallet for user
   */
  async getVendorWallet(userId: string): Promise<WalletDocument> {
    const wallet = await this.safeWalletService.getVendorWallet(userId);
    if (!wallet) {
      throw new NotFoundException(`Vendor wallet not found for user: ${userId}`);
    }
    return wallet;
  }

  /**
   * Get all user wallets (Level 3)
   */
  async getUserWallets(userId: string): Promise<WalletDocument[]> {
    return this.safeWalletService.getUserWallets(userId);
  }

  /**
   * Get wallet balance from ledger
   */
  async getWalletBalance(
    walletId: string,
    currency: string,
    chainId: number,
    tokenAddress: string = '0x0',
  ): Promise<string> {
    const wallet = await this.getWalletById(walletId);
    return this.ledgerService.getBalance(
      wallet._id,
      currency,
      chainId,
      tokenAddress,
    );
  }

  /**
   * Get all balances for a wallet
   */
  async getWalletBalances(walletId: string, chainId: number): Promise<Record<string, Record<string, string>>> {
    const wallet = await this.getWalletById(walletId);
    return this.ledgerService.getBalances(wallet._id, chainId);
  }

  /**
   * Get wallet ledger history
   */
  async getWalletLedgerHistory(
    walletId: string,
    options: {
      limit?: number;
      offset?: number;
      currency?: string;
      chainId?: number;
    } = {},
  ) {
    const wallet = await this.getWalletById(walletId);
    return this.ledgerService.getLedgerHistory(wallet._id, options);
  }
}

