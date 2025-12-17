const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n🔍 Verifying RamaScan Tool Contracts on Ramascan...\n');

  // Load deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployments', 'latest.json');
  if (!fs.existsSync(deploymentPath)) {
    console.log('❌ Deployment file not found! Run deploy script first.');
    return;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log(`📋 Network: ${deployment.network} (Chain ID: ${deployment.chainId})`);
  console.log(`📍 Deployer: ${deployment.deployer}`);
  console.log(`📅 Deployed: ${deployment.timestamp}\n`);

  // Contracts to verify
  const contracts = [
    {
      name: 'RAMA20Factory',
      address: deployment.contracts.RAMA20Factory,
      contract: 'contracts/RAMA20Factory.sol:RAMA20Factory',
      args: []
    },
    {
      name: 'MultiSender',
      address: deployment.contracts.MultiSender,
      contract: 'contracts/MultiSender.sol:MultiSender',
      args: []
    },
    {
      name: 'TokenLocker',
      address: deployment.contracts.TokenLocker,
      contract: 'contracts/TokenLocker.sol:TokenLocker',
      args: []
    },
    {
      name: 'RAMA721Factory',
      address: deployment.contracts.RAMA721Factory,
      contract: 'contracts/RAMA721Factory.sol:RAMA721Factory',
      args: []
    }
  ];

  console.log('════════════════════════════════════════════════════════════');
  console.log('VERIFYING CONTRACTS');
  console.log('════════════════════════════════════════════════════════════\n');

  let successCount = 0;
  let failCount = 0;
  const failedContracts = [];

  for (const contract of contracts) {
    console.log(`📝 Verifying ${contract.name}...`);
    console.log(`   Address: ${contract.address}`);

    try {
      const command = `npx hardhat verify --network ramestta --config hardhat.config.cjs ${contract.address}`;
      console.log(`   Command: ${command}\n`);
      
      execSync(command, { 
        encoding: 'utf8',
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      console.log(`   ✅ ${contract.name} verified successfully!\n`);
      successCount++;
    } catch (error) {
      const errorMsg = error.message || '';
      const stdout = error.stdout?.toString() || '';
      
      if (errorMsg.includes('Already Verified') || 
          stdout.includes('Already Verified') ||
          errorMsg.includes('already verified')) {
        console.log(`   ℹ️  ${contract.name} already verified\n`);
        successCount++;
      } else {
        console.log(`   ❌ Verification failed for ${contract.name}`);
        console.log(`   Error: ${errorMsg.substring(0, 200)}\n`);
        failCount++;
        failedContracts.push({
          name: contract.name,
          address: contract.address
        });
      }
    }
  }

  // Summary
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`✅ Verified: ${successCount}/${contracts.length}`);
  console.log(`❌ Failed: ${failCount}/${contracts.length}`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Failed Contracts:');
    for (const failed of failedContracts) {
      console.log(`   - ${failed.name}: ${failed.address}`);
    }
  }
  
  console.log('════════════════════════════════════════════════════════════\n');

  // Print all contract addresses
  console.log('📋 ALL CONTRACT ADDRESSES');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`   RAMA20Factory:  ${deployment.contracts.RAMA20Factory}`);
  console.log(`   MultiSender:    ${deployment.contracts.MultiSender}`);
  console.log(`   TokenLocker:    ${deployment.contracts.TokenLocker}`);
  console.log(`   RAMA721Factory: ${deployment.contracts.RAMA721Factory}`);
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('🔗 View on Ramascan:');
  for (const contract of contracts) {
    console.log(`   ${contract.name}: https://ramascan.com/address/${contract.address}`);
  }
  console.log();

  if (failCount > 0) {
    console.log('📖 MANUAL VERIFICATION GUIDE:');
    console.log('════════════════════════════════════════════════════════════');
    console.log('If automated verification failed:');
    console.log('1. Go to: https://ramascan.com/');
    console.log('2. Search for contract address');
    console.log('3. Click "Verify & Publish" or "Code" tab');
    console.log('4. Compiler Settings:');
    console.log('   - Compiler: v0.8.22');
    console.log('   - Optimization: Enabled (200 runs)');
    console.log('   - EVM Version: paris');
    console.log('   - Via IR: Enabled');
    console.log('════════════════════════════════════════════════════════════\n');
  }

  console.log('✅ Verification process complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  });
