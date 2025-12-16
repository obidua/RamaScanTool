import { useState } from 'react'
import { Send, Upload, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'

interface Recipient {
  address: string
  amount: string
  status: 'pending' | 'success' | 'error'
}

export default function TokenMultiSender() {
  const { isConnected } = useAccount()
  const [tokenAddress, setTokenAddress] = useState('')
  const [recipients, setRecipients] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<Recipient[]>([])

  const parseRecipients = (): Recipient[] => {
    return recipients
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [address, amount] = line.split(',').map(s => s.trim())
        return { address, amount, status: 'pending' as const }
      })
  }

  const sendTokens = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!tokenAddress) {
      toast.error('Please enter token address')
      return
    }

    const recipientList = parseRecipients()
    if (recipientList.length === 0) {
      toast.error('Please enter recipients')
      return
    }

    setIsSending(true)
    setResults(recipientList)

    // Simulate sending
    for (let i = 0; i < recipientList.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: Math.random() > 0.1 ? 'success' : 'error' } : r
      ))
    }

    setIsSending(false)
    toast.success('Batch transfer completed!')
  }

  const totalAmount = parseRecipients().reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
  const recipientCount = parseRecipients().length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Token MultiSender</h1>
        <p className="text-slate-400 mt-1">Send tokens to multiple addresses in one transaction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="input-label">Token Address</label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="input-label">Network</label>
                <select className="input-field">
                  <option>Ramestta</option>
                  <option>Ethereum</option>
                  <option>BNB Chain</option>
                  <option>Polygon</option>
                  <option>Arbitrum</option>
                  <option>Base</option>
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">Recipients (address, amount - one per line)</label>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="0x1234...5678, 100&#10;0xabcd...efgh, 250&#10;0x9876...5432, 500"
                rows={10}
                className="input-field resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-4 mt-4">
              <button className="btn-secondary flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
              <button
                onClick={sendTokens}
                disabled={isSending || !isConnected}
                className="btn-primary flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Tokens
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Recipients</p>
                <p className="text-2xl font-bold text-white">{recipientCount}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Total Amount</p>
                <p className="text-2xl font-bold text-blue-400">{totalAmount.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Estimated Gas</p>
                <p className="text-xl font-bold text-white">~0.008 ETH</p>
                <p className="text-sm text-slate-500">$24.00</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-green-500/30 bg-green-500/5">
            <p className="text-green-400 text-sm">
              💡 <strong>Tip:</strong> MultiSender saves up to 80% on gas compared to individual transfers.
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Transfer Results</h2>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="bg-slate-800">
                  <th className="table-header">#</th>
                  <th className="table-header">Address</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-800/50">
                    <td className="table-cell">{index + 1}</td>
                    <td className="table-cell font-mono text-sm">
                      {result.address.slice(0, 10)}...{result.address.slice(-8)}
                    </td>
                    <td className="table-cell font-semibold">{result.amount}</td>
                    <td className="table-cell">
                      {result.status === 'pending' && (
                        <span className="flex items-center gap-2 text-yellow-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Pending
                        </span>
                      )}
                      {result.status === 'success' && (
                        <span className="flex items-center gap-2 text-green-400">
                          <Check className="w-4 h-4" />
                          Success
                        </span>
                      )}
                      {result.status === 'error' && (
                        <span className="flex items-center gap-2 text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
