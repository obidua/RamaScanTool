import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import Dashboard from './pages/Dashboard'
import WalletManage from './pages/wallet/WalletManage'
import BatchWalletGenerate from './pages/wallet/BatchWalletGenerate'
import BatchCheckBalance from './pages/wallet/BatchCheckBalance'
import ApprovalChecker from './pages/wallet/ApprovalChecker'
import VanityAddressGenerator from './pages/wallet/VanityAddressGenerator'
import CreateToken from './pages/token/CreateToken'
import TokenMultiSender from './pages/token/TokenMultiSender'
import TokenBatchCollection from './pages/token/TokenBatchCollection'
import TokenLocker from './pages/token/TokenLocker'
import StakingLocker from './pages/token/StakingLocker'
import TokenAdminPanel from './pages/token/TokenAdminPanel'
import MarketMaker from './pages/trading/MarketMaker'
import BatchSwap from './pages/trading/BatchSwap'
import VolumeBot from './pages/trading/VolumeBot'
import CreateNFT from './pages/nft/CreateNFT'
import NFTMultiSender from './pages/nft/NFTMultiSender'
import NFTBatchCollection from './pages/nft/NFTBatchCollection'
import GasPrice from './pages/analytics/GasPrice'
import TokenHolders from './pages/analytics/TokenHolders'
import Explorer from './pages/analytics/Explorer'
import RPCServer from './pages/utilities/RPCServer'
import HexConverter from './pages/utilities/HexConverter'
import ContractAudit from './pages/utilities/ContractAudit'
import ChainTools from './pages/ChainTools'

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        
        {/* Wallet Tools */}
        <Route path="wallet">
          <Route path="manage" element={<WalletManage />} />
          <Route path="batch-generate" element={<BatchWalletGenerate />} />
          <Route path="batch-balance" element={<BatchCheckBalance />} />
          <Route path="batch-check-balance" element={<BatchCheckBalance />} />
          <Route path="approval-checker" element={<ApprovalChecker />} />
          <Route path="vanity-generator" element={<VanityAddressGenerator />} />
        </Route>

        {/* Token Tools */}
        <Route path="token">
          <Route path="create" element={<CreateToken />} />
          <Route path="multi-sender" element={<TokenMultiSender />} />
          <Route path="batch-collection" element={<TokenBatchCollection />} />
          <Route path="locker" element={<TokenLocker />} />
          <Route path="staking-locker" element={<StakingLocker />} />
          <Route path="admin" element={<TokenAdminPanel />} />
        </Route>

        {/* Trading Tools */}
        <Route path="trading">
          <Route path="market-maker" element={<MarketMaker />} />
          <Route path="batch-swap" element={<BatchSwap />} />
          <Route path="volume-bot" element={<VolumeBot />} />
        </Route>

        {/* NFT Tools */}
        <Route path="nft">
          <Route path="create" element={<CreateNFT />} />
          <Route path="multi-sender" element={<NFTMultiSender />} />
          <Route path="batch-collection" element={<NFTBatchCollection />} />
        </Route>

        {/* Analytics */}
        <Route path="analytics">
          <Route path="gas" element={<GasPrice />} />
          <Route path="holders" element={<TokenHolders />} />
          <Route path="explorer" element={<Explorer />} />
        </Route>

        {/* Utilities */}
        <Route path="utilities">
          <Route path="rpc" element={<RPCServer />} />
          <Route path="hex" element={<HexConverter />} />
          <Route path="audit" element={<ContractAudit />} />
        </Route>

        {/* Chain Specific Tools */}
        <Route path="chain/:chainId" element={<ChainTools />} />
      </Route>
    </Routes>
    </>
  )
}

export default App
