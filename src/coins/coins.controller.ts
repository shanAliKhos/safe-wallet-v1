import { Controller, Get, Param, Post, Body, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { CoinsService } from './coins.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('coins')
export class CoinsController {
  constructor(private readonly coinsService: CoinsService) {}

  /**
   * Get all active coins (public endpoint)
   * GET /coins
   */
  @Get()
  async getActiveCoins(@Query('chain') chainCode?: string) {
    let coins;
    if (chainCode) {
      coins = await this.coinsService.findByChainCode(chainCode);
    } else {
      coins = await this.coinsService.findAllActive();
    }
    return {
      success: true,
      data: coins,
    };
  }

  /**
   * Get coins by chain code
   * GET /coins/chain/:chainCode
   */
  @Get('chain/:chainCode')
  async getCoinsByChain(@Param('chainCode') chainCode: string) {
    const coins = await this.coinsService.findByChainCode(chainCode);
    return {
      success: true,
      data: coins,
    };
  }

  /**
   * Get all coins including inactive (protected)
   * GET /coins/all
   */
  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllCoins() {
    const coins = await this.coinsService.findAll();
    return {
      success: true,
      data: coins,
    };
  }

  /**
   * Get coin by currency code
   * GET /coins/currency/:currencyCode
   */
  @Get('currency/:currencyCode')
  async getCoinByCurrencyCode(@Param('currencyCode') currencyCode: string) {
    const coin = await this.coinsService.findByCurrencyCode(currencyCode);
    if (!coin) {
      return {
        success: false,
        message: 'Coin not found',
      };
    }
    return {
      success: true,
      data: coin,
    };
  }

  /**
   * Create coin (protected)
   * POST /coins
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createCoin(@Body() coinData: any) {
    const coin = await this.coinsService.create(coinData);
    return {
      success: true,
      data: coin,
    };
  }

  /**
   * Update coin (protected)
   * PUT /coins/:id
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateCoin(@Param('id') id: string, @Body() coinData: any) {
    const coin = await this.coinsService.update(id, coinData);
    return {
      success: true,
      data: coin,
    };
  }

  /**
   * Delete coin (protected)
   * DELETE /coins/:id
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCoin(@Param('id') id: string) {
    await this.coinsService.delete(id);
    return {
      success: true,
      message: 'Coin deleted successfully',
    };
  }
}

