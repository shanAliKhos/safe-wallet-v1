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

  GELATO_API_KEY: Joi.string()
    .optional()
    .description('Gelato API key for gasless transactions'),

  ETH_RPC_URL: Joi.string()
    .optional()
    .description('Ethereum RPC URL'),
  BSC_RPC_URL: Joi.string()
    .optional()
    .description('BSC RPC URL'),

  ANKR_HTTP_URL: Joi.string()
    .required()
    .description('Ankr HTTP URL for the chain'),
  ANKR_WS_URL: Joi.string()
    .optional()
    .description('Ankr WS URL for the chain'),
  ANKR_RPC_URL: Joi.string()
    .optional()
    .description('Ankr RPC URL for the chain'),
  ANKR_API_URL: Joi.string()
    .optional()
    .description('Ankr API URL for the chain'),
  ANKR_API_TOKEN: Joi.string()
    .optional()
    .description('Ankr API token for Query API'),
  ANKR_BASE_URL: Joi.string()
    .optional()
    .default('https://rpc.ankr.com/multichain')
    .description('Ankr base URL for Token API and Query API'),
});

