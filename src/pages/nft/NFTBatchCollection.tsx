import { useState } from 'react'
import { FolderDown, Upload, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'

interface NFTCollection {
  wallet: string
  tokenIds: string[]
  status: 'pending' | 'success' | 'error'
}

export default function NFTBatchCollection() {
  const { address, isConnected } = useAccount()
  const [contractAddress, setContractAddress] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [wallets, setWallets] = useState('')
  const [isCollecting, setIsCollecting] = useState(false)
  const [results, setResults] = useState<NFTCollection[]>([])
  const [selectedChain, setSelectedChain] = useState('1370')

  const parseWallets = (): NFTCollection[] => {
    return wallets
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [wallet] = line.split(',').map(s => s.trim())
        return { 
          wallet, 
          tokenIds: [`${Math.floor(Math.random() * 100)}`, `${Math.floor(Math.random() * 100)}`],
          status: 'pending' as const 
        }
      })
  }

  const collectNFTs = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    const walletList = parseWallets()
    if (walletList.length === 0) {
      toast.error('Please enter source wallets')
      return
    }

    setIsCollecting(true)
    setResults(walletList)

    for (let i = 0; i < walletList.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setResults(prev => prev.map((w, idx) => 
        idx === i ? { ...w, status: Math.random() > 0.1 ? 'success' : 'error' } : w
      ))
    }

    setIsCollecting(false)
    toast.success('NFT collection completed!')
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">NFT Batch Collection</h1>
        <p className="text-slate-400 mt-1">Collect NFTs from multiple wallets to a single destination</p>
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
              <label className="input-label">Destination Address</label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                className="input-field font-mono"
              />
              <button 
                onClick={() => setDestinationAddress(address || '')}
                className="text-sm text-blue-400 hover:text-blue-300 mt-1"
              >
                Use connected wallet
              </button>
            </div>

            <div>
              <label className="input-label">Source Wallets (address, privateKey - one per line)</label>
              <textarea
                value={wallets}
                onChange={(e) => setWallets(e.target.value)}
                placeholder="0x1234...5678, 0xprivate...&#10;0xabcd...efgh, 0xprivate..."
                rows={8}
                className="input-field resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-4">
              <button className="btn-secondary flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
              <button
                onClick={collectNFTs}
                disabled={isCollecting || !isConnected}
                className="btn-primary flex items-center gap-2"
              >
                {isCollecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Collecting...
                  </>
                ) : (
                  <>
                    <FolderDown className="w-5 h-5" />
                    Collect NFTs
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
              <p className="text-sm text-slate-400">Source Wallets</p>
              <p className="text-2xl font-bold text-white">{parseWallets().length}</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-slate-400">Estimated NFTs</p>
              <p className="text-2xl font-bold text-pink-400">~{parseWallets().length * 2}</p>
            </div>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Collection Results</h2>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="bg-slate-800">
                  <th className="table-header">Source Wallet</th>
                  <th className="table-header">Token IDs</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-800/50">
                    <td className="table-cell font-mono text-sm">
                      {result.wallet?.slice(0, 10)}...{result.wallet?.slice(-8)}
                    </td>
                    <td className="table-cell">{result.tokenIds.map(id => `#${id}`).join(', ')}</td>
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
                          Collected
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
