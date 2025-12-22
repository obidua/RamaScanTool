import { useState } from 'react'
import { Plus, Download, Copy, Loader2, RefreshCw, Eye, EyeOff, AlertTriangle, Shield, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateMnemonic, mnemonicToAccount, english } from 'viem/accounts'
import { toHex } from 'viem'
import BackButton from '../../components/BackButton'

interface GeneratedWallet {
  address: string
  privateKey: string
  mnemonic: string
}

export default function BatchWalletGenerate() {
  const [count, setCount] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [wallets, setWallets] = useState<GeneratedWallet[]>([])
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [showPrivateKeys, setShowPrivateKeys] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)

  const generateWallets = async () => {
    if (count < 1 || count > 1000) {
      toast.error('Please enter a number between 1 and 1000')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setWallets([])

    const newWallets: GeneratedWallet[] = []
    const prefixLower = prefix.toLowerCase().replace('0x', '')
    const suffixLower = suffix.toLowerCase()
    const hasVanity = prefixLower || suffixLower

    try {
      if (hasVanity) {
        // Vanity address generation - need to try multiple times
        // Note: Vanity with mnemonic is slower, so we use more attempts
        const maxAttempts = 100000
        let attempts = 0

        while (newWallets.length < count && attempts < maxAttempts) {
          // Generate a 12-word mnemonic phrase
          const mnemonic = generateMnemonic(english)
          const account = mnemonicToAccount(mnemonic)
          const addressLower = account.address.toLowerCase()

          const matchesPrefix = !prefixLower || addressLower.slice(2).startsWith(prefixLower)
          const matchesSuffix = !suffixLower || addressLower.endsWith(suffixLower)

          if (matchesPrefix && matchesSuffix) {
            // Get private key from the account using viem's toHex
            const privateKeyBytes = account.getHdKey().privateKey
            const privateKeyHex = privateKeyBytes ? toHex(privateKeyBytes) : ''
            
            newWallets.push({
              address: account.address,
              privateKey: privateKeyHex,
              mnemonic: mnemonic,
            })
            setGenerationProgress(Math.round((newWallets.length / count) * 100))
          }

          attempts++

          // Yield to UI periodically
          if (attempts % 500 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
          }

          // Safety check - don't run forever
          if (attempts >= maxAttempts && newWallets.length < count) {
            toast.error(`Only found ${newWallets.length} matching addresses after ${maxAttempts} attempts. Try a shorter prefix/suffix.`)
            break
          }
        }
      } else {
        // Normal generation - just create the wallets directly with mnemonics
        for (let i = 0; i < count; i++) {
          // Generate a 12-word mnemonic phrase
          const mnemonic = generateMnemonic(english)
          const account = mnemonicToAccount(mnemonic)
          
          // Get private key from the account using viem's toHex
          const privateKeyBytes = account.getHdKey().privateKey
          const privateKeyHex = privateKeyBytes ? toHex(privateKeyBytes) : ''

          newWallets.push({
            address: account.address,
            privateKey: privateKeyHex,
            mnemonic: mnemonic,
          })

          setGenerationProgress(Math.round(((i + 1) / count) * 100))

          // Yield to UI every 20 wallets for smooth progress
          if ((i + 1) % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        }
      }

      setWallets(newWallets)
      
      if (newWallets.length > 0) {
        toast.success(`Generated ${newWallets.length} wallets successfully!`)
      }
    } catch (error) {
      console.error('Wallet generation error:', error)
      toast.error('Failed to generate wallets')
    }

    setIsGenerating(false)
    setGenerationProgress(0)
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
              max="1000"
              value={count}
              onChange={(e) => setCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
              className="input-field"
            />
            <p className="text-xs text-slate-500 mt-1">Max: 1000 wallets</p>
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
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-slate-400">Network:</span>
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium flex items-center gap-2">
            🔷 Ramestta (Chain ID: 1370)
          </span>
        </div>

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
                Generating... {generationProgress > 0 && `${generationProgress}%`}
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Generate {count} Wallet{count > 1 ? 's' : ''}
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
