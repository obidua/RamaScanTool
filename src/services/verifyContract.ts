// Ramascan (Blockscout) Contract Verification Service
// Uses both v1 and v2 APIs with fallback

const RAMASCAN_API_V1 = 'https://latest-backendapi.ramascan.com/api/v1';
const RAMASCAN_API_V2 = 'https://latest-backendapi.ramascan.com/api/v2';

// RAMA20Token source code for verification (flattened)
const RAMA20_TOKEN_FLATTENED_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/ERC20.sol)
// Simplified inline version for verification

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
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

abstract contract ERC20 is Context, IERC20, IERC20Metadata {
    mapping(address account => uint256) private _balances;
    mapping(address account => mapping(address spender => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual returns (string memory) { return _name; }
    function symbol() public view virtual returns (string memory) { return _symbol; }
    function decimals() public view virtual returns (uint8) { return 18; }
    function totalSupply() public view virtual returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view virtual returns (uint256) { return _balances[account]; }

    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal virtual {
        require(from != address(0), "ERC20: transfer from zero");
        require(to != address(0), "ERC20: transfer to zero");
        _update(from, to, value);
    }

    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) {
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            require(fromBalance >= value, "ERC20: insufficient balance");
            unchecked { _balances[from] = fromBalance - value; }
        }
        if (to == address(0)) {
            unchecked { _totalSupply -= value; }
        } else {
            unchecked { _balances[to] += value; }
        }
        emit Transfer(from, to, value);
    }

    function _mint(address account, uint256 value) internal {
        require(account != address(0), "ERC20: mint to zero");
        _update(address(0), account, value);
    }

    function _burn(address account, uint256 value) internal {
        require(account != address(0), "ERC20: burn from zero");
        _update(account, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) internal virtual {
        require(owner != address(0), "ERC20: approve from zero");
        require(spender != address(0), "ERC20: approve to zero");
        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= value, "ERC20: insufficient allowance");
            unchecked { _approve(owner, spender, currentAllowance - value); }
        }
    }
}

abstract contract ERC20Burnable is Context, ERC20 {
    function burn(uint256 value) public virtual {
        _burn(_msgSender(), value);
    }
    function burnFrom(address account, uint256 value) public virtual {
        _spendAllowance(account, _msgSender(), value);
        _burn(account, value);
    }
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
    function _update(address from, address to, uint256 value) internal virtual override whenNotPaused {
        super._update(from, to, value);
    }
}

abstract contract Ownable is Context {
    address private _owner;
    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(initialOwner);
    }
    modifier onlyOwner() { _checkOwner(); _; }
    function owner() public view virtual returns (address) { return _owner; }
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) revert OwnableUnauthorizedAccount(_msgSender());
    }
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(newOwner);
    }
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
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
        
        if (initialSupply_ > 0) {
            _mint(owner_, initialSupply_ * 10 ** decimals_);
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(mintable, "Minting is disabled");
        if (maxSupply > 0) {
            require(totalSupply() + amount <= maxSupply * 10 ** _decimals, "Exceeds max supply");
        }
        _mint(to, amount);
    }

    function pause() public onlyOwner {
        require(pausable, "Pausing is disabled");
        _pause();
    }

    function unpause() public onlyOwner {
        require(pausable, "Pausing is disabled");
        _unpause();
    }

    function _update(address from, address to, uint256 value) internal virtual override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}`;

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
}

// Encode constructor arguments for verification
function encodeConstructorArgs(params: VerificationParams): string {
  // ABI encode the constructor arguments
  // constructor(string name_, string symbol_, uint8 decimals_, uint256 initialSupply_, 
  //            uint256 maxSupply_, bool mintable_, bool burnable_, bool pausable_, address owner_)
  
  const { ethers } = window as unknown as { ethers?: { AbiCoder: { defaultAbiCoder: () => { encode: (types: string[], values: unknown[]) => string } } } };
  
  if (ethers) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    return abiCoder.encode(
      ['string', 'string', 'uint8', 'uint256', 'uint256', 'bool', 'bool', 'bool', 'address'],
      [
        params.name,
        params.symbol,
        params.decimals,
        params.initialSupply,
        params.maxSupply || '0',
        params.mintable,
        params.burnable,
        params.pausable,
        params.ownerAddress
      ]
    ).slice(2); // Remove 0x prefix
  }
  
  // Fallback - return empty if ethers not available
  return '';
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

// Verify using Blockscout v2 API (Standard Input JSON)
async function verifyWithV2API(params: VerificationParams): Promise<VerificationResult> {
  const constructorArgs = encodeConstructorArgs(params);
  
  const verificationPayload = {
    compiler_version: 'v0.8.22+commit.4fc1097e',
    source_code: RAMA20_TOKEN_FLATTENED_SOURCE,
    contract_name: 'RAMA20Token',
    evm_version: 'paris',
    optimization: true,
    optimization_runs: 200,
    constructor_arguments: constructorArgs,
    autodetect_constructor_arguments: constructorArgs ? false : true,
    license_type: 'mit'
  };

  try {
    const response = await fetch(
      `${RAMASCAN_API_V2}/smart-contracts/${params.contractAddress}/verification/via/flattened-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationPayload),
      }
    );

    const data = await response.json();
    
    if (response.ok && data.status === 'success') {
      return {
        success: true,
        message: 'Contract verified successfully!',
        verificationUrl: `https://ramascan.com/address/${params.contractAddress}?tab=contract`
      };
    } else if (data.message?.includes('already verified')) {
      return {
        success: true,
        message: 'Contract is already verified!',
        verificationUrl: `https://ramascan.com/address/${params.contractAddress}?tab=contract`
      };
    } else {
      return {
        success: false,
        message: data.message || 'V2 API verification failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `V2 API error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Verify using Blockscout v1 API (Etherscan-compatible)
async function verifyWithV1API(params: VerificationParams): Promise<VerificationResult> {
  const constructorArgs = encodeConstructorArgs(params);
  
  const formData = new URLSearchParams();
  formData.append('module', 'contract');
  formData.append('action', 'verifysourcecode');
  formData.append('contractaddress', params.contractAddress);
  formData.append('sourceCode', RAMA20_TOKEN_FLATTENED_SOURCE);
  formData.append('codeformat', 'solidity-single-file');
  formData.append('contractname', 'RAMA20Token');
  formData.append('compilerversion', 'v0.8.22+commit.4fc1097e');
  formData.append('optimizationUsed', '1');
  formData.append('runs', '200');
  formData.append('evmversion', 'paris');
  formData.append('licenseType', '3'); // MIT
  if (constructorArgs) {
    formData.append('constructorArguements', constructorArgs);
  }

  try {
    const response = await fetch(`${RAMASCAN_API_V1}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();
    
    if (data.status === '1' || data.result?.toLowerCase().includes('verified')) {
      return {
        success: true,
        message: 'Contract verified successfully!',
        guid: data.result,
        verificationUrl: `https://ramascan.com/address/${params.contractAddress}?tab=contract`
      };
    } else if (data.result?.includes('Already Verified') || data.message?.includes('already verified')) {
      return {
        success: true,
        message: 'Contract is already verified!',
        verificationUrl: `https://ramascan.com/address/${params.contractAddress}?tab=contract`
      };
    } else {
      return {
        success: false,
        message: data.result || data.message || 'V1 API verification failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `V1 API error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Main verification function - tries both APIs
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

  // Try V2 API first (newer Blockscout API)
  console.log('Attempting verification with V2 API...');
  const v2Result = await verifyWithV2API(params);
  if (v2Result.success) {
    return v2Result;
  }
  console.log('V2 API failed:', v2Result.message);

  // Fallback to V1 API (Etherscan-compatible)
  console.log('Attempting verification with V1 API...');
  const v1Result = await verifyWithV1API(params);
  if (v1Result.success) {
    return v1Result;
  }
  console.log('V1 API failed:', v1Result.message);

  // Both failed
  return {
    success: false,
    message: `Verification failed. V2: ${v2Result.message}. V1: ${v1Result.message}. Please try manual verification on Ramascan.`
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
