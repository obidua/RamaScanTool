import { useState } from 'react'
import { Lock, Unlock, Clock, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'

interface LockedToken {
  id: string
  token: string
  symbol: string
  amount: string
  unlockDate: string
  status: 'locked' | 'unlockable' | 'unlocked'
}

const mockLocks: LockedToken[] = [
  { id: '1', token: '0x1234...5678', symbol: 'MYRAMA', amount: '1,000,000', unlockDate: '2025-06-01', status: 'locked' },
  { id: '2', token: '0xabcd...efgh', symbol: 'LP-RAMA', amount: '50,000', unlockDate: '2024-12-15', status: 'unlockable' },
]

export default function TokenLocker() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
  const [isLocking, setIsLocking] = useState(false)
  const [locks] = useState<LockedToken[]>(mockLocks)
  const [formData, setFormData] = useState({
    tokenAddress: '',
    amount: '',
    unlockDate: '',
    vestingEnabled: false,
    vestingPeriod: 30,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const lockTokens = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsLocking(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLocking(false)
    toast.success('Tokens locked successfully!')
    setActiveTab('manage')
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Token Locker</h1>
        <p className="text-slate-400 mt-1">Lock tokens for vesting, LP locks, or team tokens</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'create' 
              ? 'bg-blue-500 text-white' 
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Create Lock
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'manage' 
              ? 'bg-blue-500 text-white' 
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Manage Locks ({locks.length})
        </button>
      </div>

      {/* Create Lock */}
      {activeTab === 'create' && (
        <div className="glass-card p-6 max-w-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Create New Lock</h2>

          <div className="space-y-4">
            <div>
              <label className="input-label">Token Address</label>
              <input
                type="text"
                name="tokenAddress"
                value={formData.tokenAddress}
                onChange={handleChange}
                placeholder="0x..."
                className="input-field font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Amount to Lock</label>
                <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="1000000"
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Unlock Date</label>
                <input
                  type="date"
                  name="unlockDate"
                  value={formData.unlockDate}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl cursor-pointer">
              <div>
                <p className="font-medium text-white">Enable Vesting</p>
                <p className="text-sm text-slate-400">Release tokens gradually over time</p>
              </div>
              <input
                type="checkbox"
                name="vestingEnabled"
                checked={formData.vestingEnabled}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500"
              />
            </label>

            {formData.vestingEnabled && (
              <div>
                <label className="input-label">Vesting Period (days)</label>
                <input
                  type="number"
                  name="vestingPeriod"
                  value={formData.vestingPeriod}
                  onChange={handleChange}
                  min={1}
                  className="input-field"
                />
              </div>
            )}

            <div className="stat-card">
              <p className="text-sm text-slate-400">Lock Fee</p>
              <p className="text-xl font-bold text-white">10 RAMA</p>
            </div>

            <button
              onClick={lockTokens}
              disabled={isLocking || !isConnected}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isLocking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Lock Tokens
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manage Locks */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {locks.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Lock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No locked tokens found</p>
              <button
                onClick={() => setActiveTab('create')}
                className="btn-primary mt-4"
              >
                Create Your First Lock
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locks.map(lock => (
                <div key={lock.id} className="glass-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${
                        lock.status === 'locked' ? 'bg-blue-500/20' :
                        lock.status === 'unlockable' ? 'bg-green-500/20' : 'bg-slate-500/20'
                      }`}>
                        {lock.status === 'locked' ? (
                          <Lock className="w-6 h-6 text-blue-400" />
                        ) : (
                          <Unlock className="w-6 h-6 text-green-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{lock.symbol}</h3>
                        <p className="text-xs text-slate-500 font-mono">{lock.token}</p>
                      </div>
                    </div>
                    <span className={`badge ${
                      lock.status === 'locked' ? 'badge-chain' :
                      lock.status === 'unlockable' ? 'badge-new' : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {lock.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500">Amount Locked</p>
                      <p className="text-lg font-semibold text-white">{lock.amount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Unlock Date</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <p className="text-lg font-semibold text-white">{lock.unlockDate}</p>
                      </div>
                    </div>
                  </div>

                  {lock.status === 'unlockable' && (
                    <button className="w-full btn-primary flex items-center justify-center gap-2">
                      <Unlock className="w-5 h-5" />
                      Withdraw Tokens
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
