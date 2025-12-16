import { Link } from 'react-router-dom'
import { 
  Wallet, Coins, TrendingUp, Image, BarChart2, Wrench, 
  ArrowRight, Zap, Shield, Globe, Users, Flame
} from 'lucide-react'
import { TOOLS, TOOL_CATEGORIES } from '../config/tools'
import { SUPPORTED_CHAINS } from '../config/wagmi'

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  token: Coins,
  trading: TrendingUp,
  nft: Image,
  analytics: BarChart2,
  utilities: Wrench,
}

const stats = [
  { label: 'Total Users', value: '125K+', icon: Users, color: 'blue' },
  { label: 'Transactions', value: '2.5M+', icon: Zap, color: 'green' },
  { label: 'Chains Supported', value: '15+', icon: Globe, color: 'purple' },
  { label: 'Tools Available', value: '60+', icon: Wrench, color: 'yellow' },
]

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600/20 via-blue-600/20 to-purple-600/20 border border-cyan-500/30 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🔷</span>
            <h1 className="text-4xl font-bold">
              Welcome to <span className="gradient-text">RamaScan Tools</span>
            </h1>
          </div>
          <p className="text-slate-400 text-lg mb-2 max-w-2xl">
            The official blockchain developer toolkit for <strong className="text-cyan-400">Ramestta Network</strong>.
          </p>
          <p className="text-slate-400 text-lg mb-6 max-w-2xl">
            Create tokens, manage wallets, execute batch operations, and explore multi-chain analytics 
            — optimized for Ramestta with support for all major EVM chains.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/token/create" className="btn-primary flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Create RAMA-20 Token
            </Link>
            <Link to="/wallet/batch-generate" className="btn-secondary flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Generate Wallets
            </Link>
            <a 
              href="https://ramascan.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Globe className="w-5 h-5" />
              RamaScan Explorer
            </a>
          </div>
        </div>
      </div>

      {/* Ramestta Network Banner */}
      <div className="glass-card p-6 border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-cyan-500/20">
              <span className="text-4xl">🔷</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Ramestta Network</h3>
              <p className="text-slate-400">Low-cost EVM blockchain with fast transactions</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-2 rounded-lg bg-slate-800/50 text-sm">
              <span className="text-slate-400">Chain ID:</span>
              <span className="text-white font-mono ml-2">1370</span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-slate-800/50 text-sm">
              <span className="text-slate-400">Symbol:</span>
              <span className="text-cyan-400 font-bold ml-2">RAMA</span>
            </div>
            <a 
              href="https://ramestta.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
            >
              Learn More →
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${stat.color}-500/20`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Supported Chains */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Supported Chains</h2>
          <span className="badge badge-chain">Multi-Chain Support</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {SUPPORTED_CHAINS.map(chain => (
            chain.status === 'active' ? (
              <Link
                key={chain.id}
                to={`/chain/${chain.id}`}
                className="relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all bg-cyan-500/10 border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/20 cursor-pointer"
              >
                <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                  LIVE
                </span>
                <span className="text-2xl">{chain.icon}</span>
                <span className="text-xs text-slate-300 text-center font-medium">{chain.name}</span>
              </Link>
            ) : (
              <div
                key={chain.id}
                className="relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all bg-slate-800/50 border-slate-700/50 opacity-60 cursor-not-allowed"
              >
                <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                  SOON
                </span>
                <span className="text-2xl">{chain.icon}</span>
                <span className="text-xs text-slate-300 text-center font-medium">{chain.name}</span>
              </div>
            )
          ))}
        </div>
        <p className="text-center text-slate-500 text-sm mt-4">
          🔷 Ramestta is live now! Other networks coming soon.
        </p>
      </div>

      {/* Hot Tools */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-semibold text-white">Hot Tools</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(TOOLS)
            .flat()
            .filter(tool => tool.badge === 'HOT')
            .map(tool => (
              <Link key={tool.id} to={tool.path} className="tool-card group">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="badge badge-hot">HOT</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{tool.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{tool.description}</p>
                <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300">
                  Launch Tool
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
        </div>
      </div>

      {/* All Tool Categories */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">All Tools</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {TOOL_CATEGORIES.map(category => {
            const CategoryIcon = categoryIcons[category.id]
            const tools = TOOLS[category.id as keyof typeof TOOLS] || []

            return (
              <div key={category.id} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-${category.color}-500/20`}>
                    <CategoryIcon className={`w-5 h-5 text-${category.color}-400`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                </div>
                <div className="space-y-2">
                  {tools.map(tool => (
                    <Link
                      key={tool.id}
                      to={tool.path}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors group"
                    >
                      <span className="text-slate-300 group-hover:text-white transition-colors">
                        {tool.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {tool.badge && (
                          <span className={`badge ${tool.badge === 'HOT' ? 'badge-hot' : 'badge-new'}`}>
                            {tool.badge}
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
