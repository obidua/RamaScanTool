import { useState, useMemo, useRef, useCallback } from 'react'
import { Sparkles, Pause, Download, Copy, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { privateKeyToAccount } from 'viem/accounts'
import { toHex } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'

interface VanityResult {
  address: string
  privateKey: string
  attempts: number
  time: string
}

export default function VanityAddressGenerator() {
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<VanityResult[]>([])
  const [attempts, setAttempts] = useState(0)
  const [rate, setRate] = useState(0)
  const [showPrivateKeys, setShowPrivateKeys] = useState(false)
  
  // Use ref to control the generation loop
  const shouldStopRef = useRef(false)
  const startTimeRef = useRef(0)

  const difficulty = useMemo(() => {
    const chars = (prefix.length + suffix.length)
    if (chars === 0) {
      return { text: '', color: 'text-slate-400' }
    } else if (chars === 1) {
      return { text: 'Very Easy (~instant)', color: 'text-green-400' }
    } else if (chars === 2) {
      return { text: 'Easy (~1-5 seconds)', color: 'text-green-400' }
    } else if (chars === 3) {
      return { text: 'Medium (~10-60 seconds)', color: 'text-yellow-400' }
    } else if (chars === 4) {
      return { text: 'Hard (~2-15 minutes)', color: 'text-orange-400' }
    } else if (chars === 5) {
      return { text: 'Very Hard (~30-120 minutes)', color: 'text-red-400' }
    } else {
      return { text: 'Extreme (hours/days)', color: 'text-red-500' }
    }
  }, [prefix, suffix])

  // Generate random private key
  const generateRandomPrivateKey = (): `0x${string}` => {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return toHex(bytes) as `0x${string}`
  }

  // Check if address matches the pattern
  const matchesPattern = (address: string): boolean => {
    const addr = caseSensitive ? address : address.toLowerCase()
    const prefixCheck = caseSensitive ? prefix : prefix.toLowerCase()
    const suffixCheck = caseSensitive ? suffix : suffix.toLowerCase()
    
    // Address starts with 0x, so we check from position 2
    const matchesPrefix = !prefixCheck || addr.slice(2).startsWith(prefixCheck)
    const matchesSuffix = !suffixCheck || addr.endsWith(suffixCheck)
    
    return matchesPrefix && matchesSuffix
  }

  // Main generation function
  const generateVanityAddress = useCallback(async () => {
    if (!prefix && !suffix) {
      toast.error('Please enter a prefix or suffix')
      return
    }

    // Validate hex characters
    const isValidHex = /^[a-fA-F0-9]*$/.test(prefix) && /^[a-fA-F0-9]*$/.test(suffix)
    if (!isValidHex) {
      toast.error('Only hex characters (0-9, a-f) are allowed')
      return
    }

    setIsGenerating(true)
    shouldStopRef.current = false
    setAttempts(0)
    setRate(0)
    startTimeRef.current = Date.now()

    let attemptCount = 0
    let lastUpdateTime = Date.now()
    let lastAttemptCount = 0

    // Run generation in batches to allow UI updates
    const generateBatch = async (): Promise<VanityResult | null> => {
      const BATCH_SIZE = 1000

      for (let i = 0; i < BATCH_SIZE; i++) {
        if (shouldStopRef.current) {
          return null
        }

        attemptCount++
        
        const privateKey = generateRandomPrivateKey()
        const account = privateKeyToAccount(privateKey)
        
        if (matchesPattern(account.address)) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000
          return {
            address: account.address,
            privateKey: privateKey,
            attempts: attemptCount,
            time: elapsed < 1 ? `${(elapsed * 1000).toFixed(0)}ms` : `${elapsed.toFixed(1)}s`,
          }
        }
      }

      // Update UI
      const now = Date.now()
      if (now - lastUpdateTime > 100) {
        const elapsed = (now - lastUpdateTime) / 1000
        const batchAttempts = attemptCount - lastAttemptCount
        setRate(Math.round(batchAttempts / elapsed))
        setAttempts(attemptCount)
        lastUpdateTime = now
        lastAttemptCount = attemptCount
      }

      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0))
      return generateBatch()
    }

    try {
      const result = await generateBatch()
      
      if (result) {
        setResults(prev => [result, ...prev])
        toast.success(`Found vanity address in ${result.attempts.toLocaleString()} attempts!`)
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Generation failed')
    }

    setIsGenerating(false)
  }, [prefix, suffix, caseSensitive])

  // Stop generation
  const stopGeneration = () => {
    shouldStopRef.current = true
    setIsGenerating(false)
    toast('Generation stopped')
  }

  // Copy to clipboard
  const copyResult = (result: VanityResult) => {
    const text = `Address: ${result.address}\nPrivate Key: ${result.privateKey}`
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  // Download as JSON
  const downloadResult = (result: VanityResult) => {
    const data = {
      address: result.address,
      privateKey: result.privateKey,
      attempts: result.attempts,
      time: result.time,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vanity-${result.address.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded!')
  }

  // Download all results
  const downloadAll = () => {
    if (results.length === 0) return
    const csv = 'Address,Private Key,Attempts,Time\n' + 
      results.map(r => `${r.address},${r.privateKey},${r.attempts},${r.time}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vanity-addresses-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('All results downloaded!')
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <BackButton />
      
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Vanity Address Generator</h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Generate custom wallet addresses with specific prefixes or suffixes</p>
      </div>

      {/* Generator Form */}
      <div className="glass-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="input-label">Address Prefix</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">0x</span>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 8))}
                placeholder="abc"
                maxLength={8}
                className="input-field font-mono"
                disabled={isGenerating}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Hex characters only (0-9, a-f)</p>
          </div>
          <div>
            <label className="input-label">Address Suffix</label>
            <input
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 8))}
              placeholder="xyz"
              maxLength={8}
              className="input-field font-mono"
              disabled={isGenerating}
            />
            <p className="text-xs text-slate-500 mt-1">Hex characters only (0-9, a-f)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              disabled={isGenerating}
            />
            <span className="text-slate-300">Case Sensitive</span>
          </label>

          {difficulty.text && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Difficulty:</span>
              <span className={`font-medium ${difficulty.color}`}>{difficulty.text}</span>
            </div>
          )}
        </div>

        {/* Generation Stats */}
        {isGenerating && (
          <div className="mb-6 p-4 bg-slate-800/50 rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Attempts</p>
                <p className="text-xl font-bold text-white">{attempts.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Speed</p>
                <p className="text-xl font-bold text-cyan-400">{rate.toLocaleString()}/s</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Elapsed</p>
                <p className="text-xl font-bold text-white">
                  {((Date.now() - startTimeRef.current) / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={isGenerating ? stopGeneration : generateVanityAddress}
            className={`flex items-center gap-2 ${isGenerating ? 'btn-secondary' : 'btn-primary'}`}
          >
            {isGenerating ? (
              <>
                <Pause className="w-5 h-5" />
                Stop Generation
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Vanity Address
              </>
            )}
          </button>

          {results.length > 0 && (
            <button
              onClick={downloadAll}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download All ({results.length})
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {(prefix || suffix) && (
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400 mb-2">Preview:</p>
          <code className="text-lg font-mono text-white break-all">
            0x<span className="text-cyan-400 font-bold">{prefix}</span>
            <span className="text-slate-600">{'x'.repeat(Math.max(0, 40 - prefix.length - suffix.length))}</span>
            <span className="text-purple-400 font-bold">{suffix}</span>
          </code>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Generated Addresses ({results.length})</h2>
            <button
              onClick={() => setShowPrivateKeys(!showPrivateKeys)}
              className="btn-secondary text-sm py-2 flex items-center gap-2"
            >
              {showPrivateKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPrivateKeys ? 'Hide Keys' : 'Show Keys'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800">
                  <th className="table-header">#</th>
                  <th className="table-header">Address</th>
                  <th className="table-header">Private Key</th>
                  <th className="table-header">Attempts</th>
                  <th className="table-header">Time</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-800/50 border-b border-slate-800">
                    <td className="table-cell text-slate-500">{results.length - index}</td>
                    <td className="table-cell font-mono text-sm">
                      <span className="text-slate-400">0x</span>
                      <span className="text-cyan-400 font-bold">{result.address.slice(2, 2 + prefix.length)}</span>
                      <span className="text-white">{result.address.slice(2 + prefix.length, suffix ? -suffix.length : undefined)}</span>
                      {suffix && <span className="text-purple-400 font-bold">{result.address.slice(-suffix.length)}</span>}
                    </td>
                    <td className="table-cell font-mono text-sm">
                      {showPrivateKeys ? (
                        <span className="text-slate-300">{result.privateKey}</span>
                      ) : (
                        <span className="text-slate-500">{result.privateKey.slice(0, 10)}••••••••{result.privateKey.slice(-6)}</span>
                      )}
                    </td>
                    <td className="table-cell text-slate-300">{result.attempts.toLocaleString()}</td>
                    <td className="table-cell text-slate-300">{result.time}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyResult(result)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => downloadResult(result)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="glass-card p-4 border-l-4 border-yellow-500 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-semibold mb-1">Security Notice</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• All generation happens <strong>locally in your browser</strong> - no data is sent to any server</li>
              <li>• Private keys are generated using cryptographically secure random numbers</li>
              <li>• <strong>Save your private key securely</strong> - it's the only way to access your wallet</li>
              <li>• Longer prefixes/suffixes require exponentially more time to generate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
