import { Link } from 'react-router-dom'
import { 
  Wallet, Coins, TrendingUp, Image, BarChart2, Wrench, 
  ArrowRight, Zap, Shield, Globe, Users, Flame, Sparkles, 
  Rocket, Activity, Lock, Send, Eye, Hexagon, Star
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
  { label: 'Total Users', value: '125K+', icon: Users, gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/25' },
  { label: 'Transactions', value: '2.5M+', icon: Zap, gradient: 'from-green-500 to-emerald-500', glow: 'shadow-green-500/25' },
  { label: 'Chains Supported', value: '15+', icon: Globe, gradient: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/25' },
  { label: 'Tools Available', value: '60+', icon: Wrench, gradient: 'from-yellow-500 to-orange-500', glow: 'shadow-yellow-500/25' },
]

const quickActions = [
  { name: 'Create Token', icon: Coins, path: '/token/create', gradient: 'from-cyan-500 to-blue-600', description: 'Deploy ERC-20 tokens' },
  { name: 'NFT Collection', icon: Image, path: '/nft/create', gradient: 'from-purple-500 to-pink-600', description: 'Launch NFT projects' },
  { name: 'Token Locker', icon: Lock, path: '/token/locker', gradient: 'from-green-500 to-emerald-600', description: 'Lock liquidity tokens' },
  { name: 'Multi Sender', icon: Send, path: '/token/multisender', gradient: 'from-orange-500 to-red-600', description: 'Batch token transfers' },
]

export default function Dashboard() {
  return (
    <div className="space-y-8 relative">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
      </div>

      {/* Hero Section - Futuristic */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 p-8 md:p-10 group">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-blue-600/5 to-purple-600/10 animate-gradient-shift" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="particle particle-1" />
          <div className="particle particle-2" />
          <div className="particle particle-3" />
          <div className="particle particle-4" />
          <div className="particle particle-5" />
        </div>

        {/* Glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/50 rounded-2xl blur-xl animate-pulse" />
              <div className="relative p-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/30">
                <Hexagon className="w-10 h-10 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-sm font-medium text-cyan-400 tracking-wider uppercase">Welcome to</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                  RamaScan Tools
                </span>
              </h1>
            </div>
          </div>
          
          <p className="text-slate-300 text-lg mb-2 max-w-2xl leading-relaxed">
            The official blockchain developer toolkit for <strong className="text-cyan-400 font-semibold">Ramestta Network</strong>.
          </p>
          <p className="text-slate-400 text-base mb-8 max-w-2xl leading-relaxed">
            Create tokens, manage wallets, execute batch operations, and explore multi-chain analytics 
            — optimized for Ramestta with support for all major EVM chains.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link to="/token/create" className="group/btn relative overflow-hidden px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2">
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <Coins className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Create RAMA-20 Token</span>
              <Sparkles className="w-4 h-4 relative z-10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            </Link>
            <Link to="/wallet/batch-generate" className="group/btn px-6 py-3 bg-slate-800/80 text-white font-semibold rounded-xl border border-slate-600 hover:border-cyan-500/50 hover:bg-slate-700/80 transition-all duration-300 flex items-center gap-2 hover:shadow-lg hover:shadow-slate-500/10">
              <Wallet className="w-5 h-5" />
              <span>Generate Wallets</span>
            </Link>
            <a 
              href="https://ramascan.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group/btn px-6 py-3 bg-transparent text-cyan-400 font-semibold rounded-xl border border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300 flex items-center gap-2"
            >
              <Globe className="w-5 h-5" />
              <span>RamaScan Explorer</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Quick Actions - Floating Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Link
            key={action.name}
            to={action.path}
            className="group relative overflow-hidden rounded-2xl p-5 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 hover:border-transparent transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient border on hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${action.gradient} rounded-2xl`} style={{ padding: '1px' }}>
              <div className="absolute inset-[1px] bg-slate-900 rounded-2xl" />
            </div>
            
            {/* Glow effect */}
            <div className={`absolute -inset-1 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`} />
            
            <div className="relative z-10">
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${action.gradient} mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-cyan-300 transition-colors">{action.name}</h3>
              <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">{action.description}</p>
            </div>
            
            {/* Arrow indicator */}
            <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      {/* Ramestta Network Banner - Glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 group">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/10 to-cyan-500/5" />
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
        
        {/* Floating glow */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-colors duration-700" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors duration-700" />
        
        <div className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/40 rounded-2xl blur-lg animate-pulse" />
              <div className="relative p-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/30">
                <Hexagon className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white">Ramestta Network</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded-full border border-green-500/30 animate-pulse">
                  MAINNET
                </span>
              </div>
              <p className="text-slate-400">Low-cost EVM blockchain with fast transactions</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm backdrop-blur-sm">
              <span className="text-slate-400">Chain ID:</span>
              <span className="text-white font-mono font-bold ml-2">1370</span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm backdrop-blur-sm">
              <span className="text-slate-400">Symbol:</span>
              <span className="text-cyan-400 font-bold ml-2">RAMA</span>
            </div>
            <a 
              href="https://ramestta.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group/link px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 text-sm font-semibold hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-300 border border-cyan-500/30 flex items-center gap-2"
            >
              Learn More
              <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Stats - Futuristic Cards with Glow */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className={`group relative overflow-hidden rounded-2xl p-6 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${stat.glow}`}
            style={{ animationDelay: `${index * 150}ms` }}
          >
            {/* Gradient glow on hover */}
            <div className={`absolute -inset-1 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`} />
            
            {/* Top accent line */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className={`p-3.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
              </div>
            </div>
            
            {/* Decorative element */}
            <div className="absolute bottom-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="w-20 h-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Supported Chains - Futuristic Grid */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
        
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Supported Chains</h2>
            </div>
            <span className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 rounded-full border border-blue-500/30 flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Multi-Chain Support
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {SUPPORTED_CHAINS.map((chain, index) => (
              chain.status === 'active' ? (
                <Link
                  key={chain.id}
                  to={`/chain/${chain.id}`}
                  className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border transition-all duration-500 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1 cursor-pointer overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <span className="absolute -top-1 -right-1 px-2.5 py-1 text-[10px] font-bold bg-green-500/20 text-green-400 rounded-full border border-green-500/30 animate-pulse">
                    LIVE
                  </span>
                  <div className="relative">
                    <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-md group-hover:blur-lg transition-all" />
                    <span className="relative text-3xl group-hover:scale-110 transition-transform inline-block">{chain.icon}</span>
                  </div>
                  <span className="text-sm text-white text-center font-medium group-hover:text-cyan-300 transition-colors">{chain.name}</span>
                </Link>
              ) : (
                <div
                  key={chain.id}
                  className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border transition-all duration-300 bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 cursor-not-allowed overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="absolute -top-1 -right-1 px-2.5 py-1 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                    SOON
                  </span>
                  <span className="text-3xl opacity-50 group-hover:opacity-70 transition-opacity">{chain.icon}</span>
                  <span className="text-sm text-slate-500 text-center font-medium">{chain.name}</span>
                </div>
              )
            ))}
          </div>
          
          <div className="flex items-center justify-center gap-2 mt-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/10">
            <Hexagon className="w-4 h-4 text-cyan-400" />
            <p className="text-slate-400 text-sm">
              <span className="text-cyan-400 font-semibold">Ramestta</span> is live now! Other networks coming soon.
            </p>
          </div>
        </div>
      </div>

      {/* Hot Tools - Premium Cards with Glowing Effects */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-slate-800/30 backdrop-blur-xl">
        {/* Animated gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 animate-gradient-x" />
        
        <div className="relative z-10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/40 rounded-xl blur-md animate-pulse" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Hot Tools</h2>
            <div className="ml-2 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
              <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
              <span className="text-xs font-bold text-orange-400">TRENDING</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.values(TOOLS)
              .flat()
              .filter(tool => tool.badge === 'HOT')
              .map((tool, index) => (
                <Link 
                  key={tool.id} 
                  to={tool.path} 
                  className="group relative overflow-hidden rounded-2xl p-6 bg-slate-900/50 border border-slate-700/50 transition-all duration-500 hover:border-transparent hover:shadow-2xl hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Gradient border on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 rounded-2xl" style={{ padding: '1px' }}>
                      <div className="absolute inset-[1px] bg-slate-900 rounded-2xl" />
                    </div>
                  </div>
                  
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500" />
                  
                  {/* Corner decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-5">
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                        <Shield className="w-6 h-6 text-orange-400" />
                      </div>
                      <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-red-500/30 to-orange-500/30 text-red-400 rounded-full border border-red-500/30 flex items-center gap-1.5">
                        <Flame className="w-3 h-3" />
                        HOT
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-300 transition-colors">{tool.name}</h3>
                    <p className="text-sm text-slate-400 mb-5 line-clamp-2 group-hover:text-slate-300 transition-colors">{tool.description}</p>
                    <div className="flex items-center text-orange-400 text-sm font-semibold group-hover:text-orange-300">
                      <Rocket className="w-4 h-4 mr-2" />
                      Launch Tool
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>

      {/* All Tool Categories - Futuristic Design */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
            <Wrench className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white">All Tools</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent ml-4" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {TOOL_CATEGORIES.map((category, catIndex) => {
            const CategoryIcon = categoryIcons[category.id]
            const tools = TOOLS[category.id as keyof typeof TOOLS] || []
            
            const gradientMap: Record<string, string> = {
              wallet: 'from-blue-500 to-cyan-500',
              token: 'from-green-500 to-emerald-500',
              trading: 'from-purple-500 to-pink-500',
              nft: 'from-orange-500 to-red-500',
              analytics: 'from-cyan-500 to-blue-500',
              utilities: 'from-yellow-500 to-orange-500',
            }

            return (
              <div 
                key={category.id} 
                className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl transition-all duration-500 hover:border-slate-600/50 hover:shadow-xl"
                style={{ animationDelay: `${catIndex * 100}ms` }}
              >
                {/* Top gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientMap[category.id] || 'from-blue-500 to-cyan-500'} opacity-60 group-hover:opacity-100 transition-opacity`} />
                
                {/* Background glow */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${gradientMap[category.id] || 'from-blue-500 to-cyan-500'} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity`} />
                
                <div className="relative z-10 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradientMap[category.id] || 'from-blue-500 to-cyan-500'} shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <CategoryIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{category.name}</h3>
                    <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-full">
                      {tools.length} tools
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    {tools.map((tool, toolIndex) => (
                      <Link
                        key={tool.id}
                        to={tool.path}
                        className="group/item flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-700/30 transition-all duration-300 border border-transparent hover:border-slate-600/30"
                        style={{ animationDelay: `${toolIndex * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-slate-600 group-hover/item:bg-gradient-to-r group-hover/item:from-cyan-400 group-hover/item:to-blue-400 transition-all duration-300" />
                          <span className="text-slate-300 group-hover/item:text-white transition-colors font-medium">
                            {tool.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {tool.badge && (
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                              tool.badge === 'HOT' 
                                ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/30' 
                                : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30'
                            }`}>
                              {tool.badge === 'HOT' && <Flame className="w-2.5 h-2.5" />}
                              {tool.badge === 'NEW' && <Sparkles className="w-2.5 h-2.5" />}
                              {tool.badge}
                            </span>
                          )}
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover/item:text-cyan-400 group-hover/item:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer CTA Section */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 p-8 text-center">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10" />
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
        
        {/* Floating orbs */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">Start Building Today</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to launch your next <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Web3 project</span>?
          </h3>
          <p className="text-slate-400 mb-6 max-w-xl mx-auto">
            Join thousands of developers building on Ramestta Network with our comprehensive suite of blockchain tools.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              to="/token/create" 
              className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105"
            >
              <Rocket className="w-5 h-5" />
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="https://docs.ramestta.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/50 text-white font-semibold rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-300"
            >
              <Eye className="w-5 h-5" />
              View Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
