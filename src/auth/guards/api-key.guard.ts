import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check for API key in header (X-API-Key or Authorization header)
    const apiKey = 
      (request.headers['x-api-key'] as string) ||
      request.headers['authorization']?.replace('Bearer ', '') ||
      request.headers['authorization']?.replace('ApiKey ', '');

    if (!apiKey) {
      throw new UnauthorizedException('API key is required. Please provide X-API-Key header or Authorization header with ApiKey prefix.');
    }

    // Find user by public or private API key
    const user = await this.usersService.findByApiKey(apiKey);
    
    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Verify vendor wallet exists
    const vendorWallet = await this.usersService.getVendorWallet(user._id.toString());
    if (!vendorWallet) {
      throw new UnauthorizedException('Vendor wallet not found. Please register first.');
    }

    // Attach user info to request
    request.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      apiKey: apiKey,
    };

    return true;
  }
}
