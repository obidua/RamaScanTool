import { useState } from 'react'
import { ArrowLeftRight, Upload, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'

interface SwapResult {
  wallet: string
  fromToken: string
  toToken: string
  amount: string
  status: 'pending' | 'success' | 'error'
}

export default function BatchSwap() {
  const { isConnected } = useAccount()
  const [wallets, setWallets] = useState('')
  const [isSwapping, setIsSwapping] = useState(false)
  const [results, setResults] = useState<SwapResult[]>([])
  const [config, setConfig] = useState({
    fromToken: '',
    toToken: '',
    amount: '',
    slippage: 0.5,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setConfig(prev => ({ ...prev, [name]: value }))
  }

  const executeSwaps = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    const walletList = wallets.split('\n').filter(w => w.trim())
    if (walletList.length === 0) {
      toast.error('Please enter wallet addresses')
      return
    }

    setIsSwapping(true)
    const initialResults: SwapResult[] = walletList.map(wallet => ({
      wallet: wallet.trim(),
      fromToken: config.fromToken || 'ETH',
      toToken: config.toToken || 'USDT',
      amount: config.amount || '1',
      status: 'pending',
    }))
    setResults(initialResults)

    for (let i = 0; i < initialResults.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: Math.random() > 0.1 ? 'success' : 'error' } : r
      ))
    }

    setIsSwapping(false)
    toast.success('Batch swap completed!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Batch Swap</h1>
        <p className="text-slate-400 mt-1">Execute token swaps across multiple wallets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Swap Configuration */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Swap Configuration</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">From Token</label>
                <input
                  type="text"
                  name="fromToken"
                  value={config.fromToken}
                  onChange={handleChange}
                  placeholder="ETH or token address"
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">To Token</label>
                <input
                  type="text"
                  name="toToken"
                  value={config.toToken}
                  onChange={handleChange}
                  placeholder="Token address"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Amount per Wallet</label>
                <input
                  type="text"
                  name="amount"
                  value={config.amount}
                  onChange={handleChange}
                  placeholder="1"
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Slippage (%)</label>
                <input
                  type="number"
                  name="slippage"
                  value={config.slippage}
                  onChange={handleChange}
                  step={0.1}
                  min={0.1}
                  max={50}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Wallets (address, privateKey - one per line)</label>
              <textarea
                value={wallets}
                onChange={(e) => setWallets(e.target.value)}
                placeholder="0x1234...5678, 0xprivate...&#10;0xabcd...efgh, 0xprivate..."
                rows={8}
                className="input-field resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-4">
              <button className="btn-secondary flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
              <button
                onClick={executeSwaps}
                disabled={isSwapping || !isConnected}
                className="btn-primary flex items-center gap-2"
              >
                {isSwapping ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Swapping...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-5 h-5" />
                    Execute Swaps
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
          <div className="space-y-4">
            <div className="stat-card">
              <p className="text-sm text-slate-400">Total Wallets</p>
              <p className="text-2xl font-bold text-white">
                {wallets.split('\n').filter(w => w.trim()).length}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-slate-400">Total Volume</p>
              <p className="text-2xl font-bold text-blue-400">
                {(wallets.split('\n').filter(w => w.trim()).length * parseFloat(config.amount || '0')).toFixed(2)}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-slate-400">Estimated Gas</p>
              <p className="text-xl font-bold text-yellow-400">~0.01 ETH</p>
              <p className="text-sm text-slate-500">per swap</p>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Swap Results</h2>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="bg-slate-800">
                  <th className="table-header">#</th>
                  <th className="table-header">Wallet</th>
                  <th className="table-header">From</th>
                  <th className="table-header">To</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-800/50">
                    <td className="table-cell">{index + 1}</td>
                    <td className="table-cell font-mono text-sm">
                      {result.wallet.slice(0, 10)}...{result.wallet.slice(-8)}
                    </td>
                    <td className="table-cell">{result.fromToken}</td>
                    <td className="table-cell">{result.toToken}</td>
                    <td className="table-cell font-semibold">{result.amount}</td>
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
                          Success
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
