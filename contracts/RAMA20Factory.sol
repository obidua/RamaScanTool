// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RAMA20Token
 * @dev Standard RAMA-20 token with optional features (mintable, burnable, pausable)
 */
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
}

/**
 * @title RAMA20Factory
 * @dev Factory contract for deploying RAMA-20 tokens
 */
contract RAMA20Factory {
    event TokenCreated(
        address indexed tokenAddress,
        address indexed owner,
        string name,
        string symbol,
        uint256 initialSupply
    );

    struct TokenInfo {
        address tokenAddress;
        string name;
        string symbol;
        address owner;
        uint256 createdAt;
    }

    TokenInfo[] public tokens;
    mapping(address => TokenInfo[]) public tokensByOwner;
    
    uint256 public creationFee = 0.001 ether; // 0.001 RAMA
    address public feeRecipient;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        feeRecipient = msg.sender;
    }

    function createToken(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        uint256 maxSupply_,
        bool mintable_,
        bool burnable_,
        bool pausable_
    ) external payable returns (address) {
        require(msg.value >= creationFee, "Insufficient fee");
        
        RAMA20Token token = new RAMA20Token(
            name_,
            symbol_,
            decimals_,
            initialSupply_,
            maxSupply_,
            mintable_,
            burnable_,
            pausable_,
            msg.sender
        );

        address tokenAddress = address(token);
        
        TokenInfo memory info = TokenInfo({
            tokenAddress: tokenAddress,
            name: name_,
            symbol: symbol_,
            owner: msg.sender,
            createdAt: block.timestamp
        });

        tokens.push(info);
        tokensByOwner[msg.sender].push(info);

        // Transfer fee to recipient
        if (creationFee > 0) {
            payable(feeRecipient).transfer(creationFee);
        }
        
        // Refund excess
        if (msg.value > creationFee) {
            payable(msg.sender).transfer(msg.value - creationFee);
        }

        emit TokenCreated(tokenAddress, msg.sender, name_, symbol_, initialSupply_);
        
        return tokenAddress;
    }

    function getTokensCount() external view returns (uint256) {
        return tokens.length;
    }

    function getTokensByOwner(address owner_) external view returns (TokenInfo[] memory) {
        return tokensByOwner[owner_];
    }

    function getAllTokens() external view returns (TokenInfo[] memory) {
        return tokens;
    }

    function setCreationFee(uint256 fee_) external onlyOwner {
        creationFee = fee_;
    }

    function setFeeRecipient(address recipient_) external onlyOwner {
        feeRecipient = recipient_;
    }

    function transferOwnership(address newOwner_) external onlyOwner {
        owner = newOwner_;
    }

    function withdrawFees() external onlyOwner {
        payable(feeRecipient).transfer(address(this).balance);
    }
}
