import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SafeWalletService } from '../safe-wallet/safe-wallet.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private safeWalletService: SafeWalletService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(user: any) {
    const payload = { 
      sub: user._id?.toString() || user._id, 
      email: user.email, 
      role: user.role || 'user' 
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Register new user and create vendor wallet (Level 2 Safe)
   * Returns user, wallet, and access token (like CP project)
   */
  async register(registerDto: { name: string; email: string; password: string; phone?: string }) {
    // Create user
    const user = await this.usersService.create(registerDto);
    const userId = user._id.toString();

    // Create vendor wallet (Level 2 Safe) for the user
    let vendorWallet: any = null;
    try {
      this.logger.log(`Creating vendor wallet for user: ${userId}`);
      vendorWallet = await this.safeWalletService.createVendorSafe(userId);
      if (vendorWallet) {
        this.logger.log(`Vendor wallet created: ${vendorWallet.address}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create vendor wallet for user ${userId}:`, error);
      // Don't fail registration if wallet creation fails, but log it
      // In production, you might want to queue this for retry
    }

    // Generate JWT token
    const payload = { 
      sub: user._id.toString(), 
      email: user.email, 
      role: user.role || 'user' 
    };
    const access_token = this.jwtService.sign(payload);

    // Return response in CP project format
    const { password: _, ...userResult } = user.toObject();
    
    return {
      message: 'Registration successful',
      access_token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        public_api_key: user.publicApiKey,
        private_api_key: user.privateApiKey,
        lastSignedIn: user.lastSignedIn,
        created_at: (user as any).createdAt ? new Date((user as any).createdAt).toISOString().slice(0, 10) : null,
      },
      wallet: vendorWallet ? {
        id: vendorWallet._id.toString(),
        label: vendorWallet.label,
        tracking_id: vendorWallet.trackingId,
        callback_url: vendorWallet.callbackUrl,
        address: vendorWallet.address,
        type: vendorWallet.type,
        level: vendorWallet.level,
        created_at: vendorWallet.createdAt ? new Date(vendorWallet.createdAt).toISOString().slice(0, 10) : null,
      } : null,
    };
  }
}

