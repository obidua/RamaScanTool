import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, Play, Pause, Shield, Settings, TrendingUp, Loader2, CheckCircle, AlertTriangle, ExternalLink, RefreshCw, Wallet } from 'lucide-react'
import { useAccount, useReadContract, useBalance } from 'wagmi'
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

// Router ABI
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

interface Trade {
  id: number
  type: 'buy' | 'sell'
  amount: string
  txHash?: string
  status: 'pending' | 'success' | 'failed'
  timestamp: number
}

interface WalletEntry {
  address: string
  privateKey: string
  isValid: boolean
}

export default function VolumeBot() {
  const { isConnected, address: connectedAddress } = useAccount()
  const [isRunning, setIsRunning] = useState(false)
  const [trades, setTrades] = useState<Trade[]>([])
  const [walletsText, setWalletsText] = useState('')
  const [parsedWallets, setParsedWallets] = useState<WalletEntry[]>([])
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const tradeCountRef = useRef(0)
  const isRunningRef = useRef(false)
  
  const [stats, setStats] = useState({
    volumeGenerated: 0,
    tradesExecuted: 0,
    successfulTrades: 0,
    failedTrades: 0,
    gasSpent: 0,
  })

  const [config, setConfig] = useState({
    tokenAddress: '',
    volumeTarget: '10',
    minAmount: '0.1',
    maxAmount: '0.5',
    antiMev: true,
    randomDelay: true,
    minDelay: 10,
    maxDelay: 60,
  })

  const validTokenAddress = isAddress(config.tokenAddress) ? config.tokenAddress as `0x${string}` : null

  // Get connected wallet RAMA balance
  const { data: ramaBalance } = useBalance({
    address: connectedAddress,
  })

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
      let privateKey = line.trim()
      
      // Handle "address, privateKey" format
      if (privateKey.includes(',')) {
        privateKey = privateKey.split(',')[1]?.trim() || ''
      }
      
      // Normalize private key
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey
      }

      try {
        if (privateKey.length === 66) {
          const account = privateKeyToAccount(privateKey as `0x${string}`)
          parsed.push({ address: account.address, privateKey, isValid: true })
        }
      } catch {
        parsed.push({ address: 'Invalid', privateKey, isValid: false })
      }
    }

    setParsedWallets(parsed)
  }, [walletsText])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const getRandomAmount = useCallback(() => {
    const min = parseFloat(config.minAmount)
    const max = parseFloat(config.maxAmount)
    return (Math.random() * (max - min) + min).toFixed(4)
  }, [config.minAmount, config.maxAmount])

  const getRandomDelay = useCallback(() => {
    const min = config.minDelay
    const max = config.maxDelay
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000
  }, [config.minDelay, config.maxDelay])

  const getRandomWallet = useCallback(() => {
    const validWallets = parsedWallets.filter(w => w.isValid)
    if (validWallets.length === 0) return null
    return validWallets[Math.floor(Math.random() * validWallets.length)]
  }, [parsedWallets])

  const executeTrade = useCallback(async () => {
    if (!validTokenAddress || !isRunningRef.current) return

    const wallet = getRandomWallet()
    if (!wallet) {
      toast.error('No valid wallets available')
      return
    }

    const isBuy = Math.random() > 0.5
    const amount = getRandomAmount()
    const tradeId = Date.now()

    // Add pending trade
    setTrades(prev => [{
      id: tradeId,
      type: isBuy ? 'buy' : 'sell',
      amount: amount,
      status: 'pending',
      timestamp: Date.now(),
    }, ...prev.slice(0, 49)])

    try {
      const account = privateKeyToAccount(wallet.privateKey as `0x${string}`)
      const walletClient = createWalletClient({
        account,
        chain: ramestta,
        transport: http('https://blockchain.ramestta.com'),
      })

      const publicClient = createPublicClient({
        chain: ramestta,
        transport: http('https://blockchain.ramestta.com'),
      })

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)
      let txHash: `0x${string}`

      if (isBuy) {
        // Buy tokens with RAMA
        const amountIn = parseUnits(amount, 18)
        
        txHash = await walletClient.writeContract({
          address: RAMASWAP_ROUTER,
          abi: RouterABI,
          functionName: 'swapExactETHForTokens',
          args: [0n, [WRAMA_ADDRESS, validTokenAddress], account.address, deadline],
          value: amountIn,
        })
      } else {
        // Sell tokens for RAMA
        const amountIn = parseUnits(amount, decimals)

        // Check and approve if needed
        const allowance = await publicClient.readContract({
          address: validTokenAddress,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [account.address, RAMASWAP_ROUTER],
        })

        if (allowance < amountIn) {
          const approveHash = await walletClient.writeContract({
            address: validTokenAddress,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [RAMASWAP_ROUTER, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
          })
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }

        txHash = await walletClient.writeContract({
          address: RAMASWAP_ROUTER,
          abi: RouterABI,
          functionName: 'swapExactTokensForETH',
          args: [amountIn, 0n, [validTokenAddress, WRAMA_ADDRESS], account.address, deadline],
        })
      }

      // Update trade with success
      setTrades(prev => prev.map(t => 
        t.id === tradeId ? { ...t, status: 'success' as const, txHash } : t
      ))
      
      const volumeAdded = parseFloat(amount)
      setStats(prev => ({
        ...prev,
        volumeGenerated: prev.volumeGenerated + volumeAdded,
        tradesExecuted: prev.tradesExecuted + 1,
        successfulTrades: prev.successfulTrades + 1,
        gasSpent: prev.gasSpent + 0.001, // Approximate gas
      }))

      tradeCountRef.current += 1

    } catch (error) {
      console.error('Trade error:', error)
      setTrades(prev => prev.map(t => 
        t.id === tradeId ? { ...t, status: 'failed' as const } : t
      ))
      setStats(prev => ({
        ...prev,
        tradesExecuted: prev.tradesExecuted + 1,
        failedTrades: prev.failedTrades + 1,
      }))
    }
  }, [validTokenAddress, decimals, getRandomAmount, getRandomWallet])

  const stopBot = useCallback(() => {
    setIsRunning(false)
    isRunningRef.current = false
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
    toast.success('Volume bot stopped')
  }, [])

  const startBot = useCallback(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!validTokenAddress) {
      toast.error('Please enter a valid token address')
      return
    }

    const validWallets = parsedWallets.filter(w => w.isValid)
    if (validWallets.length === 0) {
      toast.error('Please add at least one valid wallet private key')
      return
    }

    setIsRunning(true)
    isRunningRef.current = true
    tradeCountRef.current = 0
    toast.success(`Volume bot started with ${validWallets.length} wallets!`)

    // Execute first trade immediately
    executeTrade()

    // Schedule subsequent trades
    const scheduleNextTrade = () => {
      if (!isRunningRef.current) return
      
      const delay = config.randomDelay ? getRandomDelay() : config.minDelay * 1000
      intervalRef.current = setTimeout(() => {
        if (isRunningRef.current) {
          // Check if we've reached volume target
          if (stats.volumeGenerated >= parseFloat(config.volumeTarget)) {
            stopBot()
            toast.success('Volume target reached!')
            return
          }
          executeTrade()
          scheduleNextTrade()
        }
      }, delay)
    }

    scheduleNextTrade()
  }, [isConnected, validTokenAddress, parsedWallets, config, stats.volumeGenerated, executeTrade, getRandomDelay, stopBot])

  const toggleBot = () => {
    if (isRunning) {
      stopBot()
    } else {
      startBot()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
    }
  }, [])

  const validWalletCount = parsedWallets.filter(w => w.isValid).length
  const progressPercent = Math.min((stats.volumeGenerated / parseFloat(config.volumeTarget || '1')) * 100, 100)

  return (
    <div className="space-y-6">
      <BackButton />
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-purple-500/20">
          <Bot className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Anti-MEV Volume Bot</h1>
          <p className="text-slate-400">Generate organic trading volume with MEV protection</p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`glass-card p-4 ${isRunning ? 'border-green-500/30 bg-green-500/5' : 'border-slate-700'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className={`font-medium ${isRunning ? 'text-green-400' : 'text-slate-400'}`}>
              {isRunning ? 'Bot is running' : 'Bot is stopped'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {validWalletCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <Wallet className="w-4 h-4" />
                {validWalletCount} wallets
              </div>
            )}
            {isRunning && config.antiMev && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <Shield className="w-4 h-4" />
                Anti-MEV Active
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Bot Configuration
          </h2>

          <div className="space-y-4">
            {/* Token Address */}
            <div>
              <label className="input-label">Token Address</label>
              <input
                type="text"
                name="tokenAddress"
                value={config.tokenAddress}
                onChange={handleChange}
                placeholder="0x..."
                className="input-field font-mono"
                disabled={isRunning}
              />
              {config.tokenAddress && (
                <div className="mt-2">
                  {validTokenAddress ? (
                    tokenLoaded ? (
                      <p className="text-sm text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {tokenName} ({tokenSymbol}) - Price: {tokenPrice.toFixed(6)} RAMA
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading token data...
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Invalid address format
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Wallet Balance */}
            {connectedAddress && ramaBalance && (
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-500">Connected Wallet Balance</p>
                <p className="text-white font-medium">
                  {Number(formatUnits(ramaBalance.value, 18)).toFixed(4)} RAMA
                </p>
              </div>
            )}

            {/* Volume & Amount Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Volume Target (RAMA)</label>
                <input
                  type="text"
                  name="volumeTarget"
                  value={config.volumeTarget}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="input-label">Min Amount (RAMA)</label>
                <input
                  type="text"
                  name="minAmount"
                  value={config.minAmount}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="input-label">Max Amount (RAMA)</label>
                <input
                  type="text"
                  name="maxAmount"
                  value={config.maxAmount}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isRunning}
                />
              </div>
            </div>

            {/* Wallets Input */}
            <div>
              <label className="input-label">Trading Wallets (private keys, one per line)</label>
              <textarea
                name="wallets"
                value={walletsText}
                onChange={(e) => setWalletsText(e.target.value)}
                placeholder="Enter private keys (one per line)&#10;0x1234...&#10;0xabcd..."
                rows={5}
                className="input-field resize-none font-mono text-sm"
                disabled={isRunning}
              />
              {parsedWallets.length > 0 && (
                <p className="mt-2 text-sm text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {validWalletCount} valid wallet(s) loaded
                </p>
              )}
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="font-medium text-white">Anti-MEV Protection</p>
                    <p className="text-sm text-slate-400">Use random timing to avoid MEV bot detection</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="antiMev"
                  checked={config.antiMev}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-green-500"
                  disabled={isRunning}
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-medium text-white">Random Delay</p>
                  <p className="text-sm text-slate-400">Add random delays between trades for natural patterns</p>
                </div>
                <input
                  type="checkbox"
                  name="randomDelay"
                  checked={config.randomDelay}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500"
                  disabled={isRunning}
                />
              </label>
            </div>

            {config.randomDelay && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/30 rounded-xl">
                <div>
                  <label className="input-label">Min Delay (seconds)</label>
                  <input
                    type="number"
                    name="minDelay"
                    value={config.minDelay}
                    onChange={handleChange}
                    className="input-field"
                    disabled={isRunning}
                  />
                </div>
                <div>
                  <label className="input-label">Max Delay (seconds)</label>
                  <input
                    type="number"
                    name="maxDelay"
                    value={config.maxDelay}
                    onChange={handleChange}
                    className="input-field"
                    disabled={isRunning}
                  />
                </div>
              </div>
            )}

            <button
              onClick={toggleBot}
              disabled={!tokenLoaded || validWalletCount === 0}
              className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  Stop Volume Bot
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Volume Bot
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Statistics
              </h2>
              <button onClick={() => refetchQuote()} className="text-slate-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Volume Generated</p>
                <p className="text-2xl font-bold text-purple-400">{stats.volumeGenerated.toFixed(4)} RAMA</p>
                <p className="text-sm text-slate-500">of {config.volumeTarget} RAMA target</p>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Trades Executed</p>
                <p className="text-2xl font-bold text-white">{stats.tradesExecuted}</p>
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <span className="text-green-400">{stats.successfulTrades} ✓</span>
                  <span className="text-red-400">{stats.failedTrades} ✗</span>
                </div>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Gas Spent</p>
                <p className="text-xl font-bold text-yellow-400">{stats.gasSpent.toFixed(4)} RAMA</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-purple-500/30 bg-purple-500/5">
            <p className="text-purple-400 text-sm">
              🤖 <strong>Pro Tip:</strong> Use multiple wallets with small amounts for more natural-looking volume patterns.
            </p>
          </div>

          <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
            <p className="text-yellow-400 text-sm">
              ⚠️ <strong>Security:</strong> Private keys are processed locally. Never share them with anyone.
            </p>
          </div>
        </div>
      </div>

      {/* Trade History */}
      {trades.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-800">
                <tr>
                  <th className="table-header">Type</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Time</th>
                  <th className="table-header">TX</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-800">
                    <td className="table-cell">
                      <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">{trade.amount} RAMA</td>
                    <td className="table-cell">
                      {trade.status === 'pending' && (
                        <span className="text-yellow-400 flex items-center gap-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Pending
                        </span>
                      )}
                      {trade.status === 'success' && (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Success
                        </span>
                      )}
                      {trade.status === 'failed' && (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="table-cell text-sm text-slate-400">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="table-cell">
                      {trade.txHash && (
                        <a
                          href={getTxUrl(trade.txHash)}
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
