import { useState, useRef } from 'react'
import { Download, Upload, Loader2, Check, AlertCircle, Wallet, ExternalLink, Trash2, Coins, RefreshCw } from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { createWalletClient, http, parseEther, formatEther, formatUnits, isAddress, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'
import { getTxUrl, getContractUrl } from '../../config/contracts'
import { ERC20ABI } from '../../config/abis'

// Ramestta chain config
const ramestta = {
  id: 1370,
  name: 'Ramestta',
  nativeCurrency: { name: 'RAMA', symbol: 'RAMA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://blockchain.ramestta.com'] },
  },
  blockExplorers: {
    default: { name: 'Ramascan', url: 'https://ramascan.com' },
  },
} as const

interface WalletSource {
  address: string
  privateKey: string
  balance: string
  tokenBalance?: string
  status: 'pending' | 'checking' | 'ready' | 'sending' | 'success' | 'error'
  txHash?: string
  error?: string
}

type CollectionMode = 'token' | 'native'

export default function TokenBatchCollection() {
  const { address, isConnected } = useAccount()
  const [collectionMode, setCollectionMode] = useState<CollectionMode>('native')
  const [tokenAddress, setTokenAddress] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [wallets, setWallets] = useState('')
  const [isCollecting, setIsCollecting] = useState(false)
  const [isCheckingBalances, setIsCheckingBalances] = useState(false)
  const [results, setResults] = useState<WalletSource[]>([])
  const [selectedChain, setSelectedChain] = useState('1370')
  const [gasReserve, setGasReserve] = useState('0.001')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Token info
  const { data: tokenName } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'name',
    query: { enabled: isAddress(tokenAddress) && collectionMode === 'token' },
  })

  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'symbol',
    query: { enabled: isAddress(tokenAddress) && collectionMode === 'token' },
  })

  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: { enabled: isAddress(tokenAddress) && collectionMode === 'token' },
  })

  const decimals = tokenDecimals ?? 18
  const currentSymbol = collectionMode === 'native' ? 'RAMA' : (tokenSymbol as string) || 'Tokens'

  // Create public client
  const publicClient = createPublicClient({
    chain: ramestta,
    transport: http(),
  })

  // Parse wallets from textarea
  const parseWallets = (): WalletSource[] => {
    return wallets
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
        let addr = parts[0] || ''
        let pk = parts[1] || parts[0] || ''
        
        if (addr.startsWith('0x') && addr.length === 66 && !pk) {
          pk = addr
          addr = ''
        }
        
        if (pk && pk.startsWith('0x') && pk.length === 66 && !addr) {
          try {
            const account = privateKeyToAccount(pk as `0x${string}`)
            addr = account.address
          } catch {
            // Invalid private key
          }
        }
        
        return { 
          address: addr, 
          privateKey: pk, 
          balance: '0',
          tokenBalance: '0',
          status: 'pending' as const 
        }
      })
      .filter(w => w.privateKey && w.privateKey.startsWith('0x') && w.privateKey.length === 66)
  }

  // Check balances
  const checkBalances = async () => {
    const walletList = parseWallets()
    if (walletList.length === 0) {
      toast.error('No valid wallets found')
      return
    }

    setIsCheckingBalances(true)
    setResults(walletList.map(w => ({ ...w, status: 'checking' as const })))

    const updatedWallets: WalletSource[] = []

    for (const wallet of walletList) {
      try {
        const balance = await publicClient.getBalance({ address: wallet.address as `0x${string}` })
        
        let tokenBalance = '0'
        if (collectionMode === 'token' && isAddress(tokenAddress)) {
          const tb = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [wallet.address as `0x${string}`],
          }) as bigint
          tokenBalance = formatUnits(tb, decimals)
        }

        updatedWallets.push({
          ...wallet,
          balance: formatEther(balance),
          tokenBalance,
          status: 'ready' as const,
        })
      } catch {
        updatedWallets.push({
          ...wallet,
          status: 'error' as const,
          error: 'Failed to fetch balance',
        })
      }
    }

    setResults(updatedWallets)
    setIsCheckingBalances(false)
    toast.success(`Checked ${updatedWallets.length} wallets`)
  }

  // Collect tokens
  const collectTokens = async () => {
    if (!destinationAddress || !isAddress(destinationAddress)) {
      toast.error('Please enter a valid destination address')
      return
    }

    if (results.length === 0) {
      toast.error('Please check balances first')
      return
    }

    setIsCollecting(true)

    for (let i = 0; i < results.length; i++) {
      const wallet = results[i]
      
      if (collectionMode === 'native') {
        if (parseFloat(wallet.balance) <= parseFloat(gasReserve)) continue
      } else {
        if (parseFloat(wallet.tokenBalance || '0') <= 0) continue
      }

      setResults(prev => prev.map((w, idx) => 
        idx === i ? { ...w, status: 'sending' as const } : w
      ))

      try {
        const account = privateKeyToAccount(wallet.privateKey as `0x${string}`)
        const walletClient = createWalletClient({
          account,
          chain: ramestta,
          transport: http(),
        })

        let txHash: `0x${string}`

        if (collectionMode === 'native') {
          const balance = await publicClient.getBalance({ address: wallet.address as `0x${string}` })
          const gasPrice = await publicClient.getGasPrice()
          const gasLimit = 21000n
          const gasCost = gasPrice * gasLimit
          const reserveWei = parseEther(gasReserve)
          const amountToSend = balance - gasCost - reserveWei

          if (amountToSend <= 0n) throw new Error('Insufficient balance after gas')

          txHash = await walletClient.sendTransaction({
            to: destinationAddress as `0x${string}`,
            value: amountToSend,
            gas: gasLimit,
          })
        } else {
          const tokenBalance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [wallet.address as `0x${string}`],
          }) as bigint

          if (tokenBalance <= 0n) throw new Error('No token balance')

          txHash = await walletClient.writeContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'transfer',
            args: [destinationAddress as `0x${string}`, tokenBalance],
          })
        }

        await publicClient.waitForTransactionReceipt({ hash: txHash })

        setResults(prev => prev.map((w, idx) => 
          idx === i ? { ...w, status: 'success' as const, txHash } : w
        ))
      } catch (error: any) {
        setResults(prev => prev.map((w, idx) => 
          idx === i ? { ...w, status: 'error' as const, error: error.message || 'Transaction failed' } : w
        ))
      }
    }

    setIsCollecting(false)
    toast.success('Collection completed!')
  }

  // CSV Import
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        const lines = text.split('\n').filter(line => line.trim())
        const parsed = lines.map(line => line.replace(/"/g, '').trim()).filter(Boolean)
        setWallets(prev => prev ? `${prev}\n${parsed.join('\n')}` : parsed.join('\n'))
        toast.success(`Imported ${parsed.length} wallets`)
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearAll = () => {
    setWallets('')
    setResults([])
  }

  const totalNativeBalance = results.reduce((sum, w) => sum + parseFloat(w.balance || '0'), 0)
  const totalTokenBalance = results.reduce((sum, w) => sum + parseFloat(w.tokenBalance || '0'), 0)
  const walletsWithBalance = results.filter(w => 
    collectionMode === 'native' 
      ? parseFloat(w.balance) > parseFloat(gasReserve)
      : parseFloat(w.tokenBalance || '0') > 0
  ).length
  const successCount = results.filter(w => w.status === 'success').length

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Token Batch Collection</h1>
          <p className="text-slate-400 mt-1">Collect tokens from multiple wallets to a single destination</p>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setCollectionMode('native')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              collectionMode === 'native'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" />
            Native RAMA
          </button>
          <button
            onClick={() => setCollectionMode('token')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              collectionMode === 'token'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            ERC20 Token
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {collectionMode === 'token' && (
                <div>
                  <label className="input-label">Token Address</label>
                  <input
                    type="text"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="0x..."
                    className="input-field font-mono"
                  />
                  {tokenName && tokenSymbol && (
                    <p className="text-sm text-green-400 mt-1">
                      {tokenName as string} ({tokenSymbol as string})
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="input-label">Gas Reserve (RAMA)</label>
                <input
                  type="text"
                  value={gasReserve}
                  onChange={(e) => setGasReserve(e.target.value)}
                  placeholder="0.001"
                  className="input-field font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">Keep in source wallets for gas</p>
              </div>
              <div>
                <NetworkSelector label="Network" value={selectedChain} onChange={setSelectedChain} />
              </div>
            </div>

            <div className="mb-4">
              <label className="input-label">Destination Address</label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                className="input-field font-mono"
              />
              {isConnected && (
                <button 
                  onClick={() => setDestinationAddress(address || '')}
                  className="text-sm text-blue-400 hover:text-blue-300 mt-1"
                >
                  Use connected wallet
                </button>
              )}
            </div>

            <div>
              <label className="input-label">Source Wallets (privateKey per line)</label>
              <textarea
                value={wallets}
                onChange={(e) => setWallets(e.target.value)}
                placeholder="0xprivatekey1...&#10;0xprivatekey2...&#10;Or: address, privateKey"
                rows={8}
                className="input-field resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-4 mt-4 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVImport}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
              <button
                onClick={checkBalances}
                disabled={isCheckingBalances || parseWallets().length === 0}
                className="btn-secondary flex items-center gap-2"
              >
                {isCheckingBalances ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Check Balances
                  </>
                )}
              </button>
              <button
                onClick={collectTokens}
                disabled={isCollecting || walletsWithBalance === 0 || !destinationAddress}
                className="btn-primary flex items-center gap-2"
              >
                {isCollecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Collecting ({successCount}/{walletsWithBalance})...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Collect {currentSymbol}
                  </>
                )}
              </button>
              {results.length > 0 && (
                <button
                  onClick={clearAll}
                  className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Source Wallets</p>
                <p className="text-2xl font-bold text-white">{results.length || parseWallets().length}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Wallets With Balance</p>
                <p className="text-2xl font-bold text-blue-400">{walletsWithBalance}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Total {collectionMode === 'native' ? 'RAMA' : currentSymbol}</p>
                <p className="text-2xl font-bold text-green-400">
                  {collectionMode === 'native' 
                    ? totalNativeBalance.toFixed(4) 
                    : totalTokenBalance.toFixed(4)
                  } {currentSymbol}
                </p>
              </div>
              {results.some(w => w.status === 'success') && (
                <div className="stat-card border-green-500/30 bg-green-500/10">
                  <p className="text-sm text-slate-400">Collected</p>
                  <p className="text-2xl font-bold text-green-400">{successCount}/{walletsWithBalance}</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
            <p className="text-yellow-400 text-sm">
              ⚠️ <strong>Security:</strong> Private keys are processed locally and never sent to any server.
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Wallet Balances</h2>
            <span className="text-sm text-slate-400">
              {results.filter(w => w.status === 'success').length} collected of {walletsWithBalance} with balance
            </span>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0">
                <tr className="bg-slate-800">
                  <th className="table-header">#</th>
                  <th className="table-header">Source Address</th>
                  <th className="table-header">RAMA Balance</th>
                  {collectionMode === 'token' && (
                    <th className="table-header">Token Balance</th>
                  )}
                  <th className="table-header">Status</th>
                  <th className="table-header">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-800/50">
                    <td className="table-cell">{index + 1}</td>
                    <td className="table-cell font-mono text-sm">
                      <a 
                        href={getContractUrl(result.address)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        {result.address?.slice(0, 10)}...{result.address?.slice(-8)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="table-cell font-semibold">{parseFloat(result.balance).toFixed(4)} RAMA</td>
                    {collectionMode === 'token' && (
                      <td className="table-cell font-semibold text-purple-400">
                        {parseFloat(result.tokenBalance || '0').toFixed(4)} {currentSymbol}
                      </td>
                    )}
                    <td className="table-cell">
                      {result.status === 'pending' && (
                        <span className="text-slate-400">Pending</span>
                      )}
                      {result.status === 'checking' && (
                        <span className="flex items-center gap-2 text-yellow-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking...
                        </span>
                      )}
                      {result.status === 'ready' && (
                        <span className="flex items-center gap-2 text-blue-400">
                          <Check className="w-4 h-4" />
                          Ready
                        </span>
                      )}
                      {result.status === 'sending' && (
                        <span className="flex items-center gap-2 text-yellow-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </span>
                      )}
                      {result.status === 'success' && (
                        <span className="flex items-center gap-2 text-green-400">
                          <Check className="w-4 h-4" />
                          Collected
                        </span>
                      )}
                      {result.status === 'error' && (
                        <span className="flex items-center gap-2 text-red-400" title={result.error}>
                          <AlertCircle className="w-4 h-4" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="table-cell font-mono text-sm">
                      {result.txHash ? (
                        <a 
                          href={getTxUrl(result.txHash)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          {result.txHash.slice(0, 10)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : '-'}
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
