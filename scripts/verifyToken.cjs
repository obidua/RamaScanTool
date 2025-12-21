/**
 * Token Verification Script for RAMA20Token
 * This script verifies tokens created by the RAMA20Factory
 * 
 * Usage: node scripts/verifyToken.cjs <tokenAddress> <name> <symbol> <decimals> <initialSupply> <maxSupply> <mintable> <burnable> <pausable> <ownerAddress>
 * 
 * Example: node scripts/verifyToken.cjs 0x123...abc "My Token" "MTK" 18 1000000 0 false true false 0xOwner...
 */

const hre = require('hardhat');

async function main() {
  // Get arguments from command line
  const args = process.argv.slice(2);
  
  if (args.length < 10) {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           RAMA20Token Verification Script                        ║
╚══════════════════════════════════════════════════════════════════╝

Usage: node scripts/verifyToken.cjs <tokenAddress> <name> <symbol> <decimals> <initialSupply> <maxSupply> <mintable> <burnable> <pausable> <ownerAddress>

Arguments:
  tokenAddress  - The deployed token contract address
  name          - Token name (string)
  symbol        - Token symbol (string)
  decimals      - Token decimals (number, usually 18)
  initialSupply - Initial supply (number, without decimals)
  maxSupply     - Max supply (number, 0 for unlimited)
  mintable      - Is mintable (true/false)
  burnable      - Is burnable (true/false)
  pausable      - Is pausable (true/false)
  ownerAddress  - Owner wallet address

Example:
  node scripts/verifyToken.cjs 0x1234...5678 "MyToken" "MTK" 18 1000000 0 false true false 0xabcd...efgh
`);
    process.exit(1);
  }

  const [
    tokenAddress,
    name,
    symbol,
    decimals,
    initialSupply,
    maxSupply,
    mintable,
    burnable,
    pausable,
    ownerAddress
  ] = args;

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           🔍 Verifying RAMA20Token on Ramascan                   ║
╚══════════════════════════════════════════════════════════════════╝
`);

  console.log('📋 Token Details:');
  console.log(`   Address:       ${tokenAddress}`);
  console.log(`   Name:          ${name}`);
  console.log(`   Symbol:        ${symbol}`);
  console.log(`   Decimals:      ${decimals}`);
  console.log(`   Initial Supply:${initialSupply}`);
  console.log(`   Max Supply:    ${maxSupply}`);
  console.log(`   Mintable:      ${mintable}`);
  console.log(`   Burnable:      ${burnable}`);
  console.log(`   Pausable:      ${pausable}`);
  console.log(`   Owner:         ${ownerAddress}`);
  console.log('');

  // Convert string booleans to actual booleans
  const mintableBool = mintable === 'true';
  const burnableBool = burnable === 'true';
  const pausableBool = pausable === 'true';

  // Constructor arguments for verification
  const constructorArgs = [
    name,                          // name_
    symbol,                        // symbol_
    parseInt(decimals),            // decimals_
    BigInt(initialSupply),         // initialSupply_
    BigInt(maxSupply),             // maxSupply_
    mintableBool,                  // mintable_
    burnableBool,                  // burnable_
    pausableBool,                  // pausable_
    ownerAddress                   // owner_
  ];

  console.log('🚀 Starting verification...\n');

  try {
    await hre.run("verify:verify", {
      address: tokenAddress,
      contract: "contracts/RAMA20Factory.sol:RAMA20Token",
      constructorArguments: constructorArgs,
    });

    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           ✅ VERIFICATION SUCCESSFUL!                            ║
╚══════════════════════════════════════════════════════════════════╝

🔗 View verified contract:
   https://ramascan.com/address/${tokenAddress}?tab=contract
`);
    
    // Return success for programmatic use
    return { success: true, address: tokenAddress };
    
  } catch (error) {
    const errorMsg = error.message || '';
    
    // Check if already verified
    if (errorMsg.includes('Already Verified') || errorMsg.includes('already verified')) {
      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           ℹ️  CONTRACT ALREADY VERIFIED                          ║
╚══════════════════════════════════════════════════════════════════╝

🔗 View contract:
   https://ramascan.com/address/${tokenAddress}?tab=contract
`);
      return { success: true, address: tokenAddress, alreadyVerified: true };
    }

    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║           ❌ VERIFICATION FAILED                                 ║
╚══════════════════════════════════════════════════════════════════╝

Error: ${errorMsg.substring(0, 500)}

Possible solutions:
1. Wait a few minutes after deployment and try again
2. Make sure the contract address is correct
3. Ensure constructor arguments match exactly
4. Check if Ramascan API is available

Manual verification URL:
https://ramascan.com/address/${tokenAddress}/verify-via-flattened-code/new
`);
    
    return { success: false, error: errorMsg };
  }
}

// Run the script
main()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Export for use as module
module.exports = { main };
