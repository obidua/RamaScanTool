const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying StakingLocker contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "RAMA");

  // Deploy StakingLocker
  const StakingLocker = await hre.ethers.getContractFactory("StakingLocker");
  const stakingLocker = await StakingLocker.deploy();
  await stakingLocker.waitForDeployment();

  const stakingLockerAddress = await stakingLocker.getAddress();
  console.log("StakingLocker deployed to:", stakingLockerAddress);

  // Update contracts.ts
  const contractsPath = path.join(__dirname, "../src/config/contracts.ts");
  let contractsContent = fs.readFileSync(contractsPath, "utf8");
  
  // Replace the placeholder with actual address
  contractsContent = contractsContent.replace(
    /StakingLocker: '.*?'/,
    `StakingLocker: '${stakingLockerAddress}'`
  );
  
  fs.writeFileSync(contractsPath, contractsContent);
  console.log("Updated contracts.ts with StakingLocker address");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      StakingLocker: stakingLockerAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `staking-locker-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentFile);

  console.log("\n=== Deployment Summary ===");
  console.log("StakingLocker:", stakingLockerAddress);
  console.log("\nVerify contract:");
  console.log(`npx hardhat verify --network ramestta ${stakingLockerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
