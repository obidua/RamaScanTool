import { useState, useEffect } from 'react'
import { Wallet, Copy, ExternalLink, RefreshCw, CheckCircle, Shield, Activity, Coins, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAccount, useBalance, useChainId, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import BackButton from '../../components/BackButton'

export default function WalletManage() {
  const { address, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useBalance({ address })
  
  const [txCount, setTxCount] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast.success('Address copied to clipboard')
    }
  }

  // Open in explorer
  const openExplorer = () => {
    if (address) {
      window.open(`https://ramascan.com/address/${address}`, '_blank')
    }
  }

  // Fetch transaction count
  const fetchTxCount = async () => {
    if (!address || !publicClient) return
    try {
      const count = await publicClient.getTransactionCount({ address })
      setTxCount(count)
    } catch (error) {
      console.error('Failed to fetch tx count:', error)
    }
  }

  // Refresh all data
  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refetchBalance(),
        fetchTxCount(),
      ])
      toast.success('Wallet data refreshed')
    } catch (error) {
      toast.error('Failed to refresh data')
    }
    setIsRefreshing(false)
  }

  // Fetch data on mount and when address changes
  useEffect(() => {
    if (address && publicClient) {
      fetchTxCount()
    }
  }, [address, publicClient])

  // Not connected state
  if (!isConnected || !address) {
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Connect your wallet to view your balance, transaction history, and manage your assets on Ramestta Network.
          </p>
          <div className="flex items-center justify-center gap-2 text-cyan-400">
            <Shield className="w-5 h-5" />
            <span className="text-sm">Fully decentralized - Your keys, your wallet</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallet Dashboard</h1>
          <p className="text-slate-400 mt-1">View your connected wallet information</p>
        </div>
        <button 
          onClick={refreshData}
          disabled={isRefreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Wallet Card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white">Connected Wallet</h2>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full text-xs text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </span>
              </div>
              <p className="text-sm text-slate-400">via {connector?.name || 'Unknown'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm text-cyan-400">Ramestta Network</span>
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500 mb-2">Wallet Address</p>
          <div className="flex items-center justify-between">
            <code className="text-lg font-mono text-white">{address}</code>
            <div className="flex items-center gap-2">
              <button 
                onClick={copyAddress}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Copy Address"
              >
                <Copy className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
              <button 
                onClick={openExplorer}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="View on RamaScan"
              >
                <ExternalLink className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Balance */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-slate-400">Balance</span>
            </div>
            {balanceLoading ? (
              <div className="h-8 bg-slate-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-white">
                {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0'} 
                <span className="text-lg text-cyan-400 ml-2">RAMA</span>
              </p>
            )}
          </div>

          {/* Transaction Count */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-slate-400">Total Transactions</span>
            </div>
            <p className="text-2xl font-bold text-white">{txCount.toLocaleString()}</p>
          </div>

          {/* Network */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm text-slate-400">Network</span>
            </div>
            <p className="text-2xl font-bold text-white">Ramestta</p>
            <p className="text-xs text-slate-500">Chain ID: {chainId}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a 
            href="/wallet/batch-balance" 
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-sm text-slate-300">Check Balances</span>
          </a>
          
          <a 
            href="/token/multi-sender" 
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-sm text-slate-300">Send Tokens</span>
          </a>
          
          <a 
            href="/wallet/approval-checker" 
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-sm text-slate-300">Check Approvals</span>
          </a>
          
          <button 
            onClick={openExplorer}
            className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <ExternalLink className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-sm text-slate-300">View on Explorer</span>
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="glass-card p-4 border border-green-500/30 bg-green-500/5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-400 mb-1">Fully Decentralized</h4>
            <p className="text-sm text-slate-400">
              This dashboard reads data directly from the Ramestta blockchain. We never store your private keys or wallet data. 
              Your wallet connection is managed by {connector?.name || 'your wallet provider'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
