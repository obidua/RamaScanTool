export const TOOLS = {
  wallet: [
    { id: 'manage', name: 'Wallets Manage', icon: 'Wallet', path: '/wallet/manage', badge: null, description: 'Manage multiple wallets in one place' },
    { id: 'batch-generate', name: 'Batch Wallet Generate', icon: 'Plus', path: '/wallet/batch-generate', badge: 'HOT', description: 'Generate multiple wallets at once' },
    { id: 'batch-balance', name: 'Batch Check Balance', icon: 'Search', path: '/wallet/batch-balance', badge: null, description: 'Check balances of multiple wallets' },
    { id: 'approval-checker', name: 'Approval Checker', icon: 'Shield', path: '/wallet/approval-checker', badge: null, description: 'Check and revoke token approvals' },
    { id: 'vanity-generator', name: 'Vanity Address Generator', icon: 'Sparkles', path: '/wallet/vanity-generator', badge: null, description: 'Generate custom wallet addresses' },
  ],
  token: [
    { id: 'create', name: 'Create Token', icon: 'Coins', path: '/token/create', badge: 'HOT', description: 'Create RAMA-20 tokens easily' },
    { id: 'multi-sender', name: 'Token MultiSender', icon: 'Send', path: '/token/multi-sender', badge: 'HOT', description: 'Send tokens to multiple addresses' },
    { id: 'batch-collection', name: 'Token Batch Collection', icon: 'Download', path: '/token/batch-collection', badge: null, description: 'Collect tokens from multiple wallets' },
    { id: 'locker', name: 'Token Locker', icon: 'Lock', path: '/token/locker', badge: 'HOT', description: 'Lock tokens for vesting or LP' },
    { id: 'staking-locker', name: 'Staking Locker', icon: 'TrendingUp', path: '/token/staking-locker', badge: 'NEW', description: 'Lock with rewards for others - like staking' },
    { id: 'admin', name: 'Token Admin Panel', icon: 'Settings', path: '/token/admin', badge: null, description: 'Manage token settings' },
  ],
  trading: [
    { id: 'market-maker', name: 'Market Maker - Batch Swap', icon: 'BarChart3', path: '/trading/market-maker', badge: 'HOT', description: 'Execute batch swap operations' },
    { id: 'batch-swap', name: 'Batch Swap', icon: 'ArrowLeftRight', path: '/trading/batch-swap', badge: null, description: 'Swap tokens across multiple wallets' },
    { id: 'volume-bot', name: 'Anti-MEV Volume Bot', icon: 'Bot', path: '/trading/volume-bot', badge: 'NEW', description: 'Protected volume generation' },
  ],
  nft: [
    { id: 'create', name: 'Create NFT', icon: 'Image', path: '/nft/create', badge: null, description: 'Create NFT collections' },
    { id: 'multi-sender', name: 'NFT MultiSender', icon: 'Images', path: '/nft/multi-sender', badge: 'NEW', description: 'Send NFTs to multiple addresses' },
    { id: 'batch-collection', name: 'NFT Batch Collection', icon: 'FolderDown', path: '/nft/batch-collection', badge: null, description: 'Collect NFTs from multiple wallets' },
  ],
  analytics: [
    { id: 'gas', name: 'Gas Price', icon: 'Fuel', path: '/analytics/gas', badge: 'HOT', description: 'Real-time gas price tracker' },
    { id: 'holders', name: 'Scan Token Holders', icon: 'Users', path: '/analytics/holders', badge: null, description: 'Analyze token holder distribution' },
    { id: 'explorer', name: 'Explorer', icon: 'Globe', path: '/analytics/explorer', badge: null, description: 'Multi-chain blockchain explorer' },
  ],
  utilities: [
    { id: 'rpc', name: 'RPC Server', icon: 'Server', path: '/utilities/rpc', badge: null, description: 'Custom RPC endpoints' },
    { id: 'hex', name: 'Hex Converter', icon: 'Binary', path: '/utilities/hex', badge: null, description: 'Convert between hex and text' },
    { id: 'audit', name: 'Contract Audit', icon: 'FileSearch', path: '/utilities/audit', badge: null, description: 'Audit smart contracts' },
  ],
}

export const TOOL_CATEGORIES = [
  { id: 'wallet', name: 'Wallet Tools', icon: 'Wallet', color: 'blue' },
  { id: 'token', name: 'Token Tools', icon: 'Coins', color: 'green' },
  { id: 'trading', name: 'Trading Tools', icon: 'TrendingUp', color: 'purple' },
  { id: 'nft', name: 'NFT Tools', icon: 'Image', color: 'pink' },
  { id: 'analytics', name: 'Analytics', icon: 'BarChart2', color: 'yellow' },
  { id: 'utilities', name: 'Utilities', icon: 'Wrench', color: 'slate' },
]
