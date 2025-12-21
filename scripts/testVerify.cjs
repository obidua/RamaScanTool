/**
 * Test Token Verification Script
 * Tests the verification API directly (matches hardhat.config.cjs settings)
 */

const fs = require('fs');
const path = require('path');

// API endpoint matches hardhat.config.cjs etherscan.customChains
const RAMASCAN_API = 'https://latest-backendapi.ramascan.com/api/v1';

// Read the flattened source code
const SOURCE_CODE = `// SPDX-License-Identifier: MIT
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

async function testVerification(contractAddress) {
  console.log('\n🔍 Testing verification for:', contractAddress);
  
  // Build form data with Etherscan-compatible field names
  const formData = new URLSearchParams();
  formData.append('module', 'contract');
  formData.append('action', 'verifysourcecode');
  formData.append('codeformat', 'solidity-single-file');
  // Use 'contractaddress' not 'addressHash'
  formData.append('contractaddress', contractAddress);
  formData.append('contractname', 'RAMA20Token');
  formData.append('compilerversion', 'v0.8.22+commit.4fc1097e');
  // Use 'optimizationUsed' and 'runs'
  formData.append('optimizationUsed', '1');
  formData.append('runs', '200');
  formData.append('evmversion', 'paris');
  formData.append('viaIR', 'true');
  formData.append('sourceCode', SOURCE_CODE);
  
  console.log('\n📤 Submitting to:', RAMASCAN_API);
  console.log('   Source code length:', SOURCE_CODE.length, 'chars');
  
  try {
    const response = await fetch(RAMASCAN_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    const data = await response.json();
    console.log('\n📥 Response:', JSON.stringify(data, null, 2));
    
    if (data.status === '1') {
      console.log('\n✅ Verification submitted! GUID:', data.result);
      
      // Wait and check status
      console.log('\n⏳ Waiting 10 seconds then checking status...');
      await new Promise(r => setTimeout(r, 10000));
      
      const statusUrl = `${RAMASCAN_API}?module=contract&action=checkverifystatus&guid=${data.result}`;
      const statusRes = await fetch(statusUrl);
      const statusData = await statusRes.json();
      console.log('📋 Status:', JSON.stringify(statusData, null, 2));
    } else {
      console.log('\n❌ Verification failed:', data.result || data.message);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run test
const contractAddress = process.argv[2] || '0x2f5b8176C3eD12885682798C1fF083Ec7912D0eF';
testVerification(contractAddress);
