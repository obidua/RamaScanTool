import { useState } from 'react'
import { Search, Download, Upload, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'

interface BalanceResult {
  address: string
  balance: string
  usdValue: string
  chain: string
}

export default function BatchCheckBalance() {
  const [addresses, setAddresses] = useState('')
  const [selectedChain, setSelectedChain] = useState('1370')
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<BalanceResult[]>([])

  const checkBalances = async () => {
    const addressList = addresses.split('\n').filter(a => a.trim())
    if (addressList.length === 0) {
      toast.error('Please enter at least one address')
      return
    }

    setIsChecking(true)
    await new Promise(resolve => setTimeout(resolve, 2000))

    const mockResults: BalanceResult[] = addressList.map(addr => ({
      address: addr.trim(),
      balance: `${(Math.random() * 10000).toFixed(4)} RAMA`,
      usdValue: `$${(Math.random() * 250).toFixed(2)}`,
      chain: 'Ramestta',
    }))

    setResults(mockResults)
    setIsChecking(false)
    toast.success(`Checked ${mockResults.length} addresses`)
  }

  const totalUSD = results.reduce((sum, r) => sum + parseFloat(r.usdValue.replace('$', '').replace(',', '')), 0)

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Batch Check Balance</h1>
        <p className="text-slate-400 mt-1">Check balances of multiple wallets at once</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Enter Addresses</h2>
          
          <div className="mb-4">
            <label className="input-label">Select Chain</label>
            <NetworkSelector 
              value={selectedChain} 
              onChange={setSelectedChain}
            />
          </div>

          <div className="mb-4">
            <label className="input-label">Wallet Addresses (one per line)</label>
            <textarea
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              placeholder="0x1234...&#10;0xabcd...&#10;0x9876..."
              rows={10}
              className="input-field resize-none font-mono text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={checkBalances}
              disabled={isChecking}
              className="btn-primary flex items-center gap-2"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Check Balances
                </>
              )}
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import CSV
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Results</h2>
            {results.length > 0 && (
              <button className="btn-secondary text-sm py-2 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>

          {results.length > 0 ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="stat-card">
                  <p className="text-sm text-slate-400">Total Wallets</p>
                  <p className="text-2xl font-bold text-white">{results.length}</p>
                </div>
                <div className="stat-card">
                  <p className="text-sm text-slate-400">Total Value</p>
                  <p className="text-2xl font-bold text-green-400">${totalUSD.toFixed(2)}</p>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-slate-300">
                        {result.address.slice(0, 10)}...{result.address.slice(-8)}
                      </p>
                      <span className="badge badge-chain">{result.chain}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{result.balance}</p>
                      <p className="text-sm text-green-400">{result.usdValue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Search className="w-12 h-12 mb-4" />
              <p>Enter addresses and click "Check Balances" to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
