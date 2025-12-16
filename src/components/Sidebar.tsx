import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Wallet, Coins, TrendingUp, Image, BarChart2, Wrench, 
  ChevronDown, ChevronRight, Plus, Search, Shield, Sparkles, Send, 
  Download, Lock, Settings, BarChart3, ArrowLeftRight, Bot, Images, 
  FolderDown, Fuel, Users, Globe, Server, Binary, FileSearch
} from 'lucide-react'
import { useState } from 'react'
import { TOOLS, TOOL_CATEGORIES } from '../config/tools'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Wallet, Coins, TrendingUp, Image, BarChart2, Wrench,
  Plus, Search, Shield, Sparkles, Send, Download, Lock, Settings,
  BarChart3, ArrowLeftRight, Bot, Images, FolderDown, Fuel, Users,
  Globe, Server, Binary, FileSearch
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  token: Coins,
  trading: TrendingUp,
  nft: Image,
  analytics: BarChart2,
  utilities: Wrench,
}

export default function Sidebar() {
  const location = useLocation()
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['wallet', 'token'])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span className="text-2xl">🔷</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">RamaScan</h1>
            <p className="text-xs text-cyan-500/70">Ramestta Tools</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Dashboard Link */}
        <Link
          to="/"
          className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>

        {/* Tool Categories */}
        {TOOL_CATEGORIES.map(category => {
          const CategoryIcon = categoryIcons[category.id]
          const isExpanded = expandedCategories.includes(category.id)
          const tools = TOOLS[category.id as keyof typeof TOOLS] || []

          return (
            <div key={category.id} className="space-y-1">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full sidebar-link justify-between"
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon className="w-5 h-5" />
                  <span>{category.name}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-4 space-y-1 border-l border-slate-800 pl-4">
                  {tools.map(tool => {
                    const ToolIcon = iconMap[tool.icon] || Wallet
                    const isActive = location.pathname === tool.path

                    return (
                      <Link
                        key={tool.id}
                        to={tool.path}
                        className={`sidebar-link text-sm ${isActive ? 'active' : ''}`}
                      >
                        <ToolIcon className="w-4 h-4" />
                        <span className="flex-1">{tool.name}</span>
                        {tool.badge && (
                          <span className={`badge ${tool.badge === 'HOT' ? 'badge-hot' : 'badge-new'}`}>
                            {tool.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 mb-2">Network Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-slate-300">All systems operational</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
