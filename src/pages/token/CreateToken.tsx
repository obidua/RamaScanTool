import { useState, useEffect } from 'react'
import { Coins, Loader2, Check, ExternalLink, RefreshCw, Copy, Wallet, FileCode, ChevronDown, ChevronUp, Shield, CheckCircle, Zap } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useGasPrice } from 'wagmi'
import { decodeEventLog, formatEther } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'
import { CONTRACT_ADDRESSES, getTxUrl, getContractUrl } from '../../config/contracts'
import { RAMA20FactoryABI } from '../../config/abis'
import { verifyTokenContract, getVerificationStatus, copySourceCode } from '../../services/verifyContract'

// RAMA20Token source code for verification
const RAMA20_TOKEN_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RAMA20Token is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    uint8 private _decimals;
    bool public mintable;
    bool public pausable;
    uint256 public maxSupply;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        uint256 maxSupply_,
        bool mintable_,
        bool burnable_,
        bool pausable_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        _decimals = decimals_;
        mintable = mintable_;
        pausable = pausable_;
        maxSupply = maxSupply_;
        
        if (initialSupply_ > 0) {
            _mint(owner_, initialSupply_ * 10 ** decimals_);
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(mintable, "Minting is disabled");
        if (maxSupply > 0) {
            require(totalSupply() + amount <= maxSupply * 10 ** _decimals, "Exceeds max supply");
        }
        _mint(to, amount);
    }

    function pause() public onlyOwner {
        require(pausable, "Pausing is disabled");
        _pause();
    }

    function unpause() public onlyOwner {
        require(pausable, "Pausing is disabled");
        _unpause();
    }

    function _update(address from, address to, uint256 value) internal virtual override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}`;

export default function CreateToken() {
  const { isConnected, address: userAddress } = useAccount()
  const [step, setStep] = useState(1)
  const [deployedToken, setDeployedToken] = useState<{ address: string; txHash: string } | null>(null)
  const [showImportGuide, setShowImportGuide] = useState(false)
  const [showVerifyGuide, setShowVerifyGuide] = useState(false)
  const [showSourceCode, setShowSourceCode] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle')
  const [verificationMessage, setVerificationMessage] = useState('')
  const [manualVerifyUrl, setManualVerifyUrl] = useState('')
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
    // Reset verification state
    setVerificationStatus('idle')
    setVerificationMessage('')
    setManualVerifyUrl('')
    setIsVerifying(false)
    setShowImportGuide(false)
    setShowVerifyGuide(false)
    setShowSourceCode(false)
    // Reset form data
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
        <h1 className="text-xl md:text-2xl font-bold text-white">Create Token</h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Deploy your own RAMA-20 token on Ramestta Network in minutes</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 overflow-x-auto px-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-sm md:text-base ${
              step >= s ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
            }`}>
              {step > s ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-6 sm:w-10 md:w-16 h-1 ${step > s ? 'bg-blue-500' : 'bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-3 sm:gap-6 md:gap-12 text-xs sm:text-sm">
        <span className={step >= 1 ? 'text-white' : 'text-slate-500'}>Token Info</span>
        <span className={step >= 2 ? 'text-white' : 'text-slate-500'}>Features</span>
        <span className={step >= 3 ? 'text-white' : 'text-slate-500'}>Deploy</span>
        <span className={step >= 4 ? 'text-white' : 'text-slate-500'}>Success</span>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Info Banner */}
          <div className="glass-card p-4 md:p-6 border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Coins className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">What is a RAMA-20 Token?</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  RAMA-20 is the token standard on Ramestta Network, similar to ERC-20 on Ethereum. 
                  It allows you to create fungible tokens that can be transferred, traded, and integrated 
                  with DeFi applications on the Ramestta blockchain.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <h4 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      Token Types You Can Create
                    </h4>
                    <ul className="text-slate-400 text-xs space-y-1">
                      <li>• <span className="text-green-400">Utility Tokens</span> - For platform access & services</li>
                      <li>• <span className="text-blue-400">Governance Tokens</span> - For DAO voting rights</li>
                      <li>• <span className="text-purple-400">Reward Tokens</span> - For loyalty & incentive programs</li>
                      <li>• <span className="text-orange-400">Meme Tokens</span> - For community-driven projects</li>
                    </ul>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <h4 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-400" />
                      Features Available
                    </h4>
                    <ul className="text-slate-400 text-xs space-y-1">
                      <li>• <span className="text-white">Mintable</span> - Create new tokens after deployment</li>
                      <li>• <span className="text-white">Burnable</span> - Reduce supply by burning tokens</li>
                      <li>• <span className="text-white">Pausable</span> - Emergency pause transfers</li>
                      <li>• <span className="text-white">Max Supply</span> - Set a hard cap limit</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-green-400 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span><strong>Free to create!</strong> Only pay gas fees (~0.01 RAMA). Contracts are auto-verified on Ramascan.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Token Form */}
          <div className="glass-card p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Token Information</h2>
          
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <NetworkSelector label="Network" />
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
        </div>
      )}

      {/* Step 2: Features */}
      {step === 2 && (
        <div className="glass-card p-4 md:p-6 max-w-2xl mx-auto">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Token Features</h2>
          
          <div className="space-y-3 md:space-y-4">
            <label className="flex items-center justify-between p-3 md:p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <div className="flex-1 mr-3">
                <p className="font-medium text-white text-sm md:text-base">Mintable</p>
                <p className="text-xs md:text-sm text-slate-400">Allow minting new tokens after deployment</p>
              </div>
              <input
                type="checkbox"
                name="mintable"
                checked={formData.mintable}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 md:p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <div className="flex-1 mr-3">
                <p className="font-medium text-white text-sm md:text-base">Burnable</p>
                <p className="text-xs md:text-sm text-slate-400">Allow burning tokens to reduce supply</p>
              </div>
              <input
                type="checkbox"
                name="burnable"
                checked={formData.burnable}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 md:p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <div className="flex-1 mr-3">
                <p className="font-medium text-white text-sm md:text-base">Pausable</p>
                <p className="text-xs md:text-sm text-slate-400">Allow pausing all token transfers</p>
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
        <div className="glass-card p-4 md:p-6 max-w-2xl mx-auto">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">Review & Deploy</h2>
          
          <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div className="stat-card">
                <p className="text-xs md:text-sm text-slate-400">Name</p>
                <p className="text-sm md:text-lg font-semibold text-white truncate">{formData.name}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs md:text-sm text-slate-400">Symbol</p>
                <p className="text-sm md:text-lg font-semibold text-white">{formData.symbol}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs md:text-sm text-slate-400">Total Supply</p>
                <p className="text-sm md:text-lg font-semibold text-white">{Number(formData.totalSupply).toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs md:text-sm text-slate-400">Decimals</p>
                <p className="text-sm md:text-lg font-semibold text-white">{formData.decimals}</p>
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
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="glass-card p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Token Deployed Successfully! 🎉</h2>
            <p className="text-slate-400 mb-6">Your {formData.name} ({formData.symbol}) token is now live on Ramestta Network</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Token Address</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-blue-400 font-mono text-xs break-all">{deployedToken.address}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(deployedToken.address)
                      toast.success('Address copied!')
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="stat-card">
                <p className="text-sm text-slate-400">Transaction Hash</p>
                <a
                  href={getTxUrl(deployedToken.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono text-xs flex items-center justify-center gap-1"
                >
                  {deployedToken.txHash.slice(0, 16)}...{deployedToken.txHash.slice(-8)}
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

          {/* Verify Contract Section */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Verify Contract on Ramascan</h3>
            </div>
            
            <p className="text-slate-400 text-sm mb-4">
              Verify your token contract to make the source code publicly visible on Ramascan. 
              This builds trust with your token holders.
            </p>

            {/* Verification Status */}
            {verificationStatus === 'success' ? (
              <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-white font-medium">Contract Verified! ✓</p>
                  <p className="text-slate-400 text-sm">{verificationMessage}</p>
                </div>
                <a
                  href={`${getContractUrl(deployedToken.address)}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
                >
                  View Code <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : verificationStatus === 'pending' ? (
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <div className="flex-1">
                  <p className="text-white font-medium">Verifying Contract...</p>
                  <p className="text-slate-400 text-sm">{verificationMessage}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* One-Click Automatic Verification */}
                <button
                  onClick={async () => {
                    if (!deployedToken || !userAddress) return;
                    
                    setIsVerifying(true);
                    setVerificationStatus('pending');
                    setVerificationMessage('Waiting for contract to be indexed (this may take up to 30 seconds)...');
                    
                    try {
                      const result = await verifyTokenContract({
                        contractAddress: deployedToken.address,
                        name: formData.name,
                        symbol: formData.symbol,
                        decimals: formData.decimals,
                        initialSupply: formData.totalSupply,
                        maxSupply: formData.maxSupply || '0',
                        mintable: formData.mintable,
                        burnable: formData.burnable,
                        pausable: formData.pausable,
                        ownerAddress: userAddress,
                      });
                      
                      if (result.success) {
                        setVerificationStatus('success');
                        setVerificationMessage(result.message);
                        toast.success(result.message);
                      } else {
                        setVerificationStatus('failed');
                        setVerificationMessage(result.message);
                        if (result.manualVerificationUrl) {
                          setManualVerifyUrl(result.manualVerificationUrl);
                        }
                        toast.error('Auto-verification failed. Try manual verification.');
                      }
                    } catch (error) {
                      setVerificationStatus('failed');
                      setVerificationMessage(error instanceof Error ? error.message : 'Unknown error');
                      toast.error('Verification failed');
                    } finally {
                      setIsVerifying(false);
                    }
                  }}
                  disabled={isVerifying}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      🚀 Verify Contract Automatically
                    </>
                  )}
                </button>

                {/* Failed status with manual option */}
                {verificationStatus === 'failed' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-white font-medium">Automatic Verification Failed</p>
                        <p className="text-slate-400 text-sm">{verificationMessage}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {/* Try Again Button */}
                      <button
                        onClick={() => {
                          setVerificationStatus('idle');
                          setVerificationMessage('');
                        }}
                        className="btn-primary flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </button>
                      {manualVerifyUrl && (
                        <a
                          href={manualVerifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Verify Manually
                        </a>
                      )}
                      <button
                        onClick={async () => {
                          const success = await copySourceCode();
                          if (success) {
                            toast.success('Source code copied!');
                          }
                        }}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Source Code
                      </button>
                    </div>
                  </div>
                )}

                {/* Check Status Button */}
                {verificationStatus === 'idle' && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <button
                      onClick={async () => {
                        if (!deployedToken) return;
                        setIsVerifying(true);
                        try {
                          const status = await getVerificationStatus(deployedToken.address);
                          if (status.verified) {
                            setVerificationStatus('success');
                            setVerificationMessage('Contract is already verified!');
                            toast.success('Contract is already verified!');
                          } else {
                            toast('Not verified yet. Click the button above to verify.', { icon: 'ℹ️' });
                          }
                        } catch {
                          toast.error('Could not check status');
                        } finally {
                          setIsVerifying(false);
                        }
                      }}
                      disabled={isVerifying}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Check if already verified
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* How to Import Token */}
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setShowImportGuide(!showImportGuide)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-white">How to Import Token to Wallet</span>
              </div>
              {showImportGuide ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {showImportGuide && (
              <div className="p-4 pt-0 border-t border-slate-700">
                <div className="space-y-4 text-left">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">MetaMask / Trust Wallet / Other Wallets:</h4>
                    <ol className="space-y-2 text-sm text-slate-300">
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-semibold">1.</span>
                        Open your wallet and make sure you're connected to <strong className="text-white">Ramestta Network (Chain ID: 1370)</strong>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-semibold">2.</span>
                        Click on "Import Tokens" or "Add Token"
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-semibold">3.</span>
                        Select "Custom Token" and paste the token address:
                      </li>
                    </ol>
                    <div className="mt-3 bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                      <code className="text-blue-400 font-mono text-xs break-all">{deployedToken.address}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(deployedToken.address)
                          toast.success('Address copied!')
                        }}
                        className="text-slate-400 hover:text-white ml-2"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <ol className="space-y-2 text-sm text-slate-300 mt-3" start={4}>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-semibold">4.</span>
                        Token Symbol (<strong className="text-white">{formData.symbol}</strong>) and Decimals (<strong className="text-white">{formData.decimals}</strong>) should auto-fill
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-semibold">5.</span>
                        Click "Add Token" - Your <strong className="text-white">{Number(formData.totalSupply).toLocaleString()} {formData.symbol}</strong> tokens will appear!
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* How to Verify Contract */}
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setShowVerifyGuide(!showVerifyGuide)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-white">How to Verify Contract on Ramascan</span>
              </div>
              {showVerifyGuide ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {showVerifyGuide && (
              <div className="p-4 pt-0 border-t border-slate-700">
                <div className="space-y-4 text-left">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Verification Details:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-900 rounded p-3">
                        <p className="text-slate-400 text-xs">Contract Address</p>
                        <p className="text-white font-mono text-xs break-all">{deployedToken.address}</p>
                      </div>
                      <div className="bg-slate-900 rounded p-3">
                        <p className="text-slate-400 text-xs">Compiler Version</p>
                        <p className="text-white font-mono">v0.8.22+commit.4fc1097e</p>
                      </div>
                      <div className="bg-slate-900 rounded p-3">
                        <p className="text-slate-400 text-xs">EVM Version</p>
                        <p className="text-white font-mono">paris</p>
                      </div>
                      <div className="bg-slate-900 rounded p-3">
                        <p className="text-slate-400 text-xs">Optimization</p>
                        <p className="text-white font-mono">Yes (200 runs)</p>
                      </div>
                      <div className="bg-slate-900 rounded p-3">
                        <p className="text-slate-400 text-xs">License</p>
                        <p className="text-white font-mono">MIT</p>
                      </div>
                      <div className="bg-slate-900 rounded p-3">
                        <p className="text-slate-400 text-xs">Contract Name</p>
                        <p className="text-white font-mono">RAMA20Token</p>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-white mt-4 mb-2">Constructor Arguments (ABI Encoded):</h4>
                    <div className="bg-slate-900 rounded p-3">
                      <p className="text-slate-400 text-xs mb-2">These are the parameters used to create your token:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-400">name:</span> <span className="text-white">{formData.name}</span></div>
                        <div><span className="text-slate-400">symbol:</span> <span className="text-white">{formData.symbol}</span></div>
                        <div><span className="text-slate-400">decimals:</span> <span className="text-white">{formData.decimals}</span></div>
                        <div><span className="text-slate-400">initialSupply:</span> <span className="text-white">{formData.totalSupply}</span></div>
                        <div><span className="text-slate-400">maxSupply:</span> <span className="text-white">{formData.maxSupply || '0'}</span></div>
                        <div><span className="text-slate-400">mintable:</span> <span className="text-white">{formData.mintable ? 'true' : 'false'}</span></div>
                        <div><span className="text-slate-400">burnable:</span> <span className="text-white">{formData.burnable ? 'true' : 'false'}</span></div>
                        <div><span className="text-slate-400">pausable:</span> <span className="text-white">{formData.pausable ? 'true' : 'false'}</span></div>
                        <div><span className="text-slate-400">owner:</span> <span className="text-white font-mono">{userAddress?.slice(0, 10)}...</span></div>
                      </div>
                    </div>

                    <h4 className="font-medium text-white mt-4 mb-2">Steps to Verify:</h4>
                    <ol className="space-y-2 text-sm text-slate-300">
                      <li className="flex gap-2">
                        <span className="text-green-400 font-semibold">1.</span>
                        Go to <a href={`${getContractUrl(deployedToken.address)}#code`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">your token's contract page on Ramascan</a>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-green-400 font-semibold">2.</span>
                        Click on "Contract" tab, then "Verify & Publish"
                      </li>
                      <li className="flex gap-2">
                        <span className="text-green-400 font-semibold">3.</span>
                        Select "Solidity (Standard JSON Input)" as verification method
                      </li>
                      <li className="flex gap-2">
                        <span className="text-green-400 font-semibold">4.</span>
                        Use the source code provided below and the settings shown above
                      </li>
                    </ol>

                    <a
                      href={`${getContractUrl(deployedToken.address)}#code`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary mt-4 inline-flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Verify on Ramascan
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Source Code */}
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setShowSourceCode(!showSourceCode)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white">View Source Code (for Verification)</span>
              </div>
              {showSourceCode ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            {showSourceCode && (
              <div className="p-4 pt-0 border-t border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-slate-400">RAMA20Token.sol</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(RAMA20_TOKEN_SOURCE)
                      toast.success('Source code copied!')
                    }}
                    className="btn-secondary text-sm py-1 px-3 flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </button>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre">{RAMA20_TOKEN_SOURCE}</pre>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Note: This contract uses OpenZeppelin v5.x libraries. When verifying, include OpenZeppelin contracts as dependencies.
                </p>
              </div>
            )}
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
