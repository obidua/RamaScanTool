import { http } from 'wagmi'
import { mainnet, bsc, polygon, arbitrum, optimism, base, avalanche, linea } from 'wagmi/chains'
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

// Chain status: 'active' = fully functional, 'coming-soon' = UI only
export const SUPPORTED_CHAINS = [
  { id: 1370, name: 'Ramestta', symbol: 'RAMA', icon: '🔷', color: '#00D4FF', rpc: 'https://blockchain.ramestta.com', explorer: 'https://ramascan.com', status: 'active' },
  { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '⟠', color: '#627EEA', rpc: 'https://eth.llamarpc.com', explorer: 'https://etherscan.io', status: 'coming-soon' },
  { id: 56, name: 'BNB Chain', symbol: 'BNB', icon: '🔶', color: '#F3BA2F', rpc: 'https://bsc-dataseed.binance.org', explorer: 'https://bscscan.com', status: 'coming-soon' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '🟣', color: '#8247E5', rpc: 'https://polygon-rpc.com', explorer: 'https://polygonscan.com', status: 'coming-soon' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', icon: '🔵', color: '#28A0F0', rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io', status: 'coming-soon' },
  { id: 10, name: 'Optimism', symbol: 'ETH', icon: '🔴', color: '#FF0420', rpc: 'https://mainnet.optimism.io', explorer: 'https://optimistic.etherscan.io', status: 'coming-soon' },
  { id: 8453, name: 'Base', symbol: 'ETH', icon: '🔵', color: '#0052FF', rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org', status: 'coming-soon' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', icon: '🔺', color: '#E84142', rpc: 'https://api.avax.network/ext/bc/C/rpc', explorer: 'https://snowtrace.io', status: 'coming-soon' },
  { id: 59144, name: 'Linea', symbol: 'ETH', icon: '⬡', color: '#61DFFF', rpc: 'https://rpc.linea.build', explorer: 'https://lineascan.build', status: 'coming-soon' },
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

// Helper to check if chain is active
export const isChainActive = (chainId: number): boolean => {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
  return chain?.status === 'active'
}

// Get active chains only
export const getActiveChains = () => SUPPORTED_CHAINS.filter(c => c.status === 'active')

// Get coming soon chains
export const getComingSoonChains = () => SUPPORTED_CHAINS.filter(c => c.status === 'coming-soon')
