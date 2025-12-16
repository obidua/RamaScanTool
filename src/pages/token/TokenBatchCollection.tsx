import { useState } from 'react'
import { Download, Upload, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'

interface WalletSource {
  address: string
  privateKey: string
  balance: string
  status: 'pending' | 'success' | 'error'
}

export default function TokenBatchCollection() {
  const { address, isConnected } = useAccount()
  const [tokenAddress, setTokenAddress] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [wallets, setWallets] = useState('')
  const [isCollecting, setIsCollecting] = useState(false)
  const [results, setResults] = useState<WalletSource[]>([])

  const parseWallets = (): WalletSource[] => {
    return wallets
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [address, privateKey] = line.split(',').map(s => s.trim())
        return { 
          address, 
          privateKey, 
          balance: `${(Math.random() * 1000).toFixed(2)}`,
          status: 'pending' as const 
        }
      })
  }

  const collectTokens = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!tokenAddress || !destinationAddress) {
      toast.error('Please fill in all required fields')
      return
    }

    const walletList = parseWallets()
    if (walletList.length === 0) {
      toast.error('Please enter source wallets')
      return
    }

    setIsCollecting(true)
    setResults(walletList)

    for (let i = 0; i < walletList.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setResults(prev => prev.map((w, idx) => 
        idx === i ? { ...w, status: Math.random() > 0.1 ? 'success' : 'error' } : w
      ))
    }

    setIsCollecting(false)
    toast.success('Batch collection completed!')
  }

  const totalBalance = parseWallets().reduce((sum, w) => sum + parseFloat(w.balance || '0'), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Token Batch Collection</h1>
        <p className="text-slate-400 mt-1">Collect tokens from multiple wallets to a single destination</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="input-label">Token Address</label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="0x... (leave empty for native token)"
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="input-label">Network</label>
                <select className="input-field">
                  <option>Ramestta</option>
                  <option>Ethereum</option>
                  <option>BNB Chain</option>
                  <option>Polygon</option>
                  <option>Arbitrum</option>
                  <option>Base</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="input-label">Destination Address</label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                className="input-field font-mono"
              />
              <button 
                onClick={() => setDestinationAddress(address || '')}
                className="text-sm text-blue-400 hover:text-blue-300 mt-1"
              >
                Use connected wallet
              </button>
            </div>

            <div>
              <label className="input-label">Source Wallets (address, privateKey - one per line)</label>
              <textarea
                value={wallets}
                onChange={(e) => setWallets(e.target.value)}
                placeholder="0x1234...5678, 0xprivate...key&#10;0xabcd...efgh, 0xprivate...key"
                rows={8}
                className="input-field resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-4 mt-4">
              <button className="btn-secondary flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
              <button
                onClick={collectTokens}
                disabled={isCollecting || !isConnected}
                className="btn-primary flex items-center gap-2"
              >
                {isCollecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Collecting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Collect Tokens
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Source Wallets</p>
                <p className="text-2xl font-bold text-white">{parseWallets().length}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Estimated Total</p>
                <p className="text-2xl font-bold text-green-400">{totalBalance.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Estimated Gas</p>
                <p className="text-xl font-bold text-white">~0.005 ETH</p>
                <p className="text-sm text-slate-500">per wallet</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
            <p className="text-yellow-400 text-sm">
              ⚠️ <strong>Security:</strong> Private keys are processed locally and never sent to any server.
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Collection Results</h2>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="bg-slate-800">
                  <th className="table-header">#</th>
                  <th className="table-header">Source Address</th>
                  <th className="table-header">Balance</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-800/50">
                    <td className="table-cell">{index + 1}</td>
                    <td className="table-cell font-mono text-sm">
                      {result.address?.slice(0, 10)}...{result.address?.slice(-8)}
                    </td>
                    <td className="table-cell font-semibold">{result.balance}</td>
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
                          Collected
                        </span>
                      )}
                      {result.status === 'error' && (
                        <span className="flex items-center gap-2 text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          Failed
                        </span>
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
