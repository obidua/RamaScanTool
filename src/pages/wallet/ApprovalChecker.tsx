import { useState } from 'react'
import { Shield, AlertTriangle, Check, Loader2, ExternalLink } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'

interface Approval {
  token: string
  symbol: string
  spender: string
  spenderName: string
  allowance: string
  risk: 'low' | 'medium' | 'high'
}

const mockApprovals: Approval[] = [
  { token: '0x1234...5678', symbol: 'RUSDT', spender: '0xabc...def', spenderName: 'RamaSwap', allowance: 'Unlimited', risk: 'low' },
  { token: '0x2345...6789', symbol: 'WRAMA', spender: '0xbcd...efg', spenderName: 'Unknown', allowance: 'Unlimited', risk: 'high' },
  { token: '0x3456...7890', symbol: 'RDAI', spender: '0xcde...fgh', spenderName: 'RamaDEX', allowance: '1,000', risk: 'low' },
  { token: '0x4567...8901', symbol: 'RLINK', spender: '0xdef...ghi', spenderName: 'Suspicious Contract', allowance: 'Unlimited', risk: 'high' },
]

export default function ApprovalChecker() {
  const { address, isConnected } = useAccount()
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedChain, setSelectedChain] = useState('1370')

  const checkApprovals = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setApprovals(mockApprovals)
    setIsLoading(false)
    toast.success('Found 4 token approvals')
  }

  const revokeApproval = async (approval: Approval) => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 2000)),
      {
        loading: `Revoking ${approval.symbol} approval...`,
        success: `${approval.symbol} approval revoked!`,
        error: 'Failed to revoke approval',
      }
    )
  }

  const riskColor = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
  }

  const riskBg = {
    low: 'bg-green-500/20',
    medium: 'bg-yellow-500/20',
    high: 'bg-red-500/20',
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Approval Checker</h1>
        <p className="text-slate-400 mt-1">Check and revoke token approvals to protect your assets</p>
      </div>

      {/* Check Section */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="input-label">Wallet Address</label>
            <input
              type="text"
              value={address || ''}
              placeholder="Connect wallet or enter address"
              className="input-field"
              readOnly={isConnected}
            />
          </div>
          <div className="w-full md:w-48">
            <label className="input-label">Chain</label>
            <NetworkSelector 
              value={selectedChain}
              onChange={setSelectedChain}
            />
          </div>
          <button
            onClick={checkApprovals}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Check Approvals
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {approvals.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{approvals.length}</p>
                <p className="text-sm text-slate-400">Total Approvals</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">
                  {approvals.filter(a => a.risk === 'high').length}
                </p>
                <p className="text-sm text-slate-400">High Risk</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {approvals.filter(a => a.risk === 'low').length}
                </p>
                <p className="text-sm text-slate-400">Safe</p>
              </div>
            </div>
          </div>

          {/* Approvals Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Token Approvals</h2>
              <button className="btn-outline text-red-400 border-red-500 hover:bg-red-500/10 text-sm py-2">
                Revoke All Risky
              </button>
            </div>
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
                  {approvals.map((approval, index) => (
                    <tr key={index} className="hover:bg-slate-800/50">
                      <td className="table-cell">
                        <div>
                          <p className="font-semibold text-white">{approval.symbol}</p>
                          <p className="text-xs text-slate-500 font-mono">{approval.token}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="text-slate-300">{approval.spenderName}</p>
                          <p className="text-xs text-slate-500 font-mono">{approval.spender}</p>
                        </div>
                      </td>
                      <td className="table-cell font-semibold text-white">{approval.allowance}</td>
                      <td className="table-cell">
                        <span className={`badge ${riskBg[approval.risk]} ${riskColor[approval.risk]}`}>
                          {approval.risk.toUpperCase()}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => revokeApproval(approval)}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                          >
                            Revoke
                          </button>
                          <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Info Box */}
      <div className="glass-card p-4 border-blue-500/30 bg-blue-500/5">
        <p className="text-blue-400 text-sm">
          ℹ️ <strong>What are token approvals?</strong> When you interact with DeFi protocols, you often give them permission 
          to spend your tokens. Unlimited approvals can be risky if the contract is compromised. Regularly check and revoke 
          unnecessary approvals to protect your assets.
        </p>
      </div>
    </div>
  )
}
