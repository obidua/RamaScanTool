import { useState } from 'react'
import { Plus, Download, Copy, Loader2, RefreshCw, Eye, EyeOff, AlertTriangle, Shield, Key, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateMnemonic, mnemonicToAccount, english, privateKeyToAccount } from 'viem/accounts'
import { toHex } from 'viem'
import BackButton from '../../components/BackButton'

interface GeneratedWallet {
  address: string
  privateKey: string
  mnemonic: string
}

const MAX_WALLETS = 100000
const BATCH_SIZE = 1000 // Process 1000 wallets before UI update
const BATCH_DELAY = 0 // No delay for maximum speed
const UI_UPDATE_INTERVAL = 200 // Update UI every 200 wallets

export default function BatchWalletGenerate() {
  const [count, setCount] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [wallets, setWallets] = useState<GeneratedWallet[]>([])
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [showPrivateKeys, setShowPrivateKeys] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatedCount, setGeneratedCount] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState('')
  const [fastMode, setFastMode] = useState(true) // Fast mode by default
  const [currentRate, setCurrentRate] = useState(0)

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `~${Math.ceil(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.ceil(seconds % 60)
    return `~${mins}m ${secs}s`
  }

  // Generate random bytes for private key (much faster than BIP-39)
  const generateRandomPrivateKey = (): `0x${string}` => {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return toHex(bytes) as `0x${string}`
  }

  // Parallel HD wallet generation using multiple iterations per batch
  const generateHDWalletsBatch = async (batchSize: number): Promise<GeneratedWallet[]> => {
    const results: GeneratedWallet[] = []
    for (let i = 0; i < batchSize; i++) {
      const mnemonic = generateMnemonic(english)
      const account = mnemonicToAccount(mnemonic)
      const privateKeyBytes = account.getHdKey().privateKey
      const privateKeyHex = privateKeyBytes ? toHex(privateKeyBytes) : ''
      results.push({
        address: account.address,
        privateKey: privateKeyHex,
        mnemonic: mnemonic,
      })
    }
    return results
  }

  const generateWallets = async () => {
    if (count < 1 || count > MAX_WALLETS) {
      toast.error(`Please enter a number between 1 and ${MAX_WALLETS.toLocaleString()}`)
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGeneratedCount(0)
    setWallets([])
    setEstimatedTime('')
    setCurrentRate(0)

    const newWallets: GeneratedWallet[] = []
    const prefixLower = prefix.toLowerCase().replace('0x', '')
    const suffixLower = suffix.toLowerCase()
    const hasVanity = prefixLower || suffixLower
    const startTime = Date.now()

    try {
      if (fastMode) {
        // Fast mode - random private keys (super fast)
        for (let i = 0; i < count; i++) {
          const privateKey = generateRandomPrivateKey()
          const account = privateKeyToAccount(privateKey)
          
          if (hasVanity) {
            const addressLower = account.address.toLowerCase()
            const matchesPrefix = !prefixLower || addressLower.slice(2).startsWith(prefixLower)
            const matchesSuffix = !suffixLower || addressLower.endsWith(suffixLower)
            if (!matchesPrefix || !matchesSuffix) {
              i-- // Retry
              continue
            }
          }
          
          newWallets.push({
            address: account.address,
            privateKey: privateKey,
            mnemonic: '(Fast mode - no recovery phrase)',
          })

          if ((i + 1) % UI_UPDATE_INTERVAL === 0 || i === count - 1) {
            const progress = Math.round(((i + 1) / count) * 100)
            setGenerationProgress(progress)
            setGeneratedCount(i + 1)
            
            const elapsed = (Date.now() - startTime) / 1000
            const rate = (i + 1) / elapsed
            setCurrentRate(Math.round(rate))
            const remaining = (count - (i + 1)) / rate
            if (remaining > 0) setEstimatedTime(formatTime(remaining))
          }

          if ((i + 1) % BATCH_SIZE === 0) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
          }
        }
      } else {
        // HD wallet mode - optimized with larger batches and less UI updates
        const CHUNK_SIZE = 50 // Generate 50 wallets per chunk for ~200/sec target
        let generated = 0
        
        while (generated < count) {
          const remaining = count - generated
          const batchSize = Math.min(CHUNK_SIZE, remaining)
          
          // Generate a batch of HD wallets
          const batchResults = await generateHDWalletsBatch(batchSize)
          
          if (hasVanity) {
            // Filter for vanity matches
            for (const wallet of batchResults) {
              const addressLower = wallet.address.toLowerCase()
              const matchesPrefix = !prefixLower || addressLower.slice(2).startsWith(prefixLower)
              const matchesSuffix = !suffixLower || addressLower.endsWith(suffixLower)
              if (matchesPrefix && matchesSuffix) {
                newWallets.push(wallet)
                if (newWallets.length >= count) break
              }
            }
            generated = newWallets.length
          } else {
            newWallets.push(...batchResults)
            generated += batchSize
          }
          
          // Update UI
          const progress = Math.round((generated / count) * 100)
          setGenerationProgress(progress)
          setGeneratedCount(generated)
          
          const elapsed = (Date.now() - startTime) / 1000
          if (elapsed > 0) {
            const rate = generated / elapsed
            setCurrentRate(Math.round(rate))
            const remainingTime = (count - generated) / rate
            if (remainingTime > 0) setEstimatedTime(formatTime(remainingTime))
          }
          
          // Yield to browser for smooth UI
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      setWallets(newWallets)
      setEstimatedTime('')
      
      if (newWallets.length > 0) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1)
        const finalRate = Math.round(newWallets.length / parseFloat(duration))
        toast.success(`Generated ${newWallets.length.toLocaleString()} wallets in ${duration}s (${finalRate.toLocaleString()}/sec)!`)
      }
    } catch (error) {
      console.error('Wallet generation error:', error)
      toast.error('Failed to generate wallets')
    }

    setIsGenerating(false)
    setGenerationProgress(0)
    setGeneratedCount(0)
  }

  const copyAll = () => {
    const text = wallets.map(w => `Address: ${w.address}\nPrivate Key: ${w.privateKey}\nRecovery Phrase: ${w.mnemonic}\n`).join('\n---\n')
    navigator.clipboard.writeText(text)
    toast.success('All wallets copied to clipboard')
  }

  const downloadCSV = () => {
    const csv = 'Address,Private Key,Recovery Phrase\n' + wallets.map(w => `${w.address},${w.privateKey},"${w.mnemonic}"`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ramestta-wallets-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Wallets downloaded!')
  }

  const downloadJSON = () => {
    const json = JSON.stringify(wallets.map(w => ({
      address: w.address,
      privateKey: w.privateKey,
      mnemonic: w.mnemonic,
      network: 'Ramestta (Chain ID: 1370)',
      derivationPath: "m/44'/60'/0'/0/0"
    })), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ramestta-wallets-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Wallets downloaded as JSON!')
  }

  const maskPrivateKey = (key: string) => {
    if (showPrivateKeys) return key
    return key.slice(0, 10) + '••••••••••••••••••••••••••••••••' + key.slice(-6)
  }

  const maskMnemonic = (mnemonic: string) => {
    if (showPrivateKeys) return mnemonic
    const words = mnemonic.split(' ')
    return words.slice(0, 2).join(' ') + ' •••••• •••••• •••••• ' + words.slice(-2).join(' ')
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Batch Wallet Generate</h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Generate multiple Ramestta wallets with optional vanity addresses</p>
      </div>

      {/* Info Card */}
      <div className="glass-card p-4 border-cyan-500/30 bg-cyan-500/5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-cyan-400 mt-0.5" />
          <div>
            <p className="text-cyan-400 text-sm font-medium">Secure Local Generation</p>
            <p className="text-slate-400 text-xs mt-1">
              Wallets are generated using cryptographically secure methods directly in your browser. 
              Private keys never leave your device.
            </p>
          </div>
        </div>
      </div>

      {/* Generator Form */}
      <div className="glass-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="input-label">Number of Wallets</label>
            <input
              type="number"
              min="1"
              max={MAX_WALLETS}
              value={count || ''}
              onChange={(e) => {
                const val = e.target.value
                if (val === '') {
                  setCount(0)
                } else {
                  const num = parseInt(val)
                  if (!isNaN(num)) {
                    setCount(Math.min(MAX_WALLETS, Math.max(0, num)))
                  }
                }
              }}
              onBlur={() => {
                if (count < 1) setCount(1)
              }}
              className="input-field"
            />
            <p className="text-xs text-slate-500 mt-1">Max: {MAX_WALLETS.toLocaleString()} wallets</p>
          </div>
          <div>
            <label className="input-label">Address Prefix (Optional)</label>
            <input
              type="text"
              placeholder="e.g., 000 or abc"
              value={prefix}
              maxLength={4}
              onChange={(e) => setPrefix(e.target.value.replace(/[^a-fA-F0-9]/g, ''))}
              className="input-field font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">Hex only, max 4 chars</p>
          </div>
          <div>
            <label className="input-label">Address Suffix (Optional)</label>
            <input
              type="text"
              placeholder="e.g., 777 or dead"
              value={suffix}
              maxLength={4}
              onChange={(e) => setSuffix(e.target.value.replace(/[^a-fA-F0-9]/g, ''))}
              className="input-field font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">Hex only, max 4 chars</p>
          </div>
        </div>

        {/* Network Badge */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Network:</span>
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium flex items-center gap-2">
              🔷 Ramestta (Chain ID: 1370)
            </span>
          </div>
          
          {/* Fast Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFastMode(!fastMode)}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                fastMode 
                  ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400' 
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <Zap className={`w-4 h-4 ${fastMode ? 'text-yellow-400' : ''}`} />
              Fast Mode {fastMode ? 'ON' : 'OFF'}
            </button>
            <span className="text-xs text-slate-500">
              {fastMode ? '⚡ ~5,000+ wallets/sec (no recovery phrase)' : '� ~200 wallets/sec (with recovery phrase)'}
            </span>
          </div>
        </div>

        {/* Progress Bar - shows during generation */}
        {isGenerating && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">
                Generating wallets... {generatedCount.toLocaleString()} / {count.toLocaleString()}
                {currentRate > 0 && <span className="text-yellow-400 ml-2">⚡ {currentRate.toLocaleString()}/sec</span>}
              </span>
              <span className="text-sm text-cyan-400 font-mono">
                {generationProgress}% {estimatedTime && `• ETA: ${estimatedTime}`}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-100 ease-out ${
                  fastMode ? 'bg-gradient-to-r from-yellow-500 to-orange-400' : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                }`}
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              {fastMode ? '⚡ Fast Mode: Maximum speed, private keys only' : '🔐 HD Mode: Slower but includes recovery phrases'}
            </p>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={generateWallets}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating... {generationProgress}%
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Generate {count.toLocaleString()} Wallet{count > 1 ? 's' : ''}
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
                CSV
              </button>
              <button onClick={downloadJSON} className="btn-secondary flex items-center gap-2">
                <Download className="w-5 h-5" />
                JSON
              </button>
              <button 
                onClick={() => setShowPrivateKeys(!showPrivateKeys)} 
                className="btn-outline flex items-center gap-2"
              >
                {showPrivateKeys ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {showPrivateKeys ? 'Hide Keys' : 'Show Keys'}
              </button>
              <button onClick={() => setWallets([])} className="btn-outline flex items-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10">
                <RefreshCw className="w-5 h-5" />
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Generated Wallets */}
      {wallets.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              Generated Wallets ({wallets.length})
            </h2>
            <span className="text-xs text-slate-400">
              Click any value to copy
            </span>
          </div>
          <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
            {wallets.map((wallet, index) => (
              <div key={index} className="p-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-medium">
                    {index + 1}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(wallet.address)
                      toast.success('Address copied!')
                    }}
                    className="font-mono text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {wallet.address}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 ml-10">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Private Key</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(wallet.privateKey)
                        toast.success('Private key copied!')
                      }}
                      className="font-mono text-xs text-slate-400 hover:text-white transition-colors text-left break-all flex items-start gap-2"
                    >
                      <Copy className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{maskPrivateKey(wallet.privateKey)}</span>
                    </button>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Recovery Phrase (12 words)</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(wallet.mnemonic)
                        toast.success('Recovery phrase copied!')
                      }}
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors text-left break-all flex items-start gap-2"
                    >
                      <Copy className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{maskMnemonic(wallet.mnemonic)}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="text-yellow-400 text-sm font-medium">Security Warning</p>
            <ul className="text-slate-400 text-xs mt-1 space-y-1">
              <li>• Wallets are HD wallets (BIP-39) with 12-word recovery phrases</li>
              <li>• Private keys and mnemonics are generated locally - never sent to any server</li>
              <li>• Both the private key AND recovery phrase can access your funds</li>
              <li>• Download and save your wallets before leaving this page</li>
              <li>• Never share your private key or recovery phrase with anyone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
