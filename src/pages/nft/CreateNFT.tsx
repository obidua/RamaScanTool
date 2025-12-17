import { useState, useEffect } from 'react'
import { Image, Upload, Loader2, Check, ExternalLink } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, decodeEventLog } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'
import { CONTRACT_ADDRESSES, getTxUrl, getContractUrl } from '../../config/contracts'
import { RAMA721FactoryABI } from '../../config/abis'

export default function CreateNFT() {
  const { isConnected } = useAccount()
  const [step, setStep] = useState(1)
  const [selectedChain, setSelectedChain] = useState('1370')
  const [deployedCollection, setDeployedCollection] = useState<{ address: string; txHash: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    baseURI: '',
    maxSupply: '10000',
    mintPrice: '0.05',
  })

  const { data: hash, writeContract, isPending, reset } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && receipt && hash) {
      try {
        const collectionCreatedLog = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: RAMA721FactoryABI,
              data: log.data,
              topics: log.topics,
            })
            return decoded.eventName === 'CollectionCreated'
          } catch {
            return false
          }
        })
        
        if (collectionCreatedLog) {
          const decoded = decodeEventLog({
            abi: RAMA721FactoryABI,
            data: collectionCreatedLog.data,
            topics: collectionCreatedLog.topics,
          })
          const collectionAddress = (decoded.args as { collectionAddress: `0x${string}` }).collectionAddress
          setDeployedCollection({ address: collectionAddress, txHash: hash })
          setStep(3)
          toast.success('NFT Collection deployed successfully!')
        }
      } catch (error) {
        console.error('Error parsing logs:', error)
        setDeployedCollection({ address: 'Check transaction on Ramascan', txHash: hash })
        setStep(3)
        toast.success('Collection deployed! Check Ramascan for details.')
      }
    }
  }, [isSuccess, receipt, hash])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const deployNFT = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      const maxSupply = BigInt(formData.maxSupply || '10000')
      const mintPrice = parseEther(formData.mintPrice || '0')
      const baseURI = formData.baseURI || `ipfs://placeholder/${formData.symbol}/`
      const contractURI = formData.baseURI || ''

      writeContract({
        address: CONTRACT_ADDRESSES.RAMA721Factory as `0x${string}`,
        abi: RAMA721FactoryABI,
        functionName: 'createCollection',
        args: [
          formData.name,
          formData.symbol,
          baseURI,
          contractURI,
          maxSupply,
          mintPrice,
        ],
        value: parseEther('0.01'), // Creation fee
      })
    } catch (error: unknown) {
      console.error('Deploy error:', error)
      toast.error('Failed to deploy collection')
    }
  }

  const isDeploying = isPending || isConfirming

  const resetForm = () => {
    setStep(1)
    setDeployedCollection(null)
    reset()
    setFormData({
      name: '',
      symbol: '',
      description: '',
      baseURI: '',
      maxSupply: '10000',
      mintPrice: '0.05',
    })
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
      <div className="flex justify-center gap-16 text-sm">
        <span className={step >= 1 ? 'text-white' : 'text-slate-500'}>Details</span>
        <span className={step >= 2 ? 'text-white' : 'text-slate-500'}>Settings</span>
        <span className={step >= 3 ? 'text-white' : 'text-slate-500'}>Success</span>
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
              <label className="input-label">Collection Name *</label>
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
              <label className="input-label">Symbol *</label>
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

            <button 
              onClick={() => setStep(2)} 
              disabled={!formData.name || !formData.symbol}
              className="w-full btn-primary"
            >
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
              <label className="input-label">Base URI (optional)</label>
              <input
                type="text"
                name="baseURI"
                value={formData.baseURI}
                onChange={handleChange}
                placeholder="ipfs://... or https://..."
                className="input-field"
              />
              <p className="text-xs text-slate-500 mt-1">Leave empty to set later. Token URIs will be baseURI + tokenId</p>
            </div>

            <div>
              <NetworkSelector label="Network" value={selectedChain} onChange={setSelectedChain} />
            </div>

            <div className="stat-card">
              <p className="text-sm text-slate-400">Creation Fee</p>
              <p className="text-xl font-bold text-white">0.01 RAMA + Gas</p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 btn-secondary" disabled={isDeploying}>
                Back
              </button>
              <button 
                onClick={deployNFT} 
                disabled={isDeploying || !isConnected} 
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isPending ? 'Confirm in Wallet...' : 'Deploying...'}
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

      {step === 3 && deployedCollection && (
        <div className="glass-card p-8 max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Collection Deployed! 🎉</h2>
          <p className="text-slate-400 mb-6">Your {formData.name} ({formData.symbol}) NFT collection is now live!</p>
          
          <div className="space-y-4 mb-6">
            <div className="stat-card">
              <p className="text-sm text-slate-400">Collection Address</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-pink-400 font-mono text-sm break-all">{deployedCollection.address}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(deployedCollection.address)
                    toast.success('Address copied!')
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  📋
                </button>
              </div>
            </div>
            
            <div className="stat-card">
              <p className="text-sm text-slate-400">Transaction Hash</p>
              <a
                href={getTxUrl(deployedCollection.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400 hover:text-pink-300 font-mono text-sm flex items-center justify-center gap-1"
              >
                {deployedCollection.txHash.slice(0, 20)}...{deployedCollection.txHash.slice(-8)}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={getContractUrl(deployedCollection.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View on Ramascan
            </a>
            <button onClick={resetForm} className="btn-secondary">
              Create Another Collection
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      {step < 3 && (
        <div className="glass-card p-4 border-pink-500/30 bg-pink-500/5 max-w-2xl mx-auto">
          <p className="text-pink-400 text-sm">
            ℹ️ <strong>Deployment Fee:</strong> Creating a RAMA-721 collection requires 0.01 RAMA + gas fees.
          </p>
        </div>
      )}
    </div>
  )
}
