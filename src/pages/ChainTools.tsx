import { useParams, Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { SUPPORTED_CHAINS } from '../config/wagmi'

const chainTools = [
  { name: 'Token MultiSender', path: 'multi-sender', badge: 'HOT' },
  { name: 'Batch Check Balance', path: 'batch-balance', badge: null },
  { name: 'Token Batch Collection', path: 'batch-collection', badge: 'HOT' },
  { name: 'Multiple to Multiple Transfer', path: 'multi-transfer', badge: null },
  { name: 'Create Token', path: 'create-token', badge: 'HOT' },
  { name: 'Batch Wallet Generate', path: 'batch-generate', badge: null },
  { name: 'Market Maker - Batch Swap', path: 'batch-swap', badge: 'HOT' },
  { name: 'Vanity Address Generator', path: 'vanity', badge: null },
  { name: 'Gas Price', path: 'gas', badge: 'HOT' },
  { name: 'RPC Server', path: 'rpc', badge: null },
  { name: 'NFT MultiSender', path: 'nft-sender', badge: 'NEW' },
  { name: 'Token Locker', path: 'locker', badge: 'HOT' },
]

export default function ChainTools() {
  const { chainId } = useParams()
  const chain = SUPPORTED_CHAINS.find(c => String(c.id) === chainId)

  if (!chain) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Chain Not Found</h2>
        <Link to="/" className="btn-primary">Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Chain Header */}
      <div className="glass-card p-8">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${chain.color}20` }}
          >
            {chain.icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{chain.name} Chain Tools</h1>
            <p className="text-slate-400 mt-1">
              Access all developer tools for {chain.name} ({chain.symbol})
            </p>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chainTools.map((tool, index) => (
          <Link
            key={index}
            to={`/chain/${chainId}/${tool.path}`}
            className="tool-card group"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors">
                {tool.name}
              </h3>
              <div className="flex items-center gap-2">
                {tool.badge && (
                  <span className={`badge ${tool.badge === 'HOT' ? 'badge-hot' : 'badge-new'}`}>
                    {tool.badge}
                  </span>
                )}
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Chain Info */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Chain Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-slate-400">Chain ID</p>
            <p className="text-xl font-bold text-white">{chain.id}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-slate-400">Native Token</p>
            <p className="text-xl font-bold text-white">{chain.symbol}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-slate-400">RPC Endpoint</p>
            <p className="text-sm font-mono text-slate-300 truncate">{chain.rpc}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
