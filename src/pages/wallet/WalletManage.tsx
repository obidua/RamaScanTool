import { useState } from 'react'
import { Wallet, Plus, Trash2, Eye, EyeOff, Copy, Download, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'

interface WalletItem {
  address: string
  name: string
  balance: string
}

const mockWallets: WalletItem[] = [
  { address: '0x1234...5678', name: 'Main Wallet', balance: '1,500 RAMA' },
  { address: '0xabcd...efgh', name: 'Trading Wallet', balance: '2,500 RAMA' },
  { address: '0x9876...5432', name: 'NFT Wallet', balance: '500 RAMA' },
]

export default function WalletManage() {
  const [wallets] = useState<WalletItem[]>(mockWallets)
  const [showPrivateKey, setShowPrivateKey] = useState<Record<string, boolean>>({})

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied to clipboard')
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wallets Manage</h1>
          <p className="text-slate-400 mt-1">Manage all your wallets in one place</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Wallet
          </button>
        </div>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((wallet, index) => (
          <div key={index} className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{wallet.name}</h3>
                  <span className="text-xs text-cyan-400">Ramestta Network</span>
                </div>
              </div>
              <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Address</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-slate-300 flex-1">{wallet.address}</code>
                  <button 
                    onClick={() => copyAddress(wallet.address)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Balance</p>
                <p className="text-lg font-semibold text-green-400">{wallet.balance}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setShowPrivateKey(prev => ({ ...prev, [wallet.address]: !prev[wallet.address] }))}
                  className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                >
                  {showPrivateKey[wallet.address] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPrivateKey[wallet.address] ? 'Hide Key' : 'Show Key'}
                </button>
                <button className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <button className="glass-card p-6 border-dashed border-2 border-slate-700 hover:border-blue-500/50 transition-colors flex flex-col items-center justify-center gap-4 min-h-[200px]">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
            <Plus className="w-6 h-6 text-slate-400" />
          </div>
          <span className="text-slate-400">Add New Wallet</span>
        </button>
      </div>

      {/* Bulk Actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Bulk Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="btn-secondary">Export All Wallets</button>
          <button className="btn-secondary">Check All Balances</button>
          <button className="btn-secondary">Revoke All Approvals</button>
          <button className="btn-outline text-red-400 border-red-500 hover:bg-red-500/10">Delete All</button>
        </div>
      </div>
    </div>
  )
}
