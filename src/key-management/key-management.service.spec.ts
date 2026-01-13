import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KeyManagementService } from './key-management.service';

describe('KeyManagementService', () => {
  let service: KeyManagementService;
  let configService: ConfigService;

  const mockEncryptionKey = 'a'.repeat(32); // 32 character key

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyManagementService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'encryption.key') {
                return mockEncryptionKey;
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<KeyManagementService>(KeyManagementService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encryptPrivateKey', () => {
    it('should encrypt a private key', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const encrypted = service.encryptPrivateKey(privateKey);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(privateKey);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should handle private key without 0x prefix', () => {
      const privateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const encrypted = service.encryptPrivateKey(privateKey);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(privateKey);
    });

    it('should throw error on encryption failure', () => {
      const invalidKey = null as any;
      expect(() => service.encryptPrivateKey(invalidKey)).toThrow('Encryption failed');
    });
  });

  describe('decryptPrivateKey', () => {
    it('should decrypt an encrypted private key', () => {
      const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const encrypted = service.encryptPrivateKey(privateKey);
      const decrypted = service.decryptPrivateKey(encrypted);
      
      expect(decrypted).toBe(privateKey);
    });

    it('should add 0x prefix if missing', () => {
      const privateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const encrypted = service.encryptPrivateKey(privateKey);
      const decrypted = service.decryptPrivateKey(encrypted);
      
      expect(decrypted).toMatch(/^0x/);
    });

    it('should throw error on invalid encrypted key', () => {
      expect(() => service.decryptPrivateKey('invalid-encrypted-key')).toThrow('Decryption failed');
    });
  });

  describe('generateEncryptedKey', () => {
    it('should generate a new private key and encrypt it', () => {
      const result = service.generateEncryptedKey();
      
      expect(result).toHaveProperty('privateKey');
      expect(result).toHaveProperty('encryptedKey');
      expect(result.privateKey).toMatch(/^0x/);
      expect(result.encryptedKey).toBeDefined();
      expect(result.encryptedKey).not.toBe(result.privateKey);
    });

    it('should generate different keys on each call', () => {
      const result1 = service.generateEncryptedKey();
      const result2 = service.generateEncryptedKey();
      
      expect(result1.privateKey).not.toBe(result2.privateKey);
      expect(result1.encryptedKey).not.toBe(result2.encryptedKey);
    });

    it('should generate valid encrypted key that can be decrypted', () => {
      const result = service.generateEncryptedKey();
      const decrypted = service.decryptPrivateKey(result.encryptedKey);
      
      expect(decrypted).toBe(result.privateKey);
    });
  });

  describe('validateEncryptedKey', () => {
    it('should return true for valid encrypted key', () => {
      const result = service.generateEncryptedKey();
      const isValid = service.validateEncryptedKey(result.encryptedKey);
      
      expect(isValid).toBe(true);
    });

    it('should return false for invalid encrypted key', () => {
      const isValid = service.validateEncryptedKey('invalid-key');
      
      expect(isValid).toBe(false);
    });
  });

  describe('encryption/decryption roundtrip', () => {
    it('should successfully encrypt and decrypt multiple times', () => {
      const privateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      for (let i = 0; i < 5; i++) {
        const encrypted = service.encryptPrivateKey(privateKey);
        const decrypted = service.decryptPrivateKey(encrypted);
        expect(decrypted).toBe(privateKey);
      }
    });
  });
});



