import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coin, CoinDocument } from './schemas/coin.schema';

@Injectable()
export class CoinsService {
  private readonly logger = new Logger(CoinsService.name);

  constructor(
    @InjectModel(Coin.name) private coinModel: Model<CoinDocument>,
  ) {}

  /**
   * Get all active coins
   */
  async findAllActive(): Promise<CoinDocument[]> {
    return this.coinModel
      .find({ isActive: true })
      .populate('chain')
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  /**
   * Get coins by chain code
   */
  async findByChainCode(chainCode: string): Promise<CoinDocument[]> {
    return this.coinModel
      .find({ isActive: true })
      .populate({
        path: 'chain',
        match: { code: chainCode },
      })
      .sort({ isNative: -1, sortOrder: 1, name: 1 })
      .exec()
      .then(coins => coins.filter(coin => coin.chain !== null));
  }

  /**
   * Get coins by chain ID
   */
  async findByChainId(chainId: string | Types.ObjectId): Promise<CoinDocument[]> {
    return this.coinModel
      .find({ chain: chainId, isActive: true })
      .populate('chain')
      .sort({ isNative: -1, sortOrder: 1, name: 1 })
      .exec();
  }

  /**
   * Get all coins (including inactive)
   */
  async findAll(): Promise<CoinDocument[]> {
    return this.coinModel.find().populate('chain').sort({ sortOrder: 1, name: 1 }).exec();
  }

  /**
   * Get coin by currency code
   */
  async findByCurrencyCode(currencyCode: string): Promise<CoinDocument | null> {
    return this.coinModel.findOne({ currencyCode }).populate('chain').exec();
  }

  /**
   * Get coin by contract address and chain
   */
  async findByContractAddress(
    contractAddress: string,
    chainId: string | Types.ObjectId,
  ): Promise<CoinDocument | null> {
    return this.coinModel
      .findOne({ contractAddress: contractAddress.toLowerCase(), chain: chainId })
      .populate('chain')
      .exec();
  }

  /**
   * Get coin by ID
   */
  async findById(id: string): Promise<CoinDocument | null> {
    return this.coinModel.findById(id).populate('chain').exec();
  }

  /**
   * Create a new coin
   */
  async create(coinData: Partial<Coin>): Promise<CoinDocument> {
    const coin = new this.coinModel(coinData);
    return coin.save();
  }

  /**
   * Update coin
   */
  async update(id: string, coinData: Partial<Coin>): Promise<CoinDocument> {
    const coin = await this.coinModel.findByIdAndUpdate(id, coinData, { new: true }).exec();
    if (!coin) {
      throw new NotFoundException('Coin not found');
    }
    return coin;
  }

  /**
   * Delete coin
   */
  async delete(id: string): Promise<void> {
    const result = await this.coinModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Coin not found');
    }
  }
}

