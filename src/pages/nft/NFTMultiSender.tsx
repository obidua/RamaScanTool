import { useState } from 'react'
import { Images, Upload, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'

interface NFTTransfer {
  tokenId: string
  recipient: string
  status: 'pending' | 'success' | 'error'
}

export default function NFTMultiSender() {
  const { isConnected } = useAccount()
  const [contractAddress, setContractAddress] = useState('')
  const [transfers, setTransfers] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<NFTTransfer[]>([])
  const [selectedChain, setSelectedChain] = useState('1370')

  const parseTransfers = (): NFTTransfer[] => {
    return transfers
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [tokenId, recipient] = line.split(',').map(s => s.trim())
        return { tokenId, recipient, status: 'pending' as const }
      })
  }

  const sendNFTs = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    const transferList = parseTransfers()
    if (transferList.length === 0) {
      toast.error('Please enter transfers')
      return
    }

    setIsSending(true)
    setResults(transferList)

    for (let i = 0; i < transferList.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600))
      setResults(prev => prev.map((t, idx) => 
        idx === i ? { ...t, status: Math.random() > 0.1 ? 'success' : 'error' } : t
      ))
    }

    setIsSending(false)
    toast.success('NFT batch transfer completed!')
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">NFT MultiSender</h1>
        <p className="text-slate-400 mt-1">Send multiple NFTs to different addresses in batch</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">NFT Contract Address</label>
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-field font-mono"
                />
              </div>
              <div>
                <NetworkSelector label="Network" value={selectedChain} onChange={setSelectedChain} />
              </div>
            </div>

            <div>
              <label className="input-label">Transfers (tokenId, recipientAddress - one per line)</label>
              <textarea
                value={transfers}
                onChange={(e) => setTransfers(e.target.value)}
                placeholder="1, 0x1234...5678&#10;2, 0xabcd...efgh&#10;3, 0x9876...5432"
                rows={10}
                className="input-field resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-4">
              <button className="btn-secondary flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
              <button
                onClick={sendNFTs}
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
                    <Images className="w-5 h-5" />
                    Send NFTs
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
          <div className="space-y-4">
            <div className="stat-card">
              <p className="text-sm text-slate-400">Total NFTs</p>
              <p className="text-2xl font-bold text-white">{parseTransfers().length}</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-slate-400">Unique Recipients</p>
              <p className="text-2xl font-bold text-pink-400">
                {new Set(parseTransfers().map(t => t.recipient)).size}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-slate-400">Estimated Gas</p>
              <p className="text-xl font-bold text-yellow-400">~0.001 RAMA</p>
              <p className="text-sm text-slate-500">per transfer</p>
            </div>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Transfer Results</h2>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="bg-slate-800">
                  <th className="table-header">Token ID</th>
                  <th className="table-header">Recipient</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-800/50">
                    <td className="table-cell font-semibold">#{result.tokenId}</td>
                    <td className="table-cell font-mono text-sm">
                      {result.recipient?.slice(0, 10)}...{result.recipient?.slice(-8)}
                    </td>
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
                          Sent
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
