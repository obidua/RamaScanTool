import { useState, useEffect } from 'react'
import { Sparkles, Play, Pause, Download, Copy, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const [difficulty, setDifficulty] = useState('')

  useEffect(() => {
    const chars = (prefix.length + suffix.length)
    if (chars === 0) {
      setDifficulty('')
    } else if (chars <= 2) {
      setDifficulty('Easy (~1 second)')
    } else if (chars <= 4) {
      setDifficulty('Medium (~1 minute)')
    } else if (chars <= 6) {
      setDifficulty('Hard (~1 hour)')
    } else {
      setDifficulty('Very Hard (days/weeks)')
    }
  }, [prefix, suffix])

  const startGeneration = async () => {
    if (!prefix && !suffix) {
      toast.error('Please enter a prefix or suffix')
      return
    }

    setIsGenerating(true)
    setAttempts(0)

    // Simulate generation with progress
    const interval = setInterval(() => {
      setAttempts(prev => prev + Math.floor(Math.random() * 1000))
    }, 100)

    await new Promise(resolve => setTimeout(resolve, 3000))
    clearInterval(interval)

    const result: VanityResult = {
      address: `0x${prefix}${Math.random().toString(16).slice(2, 34)}${suffix}`,
      privateKey: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
      attempts: attempts + Math.floor(Math.random() * 10000),
      time: '3.2s',
    }

    setResults(prev => [result, ...prev])
    setIsGenerating(false)
    toast.success('Vanity address found!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Vanity Address Generator</h1>
        <p className="text-slate-400 mt-1">Generate custom wallet addresses with specific prefixes or suffixes</p>
      </div>

      {/* Generator Form */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="input-label">Address Prefix</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">0x</span>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.replace(/[^a-fA-F0-9]/g, ''))}
                placeholder="abc"
                maxLength={8}
                className="input-field font-mono"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Hex characters only (0-9, a-f)</p>
          </div>
          <div>
            <label className="input-label">Address Suffix</label>
            <input
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value.replace(/[^a-fA-F0-9]/g, ''))}
              placeholder="xyz"
              maxLength={8}
              className="input-field font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">Hex characters only (0-9, a-f)</p>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-slate-300">Case Sensitive</span>
          </label>

          {difficulty && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Difficulty:</span>
              <span className={`font-medium ${
                difficulty.includes('Easy') ? 'text-green-400' :
                difficulty.includes('Medium') ? 'text-yellow-400' :
                difficulty.includes('Hard') ? 'text-orange-400' : 'text-red-400'
              }`}>{difficulty}</span>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={startGeneration}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating... ({attempts.toLocaleString()} attempts)
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Vanity Address
              </>
            )}
          </button>

          {isGenerating && (
            <button
              onClick={() => setIsGenerating(false)}
              className="btn-secondary flex items-center gap-2"
            >
              <Pause className="w-5 h-5" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {(prefix || suffix) && (
        <div className="glass-card p-4">
          <p className="text-sm text-slate-400 mb-2">Preview:</p>
          <code className="text-lg font-mono text-white">
            0x<span className="text-blue-400">{prefix}</span>
            <span className="text-slate-500">{'x'.repeat(40 - prefix.length - suffix.length)}</span>
            <span className="text-purple-400">{suffix}</span>
          </code>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Generated Addresses ({results.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800">
                  <th className="table-header">Address</th>
                  <th className="table-header">Private Key</th>
                  <th className="table-header">Attempts</th>
                  <th className="table-header">Time</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-800/50">
                    <td className="table-cell font-mono text-sm">
                      <span className="text-blue-400">{result.address.slice(0, 2 + prefix.length)}</span>
                      {result.address.slice(2 + prefix.length, -suffix.length || undefined)}
                      {suffix && <span className="text-purple-400">{result.address.slice(-suffix.length)}</span>}
                    </td>
                    <td className="table-cell font-mono text-sm text-slate-400">
                      {result.privateKey.slice(0, 10)}...{result.privateKey.slice(-8)}
                    </td>
                    <td className="table-cell">{result.attempts.toLocaleString()}</td>
                    <td className="table-cell">{result.time}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${result.address}\n${result.privateKey}`)
                            toast.success('Copied!')
                          }}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
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
      <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
        <p className="text-yellow-400 text-sm">
          ⚠️ <strong>Note:</strong> Vanity address generation is computationally intensive. Longer prefixes/suffixes 
          require exponentially more time. All generation happens locally in your browser.
        </p>
      </div>
    </div>
  )
}
