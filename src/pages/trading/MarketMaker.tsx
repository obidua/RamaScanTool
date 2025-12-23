import { useState, useEffect, useRef, useCallback } from 'react'
import { BarChart3, Play, Pause, Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, ArrowUpDown, ExternalLink, Zap } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi'
import { formatUnits, parseUnits, isAddress } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import { getTxUrl } from '../../config/contracts'

// RamaSwap Router address on Ramestta
const RAMASWAP_ROUTER = '0x1bA66756C0efEB40cfF04F3514BCa9E507666750' as const
const WRAMA_ADDRESS = '0x271a5203B664eDF206Eaba8C71eE209a353FD1cA' as const

// Uniswap V2 Router ABI (RamaSwap uses same interface)
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
  {
    inputs: [],
    name: 'WETH',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
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
  amountOut: string
  txHash: string
  status: 'pending' | 'success' | 'failed'
  timestamp: number
}

type SwapDirection = 'buy' | 'sell' | 'random'

export default function MarketMaker() {
  const { isConnected, address: userAddress } = useAccount()
  const [isRunning, setIsRunning] = useState(false)
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState({
    tradesExecuted: 0,
    totalVolume: 0,
    gasSpent: 0,
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const tradeCountRef = useRef(0)

  const [config, setConfig] = useState({
    tokenAddress: '',
    minAmount: '0.1',
    maxAmount: '1',
    minInterval: 30,
    maxInterval: 60,
    totalTrades: 100,
    slippage: 5, // 5%
    direction: 'random' as SwapDirection,
  })

  const validTokenAddress = isAddress(config.tokenAddress) ? config.tokenAddress as `0x${string}` : null

  // Get RAMA balance
  const { data: ramaBalance } = useBalance({
    address: userAddress,
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

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: validTokenAddress!,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!validTokenAddress && !!userAddress },
  })

  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: validTokenAddress!,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, RAMASWAP_ROUTER] : undefined,
    query: { enabled: !!validTokenAddress && !!userAddress },
  })

  // Get price quote
  const { data: quoteData, refetch: refetchQuote } = useReadContract({
    address: RAMASWAP_ROUTER,
    abi: RouterABI,
    functionName: 'getAmountsOut',
    args: validTokenAddress ? [parseUnits('1', 18), [WRAMA_ADDRESS, validTokenAddress]] : undefined,
    query: { enabled: !!validTokenAddress },
  })

  // Write contract hooks
  const { data: swapHash, writeContract: writeSwap, isPending: isSwapping } = useWriteContract()
  const { data: approveHash, writeContract: writeApprove, isPending: isApproving } = useWriteContract()

  const { isLoading: isSwapConfirming, isSuccess: swapSuccess } = useWaitForTransactionReceipt({ hash: swapHash })
  const { isLoading: isApproveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  const decimals = tokenDecimals ?? 18
  const tokenLoaded = validTokenAddress && tokenName && tokenSymbol
  const needsApproval = tokenBalance && tokenAllowance !== undefined ? tokenAllowance < tokenBalance : false

  // Calculate price from quote
  const tokenPrice = quoteData ? Number(formatUnits(quoteData[1], decimals)) : 0

  // Handle approval success
  useEffect(() => {
    if (approveSuccess) {
      toast.success('Token approved for trading!')
      refetchAllowance()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess])

  // Handle swap success
  useEffect(() => {
    if (swapSuccess && swapHash) {
      // Update the last pending trade
      setTrades(prev => prev.map(t => 
        t.txHash === swapHash ? { ...t, status: 'success' as const } : t
      ))
      setStats(prev => ({
        ...prev,
        tradesExecuted: prev.tradesExecuted + 1,
      }))
      refetchTokenBalance()
      refetchQuote()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapSuccess, swapHash])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setConfig(prev => ({ ...prev, [name]: value }))
  }

  const approveToken = async () => {
    if (!validTokenAddress) return

    try {
      writeApprove({
        address: validTokenAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [RAMASWAP_ROUTER, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
      })
    } catch (error) {
      console.error('Approve error:', error)
      toast.error('Failed to approve token')
    }
  }

  const getRandomAmount = useCallback(() => {
    const min = parseFloat(config.minAmount)
    const max = parseFloat(config.maxAmount)
    return (Math.random() * (max - min) + min).toFixed(4)
  }, [config.minAmount, config.maxAmount])

  const getRandomInterval = useCallback(() => {
    const min = config.minInterval
    const max = config.maxInterval
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000
  }, [config.minInterval, config.maxInterval])

  const getTradeDirection = useCallback((): 'buy' | 'sell' => {
    if (config.direction === 'random') {
      return Math.random() > 0.5 ? 'buy' : 'sell'
    }
    return config.direction
  }, [config.direction])

  const executeTrade = useCallback(async () => {
    if (!validTokenAddress || !userAddress) return

    const direction = getTradeDirection()
    const amount = getRandomAmount()
    const tradeId = Date.now()

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 minutes
      // Note: slippage is configured but we use minOut=0 for aggressive market making
      // const slippageMultiplier = (100 - config.slippage) / 100

      if (direction === 'buy') {
        // Buy tokens with RAMA
        const amountIn = parseUnits(amount, 18)
        const minOut = 0n // For simplicity, we accept any amount (high slippage for market making)

        // Add pending trade
        setTrades(prev => [{
          id: tradeId,
          type: 'buy',
          amount: amount,
          amountOut: '...',
          txHash: '',
          status: 'pending',
          timestamp: Date.now(),
        }, ...prev.slice(0, 49)])

        writeSwap({
          address: RAMASWAP_ROUTER,
          abi: RouterABI,
          functionName: 'swapExactETHForTokens',
          args: [minOut, [WRAMA_ADDRESS, validTokenAddress], userAddress, deadline],
          value: amountIn,
        })

        setStats(prev => ({ ...prev, totalVolume: prev.totalVolume + parseFloat(amount) }))

      } else {
        // Sell tokens for RAMA
        const amountIn = parseUnits(amount, decimals)

        // Add pending trade
        setTrades(prev => [{
          id: tradeId,
          type: 'sell',
          amount: amount,
          amountOut: '...',
          txHash: '',
          status: 'pending',
          timestamp: Date.now(),
        }, ...prev.slice(0, 49)])

        writeSwap({
          address: RAMASWAP_ROUTER,
          abi: RouterABI,
          functionName: 'swapExactTokensForETH',
          args: [amountIn, 0n, [validTokenAddress, WRAMA_ADDRESS], userAddress, deadline],
        })

        setStats(prev => ({ ...prev, totalVolume: prev.totalVolume + parseFloat(amount) * tokenPrice }))
      }

      tradeCountRef.current += 1

      // Check if we've reached the trade limit
      if (tradeCountRef.current >= config.totalTrades) {
        stopBot()
        toast.success('Market maker completed all trades!')
      }

    } catch (error) {
      console.error('Trade error:', error)
      setTrades(prev => prev.map(t => 
        t.id === tradeId ? { ...t, status: 'failed' as const } : t
      ))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validTokenAddress, userAddress, config, decimals, tokenPrice, getRandomAmount, getTradeDirection])

  const startBot = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!validTokenAddress) {
      toast.error('Please enter a valid token address')
      return
    }

    if (needsApproval && config.direction !== 'buy') {
      toast.error('Please approve the token first for selling')
      return
    }

    setIsRunning(true)
    tradeCountRef.current = 0
    toast.success('Market maker started!')

    // Execute first trade immediately
    executeTrade()

    // Schedule subsequent trades with random intervals
    const scheduleNextTrade = () => {
      if (!isRunning) return
      
      const interval = getRandomInterval()
      intervalRef.current = setTimeout(() => {
        if (tradeCountRef.current < config.totalTrades) {
          executeTrade()
          scheduleNextTrade()
        }
      }, interval)
    }

    scheduleNextTrade()
  }

  const stopBot = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
    toast.success('Market maker stopped')
  }

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
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
    }
  }, [])

  const isProcessing = isSwapping || isSwapConfirming || isApproving || isApproveConfirming

  return (
    <div className="space-y-6">
      <BackButton />
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Zap className="w-7 h-7 text-yellow-400" />
          Market Maker - Batch Swap
        </h1>
        <p className="text-slate-400 mt-1">Execute automated batch trading operations on RamaSwap</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Configuration</h2>

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

            {/* Balances */}
            {tokenLoaded && userAddress && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">RAMA Balance</p>
                  <p className="text-white font-medium">
                    {ramaBalance ? Number(formatUnits(ramaBalance.value, 18)).toFixed(4) : '0'} RAMA
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{tokenSymbol} Balance</p>
                  <p className="text-white font-medium">
                    {tokenBalance ? Number(formatUnits(tokenBalance, decimals)).toFixed(4) : '0'} {tokenSymbol}
                  </p>
                </div>
              </div>
            )}

            {/* Amount Settings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div>
                <label className="input-label">Min Interval (sec)</label>
                <input
                  type="number"
                  name="minInterval"
                  value={config.minInterval}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="input-label">Max Interval (sec)</label>
                <input
                  type="number"
                  name="maxInterval"
                  value={config.maxInterval}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isRunning}
                />
              </div>
            </div>

            {/* Trade Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Total Trades</label>
                <input
                  type="number"
                  name="totalTrades"
                  value={config.totalTrades}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="input-label">Slippage (%)</label>
                <input
                  type="number"
                  name="slippage"
                  value={config.slippage}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isRunning}
                />
              </div>
              <div>
                <label className="input-label">Trade Direction</label>
                <select 
                  name="direction"
                  value={config.direction}
                  onChange={handleChange}
                  className="input-field"
                  disabled={isRunning}
                >
                  <option value="random">Random (Buy & Sell)</option>
                  <option value="buy">Buy Only</option>
                  <option value="sell">Sell Only</option>
                </select>
              </div>
            </div>

            {/* Approval Button */}
            {tokenLoaded && needsApproval && config.direction !== 'buy' && (
              <button
                onClick={approveToken}
                disabled={isProcessing}
                className="w-full btn-secondary flex items-center justify-center gap-2"
              >
                {isApproving || isApproveConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isApproving ? 'Confirm in wallet...' : 'Approving...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Approve {tokenSymbol} for Trading
                  </>
                )}
              </button>
            )}

            {/* Start/Stop Button */}
            <button
              onClick={toggleBot}
              disabled={isProcessing || !tokenLoaded}
              className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'btn-primary'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  Stop Market Maker
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Market Maker
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Statistics</h2>
              <button onClick={() => refetchQuote()} className="text-slate-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Status</p>
                <p className={`text-xl font-bold flex items-center gap-2 ${isRunning ? 'text-green-400' : 'text-slate-400'}`}>
                  {isRunning ? (
                    <>
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Running
                    </>
                  ) : 'Stopped'}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Trades Executed</p>
                <p className="text-xl font-bold text-white">
                  {stats.tradesExecuted} / {config.totalTrades}
                </p>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${(stats.tradesExecuted / config.totalTrades) * 100}%` }}
                  />
                </div>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Volume Generated</p>
                <p className="text-xl font-bold text-blue-400">
                  {stats.totalVolume.toFixed(4)} RAMA
                </p>
              </div>
              {tokenLoaded && (
                <div className="stat-card">
                  <p className="text-sm text-slate-400">Token Price</p>
                  <p className="text-xl font-bold text-green-400">
                    {tokenPrice.toFixed(6)} RAMA
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-4 border-blue-500/30 bg-blue-500/5">
            <p className="text-blue-400 text-sm">
              💡 <strong>Tip:</strong> Use random intervals and amounts to make trading patterns appear more natural.
            </p>
          </div>

          <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
            <p className="text-yellow-400 text-sm">
              ⚠️ <strong>Warning:</strong> Market making involves risks. You may lose funds due to price volatility or failed transactions.
            </p>
          </div>
        </div>
      </div>

      {/* Trade History */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Trade History</h2>
        {trades.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4" />
            <p>No trades executed yet. Start the market maker to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3">TX</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 20).map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-800">
                    <td className="py-3 pr-4">
                      <span className={`flex items-center gap-2 ${
                        trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <ArrowUpDown className="w-4 h-4" />
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-white">
                      {trade.amount} {trade.type === 'buy' ? 'RAMA' : tokenSymbol}
                    </td>
                    <td className="py-3 pr-4">
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
                          <XCircle className="w-4 h-4" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-400 text-sm">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3">
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
        )}
      </div>
    </div>
  )
}
