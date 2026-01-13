import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SafeWalletService } from '../safe-wallet/safe-wallet.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let safeWalletService: SafeWalletService;

  const mockUsersService = {
    validateUser: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockSafeWalletService = {
    createVendorSafe: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SafeWalletService,
          useValue: mockSafeWalletService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    safeWalletService = module.get<SafeWalletService>(SafeWalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
      };

      mockUsersService.validateUser.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBe(mockUser);
      expect(mockUsersService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password',
      );
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      mockUsersService.validateUser.mockResolvedValue(null);

      await expect(
        service.validateUser('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token for valid user', () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        role: 'user',
      };

      const mockToken = 'mock-jwt-token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = service.login(mockUser);

      expect(result).toEqual({
        access_token: mockToken,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'test@example.com',
        role: 'user',
      });
    });

    it('should handle user without role', () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
      };

      const mockToken = 'mock-jwt-token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = service.login(mockUser);

      expect(result).toEqual({
        access_token: mockToken,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        email: 'test@example.com',
        role: 'user',
      });
    });
  });

  describe('register', () => {
    it('should register user and create vendor wallet', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        _id: { toString: () => 'user-id' },
        name: 'Test User',
        email: 'test@example.com',
        publicApiKey: 'public-key',
        privateApiKey: 'private-key',
        lastSignedIn: null,
        toObject: () => ({
          _id: 'user-id',
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed',
        }),
        createdAt: new Date(),
      };

      const mockWallet = {
        _id: { toString: () => 'wallet-id' },
        label: 'vendor-user-id-safe',
        trackingId: 'vendor-user-id-safe',
        callbackUrl: null,
        address: '0x123',
        type: 'EVM',
        level: 'VENDOR',
        createdAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(mockUser);
      mockSafeWalletService.createVendorSafe.mockResolvedValue(mockWallet);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('wallet');
      expect(result.user.email).toBe('test@example.com');
      expect(result.wallet.address).toBe('0x123');
      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
      expect(mockSafeWalletService.createVendorSafe).toHaveBeenCalledWith('user-id');
    });

    it('should register user even if wallet creation fails', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        _id: { toString: () => 'user-id' },
        name: 'Test User',
        email: 'test@example.com',
        publicApiKey: 'public-key',
        privateApiKey: 'private-key',
        lastSignedIn: null,
        toObject: () => ({
          _id: 'user-id',
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed',
        }),
        createdAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(mockUser);
      mockSafeWalletService.createVendorSafe.mockRejectedValue(
        new Error('Wallet creation failed'),
      );
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.wallet).toBeNull();
      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
    });
  });
});



