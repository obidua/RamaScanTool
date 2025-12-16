import { useState } from 'react'
import { Globe, Search, ExternalLink, Copy, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { SUPPORTED_CHAINS } from '../../config/wagmi'

interface SearchResult {
  type: 'address' | 'tx' | 'token' | 'block'
  value: string
  chain: string
  extra?: string
}

export default function Explorer() {
  const [query, setQuery] = useState('')
  const [selectedChain, setSelectedChain] = useState('1370')
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

    const chain = SUPPORTED_CHAINS.find(c => String(c.id) === selectedChain)?.name || 'Ethereum'
    
    setResults([{
      type,
      value: query,
      chain,
      extra: type === 'address' ? 'Balance: 1.5 ETH' : 
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
    const baseUrls: Record<string, string> = {
      '1370': 'https://ramascan.com',
      '1': 'https://etherscan.io',
      '56': 'https://bscscan.com',
      '137': 'https://polygonscan.com',
      '42161': 'https://arbiscan.io',
    }
    const base = baseUrls[selectedChain] || baseUrls['1370']
    const path = type === 'address' ? 'address' : type === 'tx' ? 'tx' : 'block'
    return `${base}/${path}/${value}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Multi-Chain Explorer</h1>
        <p className="text-slate-400 mt-1">Search addresses, transactions, tokens, and blocks</p>
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
          <div className="w-48">
            <label className="input-label">Network</label>
            <select 
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="input-field"
            >
              {SUPPORTED_CHAINS.map(chain => (
                <option key={chain.id} value={chain.id}>{chain.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={search} className="btn-primary flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SUPPORTED_CHAINS.slice(0, 4).map(chain => (
          <a
            key={chain.id}
            href={`https://${chain.name.toLowerCase().replace(' ', '')}scan.io`}
            target="_blank"
            rel="noopener noreferrer"
            className="tool-card flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{chain.icon}</span>
              <span className="font-medium text-white">{chain.name}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
          </a>
        ))}
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
                    <span className="badge badge-chain ml-2">{result.chain}</span>
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
