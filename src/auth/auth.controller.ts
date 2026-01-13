import { Controller, Request, Post, Get, UseGuards, Body, Res, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { IfAuthenticatedGuard } from './guards/if-authenticated.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('login')
  @UseGuards(IfAuthenticatedGuard)
  showLoginPage(@Request() req, @Res() res: Response) {
    return res.render('auth/login', {
      title: 'Login',
      currentRoute: req.url,
      appName: 'Safe Wallet',
      layout: false, // Don't use default layout for auth pages
    });
  }

  @Get('register')
  @UseGuards(IfAuthenticatedGuard)
  showRegisterPage(@Request() req, @Res() res: Response) {
    return res.render('auth/register', {
      title: 'Register',
      currentRoute: req.url,
      appName: 'Safe Wallet',
      layout: false, // Don't use default layout for auth pages
    });
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Res() res: Response, @Body() loginDto: LoginDto) {
    try {
      const tokenResponse = await this.authService.login(req.user);
      
      // Set JWT in cookie
      res.cookie('jwt', tokenResponse.access_token, { 
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      });
      
      // Check if AJAX request
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        return res.json({ 
          success: true, 
          message: 'Login successful',
          redirect: '/dashboard' // Redirect to dashboard
        });
      }
      
      // Redirect to dashboard
      return res.redirect('/dashboard');
    } catch (error) {
      // Check if AJAX request
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        const errors = {};
        if (error instanceof BadRequestException) {
          const response = error.getResponse();
          if (typeof response === 'object' && response !== null) {
            const errorResponse = response as any;
            if (Array.isArray(errorResponse.message)) {
              errorResponse.message.forEach((msg: string) => {
                const fieldMatch = msg.match(/(\w+)\s/);
                if (fieldMatch) {
                  const field = fieldMatch[1].toLowerCase();
                  errors[field] = msg;
                } else {
                  errors['general'] = msg;
                }
              });
            } else if (errorResponse.message) {
              errors['general'] = errorResponse.message;
            }
          }
        } else if (error instanceof UnauthorizedException) {
          errors['email'] = 'Invalid email or password';
          errors['password'] = 'Invalid email or password';
        } else {
          errors['general'] = error.message || 'Login failed';
        }
        
        return res.status(400).json({ 
          success: false, 
          message: error.message || 'Login failed',
          errors: errors
        });
      }
      
      return res.render('auth/login', {
        title: 'Login',
        error: error.message || 'Login failed',
        layout: false, // Don't use default layout for auth pages
      });
    }
  }

  @Post('register')
  async register(@Request() req, @Res() res: Response, @Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
      
      // Set JWT in cookie
      res.cookie('jwt', result.access_token, { 
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      });
      
      // Check if AJAX request
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        return res.json({ 
          success: true, 
          message: 'Registration successful',
          redirect: '/dashboard' // Redirect to dashboard
        });
      }
      
      // Redirect to dashboard
      return res.redirect('/dashboard');
    } catch (error) {
      // Check if AJAX request
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        const errors = {};
        if (error instanceof BadRequestException) {
          const response = error.getResponse();
          if (typeof response === 'object' && response !== null) {
            const errorResponse = response as any;
            if (Array.isArray(errorResponse.message)) {
              errorResponse.message.forEach((msg: string) => {
                const fieldMatch = msg.match(/(\w+)\s/);
                if (fieldMatch) {
                  const field = fieldMatch[1].toLowerCase();
                  errors[field] = msg;
                } else {
                  errors['general'] = msg;
                }
              });
            } else if (errorResponse.message) {
              errors['general'] = errorResponse.message;
            }
          }
        } else {
          errors['general'] = error.message || 'Registration failed';
        }
        
        return res.status(400).json({ 
          success: false, 
          message: error.message || 'Registration failed',
          errors: errors
        });
      }
      
      return res.render('auth/register', {
        title: 'Register',
        error: error.message || 'Registration failed',
        layout: false, // Don't use default layout for auth pages
      });
    }
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('jwt');
    return res.redirect('/auth/login');
  }
}

