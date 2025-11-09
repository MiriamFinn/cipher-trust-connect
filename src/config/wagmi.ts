import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'TrustBond Finance',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet, polygon, sepolia],
  ssr: false,
});
