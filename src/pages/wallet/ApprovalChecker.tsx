import { useState } from 'react'
import { Shield, AlertTriangle, Check, Loader2, ExternalLink, Trash2, Info, Search, FileCode, Wallet, ArrowUpRight, Coins } from 'lucide-react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { formatUnits, parseAbi, maxUint256, formatEther } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'

// Known contracts on Ramestta
const KNOWN_CONTRACTS: Record<string, string> = {
  // Add known Ramestta contract addresses here (lowercase)
}

const ERC20_ABI = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
])

interface Approval {
  tokenAddress: string
  tokenSymbol: string
  tokenName: string
  tokenDecimals: number
  spenderAddress: string
  spenderName: string
  allowance: bigint
  allowanceFormatted: string
  risk: 'low' | 'medium' | 'high'
  isUnlimited: boolean
}

interface ContractInteraction {
  contractAddress: string
  contractName: string
  isVerified: boolean
  isProxy: boolean
  implementationName?: string
  methods: string[]
  txCount: number
  lastInteraction: string
  totalValue: bigint
  status: 'success' | 'mixed' | 'error'
}

interface TokenHolding {
  tokenAddress: string
  tokenName: string
  tokenSymbol: string
  decimals: number
  balance: string
  balanceFormatted: string
  holders: number
  hasApproval: boolean
  approvalCount: number
}

interface ScanProgress {
  stage: string
  current: number
  total: number
}

type TabType = 'holdings' | 'approvals' | 'contracts'

export default function ApprovalChecker() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
const [activeTab, setActiveTab] = useState<TabType>('holdings')
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [contracts, setContracts] = useState<ContractInteraction[]>([])
  const [holdings, setHoldings] = useState<TokenHolding[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [hasScanned, setHasScanned] = useState(false)

  // RamaScan API base URL
  const RAMASCAN_API = 'https://latest-backendapi.ramascan.com/api/v2'

  // Determine risk level based on spender and allowance
  const getRiskLevel = (isUnlimited: boolean): 'low' | 'medium' | 'high' => {
    if (isUnlimited) {
      return 'high'
    }
    return 'medium'
  }

  // Get spender name from known contracts or short address
  const getSpenderName = (spenderAddress: string): string => {
    const known = KNOWN_CONTRACTS[spenderAddress.toLowerCase()]
    if (known) return known
    return `Contract ${spenderAddress.slice(0, 6)}...${spenderAddress.slice(-4)}`
  }

  // Get token info from contract
  const getTokenInfo = async (tokenAddress: string): Promise<{ symbol: string; name: string; decimals: number } | null> => {
    if (!publicClient) return null

    try {
      const [symbol, name, decimals] = await Promise.all([
        publicClient.readContract({ 
          address: tokenAddress as `0x${string}`, 
          abi: ERC20_ABI, 
          functionName: 'symbol' 
        }),
        publicClient.readContract({ 
          address: tokenAddress as `0x${string}`, 
          abi: ERC20_ABI, 
          functionName: 'name' 
        }),
        publicClient.readContract({ 
          address: tokenAddress as `0x${string}`, 
          abi: ERC20_ABI, 
          functionName: 'decimals' 
        }),
      ])
      return { 
        symbol: symbol as string, 
        name: name as string, 
        decimals: decimals as number 
      }
    } catch (e) {
      return null
    }
  }

  // Fetch all contract interactions from RamaScan API
  const fetchContractInteractions = async (walletAddress: string): Promise<ContractInteraction[]> => {
    const contractsMap = new Map<string, {
      name: string
      isVerified: boolean
      isProxy: boolean
      implementationName?: string
      methods: Set<string>
      txCount: number
      lastInteraction: string
      totalValue: bigint
      successCount: number
      errorCount: number
    }>()

    try {
      setScanProgress({ stage: 'Fetching all transactions...', current: 0, total: 0 })
      
      // Fetch all transactions
      let nextPageParams: string | null = null
      let page = 0
      const maxPages = 10 // Limit to prevent too many requests

      do {
        page++
        setScanProgress({ stage: `Fetching transactions (page ${page})...`, current: page, total: maxPages })
        
        const url = nextPageParams 
          ? `${RAMASCAN_API}/addresses/${walletAddress}/transactions?${nextPageParams}`
          : `${RAMASCAN_API}/addresses/${walletAddress}/transactions`
        
        const response = await fetch(url)
        
        if (!response.ok) break
        
        const data = await response.json()
        
        if (data.items && Array.isArray(data.items)) {
          for (const tx of data.items) {
            // Only process transactions TO contracts (not coin transfers to EOAs)
            if (!tx.to?.is_contract) continue
            
            const contractAddr = tx.to.hash.toLowerCase()
            
            if (!contractsMap.has(contractAddr)) {
              contractsMap.set(contractAddr, {
                name: tx.to.name || tx.to.implementations?.[0]?.name || 'Unknown Contract',
                isVerified: tx.to.is_verified || false,
                isProxy: tx.to.proxy_type ? true : false,
                implementationName: tx.to.implementations?.[0]?.name,
                methods: new Set(),
                txCount: 0,
                lastInteraction: tx.timestamp,
                totalValue: BigInt(0),
                successCount: 0,
                errorCount: 0
              })
            }
            
            const contract = contractsMap.get(contractAddr)!
            contract.txCount++
            
            // Add method name
            if (tx.method) {
              contract.methods.add(tx.method)
            } else if (tx.decoded_input?.method_call) {
              const methodName = tx.decoded_input.method_call.split('(')[0]
              contract.methods.add(methodName)
            }
            
            // Add value
            if (tx.value && tx.value !== '0') {
              contract.totalValue += BigInt(tx.value)
            }
            
            // Track success/error
            if (tx.status === 'ok' || tx.status === 'success') {
              contract.successCount++
            } else {
              contract.errorCount++
            }
            
            // Update last interaction if newer
            if (tx.timestamp > contract.lastInteraction) {
              contract.lastInteraction = tx.timestamp
            }
          }
        }
        
        // Check for next page
        if (data.next_page_params) {
          const params = new URLSearchParams()
          for (const [key, value] of Object.entries(data.next_page_params)) {
            params.set(key, String(value))
          }
          nextPageParams = params.toString()
        } else {
          nextPageParams = null
        }
      } while (nextPageParams && page < maxPages)

      console.log(`Found ${contractsMap.size} unique contracts`)
    } catch (e) {
      console.log('RamaScan API error:', e)
    }

    // Convert to array
    const result: ContractInteraction[] = []
    for (const [addr, data] of contractsMap) {
      let status: 'success' | 'mixed' | 'error' = 'success'
      if (data.errorCount > 0 && data.successCount > 0) {
        status = 'mixed'
      } else if (data.errorCount > 0 && data.successCount === 0) {
        status = 'error'
      }
      
      result.push({
        contractAddress: addr,
        contractName: data.name,
        isVerified: data.isVerified,
        isProxy: data.isProxy,
        implementationName: data.implementationName,
        methods: Array.from(data.methods),
        txCount: data.txCount,
        lastInteraction: data.lastInteraction,
        totalValue: data.totalValue,
        status
      })
    }

    // Sort by tx count descending
    return result.sort((a, b) => b.txCount - a.txCount)
  }

  // Fetch token holdings from RamaScan API
  const fetchTokenHoldings = async (walletAddress: string, approvalTokens: Set<string>): Promise<TokenHolding[]> => {
    const holdings: TokenHolding[] = []
    
    try {
      setScanProgress({ stage: 'Fetching token holdings...', current: 0, total: 0 })
      
      const response = await fetch(
        `${RAMASCAN_API}/addresses/${walletAddress}/tokens?type=ERC-20`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            const token = item.token
            const decimals = parseInt(token.decimals) || 18
            const rawBalance = item.value || '0'
            
            // Format balance
            const balanceNum = parseFloat(rawBalance) / Math.pow(10, decimals)
            const balanceFormatted = balanceNum.toLocaleString(undefined, {
              maximumFractionDigits: 8,
              minimumFractionDigits: 0
            })
            
            holdings.push({
              tokenAddress: token.address,
              tokenName: token.name || 'Unknown Token',
              tokenSymbol: token.symbol || '???',
              decimals,
              balance: rawBalance,
              balanceFormatted,
              holders: parseInt(token.holders) || 0,
              hasApproval: approvalTokens.has(token.address.toLowerCase()),
              approvalCount: 0 // Will be updated later
            })
          }
        }
        console.log(`Found ${holdings.length} token holdings`)
      }
    } catch (e) {
      console.log('RamaScan API error:', e)
    }
    
    return holdings
  }

  // Fetch token approvals from RamaScan API - paginate through ALL transactions
  const fetchTokenApprovals = async (walletAddress: string): Promise<Map<string, Set<string>>> => {
    const tokenSpenderMap = new Map<string, Set<string>>()
    
    try {
      setScanProgress({ stage: 'Scanning transactions for approvals...', current: 0, total: 0 })
      
      let nextPageParams: string | null = null
      let page = 0
      const maxPages = 15 // Scan more pages to find older approvals
      
      do {
        page++
        setScanProgress({ stage: `Scanning transactions for approvals (page ${page})...`, current: page, total: maxPages })
        
        const url = nextPageParams 
          ? `${RAMASCAN_API}/addresses/${walletAddress}/transactions?${nextPageParams}`
          : `${RAMASCAN_API}/addresses/${walletAddress}/transactions`
        
        const response = await fetch(url)
        if (!response.ok) break
        
        const data = await response.json()
        if (!data.items || !Array.isArray(data.items)) break
        
        // Find approve transactions
        for (const tx of data.items) {
          const methodCall = tx.decoded_input?.method_call || ''
          
          // Check if this is an approve call
          if (methodCall.toLowerCase().includes('approve(')) {
            if (tx.to?.hash && tx.decoded_input?.parameters) {
              const tokenAddr = tx.to.hash.toLowerCase()
              const spenderParam = tx.decoded_input.parameters.find(
                (p: any) => p.name === 'spender' || p.name === '_spender'
              )
              
              if (spenderParam?.value) {
                if (!tokenSpenderMap.has(tokenAddr)) {
                  tokenSpenderMap.set(tokenAddr, new Set())
                }
                tokenSpenderMap.get(tokenAddr)!.add(spenderParam.value.toLowerCase())
                console.log(`Found approval: ${tx.to.name || tokenAddr} -> ${spenderParam.value}`)
              }
            }
          }
        }
        
        // Check for next page
        if (data.next_page_params) {
          const params = new URLSearchParams()
          for (const [key, value] of Object.entries(data.next_page_params)) {
            params.set(key, String(value))
          }
          nextPageParams = params.toString()
        } else {
          nextPageParams = null
        }
      } while (nextPageParams && page < maxPages)

      console.log(`Found ${tokenSpenderMap.size} tokens with approval transactions after scanning ${page} pages`)
    } catch (e) {
      console.log('RamaScan API error:', e)
    }
    
    return tokenSpenderMap
  }

  // MAIN: Scan everything
  const scanAll = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setApprovals([])
    setContracts([])
    setHoldings([])
    setHasScanned(false)

    try {
      // Fetch contract interactions
      const contractInteractions = await fetchContractInteractions(address)
      setContracts(contractInteractions)

      // Fetch token approvals
      setScanProgress({ stage: 'Checking token approvals...', current: 0, total: 0 })
      const tokenSpenderMap = await fetchTokenApprovals(address)
      
      // Track which tokens have approvals
      const tokensWithApprovals = new Set<string>()
      for (const tokenAddr of tokenSpenderMap.keys()) {
        tokensWithApprovals.add(tokenAddr.toLowerCase())
      }
      
      // Fetch token holdings
      const tokenHoldings = await fetchTokenHoldings(address, tokensWithApprovals)
      
      // Check current allowances for found approvals
      const allApprovals: Approval[] = []
      let processed = 0
      const totalPairs = Array.from(tokenSpenderMap.values()).reduce((acc, set) => acc + set.size, 0)

      for (const [tokenAddr, spenders] of tokenSpenderMap) {
        for (const spender of spenders) {
          processed++
          setScanProgress({ 
            stage: `Checking allowance ${processed}/${totalPairs}...`, 
            current: processed, 
            total: totalPairs 
          })

          try {
            const tokenInfo = await getTokenInfo(tokenAddr)
            if (!tokenInfo) continue

            const allowance = await publicClient?.readContract({
              address: tokenAddr as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'allowance',
              args: [address, spender as `0x${string}`],
            }) as bigint

            if (allowance > BigInt(0)) {
              const isUnlimited = allowance >= maxUint256 / BigInt(2)
              const allowanceFormatted = isUnlimited 
                ? 'Unlimited' 
                : formatUnits(allowance, tokenInfo.decimals)

              allApprovals.push({
                tokenAddress: tokenAddr,
                tokenSymbol: tokenInfo.symbol,
                tokenName: tokenInfo.name,
                tokenDecimals: tokenInfo.decimals,
                spenderAddress: spender,
                spenderName: getSpenderName(spender),
                allowance,
                allowanceFormatted,
                risk: getRiskLevel(isUnlimited),
                isUnlimited,
              })
            }
          } catch (e) {
            // Skip if check fails
          }
        }
      }

      // Update holdings with approval counts
      const approvalsByToken = new Map<string, number>()
      for (const approval of allApprovals) {
        const key = approval.tokenAddress.toLowerCase()
        approvalsByToken.set(key, (approvalsByToken.get(key) || 0) + 1)
      }
      
      const updatedHoldings = tokenHoldings.map(h => ({
        ...h,
        hasApproval: approvalsByToken.has(h.tokenAddress.toLowerCase()),
        approvalCount: approvalsByToken.get(h.tokenAddress.toLowerCase()) || 0
      }))

      setApprovals(allApprovals)
      setHoldings(updatedHoldings)
      setHasScanned(true)
      setScanProgress(null)

      toast.success(`Found ${updatedHoldings.length} tokens, ${contractInteractions.length} contracts, and ${allApprovals.length} approvals`)
    } catch (error) {
      console.error('Error scanning:', error)
      toast.error('Failed to scan. Please try again.')
      setScanProgress(null)
    }

    setIsLoading(false)
  }

  // Revoke a single approval
  const revokeApproval = async (approval: Approval) => {
    if (!walletClient || !address) {
      toast.error('Please connect your wallet')
      return
    }

    const approvalKey = `${approval.tokenAddress}-${approval.spenderAddress}`
    setIsRevoking(approvalKey)

    try {
      const hash = await walletClient.writeContract({
        address: approval.tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [approval.spenderAddress as `0x${string}`, BigInt(0)],
      })

      toast.loading(`Revoking ${approval.tokenSymbol} approval...`, { id: approvalKey })

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash })
      }

      toast.success(`${approval.tokenSymbol} approval revoked!`, { id: approvalKey })
      
      setApprovals(prev => prev.filter(a => 
        !(a.tokenAddress === approval.tokenAddress && a.spenderAddress === approval.spenderAddress)
      ))
    } catch (error: any) {
      console.error('Revoke error:', error)
      toast.error(error.shortMessage || 'Failed to revoke approval', { id: approvalKey })
    }

    setIsRevoking(null)
  }

  // Revoke all high-risk approvals
  const revokeAllRisky = async () => {
    const riskyApprovals = approvals.filter(a => a.risk === 'high')
    
    if (riskyApprovals.length === 0) {
      toast.error('No high-risk approvals to revoke')
      return
    }

    if (!confirm(`Are you sure you want to revoke ${riskyApprovals.length} high-risk approvals? This will require ${riskyApprovals.length} transactions.`)) {
      return
    }

    for (const approval of riskyApprovals) {
      await revokeApproval(approval)
    }
  }

  // Format allowance for display
  const formatAllowance = (approval: Approval): string => {
    if (approval.isUnlimited) return 'Unlimited'
    const num = parseFloat(approval.allowanceFormatted)
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
    return num.toFixed(2)
  }

  // Format date
  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Open in explorer
  const openInExplorer = (addr: string, type: 'address' | 'token' = 'address') => {
    window.open(`https://ramascan.com/${type}/${addr}`, '_blank')
  }

  const riskColor = {
    low: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    high: 'text-red-400 bg-red-500/20',
  }

  const statusColor = {
    success: 'text-green-400 bg-green-500/20',
    mixed: 'text-yellow-400 bg-yellow-500/20',
    error: 'text-red-400 bg-red-500/20',
  }

  const highRiskCount = approvals.filter(a => a.risk === 'high').length
  const verifiedContractsCount = contracts.filter(c => c.isVerified).length

  return (
    <div className="space-y-6">
      <BackButton />
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Approval & Contract Checker</h1>
        <p className="text-slate-400 mt-1">View all contracts you've interacted with and manage token approvals</p>
      </div>

      {/* Check Section */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="input-label">Wallet Address</label>
            <input
              type="text"
              value={address || ''}
              placeholder="Connect wallet to check"
              className="input-field font-mono"
              readOnly
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-white">Ramestta</span>
            </div>
            <button
              onClick={scanAll}
              disabled={isLoading || !isConnected}
              className="btn-primary flex items-center gap-2 whitespace-nowrap flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Scan All
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scanning Progress */}
        {scanProgress && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">{scanProgress.stage}</span>
              {scanProgress.total > 0 && (
                <span className="text-sm text-cyan-400">
                  {scanProgress.current}/{scanProgress.total}
                </span>
              )}
            </div>
            {scanProgress.total > 0 && (
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-3">
          🔍 Scans all your transactions to find contracts you've interacted with and token approvals
        </p>
      </div>

      {/* Results */}
      {hasScanned && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/20">
                <Coins className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{holdings.length}</p>
                <p className="text-sm text-slate-400">Tokens Held</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <FileCode className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{contracts.length}</p>
                <p className="text-sm text-slate-400">Contracts Used</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{verifiedContractsCount}</p>
                <p className="text-sm text-slate-400">Verified</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{approvals.length}</p>
                <p className="text-sm text-slate-400">Token Approvals</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{highRiskCount}</p>
                <p className="text-sm text-slate-400">High Risk</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-700 pb-2">
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'holdings' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Coins className="w-4 h-4" />
              Token Holdings ({holdings.length})
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'contracts' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-4 h-4" />
              Contract Interactions ({contracts.length})
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'approvals' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              Token Approvals ({approvals.length})
            </button>
          </div>

          {/* Token Holdings Tab */}
          {activeTab === 'holdings' && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Token Holdings</h2>
                <p className="text-sm text-slate-400 mt-1">All ERC-20 tokens in your wallet</p>
              </div>
              {holdings.length === 0 ? (
                <div className="p-12 text-center">
                  <Coins className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No tokens found in this wallet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-800">
                        <th className="table-header">Token</th>
                        <th className="table-header">Contract</th>
                        <th className="table-header text-right">Balance</th>
                        <th className="table-header text-center">Holders</th>
                        <th className="table-header text-center">Approvals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((token, index) => (
                        <tr key={index} className="hover:bg-slate-800/50 border-b border-slate-800">
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                {token.tokenSymbol.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{token.tokenName}</p>
                                <p className="text-xs text-slate-500">{token.tokenSymbol}</p>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <button 
                              onClick={() => openInExplorer(token.tokenAddress, 'token')}
                              className="text-sm text-slate-400 font-mono hover:text-cyan-400 transition-colors flex items-center gap-1"
                            >
                              {token.tokenAddress.slice(0, 6)}...{token.tokenAddress.slice(-4)}
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="table-cell text-right">
                            <span className="font-semibold text-white">{token.balanceFormatted}</span>
                          </td>
                          <td className="table-cell text-center">
                            <span className="text-slate-400">{token.holders.toLocaleString()}</span>
                          </td>
                          <td className="table-cell text-center">
                            {token.hasApproval ? (
                              <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-orange-500/20 text-orange-400">
                                {token.approvalCount} Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-green-500/20 text-green-400">
                                None
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Contract Interactions Tab */}
          {activeTab === 'contracts' && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Contract Interactions</h2>
                <p className="text-sm text-slate-400 mt-1">All smart contracts your wallet has interacted with</p>
              </div>
              {contracts.length === 0 ? (
                <div className="p-12 text-center">
                  <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No contract interactions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-800">
                        <th className="table-header">Contract</th>
                        <th className="table-header">Methods Called</th>
                        <th className="table-header">Transactions</th>
                        <th className="table-header">Total Value</th>
                        <th className="table-header">Last Used</th>
                        <th className="table-header">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((contract, index) => (
                        <tr key={index} className="hover:bg-slate-800/50 border-b border-slate-800">
                          <td className="table-cell">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-white">
                                  {contract.contractName}
                                </p>
                                {contract.isVerified && (
                                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                    ✓ Verified
                                  </span>
                                )}
                                {contract.isProxy && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                    Proxy
                                  </span>
                                )}
                              </div>
                              {contract.implementationName && (
                                <p className="text-xs text-slate-500">
                                  Implementation: {contract.implementationName}
                                </p>
                              )}
                              <button 
                                onClick={() => openInExplorer(contract.contractAddress)}
                                className="text-xs text-slate-500 font-mono hover:text-cyan-400 transition-colors flex items-center gap-1"
                              >
                                {contract.contractAddress.slice(0, 10)}...{contract.contractAddress.slice(-8)}
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {contract.methods.slice(0, 3).map((method, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                                  {method}
                                </span>
                              ))}
                              {contract.methods.length > 3 && (
                                <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                                  +{contract.methods.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className="font-semibold text-white">{contract.txCount}</span>
                          </td>
                          <td className="table-cell">
                            <span className="text-cyan-400">
                              {contract.totalValue > BigInt(0) 
                                ? `${parseFloat(formatEther(contract.totalValue)).toFixed(4)} RAMA`
                                : '-'
                              }
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="text-slate-400 text-sm">
                              {formatDate(contract.lastInteraction)}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusColor[contract.status]}`}>
                              {contract.status === 'success' ? 'All Success' : 
                               contract.status === 'mixed' ? 'Mixed' : 'Errors'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Token Approvals Tab */}
          {activeTab === 'approvals' && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Token Approvals</h2>
                  <p className="text-sm text-slate-400 mt-1">Tokens you've approved contracts to spend</p>
                </div>
                {highRiskCount > 0 && (
                  <button 
                    onClick={revokeAllRisky}
                    className="btn-outline text-red-400 border-red-500 hover:bg-red-500/10 text-sm py-2 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Revoke All Risky ({highRiskCount})
                  </button>
                )}
              </div>
              {approvals.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">All Clear!</h3>
                  <p className="text-slate-400">No active token approvals found for your wallet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-800">
                        <th className="table-header">Token</th>
                        <th className="table-header">Spender</th>
                        <th className="table-header">Allowance</th>
                        <th className="table-header">Risk</th>
                        <th className="table-header">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvals.map((approval, index) => {
                        const approvalKey = `${approval.tokenAddress}-${approval.spenderAddress}`
                        const isCurrentlyRevoking = isRevoking === approvalKey
                    
                        return (
                          <tr key={index} className="hover:bg-slate-800/50 border-b border-slate-800">
                            <td className="table-cell">
                              <div>
                                <p className="font-semibold text-white">{approval.tokenSymbol}</p>
                                <button 
                                  onClick={() => openInExplorer(approval.tokenAddress, 'token')}
                                  className="text-xs text-slate-500 font-mono hover:text-cyan-400 transition-colors"
                                >
                                  {approval.tokenAddress.slice(0, 8)}...{approval.tokenAddress.slice(-6)}
                                </button>
                              </div>
                            </td>
                            <td className="table-cell">
                              <div>
                                <p className="text-slate-300">{approval.spenderName}</p>
                                <button 
                                  onClick={() => openInExplorer(approval.spenderAddress)}
                                  className="text-xs text-slate-500 font-mono hover:text-cyan-400 transition-colors"
                                >
                                  {approval.spenderAddress.slice(0, 8)}...{approval.spenderAddress.slice(-6)}
                                </button>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className={`font-semibold ${approval.isUnlimited ? 'text-orange-400' : 'text-white'}`}>
                                {formatAllowance(approval)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${riskColor[approval.risk]}`}>
                                {approval.risk.toUpperCase()}
                              </span>
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => revokeApproval(approval)}
                                  disabled={isCurrentlyRevoking}
                                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isCurrentlyRevoking ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    'Revoke'
                                  )}
                                </button>
                                <button 
                                  onClick={() => openInExplorer(approval.spenderAddress)}
                                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                  title="View on RamaScan"
                                >
                                  <ExternalLink className="w-4 h-4 text-slate-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Info Box */}
      <div className="glass-card p-4 border-l-4 border-blue-500 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-400 font-semibold mb-1">Understanding this page</p>
            <p className="text-sm text-slate-400">
              <strong>Contract Interactions:</strong> Shows all smart contracts your wallet has called, 
              including DeFi protocols, NFT marketplaces, and other dApps.
              <br /><br />
              <strong>Token Approvals:</strong> When you use DeFi, you often approve contracts to spend 
              your tokens. Unlimited approvals can be risky - regularly revoke unnecessary ones.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
