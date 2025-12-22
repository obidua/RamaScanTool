import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Bell, Search, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'

// Fetch RAMA price from CoinGecko
const useRamaPrice = () => {
  const [price, setPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ramestta&vs_currencies=usd&include_24hr_change=true'
        )
        const data = await response.json()
        if (data.ramestta) {
          setPrice(data.ramestta.usd)
          setPriceChange(data.ramestta.usd_24h_change || 0)
        }
      } catch (error) {
        console.error('Failed to fetch RAMA price:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()
    // Refresh price every 60 seconds
    const interval = setInterval(fetchPrice, 60000)
    return () => clearInterval(interval)
  }, [])

  return { price, priceChange, loading }
}

export default function Header() {
  const [isDark, setIsDark] = useState(true)
  const { price, priceChange, loading } = useRamaPrice()

  const formatPrice = (p: number | null) => {
    if (p === null) return '---'
    if (p < 0.01) return `$${p.toFixed(6)}`
    if (p < 1) return `$${p.toFixed(4)}`
    return `$${p.toFixed(2)}`
  }

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 fixed top-0 right-0 left-0 lg:left-64 z-30">
      {/* Search - Hidden on mobile, shown on tablet+ */}
      <div className="hidden sm:block flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search tools, tokens, addresses..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Mobile spacer for hamburger */}
      <div className="w-12 lg:hidden" />

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4">
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

        {/* RAMA Price from CoinGecko */}
        <a
          href="https://www.coingecko.com/en/coins/ramestta"
          target="_blank"
          rel="noopener noreferrer" 
          className="hidden lg:flex items-center gap-3 text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-medium">RAMA</span>
            {loading ? (
              <span className="text-slate-400">Loading...</span>
            ) : (
              <>
                <span className={priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatPrice(price)}
                </span>
                <span className={`text-xs ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '↑' : '↓'}{Math.abs(priceChange).toFixed(2)}%
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Gas</span>
            <span className="text-yellow-400">0.001 RAMA</span>
          </div>
        </a>

        {/* Divider - hidden on mobile */}
        <div className="hidden md:block h-6 w-px bg-slate-700" />

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

        {/* Notifications - hidden on mobile */}
        <button className="hidden sm:block p-2 rounded-lg hover:bg-slate-800 transition-colors relative">
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
