import { useState } from 'react'
import { Binary, ArrowLeftRight, Copy, Check, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'

export default function HexConverter() {
  const [decimal, setDecimal] = useState('')
  const [hex, setHex] = useState('')
  const [utf8, setUtf8] = useState('')
  const [wei, setWei] = useState('')
  const [ether, setEther] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyValue = (field: string, value: string) => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
    toast.success('Copied!')
  }

  const handleDecimalChange = (value: string) => {
    setDecimal(value)
    try {
      const num = BigInt(value || '0')
      setHex('0x' + num.toString(16))
    } catch {
      setHex('')
    }
  }

  const handleHexChange = (value: string) => {
    setHex(value)
    try {
      const clean = value.startsWith('0x') ? value.slice(2) : value
      const num = BigInt('0x' + clean)
      setDecimal(num.toString())
    } catch {
      setDecimal('')
    }
  }

  const handleUtf8Change = (value: string) => {
    setUtf8(value)
  }

  const getUtf8Hex = () => {
    try {
      return '0x' + Array.from(new TextEncoder().encode(utf8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    } catch {
      return ''
    }
  }

  const handleWeiChange = (value: string) => {
    setWei(value)
    try {
      const num = BigInt(value || '0')
      setEther((Number(num) / 1e18).toString())
    } catch {
      setEther('')
    }
  }

  const handleEtherChange = (value: string) => {
    setEther(value)
    try {
      const num = parseFloat(value || '0') * 1e18
      setWei(Math.floor(num).toString())
    } catch {
      setWei('')
    }
  }

  const renderCopyButton = (field: string, value: string) => (
    <button
      onClick={() => copyValue(field, value)}
      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
      disabled={!value}
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-slate-400" />
      )}
    </button>
  )

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Hex Converter</h1>
        <p className="text-slate-400 mt-1">Convert between different number formats and units</p>
      </div>

      {/* Decimal <-> Hex */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Binary className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Decimal ↔ Hex</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Decimal</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={decimal}
                onChange={(e) => handleDecimalChange(e.target.value)}
                placeholder="12345"
                className="input-field flex-1 font-mono"
              />
              {renderCopyButton('decimal', decimal)}
            </div>
          </div>
          <div>
            <label className="input-label">Hexadecimal</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hex}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="0x3039"
                className="input-field flex-1 font-mono"
              />
              {renderCopyButton('hex', hex)}
            </div>
          </div>
        </div>
      </div>

      {/* UTF-8 to Hex */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Hash className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">UTF-8 → Hex</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Text (UTF-8)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={utf8}
                onChange={(e) => handleUtf8Change(e.target.value)}
                placeholder="Hello World"
                className="input-field flex-1"
              />
              {renderCopyButton('utf8', utf8)}
            </div>
          </div>
          <div>
            <label className="input-label">Hex Encoded</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={getUtf8Hex()}
                readOnly
                placeholder="0x48656c6c6f20576f726c64"
                className="input-field flex-1 font-mono bg-slate-800"
              />
              {renderCopyButton('utf8hex', getUtf8Hex())}
            </div>
          </div>
        </div>
      </div>

      {/* Wei <-> Ether */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <ArrowLeftRight className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Wei ↔ Ether</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Wei</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={wei}
                onChange={(e) => handleWeiChange(e.target.value)}
                placeholder="1000000000000000000"
                className="input-field flex-1 font-mono"
              />
              {renderCopyButton('wei', wei)}
            </div>
          </div>
          <div>
            <label className="input-label">Ether</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ether}
                onChange={(e) => handleEtherChange(e.target.value)}
                placeholder="1.0"
                className="input-field flex-1 font-mono"
              />
              {renderCopyButton('ether', ether)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Reference</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { unit: '1 Wei', value: '1' },
            { unit: '1 Gwei', value: '1,000,000,000' },
            { unit: '1 Finney', value: '1e15' },
            { unit: '1 Ether', value: '1e18' },
          ].map((item) => (
            <div key={item.unit} className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">{item.unit}</p>
              <p className="font-mono text-white">{item.value} Wei</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
