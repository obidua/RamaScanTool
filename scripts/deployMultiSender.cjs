const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n🚀 Deploying Updated MultiSender Contract...\n');

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} RAMA\n`);

  // Deploy MultiSender
  console.log('📦 Deploying MultiSender with new events...');
  const MultiSender = await hre.ethers.getContractFactory('MultiSender');
  const multiSender = await MultiSender.deploy();
  await multiSender.waitForDeployment();
  const multiSenderAddr = await multiSender.getAddress();
  console.log(`✅ MultiSender deployed: ${multiSenderAddr}\n`);

  // Update the contracts.ts file with the new address
  const contractsFilePath = path.join(__dirname, '..', 'src', 'config', 'contracts.ts');
  
  let contractsContent = fs.readFileSync(contractsFilePath, 'utf8');
  
  // Replace the old MultiSender address with the new one
  const oldAddressMatch = contractsContent.match(/MultiSender: '(0x[a-fA-F0-9]+)'/);
  if (oldAddressMatch) {
    console.log(`📝 Updating MultiSender address from ${oldAddressMatch[1]} to ${multiSenderAddr}`);
    contractsContent = contractsContent.replace(
      oldAddressMatch[0],
      `MultiSender: '${multiSenderAddr}'`
    );
    fs.writeFileSync(contractsFilePath, contractsContent);
    console.log('✅ contracts.ts updated!\n');
  }

  console.log('─'.repeat(60));
  console.log('🎉 DEPLOYMENT COMPLETE');
  console.log('─'.repeat(60));
  console.log(`New MultiSender Address: ${multiSenderAddr}`);
  console.log('─'.repeat(60));
  console.log('\n📋 New Events Added:');
  console.log('  • RAMATransfer - Individual RAMA transfer logs');
  console.log('  • TokenTransfer - Individual token transfer logs');
  console.log('  • NFTTransfer - Individual NFT transfer logs');
  console.log('  • FeeCollected - Fee collection logs');
  console.log('  • getStats() - View total statistics');
  console.log('─'.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
