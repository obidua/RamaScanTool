import { SUPPORTED_CHAINS } from '../config/wagmi'

interface NetworkSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  label?: string
}

export default function NetworkSelector({ value, onChange, className = '', label }: NetworkSelectorProps) {
  return (
    <div>
      {label && <label className="input-label">{label}</label>}
      <select 
        value={value} 
        onChange={(e) => {
          const chain = SUPPORTED_CHAINS.find(c => String(c.id) === e.target.value)
          if (chain?.status === 'active') {
            onChange(e.target.value)
          }
        }}
        className={`input-field ${className}`}
      >
        {SUPPORTED_CHAINS.map(chain => (
          <option 
            key={chain.id} 
            value={chain.id}
            disabled={chain.status === 'coming-soon'}
            style={{ 
              color: chain.status === 'coming-soon' ? '#64748b' : undefined,
              opacity: chain.status === 'coming-soon' ? 0.5 : 1
            }}
          >
            {chain.name} {chain.status === 'coming-soon' ? '(Coming Soon)' : '🟢'}
          </option>
        ))}
      </select>
    </div>
  )
}
