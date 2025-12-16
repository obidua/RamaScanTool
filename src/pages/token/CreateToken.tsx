import { useState } from 'react'
import { Coins, Loader2, Check } from 'lucide-react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'

export default function CreateToken() {
  const { isConnected } = useAccount()
  const [step, setStep] = useState(1)
  const [isDeploying, setIsDeploying] = useState(false)
  const [selectedChain, setSelectedChain] = useState('1370')
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    decimals: 18,
    totalSupply: '1000000000',
    mintable: false,
    burnable: true,
    pausable: false,
    taxable: false,
    buyTax: 0,
    sellTax: 0,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const deployToken = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsDeploying(true)
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsDeploying(false)
    setStep(3)
    toast.success('Token deployed successfully!')
  }

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Create Token</h1>
        <p className="text-slate-400 mt-1">Deploy your own RAMA-20 token on Ramestta Network in minutes</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step >= s ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
            }`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div className={`w-20 h-1 ${step > s ? 'bg-blue-500' : 'bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-16 text-sm">
        <span className={step >= 1 ? 'text-white' : 'text-slate-500'}>Token Info</span>
        <span className={step >= 2 ? 'text-white' : 'text-slate-500'}>Features</span>
        <span className={step >= 3 ? 'text-white' : 'text-slate-500'}>Deploy</span>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="glass-card p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">Token Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="input-label">Token Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., My Awesome Token"
                className="input-field"
              />
            </div>

            <div>
              <label className="input-label">Token Symbol *</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="e.g., MAT"
                maxLength={10}
                className="input-field uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Decimals</label>
                <input
                  type="number"
                  name="decimals"
                  value={formData.decimals}
                  onChange={handleChange}
                  min={0}
                  max={18}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Total Supply *</label>
                <input
                  type="text"
                  name="totalSupply"
                  value={formData.totalSupply}
                  onChange={handleChange}
                  placeholder="1000000000"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <NetworkSelector label="Network" value={selectedChain} onChange={setSelectedChain} />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.symbol || !formData.totalSupply}
              className="btn-primary"
            >
              Next: Features
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Features */}
      {step === 2 && (
        <div className="glass-card p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">Token Features</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <div>
                <p className="font-medium text-white">Mintable</p>
                <p className="text-sm text-slate-400">Allow minting new tokens after deployment</p>
              </div>
              <input
                type="checkbox"
                name="mintable"
                checked={formData.mintable}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <div>
                <p className="font-medium text-white">Burnable</p>
                <p className="text-sm text-slate-400">Allow burning tokens to reduce supply</p>
              </div>
              <input
                type="checkbox"
                name="burnable"
                checked={formData.burnable}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <div>
                <p className="font-medium text-white">Pausable</p>
                <p className="text-sm text-slate-400">Allow pausing all token transfers</p>
              </div>
              <input
                type="checkbox"
                name="pausable"
                checked={formData.pausable}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <div>
                <p className="font-medium text-white">Taxable</p>
                <p className="text-sm text-slate-400">Enable buy/sell taxes</p>
              </div>
              <input
                type="checkbox"
                name="taxable"
                checked={formData.taxable}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500"
              />
            </label>

            {formData.taxable && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/30 rounded-xl">
                <div>
                  <label className="input-label">Buy Tax (%)</label>
                  <input
                    type="number"
                    name="buyTax"
                    value={formData.buyTax}
                    onChange={handleChange}
                    min={0}
                    max={25}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Sell Tax (%)</label>
                  <input
                    type="number"
                    name="sellTax"
                    value={formData.sellTax}
                    onChange={handleChange}
                    min={0}
                    max={25}
                    className="input-field"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="btn-secondary">
              Back
            </button>
            <button onClick={() => setStep(3)} className="btn-primary">
              Next: Review & Deploy
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Deploy */}
      {step === 3 && (
        <div className="glass-card p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">Review & Deploy</h2>
          
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Name</p>
                <p className="text-lg font-semibold text-white">{formData.name}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Symbol</p>
                <p className="text-lg font-semibold text-white">{formData.symbol}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Total Supply</p>
                <p className="text-lg font-semibold text-white">{Number(formData.totalSupply).toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Decimals</p>
                <p className="text-lg font-semibold text-white">{formData.decimals}</p>
              </div>
            </div>

            <div className="stat-card">
              <p className="text-sm text-slate-400 mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {formData.mintable && <span className="badge badge-chain">Mintable</span>}
                {formData.burnable && <span className="badge badge-chain">Burnable</span>}
                {formData.pausable && <span className="badge badge-chain">Pausable</span>}
                {formData.taxable && <span className="badge badge-chain">Tax: {formData.buyTax}%/{formData.sellTax}%</span>}
              </div>
            </div>

            <div className="stat-card">
              <p className="text-sm text-slate-400">Estimated Gas Fee</p>
              <p className="text-lg font-semibold text-white">~0.001 RAMA ($0.001)</p>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary">
              Back
            </button>
            <button
              onClick={deployToken}
              disabled={isDeploying || !isConnected}
              className="btn-primary flex items-center gap-2"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Coins className="w-5 h-5" />
                  Deploy Token
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Deployment Fee Info */}
      <div className="glass-card p-4 border-blue-500/30 bg-blue-500/5 max-w-2xl mx-auto">
        <p className="text-blue-400 text-sm">
          ℹ️ <strong>Deployment Fee:</strong> Creating a RAMA-20 token requires gas fees on Ramestta Network. 
          Make sure you have enough RAMA to cover the deployment cost (~0.1 RAMA).
        </p>
      </div>
    </div>
  )
}
