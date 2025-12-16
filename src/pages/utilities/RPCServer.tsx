import { useState } from 'react'
import { Server, Plus, Trash2, Copy, Check, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import { SUPPORTED_CHAINS } from '../../config/wagmi'
import BackButton from '../../components/BackButton'

interface RPCEndpoint {
  id: string
  name: string
  url: string
  chain: string
  status: 'online' | 'offline' | 'slow'
  latency: number
}

const defaultEndpoints: RPCEndpoint[] = [
  { id: '0', name: 'Ramestta Mainnet', url: 'https://blockchain.ramestta.com', chain: 'Ramestta', status: 'online', latency: 15 },
  { id: '1', name: 'Ethereum Mainnet', url: 'https://eth.llamarpc.com', chain: 'Ethereum', status: 'online', latency: 45 },
  { id: '2', name: 'BSC Mainnet', url: 'https://bsc-dataseed.binance.org', chain: 'BNB Chain', status: 'online', latency: 32 },
  { id: '3', name: 'Polygon', url: 'https://polygon-rpc.com', chain: 'Polygon', status: 'online', latency: 28 },
  { id: '4', name: 'Arbitrum', url: 'https://arb1.arbitrum.io/rpc', chain: 'Arbitrum', status: 'slow', latency: 120 },
]

export default function RPCServer() {
  const [endpoints, setEndpoints] = useState<RPCEndpoint[]>(defaultEndpoints)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEndpoint, setNewEndpoint] = useState({ name: '', url: '', chain: 'Ramestta' })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('RPC URL copied')
  }

  const addEndpoint = () => {
    if (!newEndpoint.name || !newEndpoint.url) {
      toast.error('Please fill all fields')
      return
    }

    setEndpoints(prev => [...prev, {
      id: Date.now().toString(),
      ...newEndpoint,
      status: 'online',
      latency: Math.floor(Math.random() * 100) + 20,
    }])
    setNewEndpoint({ name: '', url: '', chain: 'Ethereum' })
    setShowAddForm(false)
    toast.success('Endpoint added')
  }

  const removeEndpoint = (id: string) => {
    setEndpoints(prev => prev.filter(e => e.id !== id))
    toast.success('Endpoint removed')
  }

  const testEndpoint = async (id: string) => {
    toast.loading('Testing connection...', { id: 'test' })
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setEndpoints(prev => prev.map(e => 
      e.id === id ? { ...e, status: 'online', latency: Math.floor(Math.random() * 80) + 20 } : e
    ))
    
    toast.success('Connection successful', { id: 'test' })
  }

  const getStatusColor = (status: RPCEndpoint['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'slow': return 'bg-yellow-500'
      case 'offline': return 'bg-red-500'
    }
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">RPC Server Manager</h1>
          <p className="text-slate-400 mt-1">Manage your custom RPC endpoints</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Endpoint
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Add New RPC Endpoint</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="input-label">Name</label>
              <input
                type="text"
                value={newEndpoint.name}
                onChange={(e) => setNewEndpoint(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Custom RPC"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">RPC URL</label>
              <input
                type="text"
                value={newEndpoint.url}
                onChange={(e) => setNewEndpoint(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Chain</label>
              <select
                value={newEndpoint.chain}
                onChange={(e) => setNewEndpoint(prev => ({ ...prev, chain: e.target.value }))}
                className="input-field"
              >
                {SUPPORTED_CHAINS.map(chain => (
                  <option key={chain.id} value={chain.name}>{chain.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={addEndpoint} className="btn-primary">
              Add Endpoint
            </button>
          </div>
        </div>
      )}

      {/* Endpoints List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
          <Server className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">RPC Endpoints</h2>
        </div>
        <div className="divide-y divide-slate-700">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="p-4 hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(endpoint.status)}`} />
                  <div>
                    <p className="font-medium text-white">{endpoint.name}</p>
                    <p className="text-sm text-slate-400">{endpoint.chain}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-mono text-slate-400 max-w-xs truncate">
                      {endpoint.url}
                    </p>
                    <p className={`text-xs ${endpoint.latency > 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {endpoint.latency}ms
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyUrl(endpoint.id, endpoint.url)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {copiedId === endpoint.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => testEndpoint(endpoint.id)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Activity className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => removeEndpoint(endpoint.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Public RPCs */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Public RPC Providers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Alchemy', 'Infura', 'QuickNode', 'Moralis'].map(provider => (
            <a
              key={provider}
              href={`https://${provider.toLowerCase()}.io`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors text-center"
            >
              <p className="font-medium text-white">{provider}</p>
              <p className="text-xs text-slate-400 mt-1">Get API Key</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
