import { useState, useEffect, useRef } from 'react'
import { ArrowLeftRight, Upload, Loader2, Check, AlertCircle, ExternalLink, RefreshCw, Wallet, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { createWalletClient, createPublicClient, http, formatUnits, parseUnits, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import { getTxUrl } from '../../config/contracts'

// Ramestta chain config
const ramestta = {
  id: 1370,
  name: 'Ramestta',
  nativeCurrency: { name: 'RAMA', symbol: 'RAMA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://blockchain.ramestta.com'] },
  },
  blockExplorers: {
    default: { name: 'Ramascan', url: 'https://ramascan.com' },
  },
} as const

// RamaSwap Router address on Ramestta
const RAMASWAP_ROUTER = '0x1bA66756C0efEB40cfF04F3514BCa9E507666750' as const
const WRAMA_ADDRESS = '0x271a5203B664eDF206Eaba8C71eE209a353FD1cA' as const

// Uniswap V2 Router ABI
const RouterABI = [
  {
    inputs: [{ type: 'uint256', name: 'amountOutMin' }, { type: 'address[]', name: 'path' }, { type: 'address', name: 'to' }, { type: 'uint256', name: 'deadline' }],
    name: 'swapExactETHForTokens',
    outputs: [{ type: 'uint256[]', name: 'amounts' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ type: 'uint256', name: 'amountIn' }, { type: 'uint256', name: 'amountOutMin' }, { type: 'address[]', name: 'path' }, { type: 'address', name: 'to' }, { type: 'uint256', name: 'deadline' }],
    name: 'swapExactTokensForETH',
    outputs: [{ type: 'uint256[]', name: 'amounts' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ type: 'uint256', name: 'amountIn' }, { type: 'address[]', name: 'path' }],
    name: 'getAmountsOut',
    outputs: [{ type: 'uint256[]', name: 'amounts' }],
    stateMutability: 'view',
    type: 'function'
  },
] as const

// ERC20 ABI
const ERC20ABI = [
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'address', name: 'spender' }, { type: 'uint256', name: 'amount' }], name: 'approve', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ type: 'address' }, { type: 'address' }], name: 'allowance', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

interface WalletEntry {
  address: string
  privateKey: string
  isValid: boolean
}

interface SwapResult {
  wallet: string
  fromToken: string
  toToken: string
  amount: string
  amountOut: string
  status: 'pending' | 'success' | 'error'
  txHash?: string
  error?: string
}

type SwapDirection = 'buy' | 'sell'

export default function BatchSwap() {
  const { isConnected } = useAccount()
  const [walletsText, setWalletsText] = useState('')
  const [parsedWallets, setParsedWallets] = useState<WalletEntry[]>([])
  const [isSwapping, setIsSwapping] = useState(false)
  const [results, setResults] = useState<SwapResult[]>([])
  const [stats, setStats] = useState({ success: 0, failed: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [config, setConfig] = useState({
    fromToken: '', // RAMA or token address
    toToken: '',   // Token address
    amount: '1',
    slippage: 0.5,
    direction: 'buy' as SwapDirection, // buy = RAMA to Token, sell = Token to RAMA
  })

  // Determine which token we're swapping to (the non-RAMA token)
  const tokenAddress = config.direction === 'buy' ? config.toToken : config.fromToken
  const validTokenAddress = isAddress(tokenAddress) ? tokenAddress as `0x${string}` : null

  // Read token info
  const { data: tokenName } = useReadContract({
    address: validTokenAddress!,
    abi: ERC20ABI,
    functionName: 'name',
    query: { enabled: !!validTokenAddress },
  })

  const { data: tokenSymbol } = useReadContract({
    address: validTokenAddress!,
    abi: ERC20ABI,
    functionName: 'symbol',
    query: { enabled: !!validTokenAddress },
  })

  const { data: tokenDecimals } = useReadContract({
    address: validTokenAddress!,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: { enabled: !!validTokenAddress },
  })

  // Get price quote
  const { data: quoteData, refetch: refetchQuote } = useReadContract({
    address: RAMASWAP_ROUTER,
    abi: RouterABI,
    functionName: 'getAmountsOut',
    args: validTokenAddress ? [parseUnits('1', 18), [WRAMA_ADDRESS, validTokenAddress]] : undefined,
    query: { enabled: !!validTokenAddress },
  })

  const decimals = tokenDecimals ?? 18
  const tokenLoaded = validTokenAddress && tokenName && tokenSymbol
  const tokenPrice = quoteData ? Number(formatUnits(quoteData[1], decimals)) : 0

  // Parse wallets from text input
  useEffect(() => {
    const lines = walletsText.split('\n').filter(line => line.trim())
    const parsed: WalletEntry[] = []

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 2) {
        const address = parts[0]
        let privateKey = parts[1]
        
        // Normalize private key
        if (!privateKey.startsWith('0x')) {
          privateKey = '0x' + privateKey
        }

        // Validate
        let isValid = false
        try {
          if (isAddress(address) && privateKey.length === 66) {
            const account = privateKeyToAccount(privateKey as `0x${string}`)
            isValid = account.address.toLowerCase() === address.toLowerCase()
          }
        } catch {
          isValid = false
        }

        parsed.push({ address, privateKey, isValid })
      } else if (parts.length === 1 && parts[0].length >= 64) {
        // Just a private key
        let privateKey = parts[0]
        if (!privateKey.startsWith('0x')) {
          privateKey = '0x' + privateKey
        }
        try {
          const account = privateKeyToAccount(privateKey as `0x${string}`)
          parsed.push({ address: account.address, privateKey, isValid: true })
        } catch {
          parsed.push({ address: 'Invalid', privateKey, isValid: false })
        }
      }
    }

    setParsedWallets(parsed)
  }, [walletsText])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setConfig(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setWalletsText(text)
      toast.success(`Loaded ${text.split('\n').filter(l => l.trim()).length} wallets from CSV`)
    }
    reader.readAsText(file)
  }

  const executeSwaps = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    const validWallets = parsedWallets.filter(w => w.isValid)
    if (validWallets.length === 0) {
      toast.error('No valid wallets found. Format: address, privateKey')
      return
    }

    if (!validTokenAddress) {
      toast.error('Please enter a valid token address')
      return
    }

    if (!config.amount || parseFloat(config.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setIsSwapping(true)
    setStats({ success: 0, failed: 0, total: validWallets.length })
    
    // Initialize results
    const initialResults: SwapResult[] = validWallets.map(wallet => ({
      wallet: wallet.address,
      fromToken: config.direction === 'buy' ? 'RAMA' : (tokenSymbol || 'Token'),
      toToken: config.direction === 'buy' ? (tokenSymbol || 'Token') : 'RAMA',
      amount: config.amount,
      amountOut: '...',
      status: 'pending',
    }))
    setResults(initialResults)

    let successCount = 0
    let failedCount = 0

    // Create public client for reading
    const publicClient = createPublicClient({
      chain: ramestta,
      transport: http('https://blockchain.ramestta.com'),
    })

    // Execute swaps sequentially
    for (let i = 0; i < validWallets.length; i++) {
      const wallet = validWallets[i]
      
      try {
        const account = privateKeyToAccount(wallet.privateKey as `0x${string}`)
        const walletClient = createWalletClient({
          account,
          chain: ramestta,
          transport: http('https://blockchain.ramestta.com'),
        })

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 minutes

        let txHash: `0x${string}`

        if (config.direction === 'buy') {
          // Buy tokens with RAMA
          const amountIn = parseUnits(config.amount, 18)
          
          txHash = await walletClient.writeContract({
            address: RAMASWAP_ROUTER,
            abi: RouterABI,
            functionName: 'swapExactETHForTokens',
            args: [0n, [WRAMA_ADDRESS, validTokenAddress], account.address, deadline],
            value: amountIn,
          })
        } else {
          // Sell tokens for RAMA - need to approve first
          const amountIn = parseUnits(config.amount, decimals)

          // Check allowance
          const allowance = await publicClient.readContract({
            address: validTokenAddress,
            abi: ERC20ABI,
            functionName: 'allowance',
            args: [account.address, RAMASWAP_ROUTER],
          })

          if (allowance < amountIn) {
            // Approve max
            const approveHash = await walletClient.writeContract({
              address: validTokenAddress,
              abi: ERC20ABI,
              functionName: 'approve',
              args: [RAMASWAP_ROUTER, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
            })
            // Wait for approval to be mined
            await publicClient.waitForTransactionReceipt({ hash: approveHash })
          }

          txHash = await walletClient.writeContract({
            address: RAMASWAP_ROUTER,
            abi: RouterABI,
            functionName: 'swapExactTokensForETH',
            args: [amountIn, 0n, [validTokenAddress, WRAMA_ADDRESS], account.address, deadline],
          })
        }

        // Update result with success
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'success' as const, txHash } : r
        ))
        successCount++
        setStats(prev => ({ ...prev, success: successCount }))

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error' as const, error: errorMessage.slice(0, 50) } : r
        ))
        failedCount++
        setStats(prev => ({ ...prev, failed: failedCount }))
      }

      // Small delay between swaps to avoid RPC rate limiting
      if (i < validWallets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    setIsSwapping(false)
    
    if (successCount === validWallets.length) {
      toast.success(`All ${successCount} swaps completed successfully!`)
    } else if (successCount > 0) {
      toast.success(`${successCount}/${validWallets.length} swaps completed. ${failedCount} failed.`)
    } else {
      toast.error('All swaps failed. Check wallet balances and token liquidity.')
    }
  }

  const validWalletCount = parsedWallets.filter(w => w.isValid).length
  const invalidWalletCount = parsedWallets.filter(w => !w.isValid).length
  const totalVolume = validWalletCount * parseFloat(config.amount || '0')

  return (
    <div className="space-y-6">
      <BackButton />
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <ArrowLeftRight className="w-7 h-7 text-blue-400" />
          Batch Swap
        </h1>
        <p className="text-slate-400 mt-1">Execute token swaps across multiple wallets using private keys</p>
      </div>

      {/* Security Warning */}
      <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Security Notice</p>
            <p className="text-yellow-400/80 text-sm mt-1">
              Private keys are processed locally and never sent to any server. However, always use wallets with limited funds for batch operations.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Swap Configuration */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Swap Configuration</h2>

          <div className="space-y-4">
            {/* Swap Direction */}
            <div>
              <label className="input-label">Swap Direction</label>
              <select
                name="direction"
                value={config.direction}
                onChange={handleChange}
                className="input-field"
                disabled={isSwapping}
              >
                <option value="buy">Buy Token (RAMA → Token)</option>
                <option value="sell">Sell Token (Token → RAMA)</option>
              </select>
            </div>

            {/* Token Address */}
            <div>
              <label className="input-label">
                {config.direction === 'buy' ? 'Token to Buy' : 'Token to Sell'}
              </label>
              <input
                type="text"
                name={config.direction === 'buy' ? 'toToken' : 'fromToken'}
                value={config.direction === 'buy' ? config.toToken : config.fromToken}
                onChange={handleChange}
                placeholder="0x... token address"
                className="input-field font-mono"
                disabled={isSwapping}
              />
              {tokenAddress && (
                <div className="mt-2">
                  {validTokenAddress ? (
                    tokenLoaded ? (
                      <p className="text-sm text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {tokenName} ({tokenSymbol}) - Price: {tokenPrice.toFixed(6)} RAMA per token
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading token data...
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Invalid address format
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">
                  Amount per Wallet ({config.direction === 'buy' ? 'RAMA' : tokenSymbol || 'Tokens'})
                </label>
                <input
                  type="text"
                  name="amount"
                  value={config.amount}
                  onChange={handleChange}
                  placeholder="1"
                  className="input-field"
                  disabled={isSwapping}
                />
              </div>
              <div>
                <label className="input-label">Slippage (%)</label>
                <input
                  type="number"
                  name="slippage"
                  value={config.slippage}
                  onChange={handleChange}
                  step={0.1}
                  min={0.1}
                  max={50}
                  className="input-field"
                  disabled={isSwapping}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Wallets (address, privateKey - one per line)</label>
              <textarea
                value={walletsText}
                onChange={(e) => setWalletsText(e.target.value)}
                placeholder="0x1234...5678, 0xprivatekey...&#10;0xabcd...efgh, 0xprivatekey...&#10;&#10;Or just private keys (one per line):&#10;0xprivatekey..."
                rows={8}
                className="input-field resize-none font-mono text-sm"
                disabled={isSwapping}
              />
              {parsedWallets.length > 0 && (
                <div className="mt-2 flex items-center gap-4 text-sm">
                  {validWalletCount > 0 && (
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {validWalletCount} valid
                    </span>
                  )}
                  {invalidWalletCount > 0 && (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {invalidWalletCount} invalid
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center gap-2"
                disabled={isSwapping}
              >
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
              <button
                onClick={executeSwaps}
                disabled={isSwapping || !isConnected || validWalletCount === 0 || !tokenLoaded}
                className="btn-primary flex items-center gap-2"
              >
                {isSwapping ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Swapping... ({stats.success + stats.failed}/{stats.total})
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-5 h-5" />
                    Execute Swaps
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Summary</h2>
              <button onClick={() => refetchQuote()} className="text-slate-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Total Wallets</p>
                <p className="text-2xl font-bold text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  {validWalletCount}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Total Volume</p>
                <p className="text-2xl font-bold text-blue-400">
                  {totalVolume.toFixed(2)} {config.direction === 'buy' ? 'RAMA' : tokenSymbol || 'Tokens'}
                </p>
              </div>
              {tokenLoaded && config.direction === 'buy' && (
                <div className="stat-card">
                  <p className="text-sm text-slate-400">Expected Output</p>
                  <p className="text-xl font-bold text-green-400">
                    ~{(totalVolume * tokenPrice).toFixed(4)} {tokenSymbol}
                  </p>
                </div>
              )}
              <div className="stat-card">
                <p className="text-sm text-slate-400">Estimated Gas</p>
                <p className="text-xl font-bold text-yellow-400">~0.001 RAMA</p>
                <p className="text-sm text-slate-500">per swap</p>
              </div>
            </div>
          </div>

          {/* Live Stats */}
          {isSwapping && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">✓ Success</span>
                  <span className="text-white font-medium">{stats.success}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-400">✗ Failed</span>
                  <span className="text-white font-medium">{stats.failed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-400">◌ Pending</span>
                  <span className="text-white font-medium">{stats.total - stats.success - stats.failed}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${((stats.success + stats.failed) / stats.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Swap Results</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-400">{stats.success} Success</span>
              <span className="text-red-400">{stats.failed} Failed</span>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="bg-slate-800">
                  <th className="table-header">#</th>
                  <th className="table-header">Wallet</th>
                  <th className="table-header">Swap</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">TX</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-800/50 border-b border-slate-800">
                    <td className="table-cell">{index + 1}</td>
                    <td className="table-cell font-mono text-sm">
                      {result.wallet.slice(0, 8)}...{result.wallet.slice(-6)}
                    </td>
                    <td className="table-cell">
                      <span className="text-slate-400">{result.fromToken}</span>
                      <span className="text-blue-400 mx-2">→</span>
                      <span className="text-white">{result.toToken}</span>
                    </td>
                    <td className="table-cell font-semibold">{result.amount}</td>
                    <td className="table-cell">
                      {result.status === 'pending' && (
                        <span className="flex items-center gap-2 text-yellow-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Pending
                        </span>
                      )}
                      {result.status === 'success' && (
                        <span className="flex items-center gap-2 text-green-400">
                          <Check className="w-4 h-4" />
                          Success
                        </span>
                      )}
                      {result.status === 'error' && (
                        <span className="flex items-center gap-2 text-red-400" title={result.error}>
                          <AlertCircle className="w-4 h-4" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      {result.txHash && (
                        <a
                          href={getTxUrl(result.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
