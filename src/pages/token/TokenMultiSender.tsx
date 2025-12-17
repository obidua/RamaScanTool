import { useState, useEffect } from 'react'
import { Send, Upload, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'
import { CONTRACT_ADDRESSES, getTxUrl } from '../../config/contracts'
import { MultiSenderABI, ERC20ABI } from '../../config/abis'

interface Recipient {
  address: string
  amount: string
  valid: boolean
}

export default function TokenMultiSender() {
  const { isConnected, address: userAddress } = useAccount()
  const [tokenAddress, setTokenAddress] = useState('')
  const [recipients, setRecipients] = useState('')
  const [selectedChain, setSelectedChain] = useState('1370')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [needsApproval, setNeedsApproval] = useState(false)

  // Read token info
  const { data: tokenName } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'name',
    query: { enabled: isAddress(tokenAddress) },
  })

  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'symbol',
    query: { enabled: isAddress(tokenAddress) },
  })

  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'decimals',
    query: { enabled: isAddress(tokenAddress) },
  })

  const { data: tokenBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: isAddress(tokenAddress) && !!userAddress },
  })

  const { data: allowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, CONTRACT_ADDRESSES.MultiSender as `0x${string}`] : undefined,
    query: { enabled: isAddress(tokenAddress) && !!userAddress },
  })

  // Contract write hooks
  const { data: approveHash, writeContract: writeApprove, isPending: isApproving } = useWriteContract()
  const { data: sendHash, writeContract: writeSend, isPending: isSending } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const { isLoading: isSendConfirming, isSuccess: sendSuccess } = useWaitForTransactionReceipt({
    hash: sendHash,
  })

  // Parse recipients from textarea
  const parseRecipients = (): Recipient[] => {
    return recipients
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
        const addr = parts[0] || ''
        const amount = parts[1] || '0'
        return { 
          address: addr, 
          amount, 
          valid: isAddress(addr) && parseFloat(amount) > 0 
        }
      })
  }

  const parsedRecipients = parseRecipients()
  const validRecipients = parsedRecipients.filter(r => r.valid)
  const totalAmount = validRecipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
  const decimals = tokenDecimals ?? 18

  // Check if approval is needed
  useEffect(() => {
    if (allowance !== undefined && totalAmount > 0) {
      const totalInWei = parseUnits(totalAmount.toString(), decimals)
      setNeedsApproval(allowance < totalInWei)
    }
  }, [allowance, totalAmount, decimals])

  // Handle approval success
  useEffect(() => {
    if (approveSuccess) {
      toast.success('Token approved! Now you can send.')
      setNeedsApproval(false)
    }
  }, [approveSuccess])

  // Handle send success
  useEffect(() => {
    if (sendSuccess && sendHash) {
      setTxHash(sendHash)
      toast.success('Tokens sent successfully!')
    }
  }, [sendSuccess, sendHash])

  const approveTokens = async () => {
    if (!isAddress(tokenAddress)) {
      toast.error('Invalid token address')
      return
    }

    try {
      const totalInWei = parseUnits(totalAmount.toString(), decimals)
      writeApprove({
        address: tokenAddress as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.MultiSender as `0x${string}`, totalInWei * 2n], // Approve 2x for safety
      })
    } catch (error) {
      console.error('Approve error:', error)
      toast.error('Failed to approve tokens')
    }
  }

  const sendTokens = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!isAddress(tokenAddress)) {
      toast.error('Please enter a valid token address')
      return
    }

    if (validRecipients.length === 0) {
      toast.error('Please enter valid recipients')
      return
    }

    if (needsApproval) {
      toast.error('Please approve tokens first')
      return
    }

    try {
      const addresses = validRecipients.map(r => r.address as `0x${string}`)
      const amounts = validRecipients.map(r => parseUnits(r.amount, decimals))

      writeSend({
        address: CONTRACT_ADDRESSES.MultiSender as `0x${string}`,
        abi: MultiSenderABI,
        functionName: 'sendTokens',
        args: [tokenAddress as `0x${string}`, addresses, amounts],
      })
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Failed to send tokens')
    }
  }

  const isProcessing = isApproving || isApproveConfirming || isSending || isSendConfirming

  return (
    <div className="space-y-4 md:space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Token MultiSender</h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Send tokens to multiple addresses in one transaction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="input-label">Token Address</label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-field font-mono"
                />
                {tokenSymbol && tokenName && (
                  <p className="text-sm text-green-400 mt-1">
                    ✓ {tokenName} ({tokenSymbol})
                  </p>
                )}
              </div>
              <NetworkSelector
                label="Network"
                value={selectedChain}
                onChange={setSelectedChain}
              />
            </div>

            <div>
              <label className="input-label">Recipients (address, amount - one per line)</label>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="0x1234...5678, 100&#10;0xabcd...efgh, 250&#10;0x9876...5432, 500"
                rows={10}
                className="input-field resize-none font-mono text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              <button className="btn-secondary flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
              
              {needsApproval && validRecipients.length > 0 && (
                <button
                  onClick={approveTokens}
                  disabled={isProcessing}
                  className="btn-secondary flex items-center gap-2"
                >
                  {isApproving || isApproveConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isApproving ? 'Confirm...' : 'Approving...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Approve {tokenSymbol || 'Tokens'}
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={sendTokens}
                disabled={isProcessing || !isConnected || needsApproval || validRecipients.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                {isSending || isSendConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isSending ? 'Confirm...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Tokens
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Recipients</p>
                <p className="text-2xl font-bold text-white">{validRecipients.length}</p>
                {parsedRecipients.length > validRecipients.length && (
                  <p className="text-xs text-yellow-400">
                    {parsedRecipients.length - validRecipients.length} invalid
                  </p>
                )}
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Total Amount</p>
                <p className="text-2xl font-bold text-blue-400">
                  {totalAmount.toLocaleString()} {tokenSymbol || ''}
                </p>
              </div>
              {tokenBalance !== undefined && (
                <div className="stat-card">
                  <p className="text-sm text-slate-400">Your Balance</p>
                  <p className="text-xl font-bold text-white">
                    {Number(formatUnits(tokenBalance, decimals)).toLocaleString()} {tokenSymbol || ''}
                  </p>
                </div>
              )}
              <div className="stat-card">
                <p className="text-sm text-slate-400">Service Fee</p>
                <p className="text-xl font-bold text-white">FREE</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 border-green-500/30 bg-green-500/5">
            <p className="text-green-400 text-sm">
              💡 <strong>Tip:</strong> MultiSender saves up to 80% on gas compared to individual transfers.
            </p>
          </div>
        </div>
      </div>

      {/* Success Result */}
      {txHash && (
        <div className="glass-card p-6 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Tokens Sent Successfully! 🎉</h2>
          <p className="text-slate-400 mb-4">
            Sent {totalAmount.toLocaleString()} {tokenSymbol} to {validRecipients.length} recipients
          </p>
          <a
            href={getTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View on Ramascan
          </a>
        </div>
      )}

      {/* Validation errors */}
      {parsedRecipients.length > 0 && parsedRecipients.some(r => !r.valid) && (
        <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">Some entries are invalid</p>
              <ul className="text-sm text-slate-400 mt-1">
                {parsedRecipients.map((r, i) => !r.valid && (
                  <li key={i}>Line {i + 1}: {r.address ? (isAddress(r.address) ? 'Invalid amount' : 'Invalid address') : 'Empty line'}</li>
                )).filter(Boolean).slice(0, 5)}
                {parsedRecipients.filter(r => !r.valid).length > 5 && (
                  <li>...and {parsedRecipients.filter(r => !r.valid).length - 5} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
