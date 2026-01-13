# Safe Wallet Platform - Production Architecture

## Overview

This is a production-ready crypto wallet platform built with NestJS and Safe Global. It implements a hierarchical Safe wallet system where:

1. **Level 1 (Site Safe)**: Master platform wallet
2. **Level 2 (Vendor Safe)**: Created automatically when users register
3. **Level 3 (User Safe)**: Created via API by vendors for their end-users

## Key Improvements Over CP Project

### ✅ Security Fixes

1. **Encrypted Key Storage**: All private keys are encrypted using AES-256 before storing in database
   - No plaintext keys in database
   - Keys are only decrypted when needed for signing
   - Uses `KeyManagementService` for all key operations

2. **Proper Key Management**: 
   - Keys are generated securely
   - Encryption key stored in environment variables
   - Keys are never logged or exposed

### ✅ Accounting & Ledger

1. **Double-Entry Bookkeeping**: 
   - All balance changes go through ledger entries
   - Balances are calculated from ledger, never stored directly
   - Proper debit/credit entries ensure accounting equation balances

2. **Balance Calculation**:
   - `LedgerService.getBalance()` calculates from ledger entries
   - No direct balance mutations
   - Full audit trail

### ✅ Architecture Improvements

1. **Proper Error Handling**:
   - Comprehensive error messages
   - Proper exception types
   - Error logging

2. **Validation**:
   - DTOs with class-validator
   - Joi schema validation for environment variables
   - Input sanitization

3. **No Hardcoded Values**:
   - All configuration via environment variables
   - No hardcoded wallet IDs
   - Dynamic wallet resolution

## Architecture Components

### Core Modules

1. **KeyManagementModule**: Encrypts/decrypts private keys
2. **LedgerModule**: Double-entry bookkeeping system
3. **SafeWalletModule**: Safe wallet creation and management
4. **WalletsModule**: Wallet API endpoints
5. **AuthModule**: User authentication with automatic vendor wallet creation

### Data Flow

#### User Registration Flow:
1. User registers via `POST /auth/register`
2. User is created in database
3. Vendor Safe (Level 2) is automatically created
4. Vendor Safe address is returned

#### Layer 3 Wallet Creation Flow:
1. Vendor calls `POST /wallets` with label, purpose, etc.
2. System creates User Safe (Level 3) with multi-sig:
   - Owners: Vendor Safe + Site EOS + Vendor EOS + User EOS
   - Threshold: 3 signatures required
3. Wallet address is returned

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user (creates vendor wallet)
- `POST /auth/login` - Login user

### Wallets
- `POST /wallets` - Create Level 3 wallet (requires JWT)
- `GET /wallets` - Get all user wallets (Level 3)
- `GET /wallets/vendor` - Get vendor wallet (Level 2)
- `GET /wallets/:id` - Get wallet by ID
- `GET /wallets/:id/balance` - Get wallet balance
- `GET /wallets/:id/balances` - Get all balances for wallet
- `GET /wallets/:id/ledger` - Get ledger history

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Database
MONGODB_URI=mongodb://localhost:27017/safe-wallet

# JWT
JWT_SECRET=your-secret-key-minimum-32-characters
JWT_EXPIRES_IN=1d

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Safe Configuration
SITE_SAFE_PRIVATE_KEY=0x... (private key for site safe)
SITE_SAFE_ADDRESS=0x... (optional, if already deployed)
GELATO_API_KEY=... (optional, for gasless transactions)

# RPC URLs
ETH_RPC_URL=https://eth.llamarpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org

# Redis (for queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD= (optional)
```

## Security Best Practices

1. **Never store plaintext keys** - Always use `KeyManagementService`
2. **Use ledger for balances** - Never update balances directly
3. **Validate all inputs** - Use DTOs with class-validator
4. **Proper error handling** - Don't expose sensitive information
5. **Environment variables** - Never commit secrets to git

## Next Steps

1. **Deploy Site Safe**: Initialize site safe on first run
2. **Add Deposit Processing**: Implement blockchain listeners
3. **Add Withdrawal Processing**: Implement Safe-based withdrawals
4. **Add Transaction Monitoring**: Monitor Safe transactions
5. **Add Reconciliation**: Periodic balance reconciliation

## Differences from CP Project

| Feature | CP Project | This Project |
|---------|-----------|--------------|
| Key Storage | Plaintext | Encrypted |
| Balance Management | Direct mutations | Ledger-based |
| Deposit Crediting | Not implemented | Ready for implementation |
| Error Handling | Basic | Comprehensive |
| Validation | Minimal | Full DTO validation |
| Hardcoded Values | Yes | No |

## Production Checklist

- [x] Encrypted key storage
- [x] Ledger-based accounting
- [x] Proper error handling
- [x] Input validation
- [x] Vendor wallet auto-creation
- [x] API for Layer 3 wallets
- [ ] Deposit processing
- [ ] Withdrawal processing
- [ ] Transaction monitoring
- [ ] Balance reconciliation
- [ ] Rate limiting
- [ ] API documentation
- [ ] Monitoring & logging
- [ ] Backup & recovery

