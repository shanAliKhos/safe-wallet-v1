import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Cookie Guard - Uses JWT from cookies instead of Authorization header
 * This is useful for web applications that store JWT in httpOnly cookies
 */
@Injectable()
export class JwtCookieGuard extends AuthGuard('jwt-cookie') {}

