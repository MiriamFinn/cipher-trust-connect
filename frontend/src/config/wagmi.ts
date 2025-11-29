import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, sepolia, hardhat } from 'wagmi/chains';
import { defineChain } from 'viem';

// Define localhost chain explicitly with correct RPC URL
const localhost = defineChain({
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Local Explorer',
      url: 'http://localhost:8545',
    },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'Cipher Trust Connect',
  projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [localhost, hardhat, sepolia, mainnet, polygon],
  ssr: false,
});

