import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SafeWalletService } from './safe-wallet.service';
import { KeyManagementService } from '../key-management/key-management.service';
import { Wallet, WalletDocument, WalletLevel } from '../wallets/schemas/wallet.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SafeWalletService', () => {
  let service: SafeWalletService;
  let walletModel: Model<WalletDocument>;
  let keyManagementService: KeyManagementService;
  let configService: ConfigService;

  const mockWalletModel = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({}),
  })) as any;
  
  mockWalletModel.findOne = jest.fn();
  mockWalletModel.find = jest.fn();
  mockWalletModel.create = jest.fn();

  const mockKeyManagementService = {
    generateEncryptedKey: jest.fn(),
    decryptPrivateKey: jest.fn(),
    encryptPrivateKey: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'rpc.eth') return 'https://eth.llamarpc.com';
      if (key === 'rpc.bsc') return 'https://bsc-dataseed.binance.org';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafeWalletService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: KeyManagementService,
          useValue: mockKeyManagementService,
        },
        {
          provide: getModelToken(Wallet.name),
          useValue: mockWalletModel,
        },
      ],
    }).compile();

    service = module.get<SafeWalletService>(SafeWalletService);
    walletModel = module.get<Model<WalletDocument>>(getModelToken(Wallet.name));
    keyManagementService = module.get<KeyManagementService>(KeyManagementService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSiteSafe', () => {
    it('should return existing site safe if it already exists', async () => {
      const existingSafe = {
        _id: 'existing-id',
        address: '0x123',
        level: WalletLevel.SITE,
        trackingId: 'site-gnosis-safe',
      };

      mockWalletModel.findOne.mockResolvedValue(existingSafe);

      const result = await service.createSiteSafe();

      expect(result).toBe(existingSafe);
      expect(mockWalletModel.findOne).toHaveBeenCalledWith({
        trackingId: 'site-gnosis-safe',
        level: WalletLevel.SITE,
      });
    });

    it('should throw BadRequestException if Safe.init fails', async () => {
      mockWalletModel.findOne.mockResolvedValue(null);
      
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockEncryptedKey = 'encrypted-key';
      
      mockKeyManagementService.generateEncryptedKey.mockReturnValue({
        privateKey: mockPrivateKey,
        encryptedKey: mockEncryptedKey,
      });

      // Mock Safe.init to throw error
      const SafeModule = require('@safe-global/protocol-kit');
      SafeModule.Safe = {
        init: jest.fn().mockRejectedValue(new Error('RPC connection failed')),
      };

      await expect(service.createSiteSafe()).rejects.toThrow(BadRequestException);
    });

    it('should create a new site safe successfully', async () => {
      mockWalletModel.findOne.mockResolvedValue(null);
      
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockEncryptedKey = 'encrypted-key';
      const mockEosAddress = '0xEOS12345678901234567890123456789012345678';
      const mockSafeAddress = '0xSAFE123456789012345678901234567890123456';
      
      mockKeyManagementService.generateEncryptedKey.mockReturnValue({
        privateKey: mockPrivateKey,
        encryptedKey: mockEncryptedKey,
      });

      // Mock Safe.init to return a protocol kit instance
      const mockProtocolKit = {
        getAddress: jest.fn().mockResolvedValue(mockSafeAddress),
        isSafeDeployed: jest.fn().mockResolvedValue(false),
      };

      const SafeModule = require('@safe-global/protocol-kit');
      SafeModule.Safe = {
        init: jest.fn().mockResolvedValue(mockProtocolKit),
      };

      // Mock ethers.Wallet
      jest.spyOn(require('ethers'), 'Wallet').mockImplementation(() => ({
        address: mockEosAddress,
      }));

      // Mock getAddress
      jest.spyOn(require('ethers'), 'getAddress').mockReturnValue(mockEosAddress);

      // Mock JsonRpcProvider
      jest.spyOn(require('ethers'), 'JsonRpcProvider').mockImplementation(() => ({}));

      const savedSafe = {
        _id: 'new-site-id',
        address: mockSafeAddress,
        eosAddress: mockEosAddress,
        encryptedPrivateKey: mockEncryptedKey,
        level: WalletLevel.SITE,
        trackingId: 'site-gnosis-safe',
        save: jest.fn().mockResolvedValue({
          _id: 'new-site-id',
          address: mockSafeAddress,
          eosAddress: mockEosAddress,
          encryptedPrivateKey: mockEncryptedKey,
          level: WalletLevel.SITE,
          trackingId: 'site-gnosis-safe',
        }),
      };

      (mockWalletModel as jest.Mock).mockImplementation(() => savedSafe);

      const result = await service.createSiteSafe();

      expect(result).toBeDefined();
      expect(mockKeyManagementService.generateEncryptedKey).toHaveBeenCalled();
      expect(savedSafe.save).toHaveBeenCalled();
    });
  });

  describe('createVendorSafe', () => {
    it('should throw NotFoundException if site safe does not exist', async () => {
      mockWalletModel.findOne.mockResolvedValue(null);

      await expect(service.createVendorSafe('user-id')).rejects.toThrow(NotFoundException);
    });

    it('should return existing vendor safe if it already exists', async () => {
      const siteSafe = {
        _id: 'site-id',
        address: '0xsite',
        eosAddress: '0xsiteEOS',
        encryptedPrivateKey: 'encrypted-site-key',
        level: WalletLevel.SITE,
      };
      const existingVendorSafe = {
        _id: 'vendor-id',
        address: '0xvendor',
        level: WalletLevel.VENDOR,
      };

      mockWalletModel.findOne
        .mockResolvedValueOnce(siteSafe)
        .mockResolvedValueOnce(existingVendorSafe);

      const result = await service.createVendorSafe('user-id');

      expect(result).toBe(existingVendorSafe);
    });

    it('should create a new vendor safe successfully', async () => {
      const siteSafe = {
        _id: 'site-id',
        address: '0xsite',
        eosAddress: '0xsiteEOS',
        encryptedPrivateKey: 'encrypted-site-key',
        level: WalletLevel.SITE,
      };

      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockUserEncryptedKey = 'encrypted-user-key';
      const mockUserEosAddress = '0xUSER123456789012345678901234567890123456';
      const mockVendorSafeAddress = '0xVENDOR12345678901234567890123456789012';

      mockWalletModel.findOne
        .mockResolvedValueOnce(siteSafe)
        .mockResolvedValueOnce(null);

      mockKeyManagementService.decryptPrivateKey.mockReturnValue(mockPrivateKey);
      mockKeyManagementService.generateEncryptedKey.mockReturnValue({
        privateKey: mockPrivateKey,
        encryptedKey: mockUserEncryptedKey,
      });

      const mockProtocolKit = {
        getAddress: jest.fn().mockResolvedValue(mockVendorSafeAddress),
        isSafeDeployed: jest.fn().mockResolvedValue(false),
      };

      const SafeModule = require('@safe-global/protocol-kit');
      SafeModule.Safe = {
        init: jest.fn().mockResolvedValue(mockProtocolKit),
      };

      jest.spyOn(require('ethers'), 'Wallet').mockImplementation(() => ({
        address: mockUserEosAddress,
      }));

      jest.spyOn(require('ethers'), 'getAddress').mockReturnValue(mockUserEosAddress);
      jest.spyOn(require('ethers'), 'JsonRpcProvider').mockImplementation(() => ({}));

      const savedVendorSafe = {
        _id: 'new-vendor-id',
        address: mockVendorSafeAddress,
        eosAddress: mockUserEosAddress,
        encryptedPrivateKey: mockUserEncryptedKey,
        level: WalletLevel.VENDOR,
        save: jest.fn().mockResolvedValue({
          _id: 'new-vendor-id',
          address: mockVendorSafeAddress,
          eosAddress: mockUserEosAddress,
          encryptedPrivateKey: mockUserEncryptedKey,
          level: WalletLevel.VENDOR,
        }),
      };

      (mockWalletModel as jest.Mock).mockImplementation(() => savedVendorSafe);

      const result = await service.createVendorSafe('user-id');

      expect(result).toBeDefined();
      expect(mockKeyManagementService.decryptPrivateKey).toHaveBeenCalledWith(siteSafe.encryptedPrivateKey);
      expect(mockKeyManagementService.generateEncryptedKey).toHaveBeenCalled();
      expect(savedVendorSafe.save).toHaveBeenCalled();
    });
  });

  describe('createUserSafe', () => {
    it('should throw NotFoundException if site safe does not exist', async () => {
      mockWalletModel.findOne.mockResolvedValue(null);

      await expect(
        service.createUserSafe('user-id', {
          label: 'Test Wallet',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if vendor safe does not exist', async () => {
      const siteSafe = {
        _id: 'site-id',
        address: '0xsite',
        eosAddress: '0xsiteEOS',
        encryptedPrivateKey: 'encrypted-site-key',
        level: WalletLevel.SITE,
      };

      mockWalletModel.findOne
        .mockResolvedValueOnce(siteSafe)
        .mockResolvedValueOnce(null);

      await expect(
        service.createUserSafe('user-id', {
          label: 'Test Wallet',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a new user safe successfully', async () => {
      const siteSafe = {
        _id: 'site-id',
        address: '0xsite',
        eosAddress: '0xsiteEOS',
        encryptedPrivateKey: 'encrypted-site-key',
        level: WalletLevel.SITE,
      };

      const vendorSafe = {
        _id: 'vendor-id',
        address: '0xvendor',
        eosAddress: '0xvendorEOS',
        encryptedPrivateKey: 'encrypted-vendor-key',
        level: WalletLevel.VENDOR,
      };

      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockUserEncryptedKey = 'encrypted-user-key';
      const mockUserEosAddress = '0xUSER123456789012345678901234567890123456';
      const mockUserSafeAddress = '0xUSERSAFE123456789012345678901234567890';

      mockWalletModel.findOne
        .mockResolvedValueOnce(siteSafe)
        .mockResolvedValueOnce(vendorSafe);

      mockKeyManagementService.decryptPrivateKey.mockReturnValue(mockPrivateKey);
      mockKeyManagementService.generateEncryptedKey.mockReturnValue({
        privateKey: mockPrivateKey,
        encryptedKey: mockUserEncryptedKey,
      });

      const mockProtocolKit = {
        getAddress: jest.fn().mockResolvedValue(mockUserSafeAddress),
        isSafeDeployed: jest.fn().mockResolvedValue(false),
      };

      const SafeModule = require('@safe-global/protocol-kit');
      SafeModule.Safe = {
        init: jest.fn().mockResolvedValue(mockProtocolKit),
      };

      jest.spyOn(require('ethers'), 'Wallet').mockImplementation(() => ({
        address: mockUserEosAddress,
      }));

      jest.spyOn(require('ethers'), 'getAddress').mockReturnValue(mockUserEosAddress);
      jest.spyOn(require('ethers'), 'JsonRpcProvider').mockImplementation(() => ({}));

      const savedUserSafe = {
        _id: 'new-user-id',
        address: mockUserSafeAddress,
        eosAddress: mockUserEosAddress,
        encryptedPrivateKey: mockUserEncryptedKey,
        level: WalletLevel.USER,
        label: 'Test Wallet',
        save: jest.fn().mockResolvedValue({
          _id: 'new-user-id',
          address: mockUserSafeAddress,
          eosAddress: mockUserEosAddress,
          encryptedPrivateKey: mockUserEncryptedKey,
          level: WalletLevel.USER,
          label: 'Test Wallet',
        }),
      };

      (mockWalletModel as jest.Mock).mockImplementation(() => savedUserSafe);

      const result = await service.createUserSafe('user-id', {
        label: 'Test Wallet',
      });

      expect(result).toBeDefined();
      expect(mockKeyManagementService.decryptPrivateKey).toHaveBeenCalledWith(siteSafe.encryptedPrivateKey);
      expect(mockKeyManagementService.generateEncryptedKey).toHaveBeenCalled();
      expect(savedUserSafe.save).toHaveBeenCalled();
    });
  });

  describe('getWalletByAddress', () => {
    it('should return wallet by address', async () => {
      const wallet = {
        _id: 'wallet-id',
        address: '0x123',
      };

      mockWalletModel.findOne.mockResolvedValue(wallet);

      const result = await service.getWalletByAddress('0x123');

      expect(result).toBe(wallet);
      expect(mockWalletModel.findOne).toHaveBeenCalledWith({
        address: '0x123',
      });
    });

    it('should return null if wallet not found', async () => {
      mockWalletModel.findOne.mockResolvedValue(null);

      const result = await service.getWalletByAddress('0x123');

      expect(result).toBeNull();
    });
  });

  describe('getVendorWallet', () => {
    it('should return vendor wallet for user', async () => {
      const wallet = {
        _id: 'wallet-id',
        address: '0x123',
        level: WalletLevel.VENDOR,
      };

      mockWalletModel.findOne.mockResolvedValue(wallet);

      const result = await service.getVendorWallet('user-id');

      expect(result).toBe(wallet);
    });
  });

  describe('getUserWallets', () => {
    it('should return all user wallets', async () => {
      const wallets = [
        { _id: 'wallet-1', address: '0x1', level: WalletLevel.USER },
        { _id: 'wallet-2', address: '0x2', level: WalletLevel.USER },
      ];

      mockWalletModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(wallets),
      });

      const result = await service.getUserWallets('user-id');

      expect(result).toEqual(wallets);
    });
  });
});

