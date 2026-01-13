import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Custom JWT extractor that checks cookies first, then Authorization header
 */
const cookieExtractor = (req: Request): string | null => {
  // First check cookies
  if (req && req.cookies && req.cookies.jwt) {
    return req.cookies.jwt;
  }
  // Fallback to Authorization header
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class JwtCookieStrategy extends PassportStrategy(Strategy, 'jwt-cookie') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    return { 
      userId: payload.sub, 
      sub: payload.sub,
      email: payload.email,
      role: payload.role || 'user'
    };
  }
}

