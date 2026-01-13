import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string()
    .required()
    .description('MongoDB connection URI'),
  JWT_SECRET: Joi.string()
    .required()
    .min(32)
    .description('JWT secret key (minimum 32 characters)'),
  JWT_EXPIRES_IN: Joi.string()
    .default('1d')
    .description('JWT token expiration time'),
  REDIS_HOST: Joi.string()
    .default('localhost')
    .description('Redis host'),
  REDIS_PORT: Joi.number()
    .default(6379)
    .description('Redis port'),
  REDIS_PASSWORD: Joi.string()
    .optional()
    .allow('')
    .description('Redis password (optional)'),
  ENCRYPTION_KEY: Joi.string()
    .required()
    .min(32)
    .description('Encryption key for private keys (minimum 32 characters)'),
  SITE_SAFE_PRIVATE_KEY: Joi.string()
    .required()
    .description('Site Safe private key (will be encrypted)'),
  SITE_SAFE_ADDRESS: Joi.string()
    .optional()
    .description('Site Safe address (if already deployed)'),
  GELATO_API_KEY: Joi.string()
    .optional()
    .description('Gelato API key for gasless transactions'),
  ETH_RPC_URL: Joi.string()
    .required()
    .description('Ethereum RPC URL'),
  BSC_RPC_URL: Joi.string()
    .required()
    .description('BSC RPC URL'),
});

