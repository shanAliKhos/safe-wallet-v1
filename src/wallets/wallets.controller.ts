import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  Render,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SendDto } from '../safe-wallet/dto/send.dto';
import { MultiSendDto } from '../safe-wallet/dto/multi-send.dto';
import { SafeWalletService } from '../safe-wallet/safe-wallet.service';
import { TransactionsService } from '../transactions/transactions.service';
import { ChainsService } from '../chains/chains.service';
import { CoinsService } from '../coins/coins.service';

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly safeWalletService: SafeWalletService,
    private readonly transactionsService: TransactionsService,
    private readonly chainsService: ChainsService,
    private readonly coinsService: CoinsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  /**
   * Create Level 3 wallet (User Safe)
   * POST /wallets
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createWallet(@Request() req, @Body() createWalletDto: CreateWalletDto) {
    const userId = req.user.userId || req.user.sub;
    return this.walletsService.createUserWallet(userId, createWalletDto);
  }

  /**
   * Create vendor wallet (Level 2)
   * POST /wallets/vendor/create
   */
  @UseGuards(JwtCookieGuard)
  @Post('vendor/create')
  async createVendorWallet(@Request() req, @Res() res: Response) {
    try {
      const userId = req.user.userId || req.user.sub;
      
      // Check if vendor wallet already exists
      try {
        const existingWallet = await this.walletsService.getVendorWallet(userId);
        if (existingWallet) {
          // Check if AJAX request
          if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
            return res.status(400).json({
              success: false,
              message: 'Vendor wallet already exists',
            });
          }
          return res.redirect('/wallets');
        }
      } catch (error) {
        // Wallet doesn't exist, proceed to create
      }

      // Create vendor wallet using SafeWalletService
      const safeWalletService = (this.walletsService as any).safeWalletService;
      const newVendorWallet = await safeWalletService.createVendorSafe(userId);

      // Check if AJAX request
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          message: 'Vendor wallet created successfully',
          wallet: {
            address: newVendorWallet.address,
            tracking_id: newVendorWallet.trackingId,
            level: newVendorWallet.level,
            type: newVendorWallet.type,
          },
          redirect: '/wallets',
        });
      }

      return res.redirect('/wallets');
    } catch (error) {
      // Check if AJAX request
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to create vendor wallet',
        });
      }
      throw error;
    }
  }

  /**
   * Send transaction from Level 2 wallet
   * POST /wallets/send
   * Only Level 2 (vendor) wallets can send transactions
   */
  @UseGuards(JwtCookieGuard)
  @Post('send')
  async send(@Request() req, @Body() sendDto: SendDto) {
    const userId = req.user.userId || req.user.sub;
    return this.safeWalletService.send(userId, sendDto);
  }

  /**
   * Multi-send transaction from Level 2 wallet
   * POST /wallets/multi-send
   * Only Level 2 (vendor) wallets can send transactions
   */
  @UseGuards(JwtCookieGuard)
  @Post('multi-send')
  async multiSend(@Request() req, @Body() multiSendDto: MultiSendDto) {
    const userId = req.user.userId || req.user.sub;
    return this.safeWalletService.multiSend(userId, multiSendDto);
  }

  /**
   * Get vendor wallet API (Level 2)
   * GET /wallets/vendor
   */
  @UseGuards(JwtCookieGuard)
  @Get('vendor')
  async getVendorWallet(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    return this.walletsService.getVendorWallet(userId);
  }

  /**
   * Wallets page view
   * GET /wallets
   */
  @Get()
  @Render('wallets/index')
  async walletsPage(@Request() req, @Res() res: Response) {
    const token = req.cookies?.jwt;
    let user: any = null;
    let vendorWallet: any = null;
    let userWallets: any[] = [];

    if (!token) {
      return res.redirect('/auth/login');
    }

    try {
      const secret = this.configService.get<string>('jwt.secret') || 'your-secret-key-change-in-production';
      const decoded = this.jwtService.verify(token, { secret });
      
      if (decoded) {
        const userDoc = await this.usersService.findById(decoded.sub);
        
        if (userDoc) {
          user = {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name,
            role: userDoc.role || 'user',
          };

          // Get vendor wallet
          try {
            const vendor = await this.walletsService.getVendorWallet(decoded.sub);
            const deployments = vendor.safeConfig?.deployments || {};
            vendorWallet = {
              id: vendor._id.toString(),
              address: vendor.address,
              tracking_id: vendor.trackingId,
              level: vendor.level,
              type: vendor.type,
              created_at: vendor.createdAt ? new Date(vendor.createdAt).toISOString().slice(0, 10) : null,
              deployments: {
                eth: deployments.eth || { isDeployed: false },
                bsc: deployments.bsc || { isDeployed: false },
              },
            };
          } catch (error) {
            // No vendor wallet
          }

          // Get user wallets
          try {
            const wallets = await this.walletsService.getUserWallets(decoded.sub);
            userWallets = wallets.map((w, index) => {
              const deployments = w.safeConfig?.deployments || {};
              return {
                index: index + 1,
                id: w._id.toString(),
                address: w.address,
                type: w.type,
                level: w.level,
                label: w.label,
                purpose: w.purpose,
                created_at: w.createdAt ? new Date(w.createdAt).toISOString().slice(0, 10) : null,
                deployments: {
                  eth: deployments.eth || { isDeployed: false },
                  bsc: deployments.bsc || { isDeployed: false },
                },
              };
            });
          } catch (error) {
            // No wallets
          }

          // Get user transactions
          try {
            const transactions = await this.transactionsService.getUserTransactions(decoded.sub, { limit: 20 });
            // Transform transactions for view
            var userTransactions = transactions.map((t: any) => ({
              id: t._id.toString(),
              fromAddress: t.fromAddress,
              toAddress: t.toAddress,
              amount: t.amount,
              tokenAddress: t.tokenAddress,
              chain: t.chain,
              mode: t.mode,
              status: t.status,
              taskId: t.taskId,
              taskUrl: t.taskUrl,
              recipients: t.recipients,
              created_at: t.createdAt ? new Date(t.createdAt).toISOString().replace('T', ' ').slice(0, 19) : null,
            }));
          } catch (error) {
            var userTransactions = [];
          }
        }
      }
    } catch (error) {
      return res.redirect('/auth/login');
    }

    if (!user) {
      return res.redirect('/auth/login');
    }

    // Get chains and coins for forms
    let chains: any[] = [];
    let coins: any[] = [];
    try {
      chains = await this.chainsService.findAllActive();
      coins = await this.coinsService.findAllActive();
    } catch (error) {
      // If chains/coins not seeded yet, use defaults
      chains = [
        { code: 'eth', name: 'Ethereum', chainId: 1 },
        { code: 'bsc', name: 'Binance Smart Chain', chainId: 56 },
      ];
    }

    return {
      title: 'Wallets',
      currentRoute: req.url,
      app_name: 'Safe Wallet',
      user,
      vendorWallet,
      wallets: userWallets,
      transactions: userTransactions || [],
      chains: chains.map(c => ({
        code: c.code,
        name: c.name,
        chainId: c.chainId,
        nativeSymbol: c.nativeSymbol,
      })),
      coins: coins.map(c => ({
        id: c._id?.toString() || c.id,
        name: c.name,
        symbol: c.symbol,
        currencyCode: c.currencyCode,
        contractAddress: c.contractAddress,
        decimals: c.decimals,
        isNative: c.isNative,
        chain: typeof c.chain === 'object' ? {
          code: c.chain.code,
          name: c.chain.name,
        } : null,
      })),
      showLayout: true,
    };
  }

  /**
   * Get all user wallets API (Level 3)
   * GET /wallets/api
   */
  @UseGuards(JwtCookieGuard)
  @Get('api')
  async getUserWallets(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    return this.walletsService.getUserWallets(userId);
  }

  /**
   * Transactions page view
   * GET /wallets/transactions
   * Must be before @Get(':id') to avoid route conflicts
   */
  @UseGuards(JwtCookieGuard)
  @Get('transactions')
  @Render('wallets/transactions')
  async transactionsPage(@Request() req, @Res() res: Response) {
    const token = req.cookies?.jwt;
    let user: any = null;
    let transactions: any[] = [];

    if (!token) {
      return res.redirect('/auth/login');
    }

    try {
      const secret = this.configService.get<string>('jwt.secret') || 'your-secret-key-change-in-production';
      const decoded = this.jwtService.verify(token, { secret });
      
      if (decoded) {
        const userDoc = await this.usersService.findById(decoded.sub);
        
        if (userDoc) {
          user = {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name,
            role: userDoc.role || 'user',
          };

          // Get user transactions
          try {
            const txns = await this.transactionsService.getUserTransactions(decoded.sub, { limit: 50 });
            transactions = txns.map((t: any) => ({
              id: t._id.toString(),
              fromAddress: t.fromAddress,
              toAddress: t.toAddress,
              amount: t.amount,
              tokenAddress: t.tokenAddress,
              chain: t.chain,
              mode: t.mode,
              status: t.status,
              taskId: t.taskId,
              taskUrl: t.taskUrl,
              recipients: t.recipients,
              created_at: t.createdAt ? new Date(t.createdAt).toISOString().replace('T', ' ').slice(0, 19) : null,
            }));
          } catch (error) {
            // No transactions
          }
        }
      }
    } catch (error) {
      return res.redirect('/auth/login');
    }

    if (!user) {
      return res.redirect('/auth/login');
    }

    return {
      title: 'Transactions',
      currentRoute: req.url,
      app_name: 'Safe Wallet',
      user,
      transactions: transactions || [],
      showLayout: true,
    };
  }

  /**
   * Get user transactions API
   * GET /wallets/transactions/api
   * Must be before @Get(':id') to avoid route conflicts
   */
  @UseGuards(JwtCookieGuard)
  @Get('transactions/api')
  async getUserTransactions(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: string,
    @Query('chain') chain?: string,
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.transactionsService.getUserTransactions(userId, {
      limit: limit ? parseInt(limit.toString()) : undefined,
      offset: offset ? parseInt(offset.toString()) : undefined,
      status: status as any,
      chain,
    });
  }

  /**
   * Get wallet by ID
   * GET /wallets/:id
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getWallet(@Param('id') id: string) {
    return this.walletsService.getWalletById(id);
  }

  /**
   * Get wallet balance
   * GET /wallets/:id/balance
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/balance')
  async getBalance(
    @Param('id') id: string,
    @Query('currency') currency: string,
    @Query('chainId', ParseIntPipe) chainId: number,
    @Query('tokenAddress') tokenAddress?: string,
  ) {
    return this.walletsService.getWalletBalance(id, currency, chainId, tokenAddress || '0x0');
  }

  /**
   * Get all balances for a wallet
   * GET /wallets/:id/balances
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/balances')
  async getBalances(
    @Param('id') id: string,
    @Query('chainId', ParseIntPipe) chainId: number,
  ) {
    return this.walletsService.getWalletBalances(id, chainId);
  }

  /**
   * Get wallet ledger history
   * GET /wallets/:id/ledger
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/ledger')
  async getLedgerHistory(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('currency') currency?: string,
    @Query('chainId') chainId?: number,
  ) {
    return this.walletsService.getWalletLedgerHistory(id, {
      limit: limit ? parseInt(limit.toString()) : undefined,
      offset: offset ? parseInt(offset.toString()) : undefined,
      currency,
      chainId: chainId ? parseInt(chainId.toString()) : undefined,
    });
  }

  /**
   * Deploy wallet on chain
   * POST /wallets/:id/deploy/:chain
   */
  @UseGuards(JwtCookieGuard)
  @Post(':id/deploy/:chain')
  async deployWallet(
    @Param('id') id: string,
    @Param('chain') chain: 'eth' | 'bsc',
    @Request() req,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.userId || req.user.sub;
      
      // Verify wallet belongs to user
      const wallet = await this.walletsService.getWalletById(id);
      if (wallet.userId?.toString() !== userId) {
        throw new BadRequestException('Wallet does not belong to user');
      }

      // Validate chain
      if (chain !== 'eth' && chain !== 'bsc') {
        throw new BadRequestException('Invalid chain. Must be "eth" or "bsc"');
      }

      const result = await this.safeWalletService.deployWalletOnChain(id, chain);
      
      // Check if AJAX request
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          ...result,
        });
      }
      
      return res.json(result);
    } catch (error: any) {
      // Extract error response if it's a BadRequestException
      let errorResponse: any = {};
      if (error instanceof BadRequestException) {
        const response = error.getResponse();
        errorResponse = typeof response === 'object' && response !== null ? response : { message: response };
      } else {
        errorResponse = {
          message: error?.message || 'Failed to deploy wallet',
          error: error?.name || 'DEPLOYMENT_ERROR',
        };
      }
      
      // Handle insufficient funds error
      if (errorResponse?.error === 'INSUFFICIENT_FUNDS') {
        const errorDetails = errorResponse?.details || {};
        const errorMessage = errorResponse?.message || 'Insufficient funds';
        
        // Check if AJAX request
        if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
          return res.status(400).json({
            success: false,
            error: 'INSUFFICIENT_FUNDS',
            message: errorMessage,
            details: errorDetails,
          });
        }
        
        // For regular requests, return error response
        return res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_FUNDS',
          message: errorMessage,
          details: errorDetails,
        });
      }
      
      // Handle other errors
      const errorMessage = errorResponse?.message || 'Failed to deploy wallet';
      
      // Check if AJAX request
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          error: errorResponse?.error || 'DEPLOYMENT_ERROR',
        });
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: errorResponse?.error || 'DEPLOYMENT_ERROR',
      });
    }
  }
}

