// Ramascan (Blockscout) Automatic Contract Verification Service
// Supports both V2 API (preferred) and V1 Etherscan-compatible API

import { encodeAbiParameters, parseAbiParameters } from 'viem';

// API Endpoints
const RAMASCAN_API_V2 = 'https://latest-backendapi.ramascan.com/api/v2';
const RAMASCAN_API_V1 = 'https://latest-backendapi.ramascan.com/api/v1';
const RAMASCAN_BASE = 'https://ramascan.com';

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
  verificationUrl?: string;
  manualVerificationUrl?: string;
  isAlreadyVerified?: boolean;
  isPending?: boolean;
}

// Flattened source code for RAMA20Token
const FLATTENED_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) { return msg.sender; }
    function _msgData() internal view virtual returns (bytes calldata) { return msg.data; }
    function _contextSuffixLength() internal view virtual returns (uint256) { return 0; }
}

abstract contract Ownable is Context {
    address private _owner;
    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor(address initialOwner) { if (initialOwner == address(0)) revert OwnableInvalidOwner(address(0)); _transferOwnership(initialOwner); }
    modifier onlyOwner() { _checkOwner(); _; }
    function owner() public view virtual returns (address) { return _owner; }
    function _checkOwner() internal view virtual { if (owner() != _msgSender()) revert OwnableUnauthorizedAccount(_msgSender()); }
    function renounceOwnership() public virtual onlyOwner { _transferOwnership(address(0)); }
    function transferOwnership(address newOwner) public virtual onlyOwner { if (newOwner == address(0)) revert OwnableInvalidOwner(address(0)); _transferOwnership(newOwner); }
    function _transferOwnership(address newOwner) internal virtual { address oldOwner = _owner; _owner = newOwner; emit OwnershipTransferred(oldOwner, newOwner); }
}

interface IERC20Errors {
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);
}

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC20Errors {
    mapping(address account => uint256) private _balances;
    mapping(address owner => mapping(address spender => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    constructor(string memory name_, string memory symbol_) { _name = name_; _symbol = symbol_; }
    function name() public view virtual returns (string memory) { return _name; }
    function symbol() public view virtual returns (string memory) { return _symbol; }
    function decimals() public view virtual returns (uint8) { return 18; }
    function totalSupply() public view virtual returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view virtual returns (uint256) { return _balances[account]; }
    function transfer(address to, uint256 value) public virtual returns (bool) { _transfer(_msgSender(), to, value); return true; }
    function allowance(address owner, address spender) public view virtual returns (uint256) { return _allowances[owner][spender]; }
    function approve(address spender, uint256 value) public virtual returns (bool) { _approve(_msgSender(), spender, value); return true; }
    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) { _spendAllowance(from, _msgSender(), value); _transfer(from, to, value); return true; }
    function _transfer(address from, address to, uint256 value) internal { if (from == address(0)) revert ERC20InvalidSender(address(0)); if (to == address(0)) revert ERC20InvalidReceiver(address(0)); _update(from, to, value); }
    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) { _totalSupply += value; } else { uint256 fromBalance = _balances[from]; if (fromBalance < value) revert ERC20InsufficientBalance(from, fromBalance, value); unchecked { _balances[from] = fromBalance - value; } }
        if (to == address(0)) { unchecked { _totalSupply -= value; } } else { unchecked { _balances[to] += value; } }
        emit Transfer(from, to, value);
    }
    function _mint(address account, uint256 value) internal { if (account == address(0)) revert ERC20InvalidReceiver(address(0)); _update(address(0), account, value); }
    function _burn(address account, uint256 value) internal { if (account == address(0)) revert ERC20InvalidSender(address(0)); _update(account, address(0), value); }
    function _approve(address owner, address spender, uint256 value) internal { _approve(owner, spender, value, true); }
    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) revert ERC20InvalidApprover(address(0));
        if (spender == address(0)) revert ERC20InvalidSpender(address(0));
        _allowances[owner][spender] = value;
        if (emitEvent) emit Approval(owner, spender, value);
    }
    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) { if (currentAllowance < value) revert ERC20InsufficientAllowance(spender, currentAllowance, value); unchecked { _approve(owner, spender, currentAllowance - value, false); } }
    }
}

abstract contract ERC20Burnable is Context, ERC20 {
    function burn(uint256 value) public virtual { _burn(_msgSender(), value); }
    function burnFrom(address account, uint256 value) public virtual { _spendAllowance(account, _msgSender(), value); _burn(account, value); }
}

abstract contract Pausable is Context {
    bool private _paused;
    event Paused(address account);
    event Unpaused(address account);
    error EnforcedPause();
    error ExpectedPause();
    constructor() { _paused = false; }
    modifier whenNotPaused() { _requireNotPaused(); _; }
    modifier whenPaused() { _requirePaused(); _; }
    function paused() public view virtual returns (bool) { return _paused; }
    function _requireNotPaused() internal view virtual { if (paused()) revert EnforcedPause(); }
    function _requirePaused() internal view virtual { if (!paused()) revert ExpectedPause(); }
    function _pause() internal virtual whenNotPaused { _paused = true; emit Paused(_msgSender()); }
    function _unpause() internal virtual whenPaused { _paused = false; emit Unpaused(_msgSender()); }
}

abstract contract ERC20Pausable is ERC20, Pausable {
    function _update(address from, address to, uint256 value) internal virtual override { if (paused()) revert EnforcedPause(); super._update(from, to, value); }
}

contract RAMA20Token is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    uint8 private _decimals;
    bool public mintable;
    bool public pausable;
    uint256 public maxSupply;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        uint256 maxSupply_,
        bool mintable_,
        bool burnable_,
        bool pausable_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        _decimals = decimals_;
        mintable = mintable_;
        pausable = pausable_;
        maxSupply = maxSupply_;
        if (initialSupply_ > 0) { _mint(owner_, initialSupply_ * 10 ** decimals_); }
    }

    function decimals() public view virtual override returns (uint8) { return _decimals; }
    function mint(address to, uint256 amount) public onlyOwner { require(mintable, "Minting is disabled"); if (maxSupply > 0) { require(totalSupply() + amount <= maxSupply * 10 ** _decimals, "Exceeds max supply"); } _mint(to, amount); }
    function pause() public onlyOwner { require(pausable, "Pausing is disabled"); _pause(); }
    function unpause() public onlyOwner { require(pausable, "Pausing is disabled"); _unpause(); }
    function _update(address from, address to, uint256 value) internal virtual override(ERC20, ERC20Pausable) { super._update(from, to, value); }
}`;

// Check if contract is already verified using V2 API
export async function checkIfVerified(contractAddress: string): Promise<boolean> {
  try {
    // Try V2 API first (Blockscout native)
    const v2Response = await fetch(`${RAMASCAN_API_V2}/smart-contracts/${contractAddress}`);
    if (v2Response.ok) {
      const data = await v2Response.json();
      if (data.is_verified === true) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking verification:', error);
    return false;
  }
}

// Get verification status using V2 API
export async function getVerificationStatus(contractAddress: string): Promise<{
  verified: boolean;
  contractName?: string;
}> {
  try {
    const response = await fetch(`${RAMASCAN_API_V2}/smart-contracts/${contractAddress}`);
    if (response.ok) {
      const data = await response.json();
      if (data.is_verified === true) {
        return { verified: true, contractName: data.name };
      }
    }
    return { verified: false };
  } catch {
    return { verified: false };
  }
}

// Encode constructor arguments
function encodeConstructorArgs(params: VerificationParams): string {
  try {
    const encoded = encodeAbiParameters(
      parseAbiParameters('string, string, uint8, uint256, uint256, bool, bool, bool, address'),
      [
        params.name,
        params.symbol,
        params.decimals,
        BigInt(params.initialSupply),
        BigInt(params.maxSupply || '0'),
        params.mintable,
        params.burnable,
        params.pausable,
        params.ownerAddress as `0x${string}`
      ]
    );
    return encoded.slice(2);
  } catch (error) {
    console.error('Error encoding args:', error);
    return '';
  }
}

// Submit verification using V2 API (Blockscout native) - more reliable
async function submitVerificationV2(
  contractAddress: string,
  sourceCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    const url = `${RAMASCAN_API_V2}/smart-contracts/${contractAddress}/verification/via/flattened-code`;
    
    const body = {
      compiler_version: 'v0.8.22+commit.4fc1097e',
      source_code: sourceCode,
      is_optimization_enabled: true,
      optimization_runs: 200,
      contract_name: 'RAMA20Token',
      evm_version: 'paris',
      is_via_ir: true
    };

    console.log('Submitting verification via V2 API for:', contractAddress);
    console.log('V2 URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log('V2 Response status:', response.status);
    const data = await response.json();
    console.log('V2 API Response:', data);

    // V2 API returns success message when verification starts
    if (response.ok) {
      if (data.message?.toLowerCase().includes('started') || 
          data.message?.toLowerCase().includes('success')) {
        return { success: true, message: 'Verification started!' };
      }
      // Some V2 responses indicate success differently
      if (!data.message?.toLowerCase().includes('error') && 
          !data.message?.toLowerCase().includes('failed') &&
          !data.message?.toLowerCase().includes('missing')) {
        return { success: true, message: data.message || 'Verification submitted!' };
      }
    }

    if (data.message?.toLowerCase().includes('already verified')) {
      return { success: true, message: 'Already verified!' };
    }

    return { success: false, message: data.message || 'V2 verification failed' };
  } catch (error) {
    console.error('V2 Verification error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Network error' };
  }
}

// Fallback: Submit verification using V1 Etherscan-compatible API
async function submitVerificationV1(
  contractAddress: string,
  sourceCode: string,
  constructorArgs: string
): Promise<{ success: boolean; message: string; guid?: string }> {
  try {
    const formData = new URLSearchParams();
    formData.append('module', 'contract');
    formData.append('action', 'verifysourcecode');
    formData.append('codeformat', 'solidity-single-file');
    formData.append('contractaddress', contractAddress);
    formData.append('contractname', 'RAMA20Token');
    formData.append('compilerversion', 'v0.8.22+commit.4fc1097e');
    formData.append('optimizationUsed', '1');
    formData.append('runs', '200');
    formData.append('evmversion', 'paris');
    formData.append('viaIR', 'true');
    formData.append('sourceCode', sourceCode);
    if (constructorArgs) {
      formData.append('constructorArguements', constructorArgs);
    }

    console.log('Fallback: Submitting via V1 API for:', contractAddress);

    const response = await fetch(RAMASCAN_API_V1, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await response.json();
    console.log('V1 API Response:', data);

    if (data.status === '1' || data.message === 'OK') {
      return { success: true, message: 'Verification submitted!', guid: data.result };
    }

    if (data.result?.toLowerCase().includes('already verified')) {
      return { success: true, message: 'Already verified!' };
    }

    return { success: false, message: data.result || data.message || 'Failed' };
  } catch (error) {
    console.error('V1 Verification error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Network error' };
  }
}

// Check GUID status (V1 API specific)
async function checkGuidStatus(guid: string): Promise<{ success: boolean; message: string }> {
  try {
    const url = RAMASCAN_API_V1 + '?module=contract&action=checkverifystatus&guid=' + guid;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1') {
      return { success: true, message: 'Verified!' };
    }
    if (data.result?.toLowerCase().includes('pending')) {
      return { success: false, message: 'Pending...' };
    }
    return { success: false, message: data.result || 'Unknown' };
  } catch {
    return { success: false, message: 'Check failed' };
  }
}

// Main verification function
export async function verifyTokenContract(params: VerificationParams): Promise<VerificationResult> {
  const { contractAddress } = params;
  
  console.log('Starting verification for:', contractAddress);

  // Check if already verified
  const isVerified = await checkIfVerified(contractAddress);
  if (isVerified) {
    return {
      success: true,
      message: 'Contract is already verified! ✓',
      verificationUrl: RAMASCAN_BASE + '/address/' + contractAddress + '?tab=contract',
      isAlreadyVerified: true
    };
  }

  // Try V2 API first (more reliable for Blockscout)
  console.log('Attempting V2 API verification...');
  const v2Result = await submitVerificationV2(contractAddress, FLATTENED_SOURCE);
  
  if (v2Result.success) {
    // V2 API started verification, poll for completion
    for (let i = 0; i < 8; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const directCheck = await checkIfVerified(contractAddress);
      if (directCheck) {
        return {
          success: true,
          message: 'Contract verified successfully! 🎉',
          verificationUrl: RAMASCAN_BASE + '/address/' + contractAddress + '?tab=contract'
        };
      }
    }
    
    return {
      success: true,
      message: 'Verification submitted! Check status in a few minutes.',
      verificationUrl: RAMASCAN_BASE + '/address/' + contractAddress + '?tab=contract',
      isPending: true
    };
  }

  // Fallback to V1 API if V2 fails
  console.log('V2 failed, trying V1 API fallback...');
  const constructorArgs = encodeConstructorArgs(params);
  const v1Result = await submitVerificationV1(contractAddress, FLATTENED_SOURCE, constructorArgs);

  if (v1Result.success && v1Result.guid) {
    // Poll for completion using GUID
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const status = await checkGuidStatus(v1Result.guid);
      if (status.success) {
        return {
          success: true,
          message: 'Contract verified successfully! 🎉',
          verificationUrl: RAMASCAN_BASE + '/address/' + contractAddress + '?tab=contract'
        };
      }
      
      const directCheck = await checkIfVerified(contractAddress);
      if (directCheck) {
        return {
          success: true,
          message: 'Contract verified successfully! 🎉',
          verificationUrl: RAMASCAN_BASE + '/address/' + contractAddress + '?tab=contract'
        };
      }
    }
    
    return {
      success: true,
      message: 'Verification submitted! May take a few minutes.',
      verificationUrl: RAMASCAN_BASE + '/address/' + contractAddress + '?tab=contract',
      isPending: true
    };
  }

  if (v1Result.success) {
    return {
      success: true,
      message: v1Result.message,
      verificationUrl: RAMASCAN_BASE + '/address/' + contractAddress + '?tab=contract'
    };
  }

  return {
    success: false,
    message: v2Result.message || v1Result.message || 'Verification failed',
    manualVerificationUrl: RAMASCAN_BASE + '/address/' + contractAddress + '/verify-via-flattened-code/new',
    verificationUrl: RAMASCAN_BASE + '/address/' + contractAddress + '?tab=contract'
  };
}

// Get verification URLs
export function getVerificationUrls(contractAddress: string) {
  return {
    flattenedCode: RAMASCAN_BASE + '/address/' + contractAddress + '/verify-via-flattened-code/new',
    standardJson: RAMASCAN_BASE + '/address/' + contractAddress + '/verify-via-standard-json-input/new',
    contractPage: RAMASCAN_BASE + '/address/' + contractAddress + '?tab=contract',
  };
}

// Open verification page
export function openVerificationPage(contractAddress: string): void {
  const urls = getVerificationUrls(contractAddress);
  window.open(urls.flattenedCode, '_blank', 'noopener,noreferrer');
}

// Copy source code
export async function copySourceCode(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(FLATTENED_SOURCE);
    return true;
  } catch {
    return false;
  }
}

// Export source code getter
export function generateFlattenedSource(): string {
  return FLATTENED_SOURCE;
}
