import { http } from 'wagmi'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import type { Chain } from 'wagmi/chains'

// Define Ramestta Mainnet chain
export const ramestta: Chain = {
  id: 1370,
  name: 'Ramestta',
  nativeCurrency: {
    decimals: 18,
    name: 'RAMA',
    symbol: 'RAMA',
  },
  rpcUrls: {
    default: { http: ['https://blockchain.ramestta.com'] },
    public: { http: ['https://blockchain.ramestta.com'] },
  },
  blockExplorers: {
    default: { name: 'RamaScan', url: 'https://ramascan.com' },
  },
}

// Currently only Ramestta is active, other chains coming soon
export const config = getDefaultConfig({
  appName: 'RamaScanTool',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [ramestta], // Only Ramestta active for now
  transports: {
    [ramestta.id]: http('https://blockchain.ramestta.com'),
  },
})

// Ramestta Network - Native RAMA Coin Platform
export const SUPPORTED_CHAINS = [
  { id: 1370, name: 'Ramestta', symbol: 'RAMA', icon: '🔷', color: '#00D4FF', rpc: 'https://blockchain.ramestta.com', explorer: 'https://ramascan.com', status: 'active' },
]

// Contract addresses per chain (add addresses as you deploy)
export const CONTRACTS: Record<number, {
  tokenFactory?: string
  nftFactory?: string
  multiSender?: string
  tokenLocker?: string
}> = {
  1370: { // Ramestta - Deploy these contracts first
    tokenFactory: '', // TODO: Add after deployment
    nftFactory: '',   // TODO: Add after deployment
    multiSender: '',  // TODO: Add after deployment
    tokenLocker: '',  // TODO: Add after deployment
  },
  // Add other chains as you deploy contracts
}

// Helper to check if chain is active (only Ramestta)
export const isChainActive = (chainId: number): boolean => {
  return chainId === 1370
}

// Get Ramestta chain
export const getActiveChains = () => SUPPORTED_CHAINS

// Get Ramestta info
export const getRamessttaChain = () => SUPPORTED_CHAINS[0]
