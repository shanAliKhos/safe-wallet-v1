import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * IfAuthenticated Guard - Similar to Laravel's ifAuthenticated middleware
 * Redirects authenticated users away from auth pages (login/register)
 * 
 * This is the NestJS way of handling "guest-only" routes.
 * Guards are the standard mechanism for authentication/authorization in NestJS.
 */
@Injectable()
export class IfAuthenticatedGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get JWT token from cookies
    const token = request.cookies?.jwt;

    if (!token) {
      // No token, user is not authenticated - allow access to auth pages
      return true;
    }

    try {
      // Verify JWT token
      const secret = this.configService.get<string>('jwt.secret') || 'your-secret-key-change-in-production';
      const decoded = this.jwtService.verify(token, { secret });

      if (decoded) {
        // User is authenticated - redirect to dashboard
        // In NestJS, it's acceptable to access response directly in guards for redirects
        // Check if it's an AJAX request
        if (request.headers['x-requested-with'] === 'XMLHttpRequest' || 
            request.headers.accept?.includes('application/json')) {
          response.status(200).json({
            redirect: '/dashboard',
            message: 'You are already logged in',
          });
          return false;
        }

        // Regular request - redirect to dashboard
        response.redirect('/dashboard');
        return false;
      }
    } catch (error) {
      // Invalid/expired token - allow access to auth pages
      return true;
    }

    // Default: allow access
    return true;
  }
}
