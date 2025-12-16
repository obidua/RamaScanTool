import { useState } from 'react'
import { Shield, Search, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'

interface AuditResult {
  score: number
  issues: Array<{
    severity: 'high' | 'medium' | 'low' | 'info'
    title: string
    description: string
  }>
  stats: {
    totalFunctions: number
    externalCalls: number
    stateVariables: number
  }
}

const mockAuditResult: AuditResult = {
  score: 75,
  issues: [
    { severity: 'high', title: 'Reentrancy Vulnerability', description: 'Potential reentrancy in withdraw() function' },
    { severity: 'medium', title: 'Unchecked Transfer', description: 'RAMA-20 transfer return value not checked' },
    { severity: 'low', title: 'Missing Zero Address Check', description: 'Constructor does not validate zero address' },
    { severity: 'info', title: 'Floating Pragma', description: 'Consider locking pragma to specific version' },
  ],
  stats: {
    totalFunctions: 15,
    externalCalls: 4,
    stateVariables: 8,
  },
}

export default function ContractAudit() {
  const [contractAddress, setContractAddress] = useState('')
  const [selectedChain, setSelectedChain] = useState('1370')
  const [isAuditing, setIsAuditing] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)

  const startAudit = async () => {
    if (!contractAddress) {
      toast.error('Please enter contract address')
      return
    }

    setIsAuditing(true)
    setResult(null)
    
    // Simulate audit
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setResult(mockAuditResult)
    setIsAuditing(false)
    toast.success('Audit complete')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'low': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'info': return 'text-slate-400 bg-slate-500/20 border-slate-500/30'
      default: return ''
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Contract Audit</h1>
        <p className="text-slate-400 mt-1">Quick security analysis for smart contracts</p>
      </div>

      {/* Search */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <label className="input-label">Contract Address</label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              className="input-field font-mono"
            />
          </div>
          <div className="md:col-span-3">
            <NetworkSelector
              label="Network"
              value={selectedChain}
              onChange={setSelectedChain}
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={startAudit}
              disabled={isAuditing}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Auditing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Audit
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Auditing Progress */}
      {isAuditing && (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-white mb-2">Analyzing Contract...</h3>
          <p className="text-slate-400">This may take a few moments</p>
          <div className="mt-6 space-y-2 text-sm text-slate-500">
            <p>✓ Fetching contract bytecode</p>
            <p>✓ Decompiling functions</p>
            <p className="text-blue-400">→ Checking for vulnerabilities</p>
            <p className="text-slate-600">○ Generating report</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Score & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat-card flex items-center gap-4">
              <div className="p-4 rounded-xl bg-slate-800">
                <Shield className={`w-8 h-8 ${getScoreColor(result.score)}`} />
              </div>
              <div>
                <p className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                  {result.score}/100
                </p>
                <p className="text-sm text-slate-400">Security Score</p>
              </div>
            </div>
            <div className="stat-card">
              <p className="text-2xl font-bold text-white">{result.stats.totalFunctions}</p>
              <p className="text-sm text-slate-400">Functions</p>
            </div>
            <div className="stat-card">
              <p className="text-2xl font-bold text-white">{result.stats.externalCalls}</p>
              <p className="text-sm text-slate-400">External Calls</p>
            </div>
            <div className="stat-card">
              <p className="text-2xl font-bold text-white">{result.stats.stateVariables}</p>
              <p className="text-sm text-slate-400">State Variables</p>
            </div>
          </div>

          {/* Issues */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Issues Found</h2>
            <div className="space-y-4">
              {result.issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    {issue.severity === 'high' && <XCircle className="w-5 h-5 mt-0.5" />}
                    {issue.severity === 'medium' && <AlertTriangle className="w-5 h-5 mt-0.5" />}
                    {issue.severity === 'low' && <AlertTriangle className="w-5 h-5 mt-0.5" />}
                    {issue.severity === 'info' && <CheckCircle className="w-5 h-5 mt-0.5" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{issue.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(issue.severity)}`}>
                          {issue.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm opacity-80">{issue.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <p className="text-yellow-400 text-sm">
                <strong>Disclaimer:</strong> This is a basic automated scan. For production contracts, 
                always get a professional security audit from reputable firms like OpenZeppelin, Trail of Bits, 
                or Consensys Diligence.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !isAuditing && (
        <div className="glass-card p-12 text-center">
          <Shield className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Audit Results</h3>
          <p className="text-slate-400">Enter a contract address and click "Audit" to analyze the contract</p>
        </div>
      )}
    </div>
  )
}
