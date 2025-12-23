import { useState, useEffect } from 'react'
import { Settings, Users, Pause, Play, Shield, Loader2, AlertTriangle, CheckCircle, X, RefreshCw, Copy, ExternalLink, Coins, Flame, UserX } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits, isAddress } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import { getTxUrl, getContractUrl } from '../../config/contracts'

// RAMA20Token ABI for admin functions
const RAMA20TokenABI = [
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'maxSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'paused', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'mintable', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'pausable', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ type: 'address', name: 'to' }, { type: 'uint256', name: 'amount' }], name: 'mint', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ type: 'uint256', name: 'value' }], name: 'burn', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'unpause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ type: 'address', name: 'newOwner' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
] as const

type ModalType = 'mint' | 'burn' | 'transfer' | 'renounce' | null

export default function TokenAdminPanel() {
  const { address: userAddress } = useAccount()
  const [tokenAddress, setTokenAddress] = useState('')
  const [validTokenAddress, setValidTokenAddress] = useState<`0x${string}` | null>(null)
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()

  // Modal form states
  const [mintTo, setMintTo] = useState('')
  const [mintAmount, setMintAmount] = useState('')
  const [burnAmount, setBurnAmount] = useState('')
  const [newOwner, setNewOwner] = useState('')

  // Validate and set token address
  useEffect(() => {
    if (isAddress(tokenAddress)) {
      setValidTokenAddress(tokenAddress as `0x${string}`)
    } else {
      setValidTokenAddress(null)
    }
  }, [tokenAddress])

  // Read basic ERC20 token data (required)
  const { data: tokenName, refetch: refetchName, isError: nameError } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'name',
    query: { enabled: !!validTokenAddress, retry: false },
  })

  const { data: tokenSymbol, refetch: refetchSymbol, isError: symbolError } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'symbol',
    query: { enabled: !!validTokenAddress, retry: false },
  })

  const { data: tokenDecimals } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'decimals',
    query: { enabled: !!validTokenAddress, retry: false },
  })

  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'totalSupply',
    query: { enabled: !!validTokenAddress, retry: false },
  })

  // Read optional RAMA20Token-specific data (may not exist on standard ERC20)
  const { data: maxSupply } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'maxSupply',
    query: { enabled: !!validTokenAddress && !!tokenName, retry: false },
  })

  const { data: tokenOwner, refetch: refetchOwner } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'owner',
    query: { enabled: !!validTokenAddress && !!tokenName, retry: false },
  })

  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'paused',
    query: { enabled: !!validTokenAddress && !!tokenName, retry: false },
  })

  const { data: isMintable } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'mintable',
    query: { enabled: !!validTokenAddress && !!tokenName, retry: false },
  })

  const { data: isPausable } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'pausable',
    query: { enabled: !!validTokenAddress && !!tokenName, retry: false },
  })

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: validTokenAddress!,
    abi: RAMA20TokenABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!validTokenAddress && !!userAddress },
  })

  // Write contract hooks
  const { data: mintHash, writeContract: writeMint, isPending: isMinting } = useWriteContract()
  const { data: burnHash, writeContract: writeBurn, isPending: isBurning } = useWriteContract()
  const { data: pauseHash, writeContract: writePause, isPending: isPausing } = useWriteContract()
  const { data: transferHash, writeContract: writeTransfer, isPending: isTransferring } = useWriteContract()
  const { data: renounceHash, writeContract: writeRenounce, isPending: isRenouncing } = useWriteContract()

  // Transaction receipts
  const { isLoading: isMintConfirming, isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintHash })
  const { isLoading: isBurnConfirming, isSuccess: burnSuccess } = useWaitForTransactionReceipt({ hash: burnHash })
  const { isLoading: isPauseConfirming, isSuccess: pauseSuccess } = useWaitForTransactionReceipt({ hash: pauseHash })
  const { isLoading: isTransferConfirming, isSuccess: transferSuccess } = useWaitForTransactionReceipt({ hash: transferHash })
  const { isLoading: isRenounceConfirming, isSuccess: renounceSuccess } = useWaitForTransactionReceipt({ hash: renounceHash })

  const decimals = tokenDecimals ?? 18
  const isOwner = userAddress && tokenOwner && userAddress.toLowerCase() === tokenOwner.toLowerCase()

  // Refetch all data
  const refetchAll = () => {
    refetchName()
    refetchSymbol()
    refetchSupply()
    refetchOwner()
    refetchPaused()
    refetchBalance()
  }

  // Handle transaction success
  useEffect(() => {
    if (mintSuccess) {
      toast.success('Tokens minted successfully!')
      setActiveModal(null)
      setMintTo('')
      setMintAmount('')
      setTxHash(mintHash)
      refetchAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintSuccess])

  useEffect(() => {
    if (burnSuccess) {
      toast.success('Tokens burned successfully!')
      setActiveModal(null)
      setBurnAmount('')
      setTxHash(burnHash)
      refetchAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burnSuccess])

  useEffect(() => {
    if (pauseSuccess) {
      toast.success(isPaused ? 'Token unpaused!' : 'Token paused!')
      setTxHash(pauseHash)
      refetchAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseSuccess])

  useEffect(() => {
    if (transferSuccess) {
      toast.success('Ownership transferred!')
      setActiveModal(null)
      setNewOwner('')
      setTxHash(transferHash)
      refetchAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferSuccess])

  useEffect(() => {
    if (renounceSuccess) {
      toast.success('Ownership renounced!')
      setActiveModal(null)
      setTxHash(renounceHash)
      refetchAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renounceSuccess])

  // Action handlers
  const handleMint = () => {
    if (!validTokenAddress) return
    if (!isAddress(mintTo)) {
      toast.error('Invalid recipient address')
      return
    }
    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      toast.error('Invalid amount')
      return
    }

    try {
      const amount = parseUnits(mintAmount, decimals)
      writeMint({
        address: validTokenAddress,
        abi: RAMA20TokenABI,
        functionName: 'mint',
        args: [mintTo as `0x${string}`, amount],
      })
    } catch (error) {
      console.error('Mint error:', error)
      toast.error('Failed to mint tokens')
    }
  }

  const handleBurn = () => {
    if (!validTokenAddress) return
    if (!burnAmount || parseFloat(burnAmount) <= 0) {
      toast.error('Invalid amount')
      return
    }

    try {
      const amount = parseUnits(burnAmount, decimals)
      writeBurn({
        address: validTokenAddress,
        abi: RAMA20TokenABI,
        functionName: 'burn',
        args: [amount],
      })
    } catch (error) {
      console.error('Burn error:', error)
      toast.error('Failed to burn tokens')
    }
  }

  const handlePauseToggle = () => {
    if (!validTokenAddress) return

    try {
      writePause({
        address: validTokenAddress,
        abi: RAMA20TokenABI,
        functionName: isPaused ? 'unpause' : 'pause',
      })
    } catch (error) {
      console.error('Pause error:', error)
      toast.error('Failed to toggle pause')
    }
  }

  const handleTransferOwnership = () => {
    if (!validTokenAddress) return
    if (!isAddress(newOwner)) {
      toast.error('Invalid new owner address')
      return
    }

    try {
      writeTransfer({
        address: validTokenAddress,
        abi: RAMA20TokenABI,
        functionName: 'transferOwnership',
        args: [newOwner as `0x${string}`],
      })
    } catch (error) {
      console.error('Transfer error:', error)
      toast.error('Failed to transfer ownership')
    }
  }

  const handleRenounceOwnership = () => {
    if (!validTokenAddress) return

    try {
      writeRenounce({
        address: validTokenAddress,
        abi: RAMA20TokenABI,
        functionName: 'renounceOwnership',
      })
    } catch (error) {
      console.error('Renounce error:', error)
      toast.error('Failed to renounce ownership')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const isProcessing = isMinting || isMintConfirming || isBurning || isBurnConfirming || 
    isPausing || isPauseConfirming || isTransferring || isTransferConfirming || 
    isRenouncing || isRenounceConfirming

  const tokenLoaded = validTokenAddress && tokenName && tokenSymbol
  const hasLoadError = nameError || symbolError

  return (
    <div className="space-y-6">
      <BackButton />
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-blue-400" />
          Token Admin Panel
        </h1>
        <p className="text-slate-400 mt-1">Manage your token settings and permissions</p>
      </div>

      {/* Token Selector */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="input-label">Token Address</label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="input-field font-mono"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={refetchAll}
              disabled={!tokenLoaded}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
            </button>
            {tokenLoaded && (
              <a
                href={getContractUrl(validTokenAddress!)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        {/* Token status indicator */}
        {tokenAddress && (
          <div className="mt-3">
            {validTokenAddress ? (
              tokenLoaded ? (
                <p className="text-sm text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Token loaded: {tokenName} ({tokenSymbol})
                </p>
              ) : hasLoadError ? (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Failed to load token. Make sure this is a valid ERC20 token contract.
                </p>
              ) : (
                <p className="text-sm text-yellow-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading token data...
                </p>
              )
            ) : (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Invalid address format
              </p>
            )}
          </div>
        )}
      </div>

      {tokenLoaded && (
        <>
          {/* Token Overview */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Token Overview</h2>
              {isOwner ? (
                <span className="badge badge-new flex items-center gap-1">
                  <Shield className="w-3 h-3" /> You are Owner
                </span>
              ) : (
                <span className="badge badge-chain">Not Owner</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Name</p>
                <p className="text-lg font-semibold text-white">{tokenName}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Symbol</p>
                <p className="text-lg font-semibold text-white">{tokenSymbol}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Total Supply</p>
                <p className="text-lg font-semibold text-white">
                  {totalSupply ? Number(formatUnits(totalSupply, decimals)).toLocaleString() : '0'}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Status</p>
                <p className={`text-lg font-semibold ${isPaused ? 'text-red-400' : 'text-green-400'}`}>
                  {isPaused ? '⏸️ Paused' : '✅ Active'}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Decimals</p>
                <p className="text-white font-medium">{decimals}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Max Supply</p>
                <p className="text-white font-medium">
                  {maxSupply && maxSupply > 0n ? Number(formatUnits(maxSupply, decimals)).toLocaleString() : 'Unlimited'}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Features</p>
                <div className="flex gap-2 mt-1">
                  {isMintable && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Mintable</span>}
                  {isPausable && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Pausable</span>}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Your Balance</p>
                <p className="text-white font-medium">
                  {userBalance ? Number(formatUnits(userBalance, decimals)).toLocaleString() : '0'} {tokenSymbol}
                </p>
              </div>
            </div>

            {/* Owner Address */}
            <div className="mt-4 bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Owner Address</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-mono text-sm">{tokenOwner}</p>
                <button onClick={() => copyToClipboard(tokenOwner as string)} className="text-slate-400 hover:text-white">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Mint Tokens */}
            <button
              onClick={() => setActiveModal('mint')}
              disabled={!isOwner || !isMintable}
              className={`tool-card text-left ${(!isOwner || !isMintable) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Coins className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="font-semibold text-white">Mint Tokens</h3>
              </div>
              <p className="text-sm text-slate-400">Create new tokens and send to an address</p>
              {!isMintable && <p className="text-xs text-yellow-400 mt-2">⚠️ Minting disabled</p>}
            </button>

            {/* Burn Tokens */}
            <button
              onClick={() => setActiveModal('burn')}
              disabled={!userBalance || userBalance === 0n}
              className={`tool-card text-left ${(!userBalance || userBalance === 0n) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Flame className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="font-semibold text-white">Burn Tokens</h3>
              </div>
              <p className="text-sm text-slate-400">Permanently remove your tokens from circulation</p>
            </button>

            {/* Pause/Unpause Token */}
            <button
              onClick={handlePauseToggle}
              disabled={!isOwner || !isPausable || isProcessing}
              className={`tool-card text-left ${(!isOwner || !isPausable) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  {isPaused ? (
                    <Play className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <Pause className="w-5 h-5 text-yellow-400" />
                  )}
                </div>
                <h3 className="font-semibold text-white">
                  {isPausing || isPauseConfirming ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : isPaused ? 'Unpause Token' : 'Pause Token'}
                </h3>
              </div>
              <p className="text-sm text-slate-400">
                {isPaused ? 'Resume all token transfers' : 'Temporarily halt all transfers'}
              </p>
              {!isPausable && <p className="text-xs text-yellow-400 mt-2">⚠️ Pausing disabled</p>}
            </button>

            {/* Transfer Ownership */}
            <button
              onClick={() => setActiveModal('transfer')}
              disabled={!isOwner}
              className={`tool-card text-left ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white">Transfer Ownership</h3>
              </div>
              <p className="text-sm text-slate-400">Transfer token ownership to another address</p>
            </button>

            {/* Renounce Ownership */}
            <button
              onClick={() => setActiveModal('renounce')}
              disabled={!isOwner}
              className={`tool-card text-left ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <UserX className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="font-semibold text-white">Renounce Ownership</h3>
              </div>
              <p className="text-sm text-slate-400">Permanently give up ownership (irreversible!)</p>
            </button>
          </div>

          {/* Warning */}
          <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
            <p className="text-yellow-400 text-sm">
              ⚠️ <strong>Warning:</strong> These actions are irreversible and will be executed on the blockchain. 
              Make sure you understand the implications before proceeding.
            </p>
          </div>

          {/* Transaction Success */}
          {txHash && (
            <div className="glass-card p-4 border-green-500/30 bg-green-500/5">
              <p className="text-green-400 text-sm flex items-center gap-2">
                ✓ Transaction submitted! 
                <a
                  href={getTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-green-300"
                >
                  View on Ramascan
                </a>
              </p>
            </div>
          )}
        </>
      )}

      {/* Mint Modal */}
      {activeModal === 'mint' && (
        <Modal title="Mint Tokens" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="input-label">Recipient Address</label>
              <input
                type="text"
                value={mintTo}
                onChange={(e) => setMintTo(e.target.value)}
                placeholder="0x..."
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="input-label">Amount ({tokenSymbol})</label>
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="0.00"
                className="input-field"
              />
              {maxSupply && maxSupply > 0n && totalSupply && (
                <p className="text-xs text-slate-500 mt-1">
                  Available to mint: {Number(formatUnits(maxSupply - totalSupply, decimals)).toLocaleString()} {tokenSymbol}
                </p>
              )}
            </div>
            <button
              onClick={handleMint}
              disabled={isMinting || isMintConfirming}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isMinting || isMintConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isMinting ? 'Confirm in wallet...' : 'Minting...'}
                </>
              ) : (
                <>
                  <Coins className="w-5 h-5" />
                  Mint Tokens
                </>
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* Burn Modal */}
      {activeModal === 'burn' && (
        <Modal title="Burn Tokens" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">
                ⚠️ Burning tokens is irreversible. They will be permanently removed from circulation.
              </p>
            </div>
            <div>
              <label className="input-label">Amount to Burn ({tokenSymbol})</label>
              <input
                type="number"
                value={burnAmount}
                onChange={(e) => setBurnAmount(e.target.value)}
                placeholder="0.00"
                className="input-field"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your balance: {userBalance ? Number(formatUnits(userBalance, decimals)).toLocaleString() : '0'} {tokenSymbol}
              </p>
              <button
                onClick={() => userBalance && setBurnAmount(formatUnits(userBalance, decimals))}
                className="text-xs text-blue-400 hover:text-blue-300 mt-1"
              >
                Use Max
              </button>
            </div>
            <button
              onClick={handleBurn}
              disabled={isBurning || isBurnConfirming}
              className="w-full btn-primary flex items-center justify-center gap-2 !bg-red-500 hover:!bg-red-600"
            >
              {isBurning || isBurnConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isBurning ? 'Confirm in wallet...' : 'Burning...'}
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5" />
                  Burn Tokens
                </>
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* Transfer Ownership Modal */}
      {activeModal === 'transfer' && (
        <Modal title="Transfer Ownership" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-sm text-yellow-400">
                ⚠️ You will lose all owner privileges. The new owner will have full control over the token.
              </p>
            </div>
            <div>
              <label className="input-label">New Owner Address</label>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="0x..."
                className="input-field font-mono"
              />
            </div>
            <button
              onClick={handleTransferOwnership}
              disabled={isTransferring || isTransferConfirming}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isTransferring || isTransferConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isTransferring ? 'Confirm in wallet...' : 'Transferring...'}
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Transfer Ownership
                </>
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* Renounce Ownership Modal */}
      {activeModal === 'renounce' && (
        <Modal title="Renounce Ownership" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400 font-semibold">
                🚨 DANGER: This action is IRREVERSIBLE!
              </p>
              <p className="text-sm text-red-400 mt-2">
                Once you renounce ownership, there will be NO owner of this token. 
                No one will be able to mint, pause, or perform any admin actions ever again.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-slate-400 text-sm mb-2">Current Owner</p>
              <p className="text-white font-mono text-sm">{tokenOwner}</p>
              <p className="text-2xl my-3">⬇️</p>
              <p className="text-slate-400 text-sm mb-2">New Owner</p>
              <p className="text-red-400 font-semibold">0x0000...0000 (None)</p>
            </div>
            <button
              onClick={handleRenounceOwnership}
              disabled={isRenouncing || isRenounceConfirming}
              className="w-full btn-primary flex items-center justify-center gap-2 !bg-red-600 hover:!bg-red-700"
            >
              {isRenouncing || isRenounceConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isRenouncing ? 'Confirm in wallet...' : 'Renouncing...'}
                </>
              ) : (
                <>
                  <UserX className="w-5 h-5" />
                  Renounce Ownership Forever
                </>
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Modal Component
function Modal({ 
  title, 
  children, 
  onClose 
}: { 
  title: string
  children: React.ReactNode
  onClose: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
