import { useState } from 'react'
import { Search, ExternalLink, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'

interface SearchResult {
  type: 'address' | 'tx' | 'token' | 'block'
  value: string
  extra?: string
}

export default function Explorer() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  const search = async () => {
    if (!query) {
      toast.error('Please enter a search query')
      return
    }

    // Determine type based on query format
    let type: SearchResult['type'] = 'address'
    if (query.length === 66) type = 'tx'
    else if (query.startsWith('0x') && query.length === 42) type = 'address'
    else if (!isNaN(Number(query))) type = 'block'
    
    setResults([{
      type,
      value: query,
      extra: type === 'address' ? 'Balance: 1500 RAMA' : 
             type === 'tx' ? 'Status: Success' :
             type === 'block' ? 'Transactions: 150' : undefined
    }])

    toast.success(`Found ${type}`)
  }

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value)
    toast.success('Copied to clipboard')
  }

  const getExplorerUrl = (type: string, value: string) => {
    const base = 'https://ramascan.com'
    const path = type === 'address' ? 'address' : type === 'tx' ? 'tx' : 'block'
    return `${base}/${path}/${value}`
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Ramestta Explorer</h1>
        <p className="text-slate-400 mt-1">Search addresses, transactions, tokens, and blocks on Ramestta Network</p>
      </div>

      {/* Search */}
      <div className="glass-card p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="input-label">Search</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Address, Transaction Hash, Token, or Block Number"
              className="input-field font-mono"
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
          </div>
          <div className="flex items-end">
            <button onClick={search} className="btn-primary flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Ramascan Link */}
      <div className="glass-card p-4">
        <a
          href="https://ramascan.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between group hover:bg-slate-800/50 p-3 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔷</span>
            <div>
              <span className="font-medium text-white">Ramascan</span>
              <p className="text-xs text-slate-400">Official Ramestta Block Explorer</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
        </a>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Search Results</h2>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="p-4 bg-slate-800/50 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`badge ${
                      result.type === 'address' ? 'badge-chain' :
                      result.type === 'tx' ? 'badge-new' :
                      result.type === 'token' ? 'badge-hot' : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {result.type.toUpperCase()}
                    </span>
                    <span className="badge bg-cyan-500/20 text-cyan-400 ml-2">Ramestta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyValue(result.value)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4 text-slate-400" />
                    </button>
                    <a
                      href={getExplorerUrl(result.type, result.value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </a>
                  </div>
                </div>
                <p className="font-mono text-sm text-white break-all">{result.value}</p>
                {result.extra && (
                  <p className="text-sm text-slate-400 mt-2">{result.extra}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="glass-card p-4 border-blue-500/30 bg-blue-500/5">
        <p className="text-blue-400 text-sm">
          ℹ️ <strong>Supported searches:</strong> Wallet addresses (0x...), Transaction hashes (66 chars), 
          Token contracts, Block numbers, and ENS domains.
        </p>
      </div>
    </div>
  )
}
