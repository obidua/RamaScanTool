interface NetworkSelectorProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  label?: string
}

// Ramestta-only network display (no dropdown needed)
export default function NetworkSelector({ className = '', label }: NetworkSelectorProps) {
  return (
    <div>
      {label && <label className="input-label">{label}</label>}
      <div className={`input-field flex items-center gap-2 cursor-default ${className}`}>
        <span className="text-lg">🔷</span>
        <span className="text-white font-medium">Ramestta</span>
        <span className="text-green-400 text-xs ml-auto">●</span>
      </div>
    </div>
  )
}
