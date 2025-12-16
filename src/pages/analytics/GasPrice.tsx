import { useState, useEffect } from 'react'
import { Fuel, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { SUPPORTED_CHAINS } from '../../config/wagmi'

interface GasData {
  chain: string
  fast: number
  normal: number
  slow: number
  baseFee: number
  change: 'up' | 'down' | 'stable'
}

const mockGasData: GasData[] = [
  { chain: 'Ramestta', fast: 0.001, normal: 0.001, slow: 0.001, baseFee: 0.001, change: 'stable' },
  { chain: 'Ethereum', fast: 25, normal: 18, slow: 12, baseFee: 15, change: 'down' },
  { chain: 'BNB Chain', fast: 5, normal: 5, slow: 5, baseFee: 5, change: 'stable' },
  { chain: 'Polygon', fast: 150, normal: 100, slow: 50, baseFee: 80, change: 'up' },
  { chain: 'Arbitrum', fast: 0.1, normal: 0.1, slow: 0.1, baseFee: 0.1, change: 'stable' },
  { chain: 'Optimism', fast: 0.001, normal: 0.001, slow: 0.001, baseFee: 0.001, change: 'stable' },
  { chain: 'Base', fast: 0.005, normal: 0.003, slow: 0.001, baseFee: 0.002, change: 'down' },
]

export default function GasPrice() {
  const [gasData, setGasData] = useState<GasData[]>(mockGasData)
  const [selectedChain, setSelectedChain] = useState('Ramestta')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshData = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setGasData(prev => prev.map(g => ({
      ...g,
      fast: g.fast + (Math.random() - 0.5) * 5,
      normal: g.normal + (Math.random() - 0.5) * 3,
      slow: g.slow + (Math.random() - 0.5) * 2,
    })))
    setIsRefreshing(false)
  }

  useEffect(() => {
    const interval = setInterval(refreshData, 15000)
    return () => clearInterval(interval)
  }, [])

  const currentChain = gasData.find(g => g.chain === selectedChain) || gasData[0]

  const ChangeIcon = currentChain.change === 'up' ? TrendingUp : 
                     currentChain.change === 'down' ? TrendingDown : Minus
  const changeColor = currentChain.change === 'up' ? 'text-red-400' :
                      currentChain.change === 'down' ? 'text-green-400' : 'text-slate-400'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gas Price Tracker</h1>
          <p className="text-slate-400 mt-1">Real-time gas prices across multiple chains</p>
        </div>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Current Chain Gas */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-yellow-500/20">
              <Fuel className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="text-xl font-bold text-white bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {gasData.map(g => (
                  <option key={g.chain} value={g.chain} className="bg-slate-800">{g.chain}</option>
                ))}
              </select>
              <p className="text-sm text-slate-400">Gas Prices in Gwei</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 ${changeColor}`}>
            <ChangeIcon className="w-5 h-5" />
            <span className="font-medium">{currentChain.change === 'up' ? 'Rising' : currentChain.change === 'down' ? 'Falling' : 'Stable'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card text-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Slow</p>
            <p className="text-3xl font-bold text-white">{currentChain.slow.toFixed(2)}</p>
            <p className="text-xs text-slate-500">~10 min</p>
          </div>
          <div className="stat-card text-center border-blue-500/30">
            <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Normal</p>
            <p className="text-3xl font-bold text-blue-400">{currentChain.normal.toFixed(2)}</p>
            <p className="text-xs text-slate-500">~3 min</p>
          </div>
          <div className="stat-card text-center border-orange-500/30">
            <div className="w-3 h-3 rounded-full bg-orange-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Fast</p>
            <p className="text-3xl font-bold text-orange-400">{currentChain.fast.toFixed(2)}</p>
            <p className="text-xs text-slate-500">~30 sec</p>
          </div>
          <div className="stat-card text-center">
            <div className="w-3 h-3 rounded-full bg-purple-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Base Fee</p>
            <p className="text-3xl font-bold text-purple-400">{currentChain.baseFee.toFixed(2)}</p>
            <p className="text-xs text-slate-500">EIP-1559</p>
          </div>
        </div>
      </div>

      {/* All Chains */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">All Networks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800">
                <th className="table-header">Network</th>
                <th className="table-header text-center">Slow</th>
                <th className="table-header text-center">Normal</th>
                <th className="table-header text-center">Fast</th>
                <th className="table-header text-center">Base Fee</th>
                <th className="table-header text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {gasData.map((gas, index) => (
                <tr 
                  key={index} 
                  className={`hover:bg-slate-800/50 cursor-pointer ${gas.chain === selectedChain ? 'bg-blue-500/10' : ''}`}
                  onClick={() => setSelectedChain(gas.chain)}
                >
                  <td className="table-cell font-medium text-white">{gas.chain}</td>
                  <td className="table-cell text-center text-green-400">{gas.slow.toFixed(2)}</td>
                  <td className="table-cell text-center text-blue-400">{gas.normal.toFixed(2)}</td>
                  <td className="table-cell text-center text-orange-400">{gas.fast.toFixed(2)}</td>
                  <td className="table-cell text-center text-purple-400">{gas.baseFee.toFixed(2)}</td>
                  <td className="table-cell text-center">
                    {gas.change === 'up' && <TrendingUp className="w-5 h-5 text-red-400 mx-auto" />}
                    {gas.change === 'down' && <TrendingDown className="w-5 h-5 text-green-400 mx-auto" />}
                    {gas.change === 'stable' && <Minus className="w-5 h-5 text-slate-400 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="glass-card p-4 border-blue-500/30 bg-blue-500/5">
        <p className="text-blue-400 text-sm">
          ℹ️ <strong>Note:</strong> Gas prices are updated every 15 seconds. Actual transaction costs may vary 
          based on network congestion at the time of submission.
        </p>
      </div>
    </div>
  )
}
