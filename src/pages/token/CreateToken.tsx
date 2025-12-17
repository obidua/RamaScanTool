import { useState, useEffect } from 'react'
import { Coins, Loader2, Check, ExternalLink, RefreshCw } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useGasPrice } from 'wagmi'
import { decodeEventLog, formatEther } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'
import { CONTRACT_ADDRESSES, getTxUrl, getContractUrl } from '../../config/contracts'
import { RAMA20FactoryABI } from '../../config/abis'

export default function CreateToken() {
  const { isConnected } = useAccount()
  const [step, setStep] = useState(1)
  const [selectedChain, setSelectedChain] = useState('1370')
  const [deployedToken, setDeployedToken] = useState<{ address: string; txHash: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    decimals: 18,
    totalSupply: '1000000000',
    maxSupply: '0',
    mintable: false,
    burnable: true,
    pausable: false,
  })

  // Read creation fee from contract
  const { data: creationFee } = useReadContract({
    address: CONTRACT_ADDRESSES.RAMA20Factory as `0x${string}`,
    abi: RAMA20FactoryABI,
    functionName: 'creationFee',
  })

  // Get current gas price
  const { data: gasPrice, refetch: refetchGasPrice } = useGasPrice()

  // Estimate gas for the transaction (using approximate gas for token deployment)
  const estimatedGas = 2500000n // Approximate gas for token deployment

  // Calculate total cost
  const gasCost = gasPrice ? estimatedGas * gasPrice : 0n
  const totalCost = (creationFee as bigint || 0n) + gasCost
  
  // Format for display
  const formatRama = (value: bigint) => {
    const formatted = formatEther(value)
    const num = parseFloat(formatted)
    if (num < 0.0001) return '< 0.0001'
    return num.toFixed(4)
  }

  // Refresh gas estimates
  const refreshEstimates = () => {
    refetchGasPrice()
    toast.success('Gas estimates refreshed')
  }

  const { data: hash, writeContract, isPending, reset, error: writeError } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  })

  // Handle write error
  useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', writeError)
      toast.error(writeError.message?.includes('User rejected') 
        ? 'Transaction rejected by user' 
        : 'Failed to deploy token: ' + (writeError.message || 'Unknown error'))
    }
  }, [writeError])

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && receipt && hash) {
      // Find TokenCreated event in logs
      try {
        const tokenCreatedLog = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: RAMA20FactoryABI,
              data: log.data,
              topics: log.topics,
            })
            return decoded.eventName === 'TokenCreated'
          } catch {
            return false
          }
        })
        
        if (tokenCreatedLog) {
          const decoded = decodeEventLog({
            abi: RAMA20FactoryABI,
            data: tokenCreatedLog.data,
            topics: tokenCreatedLog.topics,
          })
          const tokenAddress = (decoded.args as { tokenAddress: `0x${string}` }).tokenAddress
          setDeployedToken({ address: tokenAddress, txHash: hash })
          setStep(4)
          toast.success('Token deployed successfully!')
        }
      } catch (error) {
        console.error('Error parsing logs:', error)
        // Still show success even if we can't parse the logs
        setDeployedToken({ address: 'Check transaction on Ramascan', txHash: hash })
        setStep(4)
        toast.success('Token deployed! Check Ramascan for details.')
      }
    }
  }, [isSuccess, receipt, hash])

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

    try {
      // Contract multiplies by 10^decimals internally, so we pass raw supply
      const supplyValue = BigInt(formData.totalSupply)
      const maxSupplyValue = formData.maxSupply && formData.maxSupply !== '0' 
        ? BigInt(formData.maxSupply)
        : 0n

      console.log('Deploying token with params:', {
        name: formData.name,
        symbol: formData.symbol,
        decimals: formData.decimals,
        initialSupply: supplyValue.toString(),
        maxSupply: maxSupplyValue.toString(),
        mintable: formData.mintable,
        burnable: formData.burnable,
        pausable: formData.pausable,
        factoryAddress: CONTRACT_ADDRESSES.RAMA20Factory,
        creationFee: creationFee?.toString(),
      })

      writeContract({
        address: CONTRACT_ADDRESSES.RAMA20Factory as `0x${string}`,
        abi: RAMA20FactoryABI,
        functionName: 'createToken',
        args: [
          formData.name,
          formData.symbol,
          formData.decimals,
          supplyValue,
          maxSupplyValue,
          formData.mintable,
          formData.burnable,
          formData.pausable,
        ],
        value: (creationFee as bigint) || 1000000000000000n, // Use dynamic fee or fallback to 0.001 RAMA
      })
    } catch (error: unknown) {
      console.error('Deploy error:', error)
      toast.error('Failed to deploy token')
    }
  }

  const isDeploying = isPending || isConfirming

  const resetForm = () => {
    setStep(1)
    setDeployedToken(null)
    reset()
    setFormData({
      name: '',
      symbol: '',
      decimals: 18,
      totalSupply: '1000000000',
      maxSupply: '0',
      mintable: false,
      burnable: true,
      pausable: false,
    })
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
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step >= s ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
            }`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-16 h-1 ${step > s ? 'bg-blue-500' : 'bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-12 text-sm">
        <span className={step >= 1 ? 'text-white' : 'text-slate-500'}>Token Info</span>
        <span className={step >= 2 ? 'text-white' : 'text-slate-500'}>Features</span>
        <span className={step >= 3 ? 'text-white' : 'text-slate-500'}>Deploy</span>
        <span className={step >= 4 ? 'text-white' : 'text-slate-500'}>Success</span>
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

            {formData.mintable && (
              <div className="p-4 bg-slate-800/30 rounded-xl">
                <label className="input-label">Max Supply (0 = unlimited)</label>
                <input
                  type="text"
                  name="maxSupply"
                  value={formData.maxSupply}
                  onChange={handleChange}
                  placeholder="0"
                  className="input-field"
                />
                <p className="text-xs text-slate-500 mt-1">Set a maximum supply cap for mintable tokens</p>
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
                {!formData.mintable && !formData.burnable && !formData.pausable && (
                  <span className="text-slate-500">Standard RAMA-20</span>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">Estimated Cost</p>
                <button
                  onClick={refreshEstimates}
                  className="text-blue-400 hover:text-blue-300 p-1"
                  title="Refresh gas estimate"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Creation Fee:</span>
                  <span className="text-white">{creationFee ? formatRama(creationFee as bigint) : '0.001'} RAMA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Gas Fee:</span>
                  <span className="text-white">~{gasCost ? formatRama(gasCost) : '0.0001'} RAMA</span>
                </div>
                <div className="border-t border-slate-700 pt-1 mt-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-300">Total:</span>
                    <span className="text-white">~{totalCost ? formatRama(totalCost) : '0.001'} RAMA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary" disabled={isDeploying}>
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
                  {isPending ? 'Confirm in Wallet...' : 'Deploying...'}
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

      {/* Step 4: Success */}
      {step === 4 && deployedToken && (
        <div className="glass-card p-6 max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Token Deployed Successfully! 🎉</h2>
          <p className="text-slate-400 mb-6">Your {formData.name} ({formData.symbol}) token is now live on Ramestta Network</p>
          
          <div className="space-y-4 mb-6">
            <div className="stat-card">
              <p className="text-sm text-slate-400">Token Address</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-blue-400 font-mono text-sm break-all">{deployedToken.address}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(deployedToken.address)
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
                href={getTxUrl(deployedToken.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-mono text-sm flex items-center justify-center gap-1"
              >
                {deployedToken.txHash.slice(0, 20)}...{deployedToken.txHash.slice(-8)}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={getContractUrl(deployedToken.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View on Ramascan
            </a>
            <button onClick={resetForm} className="btn-secondary">
              Create Another Token
            </button>
          </div>
        </div>
      )}

      {/* Deployment Fee Info */}
      {step < 4 && (
        <div className="glass-card p-4 border-blue-500/30 bg-blue-500/5 max-w-2xl mx-auto">
          <p className="text-blue-400 text-sm">
            ℹ️ <strong>Deployment Fee:</strong> Creating a RAMA-20 token requires 0.01 RAMA + gas fees. 
            Make sure you have enough RAMA to cover the deployment cost.
          </p>
        </div>
      )}
    </div>
  )
}
