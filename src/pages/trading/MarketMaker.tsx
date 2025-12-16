import { useState } from 'react'
import { BarChart3, Play, Pause, Settings, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'

export default function MarketMaker() {
  const { isConnected } = useAccount()
  const [isRunning, setIsRunning] = useState(false)
  const [config, setConfig] = useState({
    tokenAddress: '',
    pairAddress: '',
    minAmount: '0.1',
    maxAmount: '1',
    interval: 30,
    totalTrades: 100,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setConfig(prev => ({ ...prev, [name]: value }))
  }

  const toggleBot = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (isRunning) {
      setIsRunning(false)
      toast.success('Market maker stopped')
    } else {
      setIsRunning(true)
      toast.success('Market maker started')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Market Maker - Batch Swap</h1>
        <p className="text-slate-400 mt-1">Execute automated batch trading operations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Configuration</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Token Address</label>
                <input
                  type="text"
                  name="tokenAddress"
                  value={config.tokenAddress}
                  onChange={handleChange}
                  placeholder="0x..."
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="input-label">Pair Address (LP)</label>
                <input
                  type="text"
                  name="pairAddress"
                  value={config.pairAddress}
                  onChange={handleChange}
                  placeholder="0x..."
                  className="input-field font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="input-label">Min Amount (ETH)</label>
                <input
                  type="text"
                  name="minAmount"
                  value={config.minAmount}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Max Amount (ETH)</label>
                <input
                  type="text"
                  name="maxAmount"
                  value={config.maxAmount}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Interval (seconds)</label>
                <input
                  type="number"
                  name="interval"
                  value={config.interval}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Total Trades</label>
                <input
                  type="number"
                  name="totalTrades"
                  value={config.totalTrades}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="input-label">DEX</label>
              <select className="input-field">
                <option>RamaSwap</option>
                <option>Uniswap V2</option>
                <option>Uniswap V3</option>
                <option>PancakeSwap</option>
                <option>SushiSwap</option>
              </select>
            </div>

            <button
              onClick={toggleBot}
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
            <h2 className="text-lg font-semibold text-white mb-4">Statistics</h2>
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Status</p>
                <p className={`text-xl font-bold ${isRunning ? 'text-green-400' : 'text-slate-400'}`}>
                  {isRunning ? 'Running' : 'Stopped'}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Trades Executed</p>
                <p className="text-xl font-bold text-white">0 / {config.totalTrades}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Volume Generated</p>
                <p className="text-xl font-bold text-blue-400">0 ETH</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Gas Spent</p>
                <p className="text-xl font-bold text-yellow-400">0 ETH</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-blue-500/30 bg-blue-500/5">
            <p className="text-blue-400 text-sm">
              💡 <strong>Tip:</strong> Use random intervals and amounts to make trading patterns appear more natural.
            </p>
          </div>
        </div>
      </div>

      {/* Trade History */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Trade History</h2>
        <div className="text-center py-8 text-slate-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4" />
          <p>No trades executed yet. Start the market maker to begin.</p>
        </div>
      </div>
    </div>
  )
}
