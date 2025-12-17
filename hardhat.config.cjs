require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    ramestta: {
      url: process.env.RAMESTTA_RPC_URL || "https://blockchain.ramestta.com",
      chainId: 1370,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei
    },
    ramestta2: {
      url: "https://blockchain.ramestta.com",
      chainId: 1370,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000,
    },
  },
  etherscan: {
    apiKey: {
      ramestta: process.env.RAMASCAN_API_KEY || "dummy",
    },
    customChains: [
      {
        network: "ramestta",
        chainId: 1370,
        urls: {
          apiURL: process.env.VERIFICATION_URL?.replace(/\/$/, '') || "https://latest-backendapi.ramascan.com/api/v1",
          browserURL: "https://ramascan.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
