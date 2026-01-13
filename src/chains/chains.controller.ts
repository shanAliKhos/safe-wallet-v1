import { Controller, Get, Param, Post, Body, Put, Delete, UseGuards } from '@nestjs/common';
import { ChainsService } from './chains.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  /**
   * Get all active chains (public endpoint)
   * GET /chains
   */
  @Get()
  async getActiveChains() {
    const chains = await this.chainsService.findAllActive();
    return {
      success: true,
      data: chains,
    };
  }

  /**
   * Get all chains including inactive (protected)
   * GET /chains/all
   */
  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllChains() {
    const chains = await this.chainsService.findAll();
    return {
      success: true,
      data: chains,
    };
  }

  /**
   * Get chain by code
   * GET /chains/code/:code
   */
  @Get('code/:code')
  async getChainByCode(@Param('code') code: string) {
    const chain = await this.chainsService.findByCode(code);
    if (!chain) {
      return {
        success: false,
        message: 'Chain not found',
      };
    }
    return {
      success: true,
      data: chain,
    };
  }

  /**
   * Get chain by chainId
   * GET /chains/chain-id/:chainId
   */
  @Get('chain-id/:chainId')
  async getChainByChainId(@Param('chainId') chainId: number) {
    const chain = await this.chainsService.findByChainId(+chainId);
    if (!chain) {
      return {
        success: false,
        message: 'Chain not found',
      };
    }
    return {
      success: true,
      data: chain,
    };
  }

  /**
   * Create chain (protected)
   * POST /chains
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createChain(@Body() chainData: any) {
    const chain = await this.chainsService.create(chainData);
    return {
      success: true,
      data: chain,
    };
  }

  /**
   * Update chain (protected)
   * PUT /chains/:id
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateChain(@Param('id') id: string, @Body() chainData: any) {
    const chain = await this.chainsService.update(id, chainData);
    return {
      success: true,
      data: chain,
    };
  }

  /**
   * Delete chain (protected)
   * DELETE /chains/:id
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteChain(@Param('id') id: string) {
    await this.chainsService.delete(id);
    return {
      success: true,
      message: 'Chain deleted successfully',
    };
  }
}

