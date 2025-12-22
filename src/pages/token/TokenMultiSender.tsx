import { useState, useEffect, useRef } from 'react'
import { Send, Upload, Loader2, Check, AlertCircle, ExternalLink, Coins, Trash2, FileText, Copy, Clock, Wallet, ArrowRight, Download } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi'
import { parseUnits, formatUnits, isAddress, parseEther, formatEther } from 'viem'
import toast from 'react-hot-toast'
import BackButton from '../../components/BackButton'
import NetworkSelector from '../../components/NetworkSelector'
import { CONTRACT_ADDRESSES, getTxUrl, getContractUrl } from '../../config/contracts'
import { MultiSenderABI, ERC20ABI } from '../../config/abis'

interface Recipient {
  address: string
  amount: string
  valid: boolean
}

type SendMode = 'token' | 'native'

interface TransactionReport {
  txHash: string
  mode: SendMode
  tokenAddress?: string
  tokenSymbol?: string
  totalAmount: number
  recipientCount: number
  serviceFee: number
  gasUsed?: string
  timestamp: Date
  balanceBefore: string
  balanceAfter?: string
  recipients: Recipient[]
}

export default function TokenMultiSender() {
  const { isConnected, address: userAddress } = useAccount()
  const [sendMode, setSendMode] = useState<SendMode>('token')
  const [tokenAddress, setTokenAddress] = useState('')
  const [recipients, setRecipients] = useState('')
  const [selectedChain, setSelectedChain] = useState('1370')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [needsApproval, setNeedsApproval] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [txReport, setTxReport] = useState<TransactionReport | null>(null)
  const [balanceBeforeTx, setBalanceBeforeTx] = useState<string>('')

  // Native RAMA balance
  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address: userAddress,
  })

  // Read service fee from contract
  const { data: serviceFee } = useReadContract({
    address: CONTRACT_ADDRESSES.MultiSender as `0x${string}`,
    abi: MultiSenderABI,
    functionName: 'serviceFee',
  })

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

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
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
  const decimals = sendMode === 'native' ? 18 : (tokenDecimals ?? 18)
  
  // Calculate service fee
  const feePerRecipient = serviceFee ? Number(formatEther(serviceFee)) : 0.0001
  const totalServiceFee = feePerRecipient * validRecipients.length
  const totalWithFee = sendMode === 'native' ? totalAmount + totalServiceFee : totalServiceFee

  // Check if user has enough balance
  const hasEnoughBalance = sendMode === 'native'
    ? nativeBalance && parseFloat(formatEther(nativeBalance.value)) >= totalWithFee
    : tokenBalance !== undefined && Number(formatUnits(tokenBalance, decimals)) >= totalAmount

  // Check if approval is needed (only for token mode)
  useEffect(() => {
    if (sendMode === 'token' && allowance !== undefined && totalAmount > 0) {
      const totalInWei = parseUnits(totalAmount.toString(), decimals)
      setNeedsApproval(allowance < totalInWei)
    } else if (sendMode === 'native') {
      setNeedsApproval(false)
    }
  }, [allowance, totalAmount, decimals, sendMode])

  // Handle approval success
  useEffect(() => {
    if (approveSuccess) {
      toast.success('Token approved! Now you can send.')
      setNeedsApproval(false)
    }
  }, [approveSuccess])

  // Handle send success - Create transaction report
  useEffect(() => {
    if (sendSuccess && sendHash) {
      setTxHash(sendHash)
      
      // Create transaction report
      const report: TransactionReport = {
        txHash: sendHash,
        mode: sendMode,
        tokenAddress: sendMode === 'token' ? tokenAddress : undefined,
        tokenSymbol: sendMode === 'native' ? 'RAMA' : (tokenSymbol as string) || 'Unknown',
        totalAmount,
        recipientCount: validRecipients.length,
        serviceFee: totalServiceFee,
        timestamp: new Date(),
        balanceBefore: balanceBeforeTx,
        recipients: [...validRecipients],
      }
      
      setTxReport(report)
      
      // Refetch balances after transaction
      setTimeout(() => {
        refetchNativeBalance()
        if (sendMode === 'token') {
          refetchTokenBalance()
        }
        // Update balance after in report
        if (sendMode === 'native' && nativeBalance) {
          setTxReport(prev => prev ? { ...prev, balanceAfter: formatEther(nativeBalance.value) } : null)
        }
      }, 2000)
      
      toast.success(sendMode === 'native' ? 'RAMA sent successfully!' : 'Tokens sent successfully!')
    }
  }, [sendSuccess, sendHash])

  // CSV Import handler
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        // Parse CSV - handle different formats
        const lines = text.split('\n').filter(line => line.trim())
        const parsed = lines.map(line => {
          // Remove quotes and split by comma or semicolon
          const cleaned = line.replace(/"/g, '').trim()
          const parts = cleaned.split(/[,;]/).map(s => s.trim())
          if (parts.length >= 2) {
            return `${parts[0]}, ${parts[1]}`
          }
          return ''
        }).filter(Boolean)
        
        setRecipients(prev => prev ? `${prev}\n${parsed.join('\n')}` : parsed.join('\n'))
        toast.success(`Imported ${parsed.length} recipients from CSV`)
      }
    }
    reader.readAsText(file)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Clear all recipients
  const clearRecipients = () => {
    setRecipients('')
    setTxHash(undefined)
  }

  // Copy sample format
  const copySampleFormat = () => {
    const sample = `0x1234567890123456789012345678901234567890, 100\n0xabcdefabcdefabcdefabcdefabcdefabcdefabcd, 250\n0x9876543210987654321098765432109876543210, 500`
    navigator.clipboard.writeText(sample)
    toast.success('Sample format copied to clipboard')
  }

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

    if (sendMode === 'token' && !isAddress(tokenAddress)) {
      toast.error('Please enter a valid token address')
      return
    }

    if (validRecipients.length === 0) {
      toast.error('Please enter valid recipients')
      return
    }

    if (sendMode === 'token' && needsApproval) {
      toast.error('Please approve tokens first')
      return
    }

    if (!hasEnoughBalance) {
      toast.error('Insufficient balance')
      return
    }

    // Save balance before transaction
    if (sendMode === 'native' && nativeBalance) {
      setBalanceBeforeTx(formatEther(nativeBalance.value))
    } else if (sendMode === 'token' && tokenBalance !== undefined) {
      setBalanceBeforeTx(formatUnits(tokenBalance, decimals))
    }

    try {
      const addresses = validRecipients.map(r => r.address as `0x${string}`)
      
      if (sendMode === 'native') {
        // Send native RAMA
        const amounts = validRecipients.map(r => parseEther(r.amount))
        const totalValue = parseEther(totalWithFee.toString())
        
        writeSend({
          address: CONTRACT_ADDRESSES.MultiSender as `0x${string}`,
          abi: MultiSenderABI,
          functionName: 'sendRAMA',
          args: [addresses, amounts],
          value: totalValue,
        })
      } else {
        // Send ERC20 tokens
        const amounts = validRecipients.map(r => parseUnits(r.amount, decimals))
        const feeValue = parseEther(totalServiceFee.toString())

        writeSend({
          address: CONTRACT_ADDRESSES.MultiSender as `0x${string}`,
          abi: MultiSenderABI,
          functionName: 'sendTokens',
          args: [tokenAddress as `0x${string}`, addresses, amounts],
          value: feeValue,
        })
      }
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Failed to send')
    }
  }

  const isProcessing = isApproving || isApproveConfirming || isSending || isSendConfirming
  const currentSymbol = sendMode === 'native' ? 'RAMA' : (tokenSymbol || 'Tokens')

  return (
    <div className="space-y-4 md:space-y-6">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Token MultiSender</h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Send tokens to multiple addresses in one transaction</p>
      </div>

      {/* Mode Toggle */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSendMode('token')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              sendMode === 'token'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Coins className="w-4 h-4" />
            ERC20 Token
          </button>
          <button
            onClick={() => setSendMode('native')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              sendMode === 'native'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Send className="w-4 h-4" />
            Native RAMA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {sendMode === 'token' ? (
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
              ) : (
                <div>
                  <label className="input-label">Sending</label>
                  <div className="input-field flex items-center gap-2 bg-slate-700/50">
                    <Coins className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Native RAMA</span>
                    <span className="text-green-400 ml-auto">
                      Balance: {nativeBalance ? parseFloat(formatEther(nativeBalance.value)).toFixed(4) : '0'} RAMA
                    </span>
                  </div>
                </div>
              )}
              <NetworkSelector
                label="Network"
                value={selectedChain}
                onChange={setSelectedChain}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="input-label mb-0">Recipients (address, amount - one per line)</label>
                <div className="flex gap-2">
                  <button
                    onClick={copySampleFormat}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    title="Copy sample format"
                  >
                    <Copy className="w-3 h-3" />
                    Sample
                  </button>
                  {recipients && (
                    <button
                      onClick={clearRecipients}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder={`0x1234567890123456789012345678901234567890, 100\n0xabcdefabcdefabcdefabcdefabcdefabcdefabcd, 250\n0x9876543210987654321098765432109876543210, 500`}
                rows={10}
                className="input-field resize-none font-mono text-sm"
              />
              {validRecipients.length > 0 && (
                <p className="text-sm text-green-400 mt-1">
                  ✓ {validRecipients.length} valid recipient{validRecipients.length !== 1 ? 's' : ''} detected
                </p>
              )}
            </div>

            {/* Hidden file input for CSV */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVImport}
              className="hidden"
            />

            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Import CSV
              </button>
              
              {/* Approve Button - Show in token mode with valid recipients */}
              {sendMode === 'token' && validRecipients.length > 0 && (
                <button
                  onClick={approveTokens}
                  disabled={isProcessing || !hasEnoughBalance || !needsApproval}
                  className={`flex items-center gap-2 ${
                    !needsApproval 
                      ? 'btn-secondary bg-green-500/20 border-green-500/50 text-green-400 cursor-default' 
                      : hasEnoughBalance 
                        ? 'btn-secondary' 
                        : 'btn-secondary opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isApproving || isApproveConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isApproving ? 'Confirm...' : 'Approving...'}
                    </>
                  ) : !needsApproval ? (
                    <>
                      <Check className="w-5 h-5 text-green-400" />
                      Approved
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Approve {tokenSymbol || 'Tokens'}
                    </>
                  )}
                </button>
              )}
              
              {/* Send Button */}
              <button
                onClick={sendTokens}
                disabled={isProcessing || !isConnected || (sendMode === 'token' && needsApproval) || validRecipients.length === 0 || !hasEnoughBalance}
                className={`flex items-center gap-2 ${
                  isProcessing || !isConnected || (sendMode === 'token' && needsApproval) || validRecipients.length === 0 || !hasEnoughBalance
                    ? 'btn-primary opacity-50 cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                {isSending || isSendConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isSending ? 'Confirm...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send {currentSymbol}
                  </>
                )}
              </button>
            </div>

            {/* Status Messages */}
            {sendMode === 'token' && validRecipients.length > 0 && (
              <div className="mt-4 space-y-2">
                {/* Step indicator for token sending */}
                {!hasEnoughBalance ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm">
                      Step 1: Insufficient balance. You need {totalAmount.toLocaleString()} {currentSymbol}
                    </span>
                  </div>
                ) : needsApproval ? (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 text-sm">
                      Step 1: Click "Approve {tokenSymbol || 'Tokens'}" to allow the contract to transfer your tokens
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 text-sm">
                      Step 2: Tokens approved! Click "Send {currentSymbol}" to complete the transfer
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Balance Warning for Native RAMA */}
            {sendMode === 'native' && validRecipients.length > 0 && !hasEnoughBalance && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-sm">
                  Insufficient balance. You need {totalAmount.toLocaleString()} {currentSymbol}
                  {` + ${totalServiceFee.toFixed(6)} RAMA for fees`}
                </span>
              </div>
            )}
          </div>

          {/* Recipient Preview Table */}
          {validRecipients.length > 0 && (
            <div className="glass-card p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Recipient Preview
                </h3>
                <span className="text-sm text-slate-400">
                  Showing {Math.min(validRecipients.length, 10)} of {validRecipients.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Address</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRecipients.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b border-slate-700/50 text-sm">
                        <td className="py-2 text-slate-400">{i + 1}</td>
                        <td className="py-2 font-mono text-slate-300">
                          {r.address.slice(0, 6)}...{r.address.slice(-4)}
                        </td>
                        <td className="py-2 text-right text-blue-400 font-medium">
                          {parseFloat(r.amount).toLocaleString()} {currentSymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validRecipients.length > 10 && (
                <p className="text-center text-sm text-slate-500 mt-3">
                  + {validRecipients.length - 10} more recipients...
                </p>
              )}
            </div>
          )}
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
                  {totalAmount.toLocaleString()} {currentSymbol}
                </p>
              </div>
              {sendMode === 'token' && tokenBalance !== undefined && (
                <div className="stat-card">
                  <p className="text-sm text-slate-400">Your Token Balance</p>
                  <p className={`text-xl font-bold ${hasEnoughBalance ? 'text-white' : 'text-red-400'}`}>
                    {Number(formatUnits(tokenBalance, decimals)).toLocaleString()} {tokenSymbol || ''}
                  </p>
                </div>
              )}
              {sendMode === 'native' && nativeBalance && (
                <div className="stat-card">
                  <p className="text-sm text-slate-400">Your RAMA Balance</p>
                  <p className={`text-xl font-bold ${hasEnoughBalance ? 'text-white' : 'text-red-400'}`}>
                    {parseFloat(formatEther(nativeBalance.value)).toFixed(4)} RAMA
                  </p>
                </div>
              )}
              <div className="stat-card">
                <p className="text-sm text-slate-400">Service Fee</p>
                <p className="text-xl font-bold text-white">
                  {validRecipients.length > 0 ? (
                    <span>{totalServiceFee.toFixed(6)} RAMA</span>
                  ) : (
                    <span className="text-green-400">{feePerRecipient} RAMA/recipient</span>
                  )}
                </p>
              </div>
              {sendMode === 'native' && validRecipients.length > 0 && (
                <div className="stat-card bg-blue-500/10 border-blue-500/30">
                  <p className="text-sm text-slate-400">Total Required</p>
                  <p className="text-xl font-bold text-blue-400">
                    {totalWithFee.toFixed(6)} RAMA
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    ({totalAmount.toLocaleString()} + {totalServiceFee.toFixed(6)} fee)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          {validRecipients.length > 0 && (
            <div className={`glass-card p-4 ${hasEnoughBalance ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center gap-2">
                {hasEnoughBalance ? (
                  <>
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">Ready to send</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm font-medium">Insufficient balance</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="glass-card p-4 border-blue-500/30 bg-blue-500/5">
            <p className="text-blue-400 text-sm">
              💡 <strong>Tip:</strong> MultiSender saves up to 80% on gas compared to individual transfers.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Report - Success Result */}
      {txHash && txReport && (
        <div className="glass-card p-6">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {txReport.mode === 'native' ? 'RAMA' : 'Tokens'} Sent Successfully! 🎉
            </h2>
            <p className="text-slate-400">
              Transaction confirmed on Ramestta Network
            </p>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Column - Transaction Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Transaction Details
              </h3>
              
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Transaction Hash</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-sm">
                      {txReport.txHash.slice(0, 10)}...{txReport.txHash.slice(-8)}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(txReport.txHash)
                        toast.success('Hash copied!')
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Timestamp</span>
                  <span className="text-white text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {txReport.timestamp.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Type</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                    {txReport.mode === 'native' ? 'Native RAMA Transfer' : 'ERC20 Token Transfer'}
                  </span>
                </div>
                
                {txReport.mode === 'token' && txReport.tokenAddress && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Token Contract</span>
                    <a
                      href={getContractUrl(txReport.tokenAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-mono text-sm flex items-center gap-1"
                    >
                      {txReport.tokenAddress.slice(0, 8)}...{txReport.tokenAddress.slice(-6)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">MultiSender Contract</span>
                  <a
                    href={getContractUrl(CONTRACT_ADDRESSES.MultiSender)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono text-sm flex items-center gap-1"
                  >
                    {CONTRACT_ADDRESSES.MultiSender.slice(0, 8)}...{CONTRACT_ADDRESSES.MultiSender.slice(-6)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column - Amount Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-400" />
                Amount Summary
              </h3>
              
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Recipients</span>
                  <span className="text-white font-bold text-lg">{txReport.recipientCount}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Total Sent</span>
                  <span className="text-green-400 font-bold text-lg">
                    {txReport.totalAmount.toLocaleString()} {txReport.tokenSymbol}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Service Fee</span>
                  <span className="text-yellow-400 text-sm">
                    {txReport.serviceFee.toFixed(6)} RAMA
                  </span>
                </div>
                
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Balance Before</span>
                    <span className="text-white text-sm">
                      {parseFloat(txReport.balanceBefore).toFixed(6)} {txReport.tokenSymbol}
                    </span>
                  </div>
                  
                  <div className="flex justify-center my-2">
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Balance After</span>
                    <span className="text-blue-400 text-sm font-medium">
                      {txReport.mode === 'native' && nativeBalance
                        ? parseFloat(formatEther(nativeBalance.value)).toFixed(6)
                        : txReport.mode === 'token' && tokenBalance !== undefined
                          ? parseFloat(formatUnits(tokenBalance, decimals)).toFixed(6)
                          : '...'
                      } {txReport.tokenSymbol}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recipients List */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Send className="w-5 h-5 text-purple-400" />
              Recipients ({txReport.recipients.length})
            </h3>
            
            <div className="bg-slate-800/50 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50 sticky top-0">
                    <tr className="text-left text-sm text-slate-400">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Recipient Address</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txReport.recipients.map((r, i) => (
                      <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/30 text-sm">
                        <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <a
                            href={getContractUrl(r.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                          >
                            {r.address.slice(0, 10)}...{r.address.slice(-8)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {parseFloat(r.amount).toLocaleString()} {txReport.tokenSymbol}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                            <Check className="w-3 h-3" />
                            Sent
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-slate-700">
            <a
              href={getTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View on Ramascan
            </a>
            <button
              onClick={() => {
                // Export report as JSON
                const reportData = {
                  ...txReport,
                  timestamp: txReport.timestamp.toISOString(),
                  balanceAfter: txReport.mode === 'native' && nativeBalance
                    ? formatEther(nativeBalance.value)
                    : txReport.mode === 'token' && tokenBalance !== undefined
                      ? formatUnits(tokenBalance, decimals)
                      : undefined
                }
                const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `multisend-report-${txReport.txHash.slice(0, 10)}.json`
                a.click()
                toast.success('Report downloaded!')
              }}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button
              onClick={() => {
                setTxHash(undefined)
                setTxReport(null)
                setRecipients('')
              }}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send More
            </button>
          </div>
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
