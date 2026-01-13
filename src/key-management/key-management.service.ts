import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

/**
 * Key Management Service
 * NEVER stores plaintext private keys
 * All keys are encrypted at rest using AES-256
 */
@Injectable()
export class KeyManagementService {
  private readonly logger = new Logger(KeyManagementService.name);
  private readonly encryptionKey: string;

  constructor(private configService: ConfigService) {
    this.encryptionKey = this.configService.get<string>('encryption.key') || '';
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
  }

  /**
   * Encrypt a private key before storing in database
   */
  encryptPrivateKey(privateKey: string): string {
    try {
      // Remove 0x prefix if present for consistent storage
      const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      const encrypted = CryptoJS.AES.encrypt(cleanKey, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      this.logger.error('Failed to encrypt private key', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a private key from database
   * Only call this when you need to use the key (e.g., signing transactions)
   */
  decryptPrivateKey(encryptedKey: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedKey, this.encryptionKey);
      const privateKey = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!privateKey) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }

      // Add 0x prefix if not present
      return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    } catch (error) {
      this.logger.error('Failed to decrypt private key', error);
      throw new Error('Decryption failed - key may be corrupted');
    }
  }

  /**
   * Generate a new random private key and encrypt it
   */
  generateEncryptedKey(): { privateKey: string; encryptedKey: string } {
    const { ethers } = require('ethers');
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const encryptedKey = this.encryptPrivateKey(privateKey);
    
    return {
      privateKey, // Return plaintext only for immediate use, then discard
      encryptedKey, // This is what should be stored
    };
  }

  /**
   * Validate that an encrypted key can be decrypted
   */
  validateEncryptedKey(encryptedKey: string): boolean {
    try {
      this.decryptPrivateKey(encryptedKey);
      return true;
    } catch {
      return false;
    }
  }
}

