// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenLocker
 * @dev Lock RAMA-20 tokens for a specified period with optional vesting
 */
contract TokenLocker is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Lock {
        uint256 id;
        address token;
        address owner;
        uint256 amount;
        uint256 lockTime;
        uint256 unlockTime;
        bool withdrawn;
        string description;
    }

    uint256 public lockIdCounter;
    mapping(uint256 => Lock) public locks;
    mapping(address => uint256[]) public locksByOwner;
    mapping(address => uint256[]) public locksByToken;

    uint256 public lockFee = 0.001 ether; // 0.001 RAMA
    address public feeRecipient;

    event TokensLocked(
        uint256 indexed lockId,
        address indexed token,
        address indexed owner,
        uint256 amount,
        uint256 unlockTime
    );
    event TokensUnlocked(uint256 indexed lockId, address indexed owner, uint256 amount);
    event LockExtended(uint256 indexed lockId, uint256 newUnlockTime);
    event LockTransferred(uint256 indexed lockId, address indexed oldOwner, address indexed newOwner);

    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
    }

    /**
     * @dev Lock tokens until a specific time
     */
    function lockTokens(
        address token,
        uint256 amount,
        uint256 unlockTime,
        string calldata description
    ) external payable nonReentrant returns (uint256) {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount must be > 0");
        require(unlockTime > block.timestamp, "Unlock time must be future");
        require(msg.value >= lockFee, "Insufficient fee");

        IERC20 tokenContract = IERC20(token);
        require(tokenContract.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");

        // Transfer tokens to this contract
        tokenContract.safeTransferFrom(msg.sender, address(this), amount);

        // Create lock
        lockIdCounter++;
        uint256 lockId = lockIdCounter;

        locks[lockId] = Lock({
            id: lockId,
            token: token,
            owner: msg.sender,
            amount: amount,
            lockTime: block.timestamp,
            unlockTime: unlockTime,
            withdrawn: false,
            description: description
        });

        locksByOwner[msg.sender].push(lockId);
        locksByToken[token].push(lockId);

        // Transfer fee
        if (lockFee > 0) {
            payable(feeRecipient).transfer(lockFee);
        }

        // Refund excess
        if (msg.value > lockFee) {
            payable(msg.sender).transfer(msg.value - lockFee);
        }

        emit TokensLocked(lockId, token, msg.sender, amount, unlockTime);

        return lockId;
    }

    /**
     * @dev Withdraw tokens after unlock time
     */
    function unlockTokens(uint256 lockId) external nonReentrant {
        Lock storage lock = locks[lockId];
        
        require(lock.id != 0, "Lock does not exist");
        require(lock.owner == msg.sender, "Not lock owner");
        require(!lock.withdrawn, "Already withdrawn");
        require(block.timestamp >= lock.unlockTime, "Still locked");

        lock.withdrawn = true;

        IERC20(lock.token).safeTransfer(msg.sender, lock.amount);

        emit TokensUnlocked(lockId, msg.sender, lock.amount);
    }

    /**
     * @dev Extend lock time (can only extend, not reduce)
     */
    function extendLock(uint256 lockId, uint256 newUnlockTime) external {
        Lock storage lock = locks[lockId];
        
        require(lock.id != 0, "Lock does not exist");
        require(lock.owner == msg.sender, "Not lock owner");
        require(!lock.withdrawn, "Already withdrawn");
        require(newUnlockTime > lock.unlockTime, "New time must be later");

        lock.unlockTime = newUnlockTime;

        emit LockExtended(lockId, newUnlockTime);
    }

    /**
     * @dev Transfer lock ownership
     */
    function transferLockOwnership(uint256 lockId, address newOwner) external {
        Lock storage lock = locks[lockId];
        
        require(lock.id != 0, "Lock does not exist");
        require(lock.owner == msg.sender, "Not lock owner");
        require(!lock.withdrawn, "Already withdrawn");
        require(newOwner != address(0), "Invalid new owner");

        address oldOwner = lock.owner;
        lock.owner = newOwner;
        locksByOwner[newOwner].push(lockId);

        emit LockTransferred(lockId, oldOwner, newOwner);
    }

    // View functions
    function getLock(uint256 lockId) external view returns (Lock memory) {
        return locks[lockId];
    }

    function getLocksByOwner(address owner_) external view returns (uint256[] memory) {
        return locksByOwner[owner_];
    }

    function getLocksByToken(address token) external view returns (uint256[] memory) {
        return locksByToken[token];
    }

    function getLocksDetailsByOwner(address owner_) external view returns (Lock[] memory) {
        uint256[] memory lockIds = locksByOwner[owner_];
        Lock[] memory result = new Lock[](lockIds.length);
        
        for (uint256 i = 0; i < lockIds.length; i++) {
            result[i] = locks[lockIds[i]];
        }
        
        return result;
    }

    function isUnlockable(uint256 lockId) external view returns (bool) {
        Lock storage lock = locks[lockId];
        return lock.id != 0 && !lock.withdrawn && block.timestamp >= lock.unlockTime;
    }

    // Admin functions
    function setLockFee(uint256 fee_) external onlyOwner {
        lockFee = fee_;
    }

    function setFeeRecipient(address recipient_) external onlyOwner {
        require(recipient_ != address(0), "Invalid recipient");
        feeRecipient = recipient_;
    }

    function withdrawFees() external onlyOwner {
        payable(feeRecipient).transfer(address(this).balance);
    }
}
