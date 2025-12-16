# 🔧 RamaScanTool

A comprehensive blockchain developer toolkit built for **Ramestta Network** - the next-generation Layer 1 blockchain.

![RamaScanTool](https://img.shields.io/badge/Ramestta-Network-00D4FF?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite)

## 🌟 Features

### 💼 Wallet Tools
- **Wallets Manage** - Manage multiple wallets in one place
- **Batch Wallet Generate** - Generate multiple wallets at once
- **Batch Check Balance** - Check balances of multiple wallets
- **Approval Checker** - Check and revoke RAMA-20 token approvals
- **Vanity Address Generator** - Generate custom wallet addresses

### 🪙 Token Tools (RAMA-20 Standard)
- **Create Token** - Deploy RAMA-20 tokens on Ramestta Network
- **Token MultiSender** - Send tokens to multiple addresses in one transaction
- **Token Batch Collection** - Collect tokens from multiple wallets
- **Token Locker** - Lock tokens for vesting, LP locks, or team tokens
- **Token Admin Panel** - Manage token settings and ownership

### 📈 Trading Tools
- **Market Maker - Batch Swap** - Execute batch swap operations on RamaSwap
- **Batch Swap** - Swap tokens across multiple wallets
- **Anti-MEV Volume Bot** - Protected volume generation

### 🎨 NFT Tools (RAMA-721 Standard)
- **NFT MultiSender** - Send NFTs to multiple addresses
- **NFT Batch Minter** - Mint NFT collections in batches
- **NFT Metadata Manager** - Manage and update NFT metadata

### 📊 Analytics
- **Gas Price Tracker** - Real-time gas prices on Ramestta
- **Token Holders** - Analyze token holder distribution
- **Contract Explorer** - Explore and verify smart contracts

### 🔧 Utilities
- **RPC Server Manager** - Manage custom RPC endpoints
- **Hex Converter** - Convert between hex, decimal, and other formats
- **Contract Audit** - Basic security audit for smart contracts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/obidua/RamaScanTool.git

# Navigate to project directory
cd RamaScanTool

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

## ⛓️ Supported Networks

| Network | Status | Chain ID |
|---------|--------|----------|
| **Ramestta** | 🟢 LIVE | 1370 |
| Ethereum | 🟡 Coming Soon | 1 |
| BNB Chain | 🟡 Coming Soon | 56 |
| Polygon | 🟡 Coming Soon | 137 |
| Arbitrum | 🟡 Coming Soon | 42161 |
| Base | 🟡 Coming Soon | 8453 |
| Avalanche | 🟡 Coming Soon | 43114 |
| Optimism | 🟡 Coming Soon | 10 |
| Fantom | 🟡 Coming Soon | 250 |

## 🔗 Ramestta Network Details

| Property | Value |
|----------|-------|
| **Network Name** | Ramestta Mainnet |
| **Chain ID** | 1370 |
| **Currency Symbol** | RAMA |
| **RPC URL** | https://blockchain.ramestta.com |
| **Block Explorer** | https://ramascan.com |
| **Token Standard** | RAMA-20 |
| **NFT Standard** | RAMA-721 |

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite 7
- **Styling**: TailwindCSS 3.4
- **Web3**: wagmi, viem, RainbowKit
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
RamaScanTool/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── config/           # Configuration files
│   │   ├── wagmi.ts      # Chain & wallet config
│   │   └── tools.ts      # Tool definitions
│   ├── pages/            # Page components
│   │   ├── Dashboard.tsx
│   │   ├── wallet/       # Wallet tools
│   │   ├── token/        # Token tools
│   │   ├── trading/      # Trading tools
│   │   ├── nft/          # NFT tools
│   │   ├── analytics/    # Analytics tools
│   │   └── utilities/    # Utility tools
│   ├── App.tsx           # Main app with routes
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## 🎨 Branding

RamaScanTool uses Ramestta official brand colors:
- **Primary**: Cyan (#00D4FF)
- **Secondary**: Blue (#0EA5E9)
- **Background**: Dark Slate (#0f172a)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m Add some AmazingFeature)
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- **Ramestta Network**: https://ramestta.com
- **Block Explorer**: https://ramascan.com
- **Documentation**: https://docs.ramestta.com

---

Built with ❤️ for the Ramestta ecosystem
