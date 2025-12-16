import { useState } from 'react'
import { Users, Search, Download, Loader2, PieChart } from 'lucide-react'
import toast from 'react-hot-toast'

interface Holder {
  rank: number
  address: string
  balance: string
  percentage: number
  tag?: string
}

const mockHolders: Holder[] = [
  { rank: 1, address: '0x1234...5678', balance: '100,000,000', percentage: 10, tag: 'Contract' },
  { rank: 2, address: '0xabcd...efgh', balance: '50,000,000', percentage: 5, tag: 'Exchange' },
  { rank: 3, address: '0x9876...5432', balance: '25,000,000', percentage: 2.5 },
  { rank: 4, address: '0xdef1...2345', balance: '20,000,000', percentage: 2 },
  { rank: 5, address: '0x5678...9abc', balance: '15,000,000', percentage: 1.5 },
  { rank: 6, address: '0xfedc...ba98', balance: '10,000,000', percentage: 1 },
  { rank: 7, address: '0x7654...3210', balance: '8,000,000', percentage: 0.8 },
  { rank: 8, address: '0x0123...4567', balance: '5,000,000', percentage: 0.5 },
]

export default function TokenHolders() {
  const [tokenAddress, setTokenAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [holders, setHolders] = useState<Holder[]>([])
  const [stats, setStats] = useState<{
    totalHolders: number
    top10Percentage: number
    top100Percentage: number
  } | null>(null)

  const scanHolders = async () => {
    if (!tokenAddress) {
      toast.error('Please enter token address')
      return
    }

    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setHolders(mockHolders)
    setStats({
      totalHolders: 15420,
      top10Percentage: 23.3,
      top100Percentage: 45.6,
    })
    
    setIsLoading(false)
    toast.success('Holder analysis complete')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Scan Token Holders</h1>
        <p className="text-slate-400 mt-1">Analyze token holder distribution and concentration</p>
      </div>

      {/* Search */}
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
          <div className="w-48">
            <label className="input-label">Network</label>
            <select className="input-field">
              <option>Ramestta</option>
              <option>Ethereum</option>
              <option>BNB Chain</option>
              <option>Polygon</option>
              <option>Arbitrum</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={scanHolders}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Scan Holders
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {stats && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalHolders.toLocaleString()}</p>
                <p className="text-sm text-slate-400">Total Holders</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/20">
                <PieChart className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{stats.top10Percentage}%</p>
                <p className="text-sm text-slate-400">Top 10 Holdings</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <PieChart className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{stats.top100Percentage}%</p>
                <p className="text-sm text-slate-400">Top 100 Holdings</p>
              </div>
            </div>
          </div>

          {/* Holders Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Top Holders</h2>
              <button className="btn-secondary text-sm py-2 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="table-header">Rank</th>
                    <th className="table-header">Address</th>
                    <th className="table-header">Balance</th>
                    <th className="table-header">Percentage</th>
                    <th className="table-header">Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {holders.map((holder) => (
                    <tr key={holder.rank} className="hover:bg-slate-800/50">
                      <td className="table-cell font-semibold text-white">#{holder.rank}</td>
                      <td className="table-cell font-mono text-sm text-blue-400 hover:underline cursor-pointer">
                        {holder.address}
                      </td>
                      <td className="table-cell font-semibold">{holder.balance}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                              style={{ width: `${Math.min(holder.percentage * 10, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-400">{holder.percentage}%</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        {holder.tag && (
                          <span className={`badge ${
                            holder.tag === 'Contract' ? 'badge-chain' :
                            holder.tag === 'Exchange' ? 'badge-hot' : ''
                          }`}>
                            {holder.tag}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!stats && !isLoading && (
        <div className="glass-card p-12 text-center">
          <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Token Selected</h3>
          <p className="text-slate-400">Enter a token address and click "Scan Holders" to analyze holder distribution</p>
        </div>
      )}
    </div>
  )
}
