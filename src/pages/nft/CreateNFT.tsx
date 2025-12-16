import { useState } from 'react'
import { Image, Upload, Loader2, Check } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'

export default function CreateNFT() {
  const { isConnected } = useAccount()
  const [isDeploying, setIsDeploying] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedChain, setSelectedChain] = useState('1370')
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    maxSupply: '10000',
    mintPrice: '0.05',
    royalty: 5,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const deployNFT = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsDeploying(true)
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsDeploying(false)
    setStep(3)
    toast.success('NFT Collection deployed!')
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Create NFT Collection</h1>
        <p className="text-slate-400 mt-1">Deploy your own NFT collection (RAMA-721) on Ramestta</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step >= s ? 'bg-pink-500 text-white' : 'bg-slate-700 text-slate-400'
            }`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && <div className={`w-20 h-1 ${step > s ? 'bg-pink-500' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="glass-card p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">Collection Details</h2>

          <div className="space-y-4">
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-colors">
                <Upload className="w-8 h-8 text-slate-500 mb-2" />
                <span className="text-xs text-slate-500">Upload Logo</span>
              </div>
            </div>

            <div>
              <label className="input-label">Collection Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="My NFT Collection"
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label">Symbol</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="MNFT"
                maxLength={10}
                className="input-field uppercase"
              />
            </div>

            <div>
              <label className="input-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your collection..."
                rows={3}
                className="input-field resize-none"
              />
            </div>

            <button onClick={() => setStep(2)} className="w-full btn-primary">
              Next: Mint Settings
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">Mint Settings</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Max Supply</label>
                <input
                  type="text"
                  name="maxSupply"
                  value={formData.maxSupply}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Mint Price (RAMA)</label>
                <input
                  type="text"
                  name="mintPrice"
                  value={formData.mintPrice}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <NetworkSelector label="Network" value={selectedChain} onChange={setSelectedChain} />
            </div>

            <div>
              <label className="input-label">Royalty (%)</label>
              <input
                type="number"
                name="royalty"
                value={formData.royalty}
                onChange={handleChange}
                min={0}
                max={15}
                className="input-field"
              />
              <p className="text-xs text-slate-500 mt-1">Royalty on secondary sales (max 15%)</p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 btn-secondary">Back</button>
              <button onClick={deployNFT} disabled={isDeploying} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {isDeploying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Image className="w-5 h-5" />
                    Deploy Collection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="glass-card p-8 max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Collection Deployed!</h2>
          <p className="text-slate-400 mb-6">Your NFT collection has been successfully deployed to the blockchain.</p>
          <div className="stat-card mb-6">
            <p className="text-sm text-slate-400">Contract Address</p>
            <p className="font-mono text-white">0x1234...5678</p>
          </div>
          <button onClick={() => setStep(1)} className="btn-primary">Create Another Collection</button>
        </div>
      )}
    </div>
  )
}
