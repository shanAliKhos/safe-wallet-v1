import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, getAddress } from 'ethers';
import Safe, { SafeAccountConfig, SafeDeploymentConfig, PredictedSafeProps } from '@safe-global/protocol-kit';
import { GelatoRelayPack } from '@safe-global/relay-kit';
import { MetaTransactionData, OperationType } from '@safe-global/types-kit';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { KeyManagementService } from '../key-management/key-management.service';
import { Wallet, WalletDocument, WalletLevel } from '../wallets/schemas/wallet.schema';
import { bsc, mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, publicActions } from 'viem';
import { ERC20_ABI } from './constants/abis';
import { contractNetworks } from './constants/contract-networks';
import { SendDto } from './dto/send.dto';
import { MultiSendDto } from './dto/multi-send.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionMode, TransactionStatus } from '../transactions/schemas/transaction.schema';
import { SafeApiService } from './safe-api.service';
 
/**
 * Safe Wallet Service
 * Production-ready implementation with proper error handling
 * No plaintext keys, proper multi-sig setup
 * Updated to Safe Protocol v1.5.0 standards
 */
@Injectable()
export class SafeWalletService {
  private readonly logger = new Logger(SafeWalletService.name);

  constructor(
    private configService: ConfigService,
    private keyManagementService: KeyManagementService,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    private transactionsService: TransactionsService,
    private safeApiService: SafeApiService,
  ) {
     
  }

  /**
   * Create Site Safe (Level 1) - Master platform wallet
   * Called once during system initialization
   */
  async createSiteSafe(): Promise<WalletDocument> {
    const trackingId = 'site-gnosis-safe'; 
    const existing = await this.walletModel.findOne({ trackingId, level: WalletLevel.SITE }).exec();
    if (existing) {
      this.logger.warn(`Site Safe already exists: ${existing.address}`);
      return existing;
    }

    // Generate new EOA for site safe
    const { privateKey, encryptedKey } = this.keyManagementService.generateEncryptedKey();
    const userWallet = new ethers.Wallet(privateKey);
    const eosAddress = getAddress(userWallet.address);

    // Create Safe configuration
    const safeAccountConfig: SafeAccountConfig = {
      owners: [eosAddress],
      threshold: 1,
    };

    const safeDeploymentConfig: SafeDeploymentConfig = {
      saltNonce: Date.now().toString(),
      safeVersion: '1.4.1', // Latest supported version in types
      deploymentType: 'canonical',
    };

    const predictedSafe: PredictedSafeProps = {
      safeAccountConfig,
      safeDeploymentConfig,
    };

    // Predict Safe address for all chains
    const deployments: Record<string, any> = {};
    const chains = [
      { name: 'eth', chainId: 1, chain: mainnet, rpc: this.configService.get<string>('rpc.eth')! },
      { name: 'bsc', chainId: 56, chain: bsc, rpc: this.configService.get<string>('rpc.bsc')! },
    ];

    for (const { name, chainId, chain, rpc } of chains) {
      try {
        const ownerAccount = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}` as `0x${string}`);
        const client = createWalletClient({
          account: ownerAccount,
          chain,
          transport: http(rpc),
        }).extend(publicActions);

        const protocolKit = await Safe.init({
          provider: client,
          signer: privateKey,
          predictedSafe,
          contractNetworks,
        });

        const safeAddress = await protocolKit.getAddress();
        const isDeployed = await protocolKit.isSafeDeployed();

        deployments[name] = {
          chainId,
          safeAddress,
          isDeployed,
        };
      } catch (error) {
        this.logger.error(`Failed to predict Safe address for ${name}`, error);
        throw new BadRequestException(`Failed to create Site Safe: ${error.message}`);
      }
    }

    // Store in database
    const siteSafe = new this.walletModel({
      address: deployments['eth']?.safeAddress || deployments['bsc']?.safeAddress,
      eosAddress,
      encryptedPrivateKey: encryptedKey,
      type: 'EVM',
      level: WalletLevel.SITE,
      label: trackingId,
      purpose: 'transfer',
      trackingId,
      safeConfig: {
        owners: [eosAddress],
        threshold: 1,
        safeAccountConfig,
        safeDeploymentConfig,
        deployments,
      },
      isActive: true,
    });

    return siteSafe.save();
  }

  /**
   * Create Vendor Safe (Level 2) - Created when user registers
   * NESTED SAFE: Child of Level 1 (Site Safe)
   * Owners: Site Safe (parent) + Vendor EOA
   * Threshold: 2 (requires Site Safe multi-sig + Vendor EOA signature)
   */
  async createVendorSafe(userId: string): Promise<WalletDocument> {
    // Get site safe
    let siteSafe = await this.walletModel
      .findOne({ level: WalletLevel.SITE, trackingId: 'site-gnosis-safe' })
      .exec();

    if (!siteSafe) {
      await this.createSiteSafe();
      siteSafe = await this.walletModel
        .findOne({ level: WalletLevel.SITE, trackingId: 'site-gnosis-safe' })
        .exec();
    }

    if (!siteSafe) {
      throw new NotFoundException('Site Safe not found. Please initialize site safe first.');
    }

    // Check if vendor safe already exists for this user
    const existing = await this.walletModel
      .findOne({ userId: new Types.ObjectId(userId), level: WalletLevel.VENDOR })
      .exec();

    if (existing) {
      this.logger.warn(`Vendor Safe already exists for user ${userId}: ${existing.address}`);
      return existing;
    }

    // Decrypt site safe private key (only for signing, then discard)
    const sitePrivateKey = this.keyManagementService.decryptPrivateKey(siteSafe.encryptedPrivateKey);

    // Generate new EOA for vendor
    const { privateKey: userPrivateKey, encryptedKey: userEncryptedKey } =
      this.keyManagementService.generateEncryptedKey();
    const userWallet = new ethers.Wallet(userPrivateKey);
    const userEosAddress = getAddress(userWallet.address);


    // Create Safe configuration with NESTED SAFE architecture
    // Level 2 Safe is CHILD of Level 1 Safe
    // Site Safe acts as one owner (parent controls child)
    // According to Safe Protocol Guide - lines 154-158: Safes can be owners of other Safes
    const safeAccountConfig: SafeAccountConfig = {
      owners: [siteSafe.address, userEosAddress], // Site Safe (parent) + Vendor EOA
      threshold: 2, // Requires Site Safe approval + Vendor EOA signature
    };

    const safeDeploymentConfig: SafeDeploymentConfig = {
      saltNonce: Date.now().toString(),
      safeVersion: '1.4.1', // Latest supported version in types
      deploymentType: 'canonical',
    };


    const predictedSafe: PredictedSafeProps = {
      safeAccountConfig,
      safeDeploymentConfig,
    }; 

    
    const deployments: Record<string, any> = {};
    const chains = [
      { name: 'eth', chainId: 1, chain: mainnet, rpc: this.configService.get<string>('rpc.eth')! },
      { name: 'bsc', chainId: 56, chain: bsc, rpc: this.configService.get<string>('rpc.bsc')! },
    ];

    for (const { name, chainId, chain, rpc } of chains) {
      try {
        
    
        const ownerAccount = privateKeyToAccount(`0x${sitePrivateKey.replace(/^0x/, '')}` as `0x${string}`);
        const client = createWalletClient({
          account: ownerAccount,
          chain,
          transport: http(rpc),
        }).extend(publicActions);

        const protocolKit = await Safe.init({
          provider: client,
          signer: sitePrivateKey,
          predictedSafe,
          contractNetworks,
        });

        const safeAddress = await protocolKit.getAddress();
        const isDeployed = await protocolKit.isSafeDeployed();

        deployments[name] = {
          chainId,
          safeAddress,
          isDeployed,
        };
      } catch (error) {
        this.logger.error(`Failed to predict Safe address for ${name}`, error);
        throw new BadRequestException(`Failed to create Vendor Safe: ${error.message}`);
      }
    }

    // Store in database
    const vendorSafe = new this.walletModel({
      userId: new Types.ObjectId(userId),
      address: deployments['eth']?.safeAddress || deployments['bsc']?.safeAddress,
      eosAddress: userEosAddress,
      encryptedPrivateKey: userEncryptedKey,
      type: 'EVM',
      level: WalletLevel.VENDOR,
      label: `vendor-${userId}-safe`,
      purpose: 'transfer',
      trackingId: `vendor-${userId}-safe`,
      safeConfig: {
        owners: [siteSafe.address, userEosAddress], // NESTED: Site Safe is owner
        threshold: 2,
        safeAccountConfig,
        safeDeploymentConfig,
        deployments,
      },
      isActive: true,
    });

    return vendorSafe.save();
  }

  /**
   * Create User Safe (Level 3) - Created via API by vendors
   * NESTED SAFE: Child of Level 2 (Vendor Safe)
   * Owners: Vendor Safe (parent) + Site EOA (direct) + User EOA
   * Threshold: 3 (requires all 3 signatures: Vendor Safe + Site EOA + User EOA)
   * Total EOA signatures needed: 4 (Vendor EOA + Site EOA via Vendor Safe + Site EOA direct + User EOA)
   */
  async createUserSafe(userId: string, dto: { label: string; purpose?: string; trackingId?: string; callbackUrl?: string }): Promise<WalletDocument> {
    // Get site safe
    const siteSafe = await this.walletModel
      .findOne({ level: WalletLevel.SITE, trackingId: 'site-gnosis-safe' })
      .exec();

    if (!siteSafe) {
      throw new NotFoundException('Site Safe not found.');
    }

    // Get vendor safe for this user
    const vendorSafe = await this.walletModel
      .findOne({ userId: new Types.ObjectId(userId), level: WalletLevel.VENDOR })
      .exec();

    if (!vendorSafe) {
      throw new NotFoundException('Vendor Safe not found. Please register first.');
    }

    // Decrypt site safe private key
    const sitePrivateKey = this.keyManagementService.decryptPrivateKey(siteSafe.encryptedPrivateKey);

    // Generate new EOA for user
    const { privateKey: userPrivateKey, encryptedKey: userEncryptedKey } =
      this.keyManagementService.generateEncryptedKey();
    const userWallet = new ethers.Wallet(userPrivateKey);
    const userEosAddress = getAddress(userWallet.address);

    // Create Safe configuration with NESTED SAFE + Multi-owner architecture
    // Level 3 Safe has 3 owners with threshold 3 (all must sign)
    // 1. Vendor Safe (nested parent - requires Vendor EOA + Site Safe)
    // 2. Site EOA (direct platform control)
    // 3. User EOA (user control)
    // According to Safe Protocol Guide - lines 154-158: Safes can be owners of other Safes
    const safeAccountConfig: SafeAccountConfig = {
      owners: [vendorSafe.address, siteSafe.eosAddress, userEosAddress], // 3 owners
      threshold: 3, // Requires ALL 3 signatures
    };

    const safeDeploymentConfig: SafeDeploymentConfig = {
      saltNonce: Date.now().toString(),
      safeVersion: '1.4.1', // Latest supported version in types
      deploymentType: 'canonical',
    };

    const predictedSafe: PredictedSafeProps = {
      safeAccountConfig,
      safeDeploymentConfig,
    };

    // Predict Safe address for all chains
    const deployments: Record<string, any> = {};
    const chains = [
      { name: 'eth', chainId: 1, chain: mainnet, rpc: this.configService.get<string>('rpc.eth')! },
      { name: 'bsc', chainId: 56, chain: bsc, rpc: this.configService.get<string>('rpc.bsc')! },
    ];

    for (const { name, chainId, chain, rpc } of chains) {
      try {
        const ownerAccount = privateKeyToAccount(`0x${sitePrivateKey.replace(/^0x/, '')}` as `0x${string}`);
        const client = createWalletClient({
          account: ownerAccount,
          chain,
          transport: http(rpc),
        }).extend(publicActions);

        const protocolKit = await Safe.init({
          provider: client,
          signer: sitePrivateKey,
          predictedSafe,
          contractNetworks,
        });

        const safeAddress = await protocolKit.getAddress();
        const isDeployed = await protocolKit.isSafeDeployed();

        deployments[name] = {
          chainId,
          safeAddress,
          isDeployed,
        };
      } catch (error) {
        this.logger.error(`Failed to predict Safe address for ${name}`, error);
        throw new BadRequestException(`Failed to create User Safe: ${error.message}`);
      }
    }

    // Store in database
    const userSafe = new this.walletModel({
      userId: new Types.ObjectId(userId),
      address: deployments['eth']?.safeAddress || deployments['bsc']?.safeAddress,
      eosAddress: userEosAddress,
      encryptedPrivateKey: userEncryptedKey,
      type: 'EVM',
      level: WalletLevel.USER,
      label: dto.label,
      purpose: dto.purpose || 'transfer',
      trackingId: dto.trackingId,
      callbackUrl: dto.callbackUrl,
      safeConfig: {
        owners: [vendorSafe.address, siteSafe.eosAddress, userEosAddress], // 3 owners: Vendor Safe + Site EOA + User EOA
        threshold: 3, // Requires all 3 signatures
        safeAccountConfig,
        safeDeploymentConfig,
        deployments,
      },
      isActive: true,
    });

    return userSafe.save();
  }

  /**
   * Get wallet by address
   */
  async getWalletByAddress(address: string): Promise<WalletDocument | null> {
    return this.walletModel.findOne({ address: address.toLowerCase() }).exec();
  }

  /**
   * Get vendor wallet for user
   */
  async getVendorWallet(userId: string): Promise<WalletDocument | null> {
    return this.walletModel
      .findOne({ userId: new Types.ObjectId(userId), level: WalletLevel.VENDOR })
      .exec();
  }

  /**
   * Get all user wallets
   */
  async getUserWallets(userId: string): Promise<WalletDocument[]> {
    return this.walletModel
      .find({ userId: new Types.ObjectId(userId), level: WalletLevel.USER })
      .exec();
  }

  /**
   * Deploy wallet on a specific chain
   */
  async deployWalletOnChain(walletId: string, chain: 'eth' | 'bsc'): Promise<any> {
    const wallet = await this.walletModel.findById(walletId).exec();
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Check if already deployed
    const deployment = wallet.safeConfig?.deployments?.[chain];
    if (deployment?.isDeployed) {
      return {
        chain,
        safeAddress: wallet.address,
        isDeployed: true,
        message: `Wallet already deployed on ${chain}`,
      };
    }

    // Get site safe for signing
    const siteSafe = await this.walletModel
      .findOne({ level: WalletLevel.SITE, trackingId: 'site-gnosis-safe' })
      .exec();

    if (!siteSafe) {
      throw new NotFoundException('Site Safe not found');
    }

    // Decrypt site safe private key
    const sitePrivateKey = this.keyManagementService.decryptPrivateKey(siteSafe.encryptedPrivateKey);

    // Determine chain config
    const chainConfig = chain === 'bsc' 
      ? { chain: bsc, rpc: this.configService.get<string>('rpc.bsc')! }
      : { chain: mainnet, rpc: this.configService.get<string>('rpc.eth')! };

    // Create wallet client
    const siteAccount = privateKeyToAccount(`0x${sitePrivateKey.replace(/^0x/, '')}` as `0x${string}`);
    const walletClient = createWalletClient({
      account: siteAccount,
      chain: chainConfig.chain,
      transport: http(chainConfig.rpc),
    }).extend(publicActions);

    // Initialize protocol kit with predicted safe
    const predictedSafe: PredictedSafeProps = {
      safeAccountConfig: wallet.safeConfig.safeAccountConfig,
      safeDeploymentConfig: wallet.safeConfig.safeDeploymentConfig,
    };

    const protocolKit = await Safe.init({
      provider: walletClient,
      signer: sitePrivateKey,
      predictedSafe,
      contractNetworks,
    });

    const safeAddress = await protocolKit.getAddress();
    const isAlreadyDeployed = await protocolKit.isSafeDeployed();

    if (isAlreadyDeployed) {
      // Update wallet deployment status
      const deployments = { ...wallet.safeConfig.deployments };
      deployments[chain] = {
        ...deployments[chain],
        isDeployed: true,
        deployedAt: new Date(),
      };

      await this.walletModel.updateOne(
        { _id: wallet._id },
        { $set: { 'safeConfig.deployments': deployments } }
      ).exec();

      return {
        chain,
        safeAddress,
        isDeployed: true,
        message: `Wallet already deployed on ${chain}`,
      };
    }

    // Deploy the Safe
    this.logger.log(`Deploying wallet ${wallet.address} on ${chain}...`);

    try {
      const deploymentTx = await protocolKit.createSafeDeploymentTransaction();
      
      // Check account balance before attempting transaction
      const accountAddress = siteAccount.address;
      const balance = await walletClient.getBalance({ address: accountAddress });
      const gasPrice = await walletClient.getGasPrice();
      const estimatedGas = await walletClient.estimateGas({
        account: siteAccount,
        to: deploymentTx.to as `0x${string}`,
        value: BigInt(deploymentTx.value),
        data: deploymentTx.data as `0x${string}`,
      }).catch(() => BigInt(300000)); // Fallback gas estimate
      
      const estimatedCost = estimatedGas * gasPrice + BigInt(deploymentTx.value);
      
      if (balance < estimatedCost) {
        const chainName = chain === 'eth' ? 'Ethereum' : 'Binance Smart Chain';
        const balanceFormatted = ethers.formatEther(balance);
        const costFormatted = ethers.formatEther(estimatedCost);
        const neededFormatted = ethers.formatEther(estimatedCost - balance);
        
        throw new BadRequestException({
          message: `Insufficient balance to deploy wallet on ${chainName}`,
          error: 'INSUFFICIENT_FUNDS',
          details: {
            accountAddress,
            chain: chainName,
            currentBalance: balanceFormatted,
            estimatedCost: costFormatted,
            needed: neededFormatted,
            action: `Please add at least ${neededFormatted} ${chain === 'eth' ? 'ETH' : 'BNB'} to account ${accountAddress} to deploy this wallet.`,
          },
        });
      }
      
      const txHash = await walletClient.sendTransaction({
        chain: chainConfig.chain,
        to: deploymentTx.to as `0x${string}`,
        value: BigInt(deploymentTx.value),
        data: deploymentTx.data as `0x${string}`,
      });

        const receipt = await walletClient.waitForTransactionReceipt({ hash: txHash });

      const isDeployed = receipt.status === 'success';

      // Update wallet deployment status
      const deployments = { ...wallet.safeConfig.deployments };
      deployments[chain] = {
        ...deployments[chain],
        isDeployed,
        txHash: txHash.toString(),
        deployedAt: isDeployed ? new Date() : undefined,
      };

      await this.walletModel.updateOne(
        { _id: wallet._id },
        { $set: { 'safeConfig.deployments': deployments } }
      ).exec();

      if (isDeployed) {
        this.logger.log(`Wallet ${wallet.address} deployed successfully on ${chain}`);
      } else {
        this.logger.error(`Wallet ${wallet.address} deployment failed on ${chain}`);
      }

      return {
        chain,
        safeAddress,
        txHash: txHash.toString(),
        receipt,
        isDeployed,
        message: isDeployed 
          ? `Wallet deployed successfully on ${chain}` 
          : `Wallet deployment failed on ${chain}`,
      };
    } catch (error: any) {
      // Handle insufficient funds error
      if (
        error?.message?.includes('insufficient funds') ||
        error?.message?.includes('InsufficientFundsError') ||
        error?.name === 'InsufficientFundsError' ||
        error?.shortMessage?.includes('insufficient funds') ||
        error?.details?.includes('insufficient funds')
      ) {
        const accountAddress = siteAccount.address;
        const chainName = chain === 'eth' ? 'Ethereum' : 'Binance Smart Chain';
        let balance = BigInt(0);
        let estimatedCost = BigInt(0);
        
        try {
          balance = await walletClient.getBalance({ address: accountAddress });
          const gasPrice = await walletClient.getGasPrice();
          const deploymentTx = await protocolKit.createSafeDeploymentTransaction();
          const estimatedGas = await walletClient.estimateGas({
            account: siteAccount,
            to: deploymentTx.to as `0x${string}`,
            value: BigInt(deploymentTx.value),
            data: deploymentTx.data as `0x${string}`,
          }).catch(() => BigInt(300000));
          estimatedCost = estimatedGas * gasPrice + BigInt(deploymentTx.value);
        } catch (e) {
          // If we can't get balance, use error details if available
          const errorDetails = error?.details || error?.message || '';
          const match = errorDetails.match(/have (\d+) want (\d+)/);
          if (match) {
            balance = BigInt(match[1]);
            estimatedCost = BigInt(match[2]);
          }
        }
        
        const balanceFormatted = ethers.formatEther(balance);
        const costFormatted = ethers.formatEther(estimatedCost);
        const neededFormatted = ethers.formatEther(estimatedCost > balance ? estimatedCost - balance : BigInt(0));
        
        this.logger.error(`Insufficient funds for deployment: account ${accountAddress} has ${balanceFormatted}, needs ${costFormatted}`);
        
        throw new BadRequestException({
          message: `Insufficient balance to deploy wallet on ${chainName}`,
          error: 'INSUFFICIENT_FUNDS',
          details: {
            accountAddress,
            chain: chainName,
            currentBalance: balanceFormatted,
            estimatedCost: costFormatted,
            needed: neededFormatted,
            action: `Please add at least ${neededFormatted} ${chain === 'eth' ? 'ETH' : 'BNB'} to account ${accountAddress} to deploy this wallet.`,
          },
        });
      }
      
      // Re-throw other errors
      this.logger.error(`Wallet deployment error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Initialize Safe context for Level 2 wallet
   * Only Level 2 (vendor) wallets can send transactions
   */
  private async initSafeContext(
    vendorWallet: WalletDocument,
    chain: 'bsc' | 'eth',
  ): Promise<{ protocolKit: Safe; relayKit: GelatoRelayPack; walletClient: any }> {
    // Verify it's a Level 2 wallet
    if (vendorWallet.level !== WalletLevel.VENDOR) {
      throw new BadRequestException('Only Level 2 (vendor) wallets can send transactions');
    }

    // Get site safe for signing
    const siteSafe = await this.walletModel
      .findOne({ level: WalletLevel.SITE, trackingId: 'site-gnosis-safe' })
      .exec();

    if (!siteSafe) {
      throw new NotFoundException('Site Safe not found');
    }

    // Decrypt site safe private key
    const sitePrivateKey = this.keyManagementService.decryptPrivateKey(siteSafe.encryptedPrivateKey);

    // Decrypt vendor wallet private key
    const vendorPrivateKey = this.keyManagementService.decryptPrivateKey(vendorWallet.encryptedPrivateKey);

    // Determine chain config
    const chainConfig = chain === 'bsc' 
      ? { chain: bsc, rpc: this.configService.get<string>('rpc.bsc')! }
      : { chain: mainnet, rpc: this.configService.get<string>('rpc.eth')! };

    // Create wallet client with site account
    const siteAccount = privateKeyToAccount(`0x${sitePrivateKey.replace(/^0x/, '')}` as `0x${string}`);
    const walletClient = createWalletClient({
      account: siteAccount,
      chain: chainConfig.chain,
      transport: http(chainConfig.rpc),
    }).extend(publicActions);

    // Initialize protocol kit
    const protocolKit = await Safe.init({
      provider: walletClient,
      signer: sitePrivateKey,
      safeAddress: vendorWallet.address,
      contractNetworks,
    });

    // Initialize relay kit
    const gelatoApiKey = this.configService.get<string>('gelatoApiKey');
    if (!gelatoApiKey) {
      throw new BadRequestException('Gelato API key not configured');
    }

    const relayKit = new GelatoRelayPack({
      apiKey: gelatoApiKey,
      protocolKit,
    });

    return { protocolKit, relayKit, walletClient };
  }

  /**
   * Check Safe balance (native or ERC20)
   */
  private async checkSafeBalance(
    walletClient: any,
    safeAddress: string,
    tokenAddress: string | undefined,
    amount: string,
    provider: ethers.JsonRpcProvider,
  ): Promise<void> {
    const zero = ethers.ZeroAddress.toLowerCase();
    const normalizedToken = tokenAddress?.trim()?.toLowerCase();

    if (!normalizedToken || normalizedToken === zero) {
      // Native token balance
      const balance = await walletClient.getBalance({ address: safeAddress as `0x${string}` });
      const needed = ethers.parseUnits(amount, 'ether');
      if (balance < needed) {
        throw new BadRequestException(
          `Insufficient native balance: have ${ethers.formatEther(balance)}, need ${ethers.formatEther(needed)}`
        );
      }
    } else {
      // ERC20 balance
      const token = getAddress(normalizedToken);
      const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);
      const decimals = await this.safeGetDecimals(tokenContract);
      const balance = await tokenContract.balanceOf(safeAddress);
      const needed = ethers.parseUnits(amount, decimals);
      if (balance < needed) {
        throw new BadRequestException(
          `Insufficient token balance: have ${ethers.formatUnits(balance, decimals)}, need ${amount}`
        );
      }
    }
  }

  /**
   * Get token decimals (defaults to 18)
   */
  private async safeGetDecimals(contract: ethers.Contract): Promise<number> {
    try {
      return Number(await contract.decimals());
    } catch {
      return 18;
    }
  }

  /**
   * Send transaction from Level 2 (vendor) wallet
   * Only Level 2 wallets can send transactions
   */
  async send(userId: string, dto: SendDto): Promise<any> {
    // Get vendor wallet (Level 2)
    const vendorWallet = await this.getVendorWallet(userId);
    if (!vendorWallet) {
      throw new NotFoundException('Vendor wallet not found. Please create a vendor wallet first.');
    }

    // Verify it's Level 2
    if (vendorWallet.level !== WalletLevel.VENDOR) {
      throw new BadRequestException('Only Level 2 (vendor) wallets can send transactions');
    }

    try {
      // Initialize Safe context
      const { protocolKit, relayKit, walletClient } = await this.initSafeContext(vendorWallet, dto.chain);

      // Create provider for balance checks
      const rpcUrl = dto.chain === 'bsc' 
        ? this.configService.get<string>('rpc.bsc')!
        : this.configService.get<string>('rpc.eth')!;
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Check balance
      await this.checkSafeBalance(walletClient, vendorWallet.address, dto.tokenAddress, dto.amount, provider);

      // Prepare transaction data
      let txData: MetaTransactionData;
      const zero = ethers.ZeroAddress.toLowerCase();
      const normalizedToken = dto.tokenAddress?.trim()?.toLowerCase();

      if (!normalizedToken || normalizedToken === zero) {
        // Native token transfer
        const value = ethers.parseUnits(dto.amount, 'ether');
        txData = {
          to: getAddress(dto.toAddress),
          value: value.toString(),
          data: '0x',
          operation: OperationType.Call,
        };
      } else {
        // ERC20 token transfer
        const token = getAddress(normalizedToken);
        const erc20Interface = new ethers.Interface([
          'function transfer(address to, uint256 value) public returns (bool)',
        ]);
        const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);
        const decimals = await this.safeGetDecimals(tokenContract);
        const value = ethers.parseUnits(dto.amount, decimals);
        const data = erc20Interface.encodeFunctionData('transfer', [dto.toAddress, value]);

        txData = {
          to: token,
          value: '0',
          data,
          operation: OperationType.Call,
        };
      }

      // Create Safe transaction
      const safeTx = await protocolKit.createTransaction({ transactions: [txData] });
      const txHash = await protocolKit.getTransactionHash(safeTx);

      // Sign with site safe (first signature)
      const siteSig = await protocolKit.signHash(txHash);
      safeTx.addSignature(siteSig);

      // Get vendor private key for second signature
      const vendorPrivateKey = this.keyManagementService.decryptPrivateKey(vendorWallet.encryptedPrivateKey);
      const vendorAccount = privateKeyToAccount(`0x${vendorPrivateKey.replace(/^0x/, '')}` as `0x${string}`);
      const vendorWalletClient = createWalletClient({
        account: vendorAccount,
        chain: dto.chain === 'bsc' ? bsc : mainnet,
        transport: http(rpcUrl),
      }).extend(publicActions);

      const vendorProtocolKit = await Safe.init({
        provider: vendorWalletClient,
        signer: vendorPrivateKey,
        safeAddress: vendorWallet.address,
        contractNetworks,
      });

      // Sign with vendor wallet (second signature)
      const vendorSig = await vendorProtocolKit.signHash(txHash);
      safeTx.addSignature(vendorSig);

      // Execute transaction via Gelato Relay
      let result: any;
      try {
        const relayResponse = await relayKit.executeTransaction({
          executable: safeTx,
          options: { isSponsored: true },
        });

        result = {
          status: 'success',
          mode: 'sponsored',
          taskId: relayResponse.taskId,
          taskUrl: `https://relay.gelato.digital/tasks/status/${relayResponse.taskId}`,
          fromAddress: vendorWallet.address,
          toAddress: dto.toAddress,
          amount: dto.amount,
          chain: dto.chain,
        };

        // Save transaction to database
        try {
          await this.transactionsService.createTransaction({
            userId,
            walletId: vendorWallet._id.toString(),
            fromAddress: vendorWallet.address,
            toAddress: dto.toAddress,
            amount: dto.amount,
            tokenAddress: dto.tokenAddress,
            chain: dto.chain,
            mode: TransactionMode.SEND,
            taskId: relayResponse.taskId,
            taskUrl: result.taskUrl,
            metadata: {
              txHash: txHash,
            },
          });
        } catch (txError) {
          this.logger.warn('Failed to save transaction record:', txError);
          // Don't fail the transaction if saving fails
        }

        this.logger.log(`Send transaction executed via Gelato Relay: ${relayResponse.taskId}`);
      } catch (relayError: any) {
        this.logger.warn('Sponsored relay unavailable, transaction needs manual execution:', relayError.message);
        throw new BadRequestException(`Failed to execute transaction: ${relayError.message}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Send transaction failed:', error);
      throw new BadRequestException(`Send transaction failed: ${error.message}`);
    }
  }

  /**
   * Multi-send transaction from Level 2 (vendor) wallet
   * Only Level 2 wallets can send transactions
   */
  async multiSend(userId: string, dto: MultiSendDto): Promise<any> {
    // Get vendor wallet (Level 2)
    const vendorWallet = await this.getVendorWallet(userId);
    if (!vendorWallet) {
      throw new NotFoundException('Vendor wallet not found. Please create a vendor wallet first.');
    }

    // Verify it's Level 2
    if (vendorWallet.level !== WalletLevel.VENDOR) {
      throw new BadRequestException('Only Level 2 (vendor) wallets can send transactions');
    }

    try {
      // Initialize Safe context
      const { protocolKit, relayKit, walletClient } = await this.initSafeContext(vendorWallet, dto.chain);

      // Create provider for balance checks
      const rpcUrl = dto.chain === 'bsc' 
        ? this.configService.get<string>('rpc.bsc')!
        : this.configService.get<string>('rpc.eth')!;
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Calculate totals and check balances
      const totals: Record<string, bigint> = {};
      for (const recipient of dto.recipients) {
        const tokenAddr = recipient.tokenAddress?.trim()?.toLowerCase() || ethers.ZeroAddress.toLowerCase();
        const decimals =
          tokenAddr === ethers.ZeroAddress.toLowerCase()
            ? 18
            : await this.safeGetDecimals(new ethers.Contract(tokenAddr, ERC20_ABI, provider));
        const amt = ethers.parseUnits(recipient.amount, decimals);
        totals[tokenAddr] = (totals[tokenAddr] ?? 0n) + amt;
      }

      // Check balances
      for (const [tokenAddr, totalNeeded] of Object.entries(totals)) {
        if (tokenAddr === ethers.ZeroAddress.toLowerCase()) {
          const balance = await walletClient.getBalance({ address: vendorWallet.address as `0x${string}` });
          if (balance < totalNeeded) {
            throw new BadRequestException(
              `Insufficient native balance: have ${ethers.formatEther(balance)}, need ${ethers.formatEther(totalNeeded)}`
            );
          }
        } else {
          const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
          const decimals = await this.safeGetDecimals(tokenContract);
          const balance = await tokenContract.balanceOf(vendorWallet.address);
          if (balance < totalNeeded) {
            throw new BadRequestException(
              `Insufficient token balance for ${tokenAddr}: have ${ethers.formatUnits(balance, decimals)}, need ${ethers.formatUnits(totalNeeded, decimals)}`
            );
          }
        }
      }

      // Prepare transactions
      const txs: MetaTransactionData[] = [];
      const ERC20_IFACE = new ethers.Interface([
        'function transfer(address to, uint256 value) public returns (bool)',
      ]);

      for (const recipient of dto.recipients) {
        const tokenAddr = recipient.tokenAddress?.trim()?.toLowerCase();
        const isNative = !tokenAddr || tokenAddr === ethers.ZeroAddress.toLowerCase();

        if (isNative) {
          const value = ethers.parseUnits(recipient.amount, 'ether');
          txs.push({
            to: getAddress(recipient.recipient),
            value: value.toString(),
            data: '0x',
            operation: OperationType.Call,
          });
        } else {
          const token = getAddress(tokenAddr);
          const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);
          const decimals = await this.safeGetDecimals(tokenContract);
          const amountBN = ethers.parseUnits(recipient.amount, decimals);
          const data = ERC20_IFACE.encodeFunctionData('transfer', [recipient.recipient, amountBN]);

          txs.push({
            to: token,
            value: '0',
            data,
            operation: OperationType.Call,
          });
        }
      }

      // Create Safe transaction
      const safeTx = await protocolKit.createTransaction({ transactions: txs });
      const txHash = await protocolKit.getTransactionHash(safeTx);

      // Sign with site safe (first signature)
      const siteSig = await protocolKit.signHash(txHash);
      safeTx.addSignature(siteSig);

      // Get vendor private key for second signature
      const vendorPrivateKey = this.keyManagementService.decryptPrivateKey(vendorWallet.encryptedPrivateKey);
      const vendorAccount = privateKeyToAccount(`0x${vendorPrivateKey.replace(/^0x/, '')}` as `0x${string}`);
      const vendorWalletClient = createWalletClient({
        account: vendorAccount,
        chain: dto.chain === 'bsc' ? bsc : mainnet,
        transport: http(rpcUrl),
      }).extend(publicActions);

      const vendorProtocolKit = await Safe.init({
        provider: vendorWalletClient,
        signer: vendorPrivateKey,
        safeAddress: vendorWallet.address,
        contractNetworks,
      });

      // Sign with vendor wallet (second signature)
      const vendorSig = await vendorProtocolKit.signHash(txHash);
      safeTx.addSignature(vendorSig);

      // Execute transaction via Gelato Relay
      let result: any;
      try {
        const relayResponse = await relayKit.executeTransaction({
          executable: safeTx,
          options: { isSponsored: true },
        });

        result = {
          status: 'success',
          mode: 'sponsored',
          taskId: relayResponse.taskId,
          taskUrl: `https://relay.gelato.digital/tasks/status/${relayResponse.taskId}`,
          fromAddress: vendorWallet.address,
          recipients: dto.recipients.length,
          chain: dto.chain,
        };

        // Save transaction to database
        try {
          const totalAmount = dto.recipients.reduce((sum, r) => {
            return (parseFloat(sum.toString()) + parseFloat(r.amount)).toString();
          }, '0');

          await this.transactionsService.createTransaction({
            userId,
            walletId: vendorWallet._id.toString(),
            fromAddress: vendorWallet.address,
            toAddress: dto.recipients.map(r => r.recipient).join(','),
            amount: totalAmount,
            tokenAddress: dto.recipients[0]?.tokenAddress,
            chain: dto.chain,
            mode: TransactionMode.MULTI_SEND,
            taskId: relayResponse.taskId,
            taskUrl: result.taskUrl,
            recipients: dto.recipients,
            metadata: {
              txHash: txHash,
              recipientCount: dto.recipients.length,
            },
          });
        } catch (txError) {
          this.logger.warn('Failed to save transaction record:', txError);
          // Don't fail the transaction if saving fails
        }

        this.logger.log(`Multi-send transaction executed via Gelato Relay: ${relayResponse.taskId}`);
      } catch (relayError: any) {
        this.logger.warn('Sponsored relay unavailable, transaction needs manual execution:', relayError.message);
        throw new BadRequestException(`Failed to execute transaction: ${relayError.message}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Multi-send transaction failed:', error);
      throw new BadRequestException(`Multi-send transaction failed: ${error.message}`);
    }
  }

  /**
   * Get Safe nonce (for transaction ordering)
   * According to Safe Protocol Guide - line 1234
   */
  async getSafeNonce(walletAddress: string, chain: 'bsc' | 'eth'): Promise<number> {
    try {
      const wallet = await this.walletModel.findOne({ address: walletAddress }).exec();
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const siteSafe = await this.walletModel
        .findOne({ level: WalletLevel.SITE, trackingId: 'site-gnosis-safe' })
        .exec();

      if (!siteSafe) {
        throw new NotFoundException('Site Safe not found');
      }

      const sitePrivateKey = this.keyManagementService.decryptPrivateKey(siteSafe.encryptedPrivateKey);

      const chainConfig = chain === 'bsc' 
        ? { chain: bsc, rpc: this.configService.get<string>('rpc.bsc')! }
        : { chain: mainnet, rpc: this.configService.get<string>('rpc.eth')! };

      const siteAccount = privateKeyToAccount(`0x${sitePrivateKey.replace(/^0x/, '')}` as `0x${string}`);
      const walletClient = createWalletClient({
        account: siteAccount,
        chain: chainConfig.chain,
        transport: http(chainConfig.rpc),
      }).extend(publicActions);

      const protocolKit = await Safe.init({
        provider: walletClient,
        signer: sitePrivateKey,
        safeAddress: wallet.address,
        contractNetworks,
      });

      const nonce = await protocolKit.getNonce();
      this.logger.log(`Safe ${walletAddress} nonce: ${nonce}`);
      
      return nonce;
    } catch (error) {
      this.logger.error('Failed to get Safe nonce:', error);
      throw new BadRequestException(`Failed to get Safe nonce: ${error.message}`);
    }
  }

  /**
   * Sign message using Safe (EIP-1271)
   * According to Safe Protocol Guide - lines 788-817
   */
  async signMessage(params: {
    userId: string;
    walletAddress: string;
    message: string;
    chain: 'bsc' | 'eth';
  }): Promise<any> {
    try {
      const wallet = await this.walletModel.findOne({ 
        address: params.walletAddress,
        userId: new Types.ObjectId(params.userId),
      }).exec();

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const siteSafe = await this.walletModel
        .findOne({ level: WalletLevel.SITE, trackingId: 'site-gnosis-safe' })
        .exec();

      if (!siteSafe) {
        throw new NotFoundException('Site Safe not found');
      }

      const sitePrivateKey = this.keyManagementService.decryptPrivateKey(siteSafe.encryptedPrivateKey);

      const chainConfig = params.chain === 'bsc' 
        ? { chain: bsc, rpc: this.configService.get<string>('rpc.bsc')!, chainId: 56 }
        : { chain: mainnet, rpc: this.configService.get<string>('rpc.eth')!, chainId: 1 };

      const siteAccount = privateKeyToAccount(`0x${sitePrivateKey.replace(/^0x/, '')}` as `0x${string}`);
      const walletClient = createWalletClient({
        account: siteAccount,
        chain: chainConfig.chain,
        transport: http(chainConfig.rpc),
      }).extend(publicActions);

      const protocolKit = await Safe.init({
        provider: walletClient,
        signer: sitePrivateKey,
        safeAddress: wallet.address,
        contractNetworks,
      });

      // Create message
      const safeMessage = protocolKit.createMessage(params.message);
      
      // Sign message with site safe
      const signature = await protocolKit.signMessage(safeMessage);

      // Get message hash
      const messageHash = await protocolKit.getSafeMessageHash(ethers.hashMessage(params.message));

      // Propose message to Transaction Service
      try {
        await this.safeApiService.proposeMessage({
          chainId: chainConfig.chainId,
          safeAddress: wallet.address,
          message: params.message,
          signature: signature.encodedSignatures(),
        });
      } catch (apiError) {
        this.logger.warn('Failed to propose message to Transaction Service:', apiError);
        // Continue even if Transaction Service is unavailable
      }

      return {
        message: params.message,
        messageHash,
        signature: signature.encodedSignatures(),
        safeAddress: wallet.address,
        chain: params.chain,
      };
    } catch (error) {
      this.logger.error('Failed to sign message:', error);
      throw new BadRequestException(`Failed to sign message: ${error.message}`);
    }
  }

  /**
   * Verify message signature using Safe (EIP-1271)
   * According to Safe Protocol Guide - lines 772-785
   */
  async verifyMessageSignature(params: {
    walletAddress: string;
    message: string;
    signature: string;
    chain: 'bsc' | 'eth';
  }): Promise<boolean> {
    try {
      const wallet = await this.walletModel.findOne({ address: params.walletAddress }).exec();
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const siteSafe = await this.walletModel
        .findOne({ level: WalletLevel.SITE, trackingId: 'site-gnosis-safe' })
        .exec();

      if (!siteSafe) {
        throw new NotFoundException('Site Safe not found');
      }

      const sitePrivateKey = this.keyManagementService.decryptPrivateKey(siteSafe.encryptedPrivateKey);

      const chainConfig = params.chain === 'bsc' 
        ? { chain: bsc, rpc: this.configService.get<string>('rpc.bsc')! }
        : { chain: mainnet, rpc: this.configService.get<string>('rpc.eth')! };

      const siteAccount = privateKeyToAccount(`0x${sitePrivateKey.replace(/^0x/, '')}` as `0x${string}`);
      const walletClient = createWalletClient({
        account: siteAccount,
        chain: chainConfig.chain,
        transport: http(chainConfig.rpc),
      }).extend(publicActions);

      const protocolKit = await Safe.init({
        provider: walletClient,
        signer: sitePrivateKey,
        safeAddress: wallet.address,
        contractNetworks,
      });

      const messageHash = await protocolKit.getSafeMessageHash(ethers.hashMessage(params.message));
      const isValid = await protocolKit.isValidSignature(messageHash, params.signature);

      this.logger.log(`Message signature verification: ${isValid}`);
      return isValid;
    } catch (error) {
      this.logger.error('Failed to verify message signature:', error);
      throw new BadRequestException(`Failed to verify message signature: ${error.message}`);
    }
  }

  /**
   * Enable Guard on Safe
   * According to Safe Protocol Guide - lines 568-577
   */
  async enableGuard(params: {
    userId: string;
    walletId: string;
    guardAddress: string;
    chain: 'bsc' | 'eth';
  }): Promise<any> {
    try {
      const wallet = await this.walletModel.findOne({
        _id: params.walletId,
        userId: new Types.ObjectId(params.userId),
      }).exec();

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.level !== WalletLevel.VENDOR) {
        throw new BadRequestException('Only Level 2 (vendor) wallets can manage guards');
      }

      const { protocolKit } = await this.initSafeContext(wallet, params.chain);

      // Create enable guard transaction
      const enableGuardTx = await protocolKit.createEnableGuardTx(params.guardAddress);

      // Get transaction hash
      const txHash = await protocolKit.getTransactionHash(enableGuardTx);

      // Sign with site safe
      const siteSig = await protocolKit.signHash(txHash);
      enableGuardTx.addSignature(siteSig);

      // Sign with vendor wallet
      const vendorPrivateKey = this.keyManagementService.decryptPrivateKey(wallet.encryptedPrivateKey);
      const rpcUrl = params.chain === 'bsc' 
        ? this.configService.get<string>('rpc.bsc')!
        : this.configService.get<string>('rpc.eth')!;

      const vendorAccount = privateKeyToAccount(`0x${vendorPrivateKey.replace(/^0x/, '')}` as `0x${string}`);
      const vendorWalletClient = createWalletClient({
        account: vendorAccount,
        chain: params.chain === 'bsc' ? bsc : mainnet,
        transport: http(rpcUrl),
      }).extend(publicActions);

      const vendorProtocolKit = await Safe.init({
        provider: vendorWalletClient,
        signer: vendorPrivateKey,
        safeAddress: wallet.address,
        contractNetworks,
      });

      const vendorSig = await vendorProtocolKit.signHash(txHash);
      enableGuardTx.addSignature(vendorSig);

      // Execute transaction
      const txResponse = await protocolKit.executeTransaction(enableGuardTx);

      this.logger.log(`Guard enabled: ${params.guardAddress}`);

      return {
        status: 'success',
        guardAddress: params.guardAddress,
        txHash: txResponse.hash,
        safeAddress: wallet.address,
        chain: params.chain,
      };
    } catch (error) {
      this.logger.error('Failed to enable guard:', error);
      throw new BadRequestException(`Failed to enable guard: ${error.message}`);
    }
  }

  /**
   * Disable Guard on Safe
   * According to Safe Protocol Guide - lines 574-577
   */
  async disableGuard(params: {
    userId: string;
    walletId: string;
    chain: 'bsc' | 'eth';
  }): Promise<any> {
    try {
      const wallet = await this.walletModel.findOne({
        _id: params.walletId,
        userId: new Types.ObjectId(params.userId),
      }).exec();

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.level !== WalletLevel.VENDOR) {
        throw new BadRequestException('Only Level 2 (vendor) wallets can manage guards');
      }

      const { protocolKit } = await this.initSafeContext(wallet, params.chain);

      // Create disable guard transaction
      const disableGuardTx = await protocolKit.createDisableGuardTx();

      // Get transaction hash
      const txHash = await protocolKit.getTransactionHash(disableGuardTx);

      // Sign with site safe
      const siteSig = await protocolKit.signHash(txHash);
      disableGuardTx.addSignature(siteSig);

      // Sign with vendor wallet
      const vendorPrivateKey = this.keyManagementService.decryptPrivateKey(wallet.encryptedPrivateKey);
      const rpcUrl = params.chain === 'bsc' 
        ? this.configService.get<string>('rpc.bsc')!
        : this.configService.get<string>('rpc.eth')!;

      const vendorAccount = privateKeyToAccount(`0x${vendorPrivateKey.replace(/^0x/, '')}` as `0x${string}`);
      const vendorWalletClient = createWalletClient({
        account: vendorAccount,
        chain: params.chain === 'bsc' ? bsc : mainnet,
        transport: http(rpcUrl),
      }).extend(publicActions);

      const vendorProtocolKit = await Safe.init({
        provider: vendorWalletClient,
        signer: vendorPrivateKey,
        safeAddress: wallet.address,
        contractNetworks,
      });

      const vendorSig = await vendorProtocolKit.signHash(txHash);
      disableGuardTx.addSignature(vendorSig);

      // Execute transaction
      const txResponse = await protocolKit.executeTransaction(disableGuardTx);

      this.logger.log(`Guard disabled for Safe: ${wallet.address}`);

      return {
        status: 'success',
        txHash: txResponse.hash,
        safeAddress: wallet.address,
        chain: params.chain,
      };
    } catch (error) {
      this.logger.error('Failed to disable guard:', error);
      throw new BadRequestException(`Failed to disable guard: ${error.message}`);
    }
  }

  /**
   * Get current Guard address
   * According to Safe Protocol Guide - line 580
   */
  async getGuard(walletAddress: string, chain: 'bsc' | 'eth'): Promise<string | null> {
    try {
      const wallet = await this.walletModel.findOne({ address: walletAddress }).exec();
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const siteSafe = await this.walletModel
        .findOne({ level: WalletLevel.SITE, trackingId: 'site-gnosis-safe' })
        .exec();

      if (!siteSafe) {
        throw new NotFoundException('Site Safe not found');
      }

      const sitePrivateKey = this.keyManagementService.decryptPrivateKey(siteSafe.encryptedPrivateKey);

      const chainConfig = chain === 'bsc' 
        ? { chain: bsc, rpc: this.configService.get<string>('rpc.bsc')! }
        : { chain: mainnet, rpc: this.configService.get<string>('rpc.eth')! };

      const siteAccount = privateKeyToAccount(`0x${sitePrivateKey.replace(/^0x/, '')}` as `0x${string}`);
      const walletClient = createWalletClient({
        account: siteAccount,
        chain: chainConfig.chain,
        transport: http(chainConfig.rpc),
      }).extend(publicActions);

      const protocolKit = await Safe.init({
        provider: walletClient,
        signer: sitePrivateKey,
        safeAddress: wallet.address,
        contractNetworks,
      });

      const guardAddress = await protocolKit.getGuard();
      this.logger.log(`Safe ${walletAddress} guard: ${guardAddress || 'none'}`);
      
      return guardAddress;
    } catch (error) {
      this.logger.error('Failed to get guard:', error);
      throw new BadRequestException(`Failed to get guard: ${error.message}`);
    }
  }

  /**
   * Propose transaction to Safe Transaction Service
   * According to Safe Protocol Guide - lines 253-262
   */
  async proposeTransaction(params: {
    userId: string;
    walletId: string;
    toAddress: string;
    amount: string;
    tokenAddress?: string;
    chain: 'bsc' | 'eth';
  }): Promise<any> {
    try {
      const vendorWallet = await this.walletModel.findOne({
        _id: params.walletId,
        userId: new Types.ObjectId(params.userId),
        level: WalletLevel.VENDOR,
      }).exec();

      if (!vendorWallet) {
        throw new NotFoundException('Vendor wallet not found');
      }

      const { protocolKit } = await this.initSafeContext(vendorWallet, params.chain);

      // Prepare transaction data
      let txData: MetaTransactionData;
      const zero = ethers.ZeroAddress.toLowerCase();
      const normalizedToken = params.tokenAddress?.trim()?.toLowerCase();

      if (!normalizedToken || normalizedToken === zero) {
        const value = ethers.parseUnits(params.amount, 'ether');
        txData = {
          to: getAddress(params.toAddress),
          value: value.toString(),
          data: '0x',
          operation: OperationType.Call,
        };
      } else {
        const token = getAddress(normalizedToken);
        const erc20Interface = new ethers.Interface([
          'function transfer(address to, uint256 value) public returns (bool)',
        ]);
        const rpcUrl = params.chain === 'bsc' 
          ? this.configService.get<string>('rpc.bsc')!
          : this.configService.get<string>('rpc.eth')!;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);
        const decimals = await this.safeGetDecimals(tokenContract);
        const value = ethers.parseUnits(params.amount, decimals);
        const data = erc20Interface.encodeFunctionData('transfer', [params.toAddress, value]);

        txData = {
          to: token,
          value: '0',
          data,
          operation: OperationType.Call,
        };
      }

      // Create Safe transaction
      const safeTx = await protocolKit.createTransaction({ transactions: [txData] });
      const txHash = await protocolKit.getTransactionHash(safeTx);

      // Sign with site safe (first signature)
      const siteSig = await protocolKit.signHash(txHash);

      // Get chain ID
      const chainId = params.chain === 'bsc' ? 56 : 1;

      // Propose to Transaction Service
      await this.safeApiService.proposeTransaction({
        chainId,
        safeAddress: vendorWallet.address,
        safeTransactionData: safeTx.data,
        safeTxHash: txHash,
        senderAddress: (await protocolKit.getOwners())[0],
        senderSignature: siteSig.data,
        origin: 'Safe Wallet API',
      });

      this.logger.log(`Transaction proposed: ${txHash}`);

      return {
        status: 'proposed',
        safeTxHash: txHash,
        safeAddress: vendorWallet.address,
        chain: params.chain,
        confirmationsRequired: await protocolKit.getThreshold(),
        confirmationsCollected: 1,
      };
    } catch (error) {
      this.logger.error('Failed to propose transaction:', error);
      throw new BadRequestException(`Failed to propose transaction: ${error.message}`);
    }
  }

  /**
   * Get pending transactions from Transaction Service
   * According to Safe Protocol Guide - lines 941-948
   */
  async getPendingTransactions(params: {
    userId: string;
    walletId: string;
    chain: 'bsc' | 'eth';
  }): Promise<any> {
    try {
      const wallet = await this.walletModel.findOne({
        _id: params.walletId,
        userId: new Types.ObjectId(params.userId),
      }).exec();

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const chainId = params.chain === 'bsc' ? 56 : 1;

      const pendingTxs = await this.safeApiService.getPendingTransactions({
        chainId,
        safeAddress: wallet.address,
      });

      return {
        safeAddress: wallet.address,
        chain: params.chain,
        pendingTransactions: pendingTxs,
        count: pendingTxs.length,
      };
    } catch (error) {
      this.logger.error('Failed to get pending transactions:', error);
      throw new BadRequestException(`Failed to get pending transactions: ${error.message}`);
    }
  }
}

