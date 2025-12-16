import { useState } from 'react'
import { Bot, Play, Pause, Shield, Settings, TrendingUp } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'

export default function VolumeBot() {
  const { isConnected } = useAccount()
  const [isRunning, setIsRunning] = useState(false)
  const [config, setConfig] = useState({
    tokenAddress: '',
    volumeTarget: '10',
    timeFrame: '24',
    antiMev: true,
    randomDelay: true,
    minDelay: 10,
    maxDelay: 60,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const toggleBot = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsRunning(!isRunning)
    toast.success(isRunning ? 'Volume bot stopped' : 'Volume bot started with Anti-MEV protection')
  }

  return (
    <div className="space-y-6">
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
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Shield className="w-4 h-4" />
              Anti-MEV Active
            </div>
          )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Volume Target (RAMA)</label>
                <input
                  type="text"
                  name="volumeTarget"
                  value={config.volumeTarget}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Time Frame (hours)</label>
                <input
                  type="text"
                  name="timeFrame"
                  value={config.timeFrame}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl cursor-pointer">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="font-medium text-white">Anti-MEV Protection</p>
                    <p className="text-sm text-slate-400">Protect trades from MEV bots and sandwich attacks</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="antiMev"
                  checked={config.antiMev}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-green-500"
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
                  />
                </div>
              </div>
            )}

            <button
              onClick={toggleBot}
              className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white'
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
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Statistics
            </h2>
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Volume Generated</p>
                <p className="text-2xl font-bold text-purple-400">0 ETH</p>
                <p className="text-sm text-slate-500">of {config.volumeTarget} ETH target</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Trades Executed</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">MEV Attacks Blocked</p>
                <p className="text-2xl font-bold text-green-400">0</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Gas Spent</p>
                <p className="text-xl font-bold text-yellow-400">0 ETH</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-purple-500/30 bg-purple-500/5">
            <p className="text-purple-400 text-sm">
              🤖 <strong>Pro Tip:</strong> Enable Anti-MEV protection to prevent sandwich attacks and ensure fair execution prices.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
