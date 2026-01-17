import { bsc, mainnet } from 'viem/chains';
import { ContractNetworksConfig } from '@safe-global/protocol-kit';

/**
 * Safe Protocol v1.5.0 Contract Networks Configuration
 * Updated to use latest Safe contract addresses
 * Source: https://docs.safe.global/advanced/smart-account-supported-networks
 */
export const contractNetworks: ContractNetworksConfig = {
  // Ethereum Mainnet
  [mainnet.id]: {
    safeSingletonAddress: '0x41675C099F32341bf84BFc5382aF534df5C7461a', // Safe v1.5.0
    safeProxyFactoryAddress: '0x4e1DCF7AD4e460CfD30791CCC4F9c8a4f820ec67', // SafeProxyFactory v1.4.1 (compatible)
    multiSendAddress: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526', // MultiSend v1.4.1
    multiSendCallOnlyAddress: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2', // MultiSendCallOnly v1.4.1
    fallbackHandlerAddress: '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99', // CompatibilityFallbackHandler v1.4.1
    signMessageLibAddress: '0xd53cd0aB83D845Ac265BE939c57F53AD838012c9', // SignMessageLib v1.4.1
    createCallAddress: '0x9b35Af71d77eaf8d7e40252370304687390A1a52', // CreateCall v1.4.1
    simulateTxAccessorAddress: '0x3d4BA2E0884aa488718476ca2FB8Efc291A46199', // SimulateTxAccessor v1.4.1
    safeSingletonAbi: undefined,
    safeProxyFactoryAbi: undefined,
    multiSendAbi: undefined,
    multiSendCallOnlyAbi: undefined,
  },
  // BSC (Binance Smart Chain)
  [bsc.id]: {
    safeSingletonAddress: '0x41675C099F32341bf84BFc5382aF534df5C7461a', // Safe v1.5.0
    safeProxyFactoryAddress: '0x4e1DCF7AD4e460CfD30791CCC4F9c8a4f820ec67', // SafeProxyFactory v1.4.1
    multiSendAddress: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526', // MultiSend v1.4.1
    multiSendCallOnlyAddress: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2', // MultiSendCallOnly v1.4.1
    fallbackHandlerAddress: '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99', // CompatibilityFallbackHandler v1.4.1
    signMessageLibAddress: '0xd53cd0aB83D845Ac265BE939c57F53AD838012c9', // SignMessageLib v1.4.1
    createCallAddress: '0x9b35Af71d77eaf8d7e40252370304687390A1a52', // CreateCall v1.4.1
    simulateTxAccessorAddress: '0x3d4BA2E0884aa488718476ca2FB8Efc291A46199', // SimulateTxAccessor v1.4.1
    safeSingletonAbi: undefined,
    safeProxyFactoryAbi: undefined,
    multiSendAbi: undefined,
    multiSendCallOnlyAbi: undefined,
  },
};

