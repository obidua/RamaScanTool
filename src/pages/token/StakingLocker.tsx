import { useState, useEffect } from 'react'
import { Lock, Unlock, Clock, Loader2, ExternalLink, Gift, Users, Shield, Settings, TrendingUp, Wallet } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import { CONTRACT_ADDRESSES, getTxUrl, getContractUrl } from '../../config/contracts'
import { StakingLockerABI, ERC20ABI } from '../../config/abis'

// Unlock recipient enum matching contract
const UnlockRecipient = {
  Beneficiary: 0,
  Creator: 1,
  Admin: 2,
} as const

interface LockInfo {
  id: bigint
  token: string
  creator: string
  beneficiary: string
  principalAmount: bigint
  rewardAmount: bigint
  dailyRewardRate: bigint
  lockTime: bigint
  unlockTime: bigint
  lastRewardCalcTime: bigint
  accruedRewards: bigint
  withdrawn: boolean
  adminCanUnlock: boolean
  creatorCanClaim: boolean
  description: string
  unlockRecipient: number
}

export default function StakingLocker() {
  const { isConnected, address: userAddress } = useAccount()
  const [activeTab, setActiveTab] = useState<'create' | 'myLocks' | 'claimable'>('create')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const [formData, setFormData] = useState({
    tokenAddress: '',
    beneficiary: '',
    principalAmount: '',
    rewardAmount: '',
    dailyRewardRate: '', // In percentage (e.g., 0.5 for 0.5% daily)
    unlockDate: '',
    description: '',
    adminCanUnlock: false,
    unlockRecipient: UnlockRecipient.Beneficiary,
  })

  // Use self as beneficiary if not specified
  const effectiveBeneficiary = formData.beneficiary || userAddress || ''

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
    args: userAddress ? [userAddress, CONTRACT_ADDRESSES.StakingLocker as `0x${string}`] : undefined,
    query: { enabled: isAddress(formData.tokenAddress) && !!userAddress },
  })

  // Read user's created locks
  const { data: createdLocks, refetch: refetchCreatedLocks } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingLocker as `0x${string}`,
    abi: StakingLockerABI,
    functionName: 'getLocksDetailsByCreator',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && !!CONTRACT_ADDRESSES.StakingLocker },
  }) as { data: LockInfo[] | undefined; refetch: () => void }

  // Read locks where user is beneficiary
  const { data: beneficiaryLocks, refetch: refetchBeneficiaryLocks } = useReadContract({
    address: CONTRACT_ADDRESSES.StakingLocker as `0x${string}`,
    abi: StakingLockerABI,
    functionName: 'getLocksDetailsByBeneficiary',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && !!CONTRACT_ADDRESSES.StakingLocker },
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
  const totalAmount = (parseFloat(formData.principalAmount) || 0) + (parseFloat(formData.rewardAmount) || 0)
  const needsApproval = totalAmount > 0 && allowance !== undefined 
    ? allowance < parseUnits(totalAmount.toString(), decimals)
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
      toast.success('Staking lock created successfully!')
      setActiveTab('myLocks')
      refetchCreatedLocks()
      refetchBeneficiaryLocks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockSuccess, lockHash])

  // Handle unlock success
  useEffect(() => {
    if (unlockSuccess) {
      toast.success('Tokens unlocked!')
      refetchCreatedLocks()
      refetchBeneficiaryLocks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockSuccess])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const approveTokens = async () => {
    if (!isAddress(formData.tokenAddress)) return

    try {
      const amountToApprove = parseUnits(totalAmount.toString(), decimals)
      writeApprove({
        address: formData.tokenAddress as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.StakingLocker as `0x${string}`, amountToApprove * 2n],
      })
    } catch (error) {
      console.error('Approve error:', error)
      toast.error('Failed to approve tokens')
    }
  }

  const createLock = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!isAddress(formData.tokenAddress)) {
      toast.error('Please enter a valid token address')
      return
    }

    if (!isAddress(effectiveBeneficiary)) {
      toast.error('Please enter a valid beneficiary address')
      return
    }

    if (!formData.principalAmount || parseFloat(formData.principalAmount) <= 0) {
      toast.error('Please enter a principal amount')
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
      const principalAmount = parseUnits(formData.principalAmount, decimals)
      const rewardAmount = formData.rewardAmount 
        ? parseUnits(formData.rewardAmount, decimals) 
        : 0n
      // Convert percentage to basis points (0.5% = 50 basis points)
      const dailyRewardRate = formData.dailyRewardRate 
        ? BigInt(Math.floor(parseFloat(formData.dailyRewardRate) * 100))
        : 0n

      writeLock({
        address: CONTRACT_ADDRESSES.StakingLocker as `0x${string}`,
        abi: StakingLockerABI,
        functionName: 'createLock',
        args: [
          formData.tokenAddress as `0x${string}`,
          effectiveBeneficiary as `0x${string}`,
          principalAmount,
          rewardAmount,
          dailyRewardRate,
          unlockTimestamp,
          formData.adminCanUnlock,
          formData.unlockRecipient,
          formData.description || 'Staking Lock',
        ],
        value: 10000000000000000n, // 0.01 RAMA lock fee
      })
    } catch (error) {
      console.error('Lock error:', error)
      toast.error('Failed to create lock')
    }
  }

  const unlockTokens = async (lockId: bigint) => {
    try {
      writeUnlock({
        address: CONTRACT_ADDRESSES.StakingLocker as `0x${string}`,
        abi: StakingLockerABI,
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

  const canUserUnlock = (lock: LockInfo) => {
    if (lock.withdrawn) return false
    if (!isUnlockable(lock)) return false
    
    // Check if user is authorized
    if (lock.beneficiary.toLowerCase() === userAddress?.toLowerCase()) return true
    if (lock.creator.toLowerCase() === userAddress?.toLowerCase()) return true
    
    return false
  }

  const calculateEstimatedRewards = () => {
    if (!formData.principalAmount || !formData.dailyRewardRate || !formData.unlockDate) return 0
    
    const unlockTimestamp = new Date(formData.unlockDate).getTime() / 1000
    const now = Date.now() / 1000
    const daysUntilUnlock = Math.max(0, (unlockTimestamp - now) / 86400)
    
    const principal = parseFloat(formData.principalAmount)
    const dailyRate = parseFloat(formData.dailyRewardRate) / 100
    
    return principal * dailyRate * daysUntilUnlock
  }

  const calculateAPR = () => {
    if (!formData.dailyRewardRate) return 0
    return parseFloat(formData.dailyRewardRate) * 365
  }

  const myCreatedLocks = createdLocks?.filter(l => !l.withdrawn) || []
  const myClaimableLocks = beneficiaryLocks?.filter(l => !l.withdrawn) || []

  return (
    <div className="space-y-4 md:space-y-6">
      <BackButton />
      
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-green-400" />
          Staking Locker
        </h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">
          Lock tokens with rewards for yourself or others - like staking with daily ROI
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card p-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <span className="text-xs text-slate-400">Lock for Others</span>
        </div>
        <div className="stat-card p-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-green-400" />
          <span className="text-xs text-slate-400">Daily Rewards</span>
        </div>
        <div className="stat-card p-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          <span className="text-xs text-slate-400">Admin Control</span>
        </div>
        <div className="stat-card p-3 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-yellow-400" />
          <span className="text-xs text-slate-400">Flexible Payout</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-colors text-sm md:text-base ${
            activeTab === 'create' 
              ? 'bg-green-500 text-white' 
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Create Lock
        </button>
        <button
          onClick={() => setActiveTab('myLocks')}
          className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-colors text-sm md:text-base ${
            activeTab === 'myLocks' 
              ? 'bg-green-500 text-white' 
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          My Created Locks ({myCreatedLocks.length})
        </button>
        <button
          onClick={() => setActiveTab('claimable')}
          className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-colors text-sm md:text-base ${
            activeTab === 'claimable' 
              ? 'bg-green-500 text-white' 
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Claimable ({myClaimableLocks.length})
        </button>
      </div>

      {/* Create Lock Form */}
      {activeTab === 'create' && (
        <div className="glass-card p-4 md:p-6 max-w-2xl">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-green-400" />
            Create New Staking Lock
          </h2>

          <div className="space-y-4">
            {/* Token Address */}
            <div>
              <label className="input-label">Token Address</label>
              <input
                type="text"
                name="tokenAddress"
                value={formData.tokenAddress}
                onChange={handleChange}
                placeholder="0x..."
                className="input-field font-mono text-sm md:text-base"
              />
              {tokenSymbol && tokenName && (
                <p className="text-xs md:text-sm text-green-400 mt-1">
                  ✓ {tokenName} ({tokenSymbol})
                </p>
              )}
            </div>

            {/* Beneficiary */}
            <div>
              <label className="input-label flex items-center gap-2">
                <Users className="w-4 h-4" />
                Beneficiary Address
                <span className="text-slate-500 text-xs">(who can claim tokens)</span>
              </label>
              <input
                type="text"
                name="beneficiary"
                value={formData.beneficiary}
                onChange={handleChange}
                placeholder={userAddress || "Leave empty to use your address"}
                className="input-field font-mono text-sm md:text-base"
              />
              {!formData.beneficiary && userAddress && (
                <p className="text-xs text-slate-500 mt-1">
                  Using your wallet: {userAddress.slice(0, 10)}...{userAddress.slice(-8)}
                </p>
              )}
            </div>

            {/* Principal Amount & Unlock Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Principal Amount</label>
                <input
                  type="text"
                  name="principalAmount"
                  value={formData.principalAmount}
                  onChange={handleChange}
                  placeholder="1000"
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

            {/* Rewards Section */}
            <div className="border border-green-500/30 rounded-xl p-4 bg-green-500/5">
              <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Reward Settings (Optional)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Daily ROI Rate (%)</label>
                  <input
                    type="text"
                    name="dailyRewardRate"
                    value={formData.dailyRewardRate}
                    onChange={handleChange}
                    placeholder="0.5 (= 0.5% per day)"
                    className="input-field"
                  />
                  {formData.dailyRewardRate && (
                    <p className="text-xs text-green-400 mt-1">
                      ≈ {calculateAPR().toFixed(2)}% APR
                    </p>
                  )}
                </div>
                <div>
                  <label className="input-label">Total Reward Pool</label>
                  <input
                    type="text"
                    name="rewardAmount"
                    value={formData.rewardAmount}
                    onChange={handleChange}
                    placeholder="100 (tokens to distribute)"
                    className="input-field"
                  />
                  {calculateEstimatedRewards() > 0 && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Est. rewards: {calculateEstimatedRewards().toFixed(4)} {tokenSymbol}
                    </p>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-slate-500 mt-2">
                💡 Rewards accrue daily from the reward pool based on principal × daily rate
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="input-label">Description (optional)</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., Team vesting, LP lock, Staking rewards..."
                className="input-field"
              />
            </div>

            {/* Advanced Settings */}
            <div className="border border-slate-600/50 rounded-xl">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-3 flex items-center justify-between text-slate-400 hover:text-white"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Settings className="w-4 h-4" />
                  Advanced Settings
                </span>
                <span className="text-xs">{showAdvanced ? '▲' : '▼'}</span>
              </button>
              
              {showAdvanced && (
                <div className="p-4 pt-0 space-y-4">
                  {/* Admin Unlock Control */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="adminCanUnlock"
                      name="adminCanUnlock"
                      checked={formData.adminCanUnlock}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-slate-600"
                    />
                    <label htmlFor="adminCanUnlock" className="text-sm text-slate-400">
                      <span className="text-white">Allow Admin Emergency Unlock</span>
                      <br />
                      <span className="text-xs">Contract owner can force unlock anytime</span>
                    </label>
                  </div>

                  {/* Unlock Recipient */}
                  <div>
                    <label className="input-label">Who Receives Tokens on Unlock</label>
                    <select
                      name="unlockRecipient"
                      value={formData.unlockRecipient}
                      onChange={handleChange}
                      className="input-field"
                    >
                      <option value={UnlockRecipient.Beneficiary}>Beneficiary (default)</option>
                      <option value={UnlockRecipient.Creator}>Creator (return to me)</option>
                      <option value={UnlockRecipient.Admin}>Admin Wallet</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      {Number(formData.unlockRecipient) === UnlockRecipient.Beneficiary && "Tokens go to the beneficiary when unlocked"}
                      {Number(formData.unlockRecipient) === UnlockRecipient.Creator && "Tokens return to you when unlocked (useful for vesting)"}
                      {Number(formData.unlockRecipient) === UnlockRecipient.Admin && "Tokens go to admin/platform wallet"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="stat-card p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Principal</span>
                <span className="text-white">{formData.principalAmount || '0'} {tokenSymbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Reward Pool</span>
                <span className="text-green-400">+{formData.rewardAmount || '0'} {tokenSymbol}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                <span className="text-slate-400">Total to Deposit</span>
                <span className="text-white font-bold">{totalAmount.toLocaleString()} {tokenSymbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Lock Fee</span>
                <span className="text-white">0.01 RAMA</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={approveTokens}
                disabled={isProcessing || !needsApproval || totalAmount <= 0}
                className={`flex-1 flex items-center justify-center gap-2 ${
                  needsApproval && totalAmount > 0
                    ? 'btn-primary'
                    : 'btn-secondary opacity-50 cursor-not-allowed'
                }`}
              >
                {isApproving || isApproveConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isApproving ? 'Confirm...' : 'Approving...'}
                  </>
                ) : !needsApproval && totalAmount > 0 ? (
                  <>✓ Approved</>
                ) : (
                  <>1. Approve {tokenSymbol || 'Tokens'}</>
                )}
              </button>

              {!needsApproval && totalAmount > 0 && (
                <button
                  onClick={createLock}
                  disabled={isProcessing || !isConnected}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 !bg-green-500 hover:!bg-green-600"
                >
                  {isLocking || isLockConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isLocking ? 'Confirm...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      2. Create Lock
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My Created Locks */}
      {activeTab === 'myLocks' && (
        <div className="space-y-4">
          {myCreatedLocks.length === 0 ? (
            <div className="glass-card p-8 md:p-12 text-center">
              <Lock className="w-10 h-10 md:w-12 md:h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 text-sm md:text-base">No locks created yet</p>
              <button
                onClick={() => setActiveTab('create')}
                className="btn-primary mt-4"
              >
                Create Your First Lock
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {myCreatedLocks.map((lock) => (
                <LockCard 
                  key={lock.id.toString()} 
                  lock={lock} 
                  isUnlockable={isUnlockable(lock)}
                  canUnlock={canUserUnlock(lock)}
                  onUnlock={() => unlockTokens(lock.id)}
                  isUnlocking={isUnlocking || isUnlockConfirming}
                  formatDate={formatDate}
                  decimals={18}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Claimable Locks (where user is beneficiary) */}
      {activeTab === 'claimable' && (
        <div className="space-y-4">
          {/* Info banner for beneficiaries */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <p className="text-sm text-purple-400 flex items-center gap-2">
              <Gift className="w-4 h-4" />
              These are tokens that others have locked for you. When the unlock date arrives, you can claim them.
            </p>
          </div>
          
          {myClaimableLocks.length === 0 ? (
            <div className="glass-card p-8 md:p-12 text-center">
              <Gift className="w-10 h-10 md:w-12 md:h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 text-sm md:text-base">No claimable locks found</p>
              <p className="text-xs text-slate-500 mt-2">
                When someone locks tokens for you, they will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {myClaimableLocks.map((lock) => (
                <LockCard 
                  key={lock.id.toString()} 
                  lock={lock}
                  isUnlockable={isUnlockable(lock)}
                  canUnlock={canUserUnlock(lock)}
                  onUnlock={() => unlockTokens(lock.id)}
                  isUnlocking={isUnlocking || isUnlockConfirming}
                  formatDate={formatDate}
                  decimals={18}
                  showCreator={true}
                />
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

// Lock Card Component
interface LockCardProps {
  lock: LockInfo
  isUnlockable: boolean
  canUnlock: boolean
  onUnlock: () => void
  isUnlocking: boolean
  formatDate: (ts: bigint) => string
  decimals: number
  showCreator?: boolean // Show who created this lock
}

function LockCard({ 
  lock, 
  isUnlockable, 
  canUnlock, 
  onUnlock, 
  isUnlocking, 
  formatDate,
  decimals,
  showCreator = false,
}: LockCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Math.floor(Date.now() / 1000))
  
  const dailyRate = Number(lock.dailyRewardRate) / 100
  const apr = dailyRate * 365
  const principal = Number(formatUnits(lock.principalAmount, decimals))
  const totalRewards = Number(formatUnits(lock.rewardAmount, decimals))
  const accruedRewards = Number(formatUnits(lock.accruedRewards, decimals))
  
  // Calculate pending rewards
  const unlockTimestamp = Number(lock.unlockTime)
  const lockTimestamp = Number(lock.lockTime)
  const totalLockDays = Math.ceil((unlockTimestamp - lockTimestamp) / 86400)
  const elapsedDays = Math.min(totalLockDays, Math.floor((currentTimestamp - lockTimestamp) / 86400))
  
  const pendingRewards = Math.min(
    (principal * (Number(lock.dailyRewardRate) / 10000) * elapsedDays),
    totalRewards - accruedRewards
  )
  
  const estimatedTotal = accruedRewards + Math.max(0, pendingRewards)
  const totalClaimable = principal + estimatedTotal

  // Update time remaining every minute
  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = Math.floor(Date.now() / 1000)
      setCurrentTimestamp(now)
      const remaining = unlockTimestamp - now
      
      if (remaining <= 0) {
        setTimeRemaining('Ready to claim!')
        return
      }
      
      const days = Math.floor(remaining / 86400)
      const hours = Math.floor((remaining % 86400) / 3600)
      const minutes = Math.floor((remaining % 3600) / 60)
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`)
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`)
      } else {
        setTimeRemaining(`${minutes}m remaining`)
      }
    }
    
    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [unlockTimestamp])

  const getRecipientLabel = (recipient: number) => {
    switch (recipient) {
      case 0: return 'Beneficiary'
      case 1: return 'Creator'
      case 2: return 'Admin'
      default: return 'Unknown'
    }
  }

  return (
    <div className="glass-card p-4 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`p-2 md:p-3 rounded-xl ${
            isUnlockable ? 'bg-green-500/20' : 'bg-blue-500/20'
          }`}>
            {isUnlockable ? (
              <Unlock className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
            ) : (
              <Lock className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm md:text-base">
              {lock.description || 'Staking Lock'}
            </h3>
            <p className="text-xs text-slate-500 font-mono truncate max-w-[120px] sm:max-w-none">
              {lock.token.slice(0, 10)}...{lock.token.slice(-8)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`badge ${isUnlockable ? 'badge-new' : 'badge-chain'}`}>
            {isUnlockable ? 'UNLOCKABLE' : 'LOCKED'}
          </span>
          {dailyRate > 0 && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {apr.toFixed(2)}% APR
            </span>
          )}
        </div>
      </div>

      {/* Time Remaining Banner */}
      {!isUnlockable && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 mb-4 text-center">
          <p className="text-sm text-blue-400 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            {timeRemaining}
          </p>
        </div>
      )}

      {/* Ready to Claim Banner */}
      {isUnlockable && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 mb-4 text-center">
          <p className="text-sm text-green-400 font-semibold">🎉 Ready to claim your tokens!</p>
        </div>
      )}

      {/* Creator Info (for beneficiaries) */}
      {showCreator && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 mb-4">
          <p className="text-xs text-purple-400 flex items-center gap-2">
            <Users className="w-3 h-3" />
            Locked by: {lock.creator.slice(0, 8)}...{lock.creator.slice(-6)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-500">Principal</p>
          <p className="text-base md:text-lg font-semibold text-white">
            {principal.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Unlock Date</p>
          <div className="flex items-center gap-1 md:gap-2">
            <Clock className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
            <p className="text-base md:text-lg font-semibold text-white">{formatDate(lock.unlockTime)}</p>
          </div>
        </div>
      </div>

      {/* Rewards Info */}
      {dailyRate > 0 && (
        <div className="bg-green-500/10 rounded-lg p-3 mb-4 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Reward Pool</span>
            <span className="text-white">{totalRewards.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Accrued Rewards</span>
            <span className="text-green-400">+{estimatedTotal.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Daily Rate</span>
            <span className="text-white">{dailyRate.toFixed(2)}%</span>
          </div>
          <div className="border-t border-green-500/30 pt-1 mt-1 flex justify-between text-xs">
            <span className="text-green-400 font-semibold">Total Claimable</span>
            <span className="text-green-400 font-semibold">{totalClaimable.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Total Claimable for non-reward locks */}
      {dailyRate === 0 && (
        <div className="bg-slate-700/30 rounded-lg p-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Claimable</span>
            <span className="text-white font-semibold">{principal.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div className="flex items-center gap-1 text-slate-500">
          <Users className="w-3 h-3" />
          <span>To: {lock.beneficiary.slice(0, 6)}...{lock.beneficiary.slice(-4)}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Wallet className="w-3 h-3" />
          <span>Pays: {getRecipientLabel(lock.unlockRecipient)}</span>
        </div>
        {lock.adminCanUnlock && (
          <div className="flex items-center gap-1 text-yellow-500 col-span-2">
            <Shield className="w-3 h-3" />
            <span>Admin can force unlock</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {canUnlock && (
          <button 
            onClick={onUnlock}
            disabled={isUnlocking}
            className="flex-1 btn-primary flex items-center justify-center gap-2 !bg-green-500 hover:!bg-green-600"
          >
            {isUnlocking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Unlock className="w-5 h-5" />
            )}
            Claim Tokens
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
  )
}
