// Ramascan (Blockscout) Contract Verification Service

const RAMASCAN_API_V2 = 'https://latest-backendapi.ramascan.com/api/v2';

export interface VerificationParams {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  maxSupply: string;
  mintable: boolean;
  burnable: boolean;
  pausable: boolean;
  ownerAddress: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  guid?: string;
  verificationUrl?: string;
  manualVerificationUrl?: string;
}

// Check if contract is already verified
async function checkIfVerified(contractAddress: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${RAMASCAN_API_V2}/smart-contracts/${contractAddress}`
    );
    if (response.ok) {
      const data = await response.json();
      return data.is_verified === true;
    }
    return false;
  } catch {
    return false;
  }
}

// Main verification function
export async function verifyTokenContract(params: VerificationParams): Promise<VerificationResult> {
  // First check if already verified
  const isVerified = await checkIfVerified(params.contractAddress);
  if (isVerified) {
    return {
      success: true,
      message: 'Contract is already verified!',
      verificationUrl: `https://ramascan.com/address/${params.contractAddress}?tab=contract`
    };
  }

  // Since automatic verification requires exact bytecode match and the contract
  // was deployed via factory with OpenZeppelin dependencies, we provide the
  // manual verification URL with instructions.
  const manualVerificationUrl = `https://ramascan.com/address/${params.contractAddress}/verify-via-flattened-code/new`;
  
  return {
    success: false,
    message: 'Factory-deployed contracts require manual verification. Click the link below to verify on Ramascan.',
    manualVerificationUrl,
    verificationUrl: `https://ramascan.com/address/${params.contractAddress}?tab=contract`
  };
}

// Get verification status
export async function getVerificationStatus(contractAddress: string): Promise<{
  verified: boolean;
  contractName?: string;
}> {
  try {
    const response = await fetch(
      `${RAMASCAN_API_V2}/smart-contracts/${contractAddress}`
    );
    if (response.ok) {
      const data = await response.json();
      return {
        verified: data.is_verified === true,
        contractName: data.name
      };
    }
    return { verified: false };
  } catch {
    return { verified: false };
  }
}
