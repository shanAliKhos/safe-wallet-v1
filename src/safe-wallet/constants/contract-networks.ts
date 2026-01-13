import { bsc, mainnet } from 'viem/chains';
import { ContractNetworksConfig } from '@safe-global/protocol-kit';

export const contractNetworks: ContractNetworksConfig = {
  [bsc.id]: {
    safeSingletonAddress: '0x29fcb43b46531bca003ddc8fcb67ffe91900c762',
    safeProxyFactoryAddress: '0x4e1dcf7ad4e460cfd30791ccc4f9c8a4f820ec67',
    multiSendAddress: '0x38869bf66a61cf6bdb996a6ae40d5853fd43b526',
    multiSendCallOnlyAddress: '0x9641d764fc13c8b624c04430c7356c1c7c8102e2',
    fallbackHandlerAddress: '0xfd0732dc9e303f09fcef3a7388ad10a83459ec99',
    createCallAddress: '0x9b35af71d77eaf8d7e40252370304687390a1a52',
  },
  [mainnet.id]: {
    safeSingletonAddress: '0x29fcb43b46531bca003ddc8fcb67ffe91900c762',
    safeProxyFactoryAddress: '0x4e1dcf7ad4e460cfd30791ccc4f9c8a4f820ec67',
    multiSendAddress: '0x38869bf66a61cf6bdb996a6ae40d5853fd43b526',
    multiSendCallOnlyAddress: '0x9641d764fc13c8b624c04430c7356c1c7c8102e2',
    fallbackHandlerAddress: '0xfd0732dc9e303f09fcef3a7388ad10a83459ec99',
    createCallAddress: '0x9b35af71d77eaf8d7e40252370304687390a1a52',
  },
};

