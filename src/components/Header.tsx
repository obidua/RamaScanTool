import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Bell, Search, Sun, Moon } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [isDark, setIsDark] = useState(true)

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search tools, tokens, addresses..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Ramestta Network Indicator */}
        <a 
          href="https://ramascan.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
        >
          <span className="text-lg">🔷</span>
          <span className="text-sm font-medium text-cyan-400">Ramestta</span>
        </a>

        {/* Price Ticker */}
        <div className="hidden lg:flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-medium">RAMA</span>
            <span className="text-green-400">$0.025</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">ETH</span>
            <span className="text-green-400">$3,980</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Gas</span>
            <span className="text-yellow-400">0.001 RAMA</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-700" />

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-slate-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors relative">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Wallet Connect */}
        <ConnectButton 
          chainStatus="icon"
          showBalance={false}
          accountStatus={{
            smallScreen: 'avatar',
            largeScreen: 'full',
          }}
        />
      </div>
    </header>
  )
}
