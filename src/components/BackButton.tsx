import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  label?: string
  to?: string
}

export default function BackButton({ label = 'Back', to }: BackButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (to) {
      navigate(to)
    } else {
      navigate(-1)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 group"
    >
      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
      <span>{label}</span>
    </button>
  )
}
