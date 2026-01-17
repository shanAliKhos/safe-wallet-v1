import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { WalletsService } from '../wallets/wallets.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CoinsService } from '../coins/coins.service';
import { SafeWalletService } from '../safe-wallet/safe-wallet.service';
import { CreateWalletDto } from '../wallets/dto/create-wallet.dto';
import { SendDto } from '../safe-wallet/dto/send.dto';
import { MultiSendDto } from '../safe-wallet/dto/multi-send.dto';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';

@Controller('api/v1')
@UseGuards(ApiKeyGuard)
export class VendorApiController {
  constructor(
    private walletsService: WalletsService,
    private transactionsService: TransactionsService,
    private coinsService: CoinsService,
    private safeWalletService: SafeWalletService,
    private configService: ConfigService,
  ) {}

  /**
   * Create Level 3 wallet (User Safe)
   * POST /api/v1/wallets
   */
  @Post('wallets')
  async createWallet(@Request() req, @Body() createWalletDto: CreateWalletDto) {
    const userId = req.user.userId;
    
    // Validate required fields
    if (!createWalletDto.label) {
      throw new BadRequestException('label is required');
    }

    const wallet = await this.walletsService.createUserWallet(userId, createWalletDto);
    
    return {
      success: true,
      data: {
        id: wallet._id.toString(),
        address: wallet.address,
        trackingId: wallet.trackingId,
        label: wallet.label,
        level: wallet.level,
        callbackUrl: wallet.callbackUrl,
        createdAt: wallet.createdAt,
      },
    };
  }

  /**
   * Get all Level 3 wallets for vendor
   * GET /api/v1/wallets
   */
  @Get('wallets')
  async getWallets(@Request() req) {
    const userId = req.user.userId;
    const wallets = await this.walletsService.getUserWallets(userId);
    
    return {
      success: true,
      data: wallets.map((wallet) => ({
        id: wallet._id.toString(),
        address: wallet.address,
        trackingId: wallet.trackingId,
        label: wallet.label,
        level: wallet.level,
        callbackUrl: wallet.callbackUrl,
        createdAt: wallet.createdAt,
      })),
    };
  }

  /**
   * Get wallet by ID or tracking ID
   * GET /api/v1/wallets/:id
   */
  @Get('wallets/:id')
  async getWallet(@Request() req, @Param('id') id: string) {
    const walletId = id;
    const userId = req.user.userId;
    
    // Try to find by ID first, then by tracking ID
    let wallet;
    try {
      wallet = await this.walletsService.getWalletById(id);
      // Verify wallet belongs to user
      if (wallet.userId?.toString() !== userId) {
        throw new BadRequestException('Wallet not found or access denied');
      }
    } catch (error) {
      // Try finding by tracking ID
      const wallets = await this.walletsService.getUserWallets(userId);
      wallet = wallets.find((w) => w.trackingId === id);
      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }
    }
    
    return {
      success: true,
      data: {
        id: wallet._id.toString(),
        address: wallet.address,
        trackingId: wallet.trackingId,
        label: wallet.label,
        level: wallet.level,
        callbackUrl: wallet.callbackUrl,
        createdAt: wallet.createdAt,
      },
    };
  }

  /**
   * Get transactions for vendor
   * GET /api/v1/transactions
   */
  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: string,
    @Query('chain') chain?: string,
    @Query('walletId') walletId?: string,
  ) {
    const userId = req.user.userId;
    
    let transactions;
    if (walletId) {
      // Get transactions for specific wallet
      const wallet = await this.walletsService.getWalletById(walletId);
      if (wallet.userId?.toString() !== userId) {
        throw new BadRequestException('Wallet not found or access denied');
      }
      transactions = await this.transactionsService.getTransactionsByWallet(walletId, {
        limit: limit ? parseInt(limit.toString()) : undefined,
        offset: offset ? parseInt(offset.toString()) : undefined,
        status: status as any,
        chain,
      });
    } else {
      // Get all transactions for vendor
      transactions = await this.transactionsService.getUserTransactions(userId, {
        limit: limit ? parseInt(limit.toString()) : undefined,
        offset: offset ? parseInt(offset.toString()) : undefined,
        status: status as any,
        chain,
      });
    }
    
    return {
      success: true,
      data: transactions.map((tx) => ({
        id: tx._id.toString(),
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        amount: tx.amount,
        tokenAddress: tx.tokenAddress,
        chain: tx.chain,
        mode: tx.mode,
        status: tx.status,
        taskId: tx.taskId,
        taskUrl: tx.taskUrl,
        txHash: tx.txHash,
        recipients: tx.recipients,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      })),
      pagination: {
        limit: limit ? parseInt(limit.toString()) : 50,
        offset: offset ? parseInt(offset.toString()) : 0,
        total: transactions.length,
      },
    };
  }

  /**
   * Get transaction by ID
   * GET /api/v1/transactions/:id
   */
  @Get('transactions/:id')
  async getTransaction(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    const transaction = await this.transactionsService.getTransactionById(id);
    
    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }
    
    // Verify transaction belongs to user
    if (transaction.userId.toString() !== userId) {
      throw new BadRequestException('Transaction not found or access denied');
    }
    
    return {
      success: true,
      data: {
        id: transaction._id.toString(),
        fromAddress: transaction.fromAddress,
        toAddress: transaction.toAddress,
        amount: transaction.amount,
        tokenAddress: transaction.tokenAddress,
        chain: transaction.chain,
        mode: transaction.mode,
        status: transaction.status,
        taskId: transaction.taskId,
        taskUrl: transaction.taskUrl,
        txHash: transaction.txHash,
        recipients: transaction.recipients,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    };
  }

  /**
   * Get coins/tokens
   * GET /api/v1/coins
   */
  @Get('coins')
  async getCoins(@Query('chain') chainCode?: string) {
    let coins;
    if (chainCode) {
      coins = await this.coinsService.findByChainCode(chainCode);
    } else {
      coins = await this.coinsService.findAllActive();
    }
    
    return {
      success: true,
      data: coins.map((coin) => ({
        id: coin._id.toString(),
        name: coin.name,
        symbol: coin.symbol,
        currencyCode: coin.currencyCode,
        chain: coin.chain,
        contractAddress: coin.contractAddress,
        decimals: coin.decimals,
        isNative: coin.isNative,
        price: coin.price,
        minimalTransfer: coin.minimalTransfer,
        logoUrl: coin.logoUrl,
      })),
    };
  }

  /**
   * Get coin by currency code
   * GET /api/v1/coins/:currencyCode
   */
  @Get('coins/:currencyCode')
  async getCoin(@Param('currencyCode') currencyCode: string) {
    const coin = await this.coinsService.findByCurrencyCode(currencyCode);
    
    if (!coin) {
      throw new BadRequestException('Coin not found');
    }
    
    return {
      success: true,
      data: {
        id: coin._id.toString(),
        name: coin.name,
        symbol: coin.symbol,
        currencyCode: coin.currencyCode,
        chain: coin.chain,
        contractAddress: coin.contractAddress,
        decimals: coin.decimals,
        isNative: coin.isNative,
        price: coin.price,
        minimalTransfer: coin.minimalTransfer,
        logoUrl: coin.logoUrl,
      },
    };
  }

  /**
   * Estimate transaction fee
   * POST /api/v1/fees/estimate
   */
  @Post('fees/estimate')
  async estimateFee(
    @Body() body: {
      chain: 'eth' | 'bsc';
      fromAddress: string;
      toAddress: string;
      amount: string;
      tokenAddress?: string;
    },
  ) {
    const { chain, fromAddress, toAddress, amount, tokenAddress } = body;

    if (!chain || !fromAddress || !toAddress || !amount) {
      throw new BadRequestException('chain, fromAddress, toAddress, and amount are required');
    }

    try {
      // Get RPC URL
      const rpcUrl = chain === 'bsc' 
        ? this.configService.get<string>('rpc.bsc')
        : this.configService.get<string>('rpc.eth');

      if (!rpcUrl) {
        throw new BadRequestException(`RPC URL not configured for chain: ${chain}`);
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Estimate gas for the transaction
      const zero = ethers.ZeroAddress.toLowerCase();
      const normalizedToken = tokenAddress?.trim()?.toLowerCase();

      let gasEstimate: bigint;
      let gasPrice: bigint;

      if (!normalizedToken || normalizedToken === zero) {
        // Native token transfer
        const value = ethers.parseUnits(amount, 'ether');
        gasEstimate = await provider.estimateGas({
          from: fromAddress,
          to: toAddress,
          value: value,
        });
      } else {
        // ERC20 token transfer
        const erc20Interface = new ethers.Interface([
          'function transfer(address to, uint256 value) public returns (bool)',
        ]);
        
        // Get token decimals
        const tokenContract = new ethers.Contract(normalizedToken, [
          'function decimals() view returns (uint8)',
        ], provider);
        
        let decimals = 18;
        try {
          decimals = await tokenContract.decimals();
        } catch {
          // Default to 18
        }
        
        const value = ethers.parseUnits(amount, decimals);
        const data = erc20Interface.encodeFunctionData('transfer', [toAddress, value]);
        
        gasEstimate = await provider.estimateGas({
          from: fromAddress,
          to: normalizedToken,
          data: data,
        });
      }

      gasPrice = await provider.getFeeData().then((feeData) => feeData.gasPrice || BigInt(0));

      // Calculate total fee
      const totalFee = gasEstimate * gasPrice;
      const totalFeeFormatted = ethers.formatEther(totalFee);

      return {
        success: true,
        data: {
          chain,
          gasEstimate: gasEstimate.toString(),
          gasPrice: gasPrice.toString(),
          totalFee: totalFee.toString(),
          totalFeeFormatted,
          currency: chain === 'eth' ? 'ETH' : 'BNB',
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to estimate fee: ${error.message}`);
    }
  }

  /**
   * Get vendor wallet info (Level 2)
   * GET /api/v1/vendor/wallet
   */
  @Get('vendor/wallet')
  async getVendorWallet(@Request() req) {
    const userId = req.user.userId;
    const wallet = await this.walletsService.getVendorWallet(userId);
    
    return {
      success: true,
      data: {
        id: wallet._id.toString(),
        address: wallet.address,
        trackingId: wallet.trackingId,
        label: wallet.label,
        level: wallet.level,
        createdAt: wallet.createdAt,
      },
    };
  }

  /**
   * Send transaction (withdrawal) from Level 2 vendor wallet
   * POST /api/v1/withdraw/send
   * Only Level 2 (vendor) wallets can send transactions
   */
  @Post('withdraw/send')
  async send(@Request() req, @Body() sendDto: SendDto) {
    const userId = req.user.userId;
    
    try {
      const result = await this.safeWalletService.send(userId, sendDto);
      
      return {
        success: true,
        data: {
          status: result.status,
          mode: result.mode,
          taskId: result.taskId,
          taskUrl: result.taskUrl,
          fromAddress: result.fromAddress,
          toAddress: result.toAddress,
          amount: result.amount,
          chain: result.chain,
        },
        message: 'Transaction submitted successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Multi-send transaction (withdrawal) from Level 2 vendor wallet
   * POST /api/v1/withdraw/multi-send
   * Only Level 2 (vendor) wallets can send transactions
   */
  @Post('withdraw/multi-send')
  async multiSend(@Request() req, @Body() multiSendDto: MultiSendDto) {
    const userId = req.user.userId;
    
    try {
      const result = await this.safeWalletService.multiSend(userId, multiSendDto);
      
      return {
        success: true,
        data: {
          status: result.status,
          mode: result.mode,
          taskId: result.taskId,
          taskUrl: result.taskUrl,
          fromAddress: result.fromAddress,
          recipients: result.recipients,
          chain: result.chain,
        },
        message: `Successfully sent ${result.recipients} transactions`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to multi-send transaction: ${error.message}`);
    }
  }
}
