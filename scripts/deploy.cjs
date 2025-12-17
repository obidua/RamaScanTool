const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n🚀 Starting Deployment of RamaScan Tool Contracts...\n');

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} RAMA\n`);

  const network = await hre.ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

  console.log('─'.repeat(60));
  console.log('📋 DEPLOYMENT PLAN');
  console.log('─'.repeat(60));
  console.log('1. Deploy RAMA20Factory (Token Creation)');
  console.log('2. Deploy MultiSender (Batch Transfers)');
  console.log('3. Deploy TokenLocker (Token Locking)');
  console.log('4. Deploy RAMA721Factory (NFT Creation)');
  console.log('─'.repeat(60));
  console.log();

  const deployedContracts = {};

  // 1. Deploy RAMA20Factory
  console.log('1️⃣  Deploying RAMA20Factory...');
  const RAMA20Factory = await hre.ethers.getContractFactory('RAMA20Factory');
  const rama20Factory = await RAMA20Factory.deploy();
  await rama20Factory.waitForDeployment();
  const rama20FactoryAddr = await rama20Factory.getAddress();
  console.log(`   ✅ RAMA20Factory deployed: ${rama20FactoryAddr}\n`);
  deployedContracts.RAMA20Factory = rama20FactoryAddr;

  // 2. Deploy MultiSender
  console.log('2️⃣  Deploying MultiSender...');
  const MultiSender = await hre.ethers.getContractFactory('MultiSender');
  const multiSender = await MultiSender.deploy();
  await multiSender.waitForDeployment();
  const multiSenderAddr = await multiSender.getAddress();
  console.log(`   ✅ MultiSender deployed: ${multiSenderAddr}\n`);
  deployedContracts.MultiSender = multiSenderAddr;

  // 3. Deploy TokenLocker
  console.log('3️⃣  Deploying TokenLocker...');
  const TokenLocker = await hre.ethers.getContractFactory('TokenLocker');
  const tokenLocker = await TokenLocker.deploy();
  await tokenLocker.waitForDeployment();
  const tokenLockerAddr = await tokenLocker.getAddress();
  console.log(`   ✅ TokenLocker deployed: ${tokenLockerAddr}\n`);
  deployedContracts.TokenLocker = tokenLockerAddr;

  // 4. Deploy RAMA721Factory
  console.log('4️⃣  Deploying RAMA721Factory...');
  const RAMA721Factory = await hre.ethers.getContractFactory('RAMA721Factory');
  const rama721Factory = await RAMA721Factory.deploy();
  await rama721Factory.waitForDeployment();
  const rama721FactoryAddr = await rama721Factory.getAddress();
  console.log(`   ✅ RAMA721Factory deployed: ${rama721FactoryAddr}\n`);
  deployedContracts.RAMA721Factory = rama721FactoryAddr;

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployedContracts,
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const filename = `deployment-${timestamp}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  
  // Also save to a standard location for frontend
  const latestDeployment = path.join(deploymentsDir, 'latest.json');
  fs.writeFileSync(latestDeployment, JSON.stringify(deploymentInfo, null, 2));

  // Create frontend config
  const frontendConfig = `// Auto-generated contract addresses - DO NOT EDIT MANUALLY
// Generated: ${deploymentInfo.timestamp}
// Network: Ramestta (Chain ID: 1370)

export const CONTRACT_ADDRESSES = {
  RAMA20Factory: '${rama20FactoryAddr}',
  MultiSender: '${multiSenderAddr}',
  TokenLocker: '${tokenLockerAddr}',
  RAMA721Factory: '${rama721FactoryAddr}',
} as const;

export const DEPLOYER = '${deployer.address}';
export const DEPLOYMENT_TIME = '${deploymentInfo.timestamp}';
`;

  const frontendConfigPath = path.join(__dirname, '..', 'src', 'config', 'contracts.ts');
  fs.writeFileSync(frontendConfigPath, frontendConfig);

  console.log('─'.repeat(60));
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('─'.repeat(60));
  console.log();
  console.log('📝 Contract Addresses:');
  console.log(`   RAMA20Factory:  ${rama20FactoryAddr}`);
  console.log(`   MultiSender:    ${multiSenderAddr}`);
  console.log(`   TokenLocker:    ${tokenLockerAddr}`);
  console.log(`   RAMA721Factory: ${rama721FactoryAddr}`);
  console.log();
  console.log(`💾 Deployment saved to: ${filename}`);
  console.log(`💾 Frontend config updated: src/config/contracts.ts`);
  console.log();
  console.log('🎯 Next Steps:');
  console.log('   1. Run verification: npm run verify:ramestta');
  console.log('   2. Test contracts on Ramascan');
  console.log('   3. Update frontend to use contracts');
  console.log('─'.repeat(60));
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
