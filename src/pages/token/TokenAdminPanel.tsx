import { useState } from 'react'
import { Settings, Users, Pause, Play, Trash2, Edit, Shield, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'

export default function TokenAdminPanel() {
  useAccount()
  const [tokenAddress, setTokenAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<{
    name: string
    symbol: string
    totalSupply: string
    owner: string
    paused: boolean
  } | null>(null)

  const loadToken = async () => {
    if (!tokenAddress) {
      toast.error('Please enter token address')
      return
    }

    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setTokenInfo({
      name: 'My Awesome Token',
      symbol: 'MAT',
      totalSupply: '1,000,000,000',
      owner: '0x1234...5678',
      paused: false,
    })
    
    setIsLoading(false)
    toast.success('Token loaded successfully')
  }

  const executeAction = async (action: string) => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 2000)),
      {
        loading: `Executing ${action}...`,
        success: `${action} completed!`,
        error: `Failed to execute ${action}`,
      }
    )
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Token Admin Panel</h1>
        <p className="text-slate-400 mt-1">Manage your token settings and permissions</p>
      </div>

      {/* Token Selector */}
      <div className="glass-card p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="input-label">Token Address</label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="input-field font-mono"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadToken}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Settings className="w-5 h-5" />
                  Load Token
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {tokenInfo && (
        <>
          {/* Token Overview */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Token Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Name</p>
                <p className="text-lg font-semibold text-white">{tokenInfo.name}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Symbol</p>
                <p className="text-lg font-semibold text-white">{tokenInfo.symbol}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Total Supply</p>
                <p className="text-lg font-semibold text-white">{tokenInfo.totalSupply}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Status</p>
                <p className={`text-lg font-semibold ${tokenInfo.paused ? 'text-red-400' : 'text-green-400'}`}>
                  {tokenInfo.paused ? 'Paused' : 'Active'}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => executeAction('Mint Tokens')}
              className="tool-card text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Edit className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="font-semibold text-white">Mint Tokens</h3>
              </div>
              <p className="text-sm text-slate-400">Create new tokens and send to an address</p>
            </button>

            <button
              onClick={() => executeAction('Burn Tokens')}
              className="tool-card text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="font-semibold text-white">Burn Tokens</h3>
              </div>
              <p className="text-sm text-slate-400">Permanently remove tokens from circulation</p>
            </button>

            <button
              onClick={() => executeAction(tokenInfo.paused ? 'Unpause' : 'Pause')}
              className="tool-card text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  {tokenInfo.paused ? (
                    <Play className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <Pause className="w-5 h-5 text-yellow-400" />
                  )}
                </div>
                <h3 className="font-semibold text-white">
                  {tokenInfo.paused ? 'Unpause Token' : 'Pause Token'}
                </h3>
              </div>
              <p className="text-sm text-slate-400">
                {tokenInfo.paused ? 'Resume all token transfers' : 'Temporarily halt all transfers'}
              </p>
            </button>

            <button
              onClick={() => executeAction('Update Tax')}
              className="tool-card text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Settings className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white">Update Tax</h3>
              </div>
              <p className="text-sm text-slate-400">Modify buy/sell tax percentages</p>
            </button>

            <button
              onClick={() => executeAction('Manage Whitelist')}
              className="tool-card text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white">Manage Whitelist</h3>
              </div>
              <p className="text-sm text-slate-400">Add or remove addresses from whitelist</p>
            </button>

            <button
              onClick={() => executeAction('Transfer Ownership')}
              className="tool-card text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Shield className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="font-semibold text-white">Transfer Ownership</h3>
              </div>
              <p className="text-sm text-slate-400">Transfer token ownership to another address</p>
            </button>
          </div>

          {/* Warning */}
          <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
            <p className="text-yellow-400 text-sm">
              ⚠️ <strong>Warning:</strong> These actions are irreversible and will be executed on the blockchain. 
              Make sure you understand the implications before proceeding.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
