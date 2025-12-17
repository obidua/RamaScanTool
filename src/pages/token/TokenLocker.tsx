import { useState, useEffect } from 'react'
import { Lock, Unlock, Clock, Loader2, ExternalLink } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import { CONTRACT_ADDRESSES, getTxUrl, getContractUrl } from '../../config/contracts'
import { TokenLockerABI, ERC20ABI } from '../../config/abis'

interface LockInfo {
  id: bigint
  token: string
  owner: string
  amount: bigint
  lockTime: bigint
  unlockTime: bigint
  withdrawn: boolean
  description: string
}

export default function TokenLocker() {
  const { isConnected, address: userAddress } = useAccount()
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [formData, setFormData] = useState({
    tokenAddress: '',
    amount: '',
    unlockDate: '',
    description: '',
  })

  // Read token info
  const { data: tokenName } = useReadContract({
    address: formData.tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'name',
    query: { enabled: isAddress(formData.tokenAddress) },
  })

  const { data: tokenSymbol } = useReadContract({
    address: formData.tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'symbol',
    query: { enabled: isAddress(formData.tokenAddress) },
  })

  const { data: tokenDecimals } = useReadContract({
    address: formData.tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: { enabled: isAddress(formData.tokenAddress) },
  })

  const { data: tokenBalance } = useReadContract({
    address: formData.tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: isAddress(formData.tokenAddress) && !!userAddress },
  })

  const { data: allowance } = useReadContract({
    address: formData.tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, CONTRACT_ADDRESSES.TokenLocker as `0x${string}`] : undefined,
    query: { enabled: isAddress(formData.tokenAddress) && !!userAddress },
  })

  // Read user's locks
  const { data: userLocks, refetch: refetchLocks } = useReadContract({
    address: CONTRACT_ADDRESSES.TokenLocker as `0x${string}`,
    abi: TokenLockerABI,
    functionName: 'getLocksDetailsByOwner',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  }) as { data: LockInfo[] | undefined; refetch: () => void }

  // Contract write hooks
  const { data: approveHash, writeContract: writeApprove, isPending: isApproving } = useWriteContract()
  const { data: lockHash, writeContract: writeLock, isPending: isLocking } = useWriteContract()
  const { data: unlockHash, writeContract: writeUnlock, isPending: isUnlocking } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const { isLoading: isLockConfirming, isSuccess: lockSuccess } = useWaitForTransactionReceipt({
    hash: lockHash,
  })

  const { isLoading: isUnlockConfirming, isSuccess: unlockSuccess } = useWaitForTransactionReceipt({
    hash: unlockHash,
  })

  const decimals = tokenDecimals ?? 18
  const needsApproval = formData.amount && allowance !== undefined 
    ? allowance < parseUnits(formData.amount || '0', decimals)
    : false

  // Handle approval success
  useEffect(() => {
    if (approveSuccess) {
      toast.success('Token approved!')
    }
  }, [approveSuccess])

  // Handle lock success
  useEffect(() => {
    if (lockSuccess && lockHash) {
      setTxHash(lockHash)
      toast.success('Tokens locked successfully!')
      setActiveTab('manage')
      refetchLocks()
    }
  }, [lockSuccess, lockHash])

  // Handle unlock success
  useEffect(() => {
    if (unlockSuccess) {
      toast.success('Tokens unlocked!')
      refetchLocks()
    }
  }, [unlockSuccess])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const approveTokens = async () => {
    if (!isAddress(formData.tokenAddress)) return

    try {
      const amountToApprove = parseUnits(formData.amount || '0', decimals)
      writeApprove({
        address: formData.tokenAddress as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.TokenLocker as `0x${string}`, amountToApprove * 2n],
      })
    } catch (error) {
      console.error('Approve error:', error)
      toast.error('Failed to approve tokens')
    }
  }

  const lockTokens = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!isAddress(formData.tokenAddress)) {
      toast.error('Please enter a valid token address')
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter an amount')
      return
    }

    if (!formData.unlockDate) {
      toast.error('Please select unlock date')
      return
    }

    const unlockTimestamp = BigInt(Math.floor(new Date(formData.unlockDate).getTime() / 1000))
    if (unlockTimestamp <= BigInt(Math.floor(Date.now() / 1000))) {
      toast.error('Unlock date must be in the future')
      return
    }

    try {
      const amount = parseUnits(formData.amount, decimals)
      writeLock({
        address: CONTRACT_ADDRESSES.TokenLocker as `0x${string}`,
        abi: TokenLockerABI,
        functionName: 'lockTokens',
        args: [
          formData.tokenAddress as `0x${string}`,
          amount,
          unlockTimestamp,
          formData.description || 'Token Lock',
        ],
        value: 10000000000000000n, // 0.01 RAMA lock fee
      })
    } catch (error) {
      console.error('Lock error:', error)
      toast.error('Failed to lock tokens')
    }
  }

  const unlockTokens = async (lockId: bigint) => {
    try {
      writeUnlock({
        address: CONTRACT_ADDRESSES.TokenLocker as `0x${string}`,
        abi: TokenLockerABI,
        functionName: 'unlockTokens',
        args: [lockId],
      })
    } catch (error) {
      console.error('Unlock error:', error)
      toast.error('Failed to unlock tokens')
    }
  }

  const isProcessing = isApproving || isApproveConfirming || isLocking || isLockConfirming || isUnlocking || isUnlockConfirming

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  const isUnlockable = (lock: LockInfo) => {
    return !lock.withdrawn && BigInt(Math.floor(Date.now() / 1000)) >= lock.unlockTime
  }

  const locks = userLocks || []

  return (
    <div className="space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Token Locker</h1>
        <p className="text-slate-400 mt-1">Lock tokens for vesting, LP locks, or team tokens</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'create' 
              ? 'bg-blue-500 text-white' 
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Create Lock
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            activeTab === 'manage' 
              ? 'bg-blue-500 text-white' 
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Manage Locks ({locks.filter(l => !l.withdrawn).length})
        </button>
      </div>

      {/* Create Lock */}
      {activeTab === 'create' && (
        <div className="glass-card p-6 max-w-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Create New Lock</h2>

          <div className="space-y-4">
            <div>
              <label className="input-label">Token Address</label>
              <input
                type="text"
                name="tokenAddress"
                value={formData.tokenAddress}
                onChange={handleChange}
                placeholder="0x..."
                className="input-field font-mono"
              />
              {tokenSymbol && tokenName && (
                <p className="text-sm text-green-400 mt-1">
                  ✓ {tokenName} ({tokenSymbol})
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Amount to Lock</label>
                <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="1000000"
                  className="input-field"
                />
                {tokenBalance !== undefined && (
                  <p className="text-xs text-slate-500 mt-1">
                    Balance: {Number(formatUnits(tokenBalance, decimals)).toLocaleString()} {tokenSymbol}
                  </p>
                )}
              </div>
              <div>
                <label className="input-label">Unlock Date</label>
                <input
                  type="date"
                  name="unlockDate"
                  value={formData.unlockDate}
                  onChange={handleChange}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Description (optional)</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., Team tokens, LP lock, etc."
                className="input-field"
              />
            </div>

            <div className="stat-card">
              <p className="text-sm text-slate-400">Lock Fee</p>
              <p className="text-xl font-bold text-white">0.01 RAMA</p>
            </div>

            <div className="flex gap-4">
              {needsApproval && (
                <button
                  onClick={approveTokens}
                  disabled={isProcessing}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  {isApproving || isApproveConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isApproving ? 'Confirm...' : 'Approving...'}
                    </>
                  ) : (
                    <>Approve {tokenSymbol || 'Tokens'}</>
                  )}
                </button>
              )}
              <button
                onClick={lockTokens}
                disabled={isProcessing || !isConnected || needsApproval}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {isLocking || isLockConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isLocking ? 'Confirm...' : 'Locking...'}
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Lock Tokens
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Locks */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {locks.filter(l => !l.withdrawn).length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Lock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No locked tokens found</p>
              <button
                onClick={() => setActiveTab('create')}
                className="btn-primary mt-4"
              >
                Create Your First Lock
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locks.filter(l => !l.withdrawn).map((lock) => (
                <div key={lock.id.toString()} className="glass-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${
                        isUnlockable(lock) ? 'bg-green-500/20' : 'bg-blue-500/20'
                      }`}>
                        {isUnlockable(lock) ? (
                          <Unlock className="w-6 h-6 text-green-400" />
                        ) : (
                          <Lock className="w-6 h-6 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{lock.description || 'Token Lock'}</h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {lock.token.slice(0, 10)}...{lock.token.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${isUnlockable(lock) ? 'badge-new' : 'badge-chain'}`}>
                      {isUnlockable(lock) ? 'UNLOCKABLE' : 'LOCKED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500">Amount Locked</p>
                      <p className="text-lg font-semibold text-white">
                        {Number(formatUnits(lock.amount, 18)).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Unlock Date</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <p className="text-lg font-semibold text-white">{formatDate(lock.unlockTime)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isUnlockable(lock) && (
                      <button 
                        onClick={() => unlockTokens(lock.id)}
                        disabled={isUnlocking || isUnlockConfirming}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                      >
                        {isUnlocking || isUnlockConfirming ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Unlock className="w-5 h-5" />
                        )}
                        Withdraw Tokens
                      </button>
                    )}
                    <a
                      href={getContractUrl(lock.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Success notification */}
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
    </div>
  )
}
