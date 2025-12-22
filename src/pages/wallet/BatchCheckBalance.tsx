import { useState, useCallback } from 'react'
import { Search, Download, Upload, Loader2, Wallet, Copy, ExternalLink, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createPublicClient, http, formatEther, isAddress } from 'viem'
import BackButton from '../../components/BackButton'

// Ramestta chain config
const ramesttaChain = {
  id: 1370,
  name: 'Ramestta',
  rpcUrl: 'https://blockchain.ramestta.com',
  symbol: 'RAMA',
  explorer: 'https://ramascan.com',
}

interface BalanceResult {
  address: string
  balance: string
  balanceRaw: bigint
  status: 'success' | 'error' | 'pending'
  error?: string
}

export default function BatchCheckBalance() {
  const [addresses, setAddresses] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<BalanceResult[]>([])
  const [progress, setProgress] = useState(0)
  const [checkedCount, setCheckedCount] = useState(0)

  // Create public client for Ramestta
  const publicClient = createPublicClient({
    chain: {
      id: ramesttaChain.id,
      name: ramesttaChain.name,
      nativeCurrency: { name: 'RAMA', symbol: 'RAMA', decimals: 18 },
      rpcUrls: { default: { http: [ramesttaChain.rpcUrl] } },
    },
    transport: http(ramesttaChain.rpcUrl),
  })

  // Parse addresses from input
  const parseAddresses = useCallback((input: string): string[] => {
    return input
      .split(/[\n,;]/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0)
      .filter((addr, index, self) => self.indexOf(addr) === index) // Remove duplicates
  }, [])

  // Check balance for single address
  const checkSingleBalance = async (address: string): Promise<BalanceResult> => {
    if (!isAddress(address)) {
      return {
        address,
        balance: '0',
        balanceRaw: BigInt(0),
        status: 'error',
        error: 'Invalid address format',
      }
    }

    try {
      const balance = await publicClient.getBalance({ address: address as `0x${string}` })
      return {
        address,
        balance: formatEther(balance),
        balanceRaw: balance,
        status: 'success',
      }
    } catch (error) {
      return {
        address,
        balance: '0',
        balanceRaw: BigInt(0),
        status: 'error',
        error: 'Failed to fetch balance',
      }
    }
  }

  // Check all balances
  const checkBalances = async () => {
    const addressList = parseAddresses(addresses)
    
    if (addressList.length === 0) {
      toast.error('Please enter at least one valid address')
      return
    }

    if (addressList.length > 500) {
      toast.error('Maximum 500 addresses allowed per batch')
      return
    }

    setIsChecking(true)
    setResults([])
    setProgress(0)
    setCheckedCount(0)

    const newResults: BalanceResult[] = []
    const BATCH_SIZE = 10 // Check 10 addresses at a time

    for (let i = 0; i < addressList.length; i += BATCH_SIZE) {
      const batch = addressList.slice(i, i + BATCH_SIZE)
      
      const batchResults = await Promise.all(
        batch.map(addr => checkSingleBalance(addr))
      )
      
      newResults.push(...batchResults)
      setResults([...newResults])
      setCheckedCount(newResults.length)
      setProgress(Math.round((newResults.length / addressList.length) * 100))
      
      // Small delay to prevent rate limiting
      if (i + BATCH_SIZE < addressList.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    setIsChecking(false)
    const successCount = newResults.filter(r => r.status === 'success').length
    toast.success(`Checked ${successCount}/${addressList.length} addresses successfully`)
  }

  // Copy address
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied')
  }

  // Open in explorer
  const openExplorer = (address: string) => {
    window.open(`${ramesttaChain.explorer}/address/${address}`, '_blank')
  }

  // Export to CSV
  const exportCSV = () => {
    if (results.length === 0) return
    
    const csv = 'Address,Balance (RAMA),Status\n' + 
      results.map(r => `${r.address},${r.balance},${r.status}`).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ramestta-balances-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported to CSV')
  }

  // Import from CSV
  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').slice(1) // Skip header
      const addrs = lines
        .map(line => line.split(',')[0]?.trim())
        .filter(addr => addr && isAddress(addr))
      
      if (addrs.length > 0) {
        setAddresses(addrs.join('\n'))
        toast.success(`Imported ${addrs.length} addresses`)
      } else {
        toast.error('No valid addresses found in CSV')
      }
    }
    reader.readAsText(file)
    e.target.value = '' // Reset input
  }

  // Calculate totals
  const totalBalance = results.reduce((sum, r) => sum + r.balanceRaw, BigInt(0))
  const errorCount = results.filter(r => r.status === 'error').length
  const nonZeroCount = results.filter(r => r.balanceRaw > BigInt(0)).length

  // Format large balance
  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
    return num.toFixed(4)
  }

  return (
    <div className="space-y-6">
      <BackButton />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Batch Check Balance</h1>
          <p className="text-slate-400 mt-1">Check RAMA balances for multiple wallets instantly</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-sm text-cyan-400">Ramestta Network</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Enter Addresses</h2>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="input-label">Wallet Addresses</label>
              <span className="text-xs text-slate-500">
                {parseAddresses(addresses).length} addresses (max 500)
              </span>
            </div>
            <textarea
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              placeholder="Enter wallet addresses (one per line, comma, or semicolon separated)&#10;&#10;0x742d35Cc6634C0532925a3b844Bc9e7595f...&#10;0x8ba1f109551bD432803012645Ac136ddd64DBA72&#10;0xdAC17F958D2ee523a2206206994597C13D831ec7"
              rows={12}
              className="input-field resize-none font-mono text-sm"
              disabled={isChecking}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={checkBalances}
              disabled={isChecking || parseAddresses(addresses).length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking... {checkedCount}/{parseAddresses(addresses).length}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Check Balances
                </>
              )}
            </button>
            
            <label className="btn-secondary flex items-center gap-2 cursor-pointer">
              <Upload className="w-5 h-5" />
              Import CSV
              <input
                type="file"
                accept=".csv,.txt"
                onChange={importCSV}
                className="hidden"
              />
            </label>

            {addresses && (
              <button 
                onClick={() => { setAddresses(''); setResults([]) }}
                className="btn-secondary flex items-center gap-2 text-red-400"
              >
                <Trash2 className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {isChecking && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Progress</span>
                <span className="text-cyan-400">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Results</h2>
            {results.length > 0 && (
              <button 
                onClick={exportCSV}
                className="btn-secondary text-sm py-2 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>

          {results.length > 0 ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Total Balance</p>
                  <p className="text-lg font-bold text-cyan-400">
                    {formatBalance(formatEther(totalBalance))} RAMA
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Checked</p>
                  <p className="text-lg font-bold text-white">{results.length}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">With Balance</p>
                  <p className="text-lg font-bold text-green-400">{nonZeroCount}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Errors</p>
                  <p className="text-lg font-bold text-red-400">{errorCount}</p>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {results.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg flex items-center justify-between gap-3 ${
                      result.status === 'error' 
                        ? 'bg-red-500/10 border border-red-500/20' 
                        : result.balanceRaw > BigInt(0)
                          ? 'bg-green-500/5 border border-green-500/10'
                          : 'bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        result.status === 'error' ? 'bg-red-500/20' : 'bg-cyan-500/20'
                      }`}>
                        {result.status === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Wallet className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm text-slate-300 truncate">
                          {result.address}
                        </p>
                        {result.error && (
                          <p className="text-xs text-red-400">{result.error}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className={`font-semibold ${
                          result.balanceRaw > BigInt(0) ? 'text-green-400' : 'text-slate-400'
                        }`}>
                          {formatBalance(result.balance)} RAMA
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyAddress(result.address)}
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          title="Copy address"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => openExplorer(result.address)}
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          title="View on RamaScan"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-center">Enter wallet addresses and click<br/>"Check Balances" to see results</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card p-4 border border-blue-500/30 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-400 mb-1">How it works</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Paste up to 500 wallet addresses (one per line, or separated by commas)</li>
              <li>• Balances are fetched directly from Ramestta blockchain RPC</li>
              <li>• Export results to CSV for further analysis</li>
              <li>• All data is processed locally - nothing is stored on our servers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
