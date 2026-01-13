import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chain, ChainDocument } from './schemas/chain.schema';

@Injectable()
export class ChainsService {
  private readonly logger = new Logger(ChainsService.name);

  constructor(
    @InjectModel(Chain.name) private chainModel: Model<ChainDocument>,
  ) {}

  /**
   * Get all active chains
   */
  async findAllActive(): Promise<ChainDocument[]> {
    return this.chainModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  /**
   * Get all chains (including inactive)
   */
  async findAll(): Promise<ChainDocument[]> {
    return this.chainModel.find().sort({ sortOrder: 1, name: 1 }).exec();
  }

  /**
   * Get chain by code
   */
  async findByCode(code: string): Promise<ChainDocument | null> {
    return this.chainModel.findOne({ code }).exec();
  }

  /**
   * Get chain by chainId
   */
  async findByChainId(chainId: number): Promise<ChainDocument | null> {
    return this.chainModel.findOne({ chainId }).exec();
  }

  /**
   * Get chain by ID
   */
  async findById(id: string): Promise<ChainDocument | null> {
    return this.chainModel.findById(id).exec();
  }

  /**
   * Create a new chain
   */
  async create(chainData: Partial<Chain>): Promise<ChainDocument> {
    const chain = new this.chainModel(chainData);
    return chain.save();
  }

  /**
   * Update chain
   */
  async update(id: string, chainData: Partial<Chain>): Promise<ChainDocument> {
    const chain = await this.chainModel.findByIdAndUpdate(id, chainData, { new: true }).exec();
    if (!chain) {
      throw new NotFoundException('Chain not found');
    }
    return chain;
  }

  /**
   * Delete chain
   */
  async delete(id: string): Promise<void> {
    const result = await this.chainModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Chain not found');
    }
  }
}

