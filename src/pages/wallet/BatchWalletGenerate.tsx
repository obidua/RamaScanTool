import { useState } from 'react'
import { Plus, Download, Copy, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface GeneratedWallet {
  address: string
  privateKey: string
}

export default function BatchWalletGenerate() {
  const [count, setCount] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [wallets, setWallets] = useState<GeneratedWallet[]>([])
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')

  const generateWallets = async () => {
    setIsGenerating(true)
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const newWallets: GeneratedWallet[] = Array.from({ length: count }, (_, i) => ({
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      privateKey: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
    }))
    
    setWallets(newWallets)
    setIsGenerating(false)
    toast.success(`Generated ${count} wallets successfully!`)
  }

  const copyAll = () => {
    const text = wallets.map(w => `${w.address},${w.privateKey}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('All wallets copied to clipboard')
  }

  const downloadCSV = () => {
    const csv = 'Address,Private Key\n' + wallets.map(w => `${w.address},${w.privateKey}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wallets.csv'
    a.click()
    toast.success('Wallets downloaded!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Batch Wallet Generate</h1>
        <p className="text-slate-400 mt-1">Generate multiple wallets at once with optional vanity options</p>
      </div>

      {/* Generator Form */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="input-label">Number of Wallets</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">Address Prefix (Optional)</label>
            <input
              type="text"
              placeholder="e.g., 0x000"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">Address Suffix (Optional)</label>
            <input
              type="text"
              placeholder="e.g., abc"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">Chain</label>
            <select className="input-field">
              <option>EVM (ETH, BSC, etc.)</option>
              <option>Solana</option>
              <option>Tron</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={generateWallets}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Generate {count} Wallets
              </>
            )}
          </button>

          {wallets.length > 0 && (
            <>
              <button onClick={copyAll} className="btn-secondary flex items-center gap-2">
                <Copy className="w-5 h-5" />
                Copy All
              </button>
              <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download CSV
              </button>
              <button onClick={() => setWallets([])} className="btn-outline flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Generated Wallets Table */}
      {wallets.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">
              Generated Wallets ({wallets.length})
            </h2>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="bg-slate-800">
                  <th className="table-header">#</th>
                  <th className="table-header">Address</th>
                  <th className="table-header">Private Key</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet, index) => (
                  <tr key={index} className="hover:bg-slate-800/50">
                    <td className="table-cell">{index + 1}</td>
                    <td className="table-cell font-mono text-sm">
                      {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                    </td>
                    <td className="table-cell font-mono text-sm">
                      {wallet.privateKey.slice(0, 10)}...{wallet.privateKey.slice(-8)}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${wallet.address},${wallet.privateKey}`)
                          toast.success('Copied!')
                        }}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
        <p className="text-yellow-400 text-sm">
          ⚠️ <strong>Security Warning:</strong> Private keys are generated locally in your browser and never sent to any server. 
          Always store your private keys securely and never share them with anyone.
        </p>
      </div>
    </div>
  )
}
