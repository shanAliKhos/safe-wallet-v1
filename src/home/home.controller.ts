import { Controller, Get, Render, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WalletsService } from '../wallets/wallets.service';
import { UsersService } from '../users/users.service';

@Controller()
export class HomeController {
  constructor(
    private walletsService: WalletsService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Get()
  @Render('home/index')
  async index(@Request() req) {
    // Check if user is authenticated via JWT cookie
    const token = req.cookies?.jwt;
    let user: any = null;

    if (token) {
      try {
        // Verify and decode JWT
        const secret = this.configService.get<string>('jwt.secret') || 'your-secret-key-change-in-production';
        const decoded = this.jwtService.verify(token, { secret });
        
        if (decoded) {
          // Get user from database
          const userDoc = await this.usersService.findById(decoded.sub);
          
          if (userDoc) {
            user = {
              id: userDoc._id.toString(),
              email: userDoc.email,
              name: userDoc.name,
              role: userDoc.role || 'user',
            };
          }
        }
      } catch (error) {
        // Invalid token, ignore
        console.error('JWT verification failed:', error);
      }
    }

    return {
      title: 'Welcome',
      currentRoute: req.url,
      app_name: 'Safe Wallet',
      user,
      showLayout: false, // Don't show sidebar/header on welcome page
    };
  }

  @Get('dashboard')
  @Render('home/dashboard')
  async dashboard(@Request() req, @Res() res: Response) {
    // Check if user is authenticated via JWT cookie
    const token = req.cookies?.jwt;
    let user: any = null;
    let wallet: any = null;
    let wallets: any[] = [];
    let stats: any = {
      totalWallets: 0,
      totalBalance: '0',
      recentTransactions: 0,
    };

    if (token) {
      try {
        // Verify and decode JWT
        const secret = this.configService.get<string>('jwt.secret') || 'your-secret-key-change-in-production';
        const decoded = this.jwtService.verify(token, { secret });
        
        if (decoded) {
          // Get user from database
          const userDoc = await this.usersService.findById(decoded.sub);
          
          if (userDoc) {
            user = {
              id: userDoc._id.toString(),
              email: userDoc.email,
              name: userDoc.name,
              role: userDoc.role || 'user',
              created_at: (userDoc as any).createdAt ? new Date((userDoc as any).createdAt).toISOString().slice(0, 10) : null,
            };

            // Get vendor wallet (Level 2)
            try {
              const vendorWallet = await this.walletsService.getVendorWallet(decoded.sub);
              wallet = {
                address: vendorWallet.address,
                tracking_id: vendorWallet.trackingId,
                level: vendorWallet.level,
                type: vendorWallet.type,
                created_at: vendorWallet.createdAt ? new Date(vendorWallet.createdAt).toISOString().slice(0, 10) : null,
              };
            } catch (error) {
              // Wallet not found, that's okay
            }

            // Get all user wallets (Level 3)
            try {
              const userWallets = await this.walletsService.getUserWallets(decoded.sub);
              wallets = userWallets.map((w, index) => ({
                index: index + 1,
                address: w.address,
                type: w.type,
                level: w.level,
                label: w.label,
                purpose: w.purpose,
                created_at: w.createdAt ? new Date(w.createdAt).toISOString().slice(0, 10) : null,
              }));
              stats.totalWallets = wallets.length;
            } catch (error) {
              // No wallets found, that's okay
            }
          }
        }
      } catch (error) {
        // Invalid token, redirect to login
        console.error('JWT verification failed:', error);
      }
    }

    // If not authenticated, redirect to login
    if (!user) {
      return res.redirect('/auth/login');
    }

    return {
      title: 'Dashboard',
      currentRoute: req.url,
      app_name: 'Safe Wallet',
      user,
      wallet,
      wallets,
      stats,
      showLayout: true, // Show sidebar/header on dashboard
    };
  }
}
