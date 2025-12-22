// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakingLocker
 * @dev Advanced Token Locker with staking-like rewards, beneficiary support, and admin controls
 * Features:
 * - Lock tokens for yourself or another user (beneficiary)
 * - Daily/APR based rewards that accrue over lock period
 * - Principal + rewards locked in contract
 * - Admin can emergency unlock if enabled
 * - Choose recipient on unlock (beneficiary or creator)
 */
contract StakingLocker is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Lock {
        uint256 id;
        address token;                // Token being locked
        address creator;              // Who created the lock (depositor)
        address beneficiary;          // Who can claim the tokens
        uint256 principalAmount;      // Original locked amount
        uint256 rewardAmount;         // Total reward amount deposited
        uint256 dailyRewardRate;      // Daily reward rate in basis points (100 = 1%)
        uint256 lockTime;             // When the lock was created
        uint256 unlockTime;           // When the lock can be unlocked
        uint256 lastRewardCalcTime;   // Last time rewards were calculated
        uint256 accruedRewards;       // Accumulated rewards
        bool withdrawn;               // Whether tokens have been withdrawn
        bool adminCanUnlock;          // Whether admin can force unlock
        bool creatorCanClaim;         // Whether creator can claim instead of beneficiary
        string description;           // Lock description
        UnlockRecipient unlockRecipient; // Who receives tokens on unlock
    }

    enum UnlockRecipient {
        Beneficiary,    // Tokens go to beneficiary
        Creator,        // Tokens go back to creator
        Admin           // Tokens go to admin/fee recipient
    }

    uint256 public lockIdCounter;
    mapping(uint256 => Lock) public locks;
    mapping(address => uint256[]) public locksByCreator;
    mapping(address => uint256[]) public locksByBeneficiary;
    mapping(address => uint256[]) public locksByToken;

    uint256 public lockFee = 0.01 ether; // 0.01 RAMA
    address public feeRecipient;
    uint256 public constant MAX_DAILY_RATE = 1000; // Max 10% daily (1000 basis points)
    uint256 public constant BASIS_POINTS = 10000;

    // Events
    event TokensLocked(
        uint256 indexed lockId,
        address indexed token,
        address indexed creator,
        address beneficiary,
        uint256 principalAmount,
        uint256 rewardAmount,
        uint256 dailyRewardRate,
        uint256 unlockTime,
        bool adminCanUnlock
    );

    event TokensUnlocked(
        uint256 indexed lockId,
        address indexed recipient,
        uint256 principalAmount,
        uint256 rewardsAmount
    );

    event RewardsAccrued(
        uint256 indexed lockId,
        uint256 rewardsAmount,
        uint256 timestamp
    );

    event AdminUnlock(
        uint256 indexed lockId,
        address indexed admin,
        address indexed recipient,
        uint256 totalAmount
    );

    event LockExtended(
        uint256 indexed lockId,
        uint256 newUnlockTime,
        uint256 additionalRewards
    );

    event BeneficiaryChanged(
        uint256 indexed lockId,
        address indexed oldBeneficiary,
        address indexed newBeneficiary
    );

    event UnlockRecipientChanged(
        uint256 indexed lockId,
        UnlockRecipient newRecipient
    );

    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
    }

    /**
     * @dev Create a new lock with rewards
     * @param token Token address to lock
     * @param beneficiary Who can claim the tokens (can be different from caller)
     * @param principalAmount Amount to lock as principal
     * @param rewardAmount Amount to lock as rewards (must have enough tokens)
     * @param dailyRewardRate Daily reward rate in basis points (100 = 1% per day)
     * @param unlockTime When the lock expires
     * @param adminCanUnlock Whether contract owner can force unlock
     * @param unlockRecipient Who receives tokens on unlock
     * @param description Lock description
     */
    function createLock(
        address token,
        address beneficiary,
        uint256 principalAmount,
        uint256 rewardAmount,
        uint256 dailyRewardRate,
        uint256 unlockTime,
        bool adminCanUnlock,
        UnlockRecipient unlockRecipient,
        string calldata description
    ) external payable nonReentrant returns (uint256) {
        require(token != address(0), "Invalid token");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(principalAmount > 0, "Principal must be > 0");
        require(unlockTime > block.timestamp, "Unlock time must be future");
        require(msg.value >= lockFee, "Insufficient fee");
        require(dailyRewardRate <= MAX_DAILY_RATE, "Daily rate too high");

        uint256 totalAmount = principalAmount + rewardAmount;
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.allowance(msg.sender, address(this)) >= totalAmount, "Insufficient allowance");

        // Transfer tokens to this contract
        tokenContract.safeTransferFrom(msg.sender, address(this), totalAmount);

        // Create lock
        lockIdCounter++;
        uint256 lockId = lockIdCounter;

        locks[lockId] = Lock({
            id: lockId,
            token: token,
            creator: msg.sender,
            beneficiary: beneficiary,
            principalAmount: principalAmount,
            rewardAmount: rewardAmount,
            dailyRewardRate: dailyRewardRate,
            lockTime: block.timestamp,
            unlockTime: unlockTime,
            lastRewardCalcTime: block.timestamp,
            accruedRewards: 0,
            withdrawn: false,
            adminCanUnlock: adminCanUnlock,
            creatorCanClaim: unlockRecipient == UnlockRecipient.Creator,
            description: description,
            unlockRecipient: unlockRecipient
        });

        locksByCreator[msg.sender].push(lockId);
        locksByBeneficiary[beneficiary].push(lockId);
        locksByToken[token].push(lockId);

        // Transfer fee
        if (lockFee > 0) {
            payable(feeRecipient).transfer(lockFee);
        }

        // Refund excess
        if (msg.value > lockFee) {
            payable(msg.sender).transfer(msg.value - lockFee);
        }

        emit TokensLocked(
            lockId,
            token,
            msg.sender,
            beneficiary,
            principalAmount,
            rewardAmount,
            dailyRewardRate,
            unlockTime,
            adminCanUnlock
        );

        return lockId;
    }

    /**
     * @dev Calculate pending rewards for a lock
     */
    function calculatePendingRewards(uint256 lockId) public view returns (uint256) {
        Lock storage lock = locks[lockId];
        if (lock.id == 0 || lock.withdrawn || lock.dailyRewardRate == 0) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - lock.lastRewardCalcTime;
        uint256 daysElapsed = timeElapsed / 1 days;
        
        if (daysElapsed == 0) {
            return 0;
        }

        // Calculate daily compound rewards: principal * rate * days
        uint256 pendingReward = (lock.principalAmount * lock.dailyRewardRate * daysElapsed) / BASIS_POINTS;
        
        // Cap rewards at available reward pool
        uint256 remainingRewards = lock.rewardAmount > lock.accruedRewards 
            ? lock.rewardAmount - lock.accruedRewards 
            : 0;

        return pendingReward > remainingRewards ? remainingRewards : pendingReward;
    }

    /**
     * @dev Get total claimable amount (principal + accrued + pending rewards)
     */
    function getClaimableAmount(uint256 lockId) public view returns (uint256 principal, uint256 rewards, uint256 total) {
        Lock storage lock = locks[lockId];
        if (lock.id == 0 || lock.withdrawn) {
            return (0, 0, 0);
        }

        principal = lock.principalAmount;
        rewards = lock.accruedRewards + calculatePendingRewards(lockId);
        total = principal + rewards;
    }

    /**
     * @dev Accrue pending rewards (updates state)
     */
    function accrueRewards(uint256 lockId) public {
        Lock storage lock = locks[lockId];
        require(lock.id != 0, "Lock does not exist");
        require(!lock.withdrawn, "Already withdrawn");

        uint256 pendingRewards = calculatePendingRewards(lockId);
        if (pendingRewards > 0) {
            lock.accruedRewards += pendingRewards;
            uint256 timeElapsed = block.timestamp - lock.lastRewardCalcTime;
            uint256 daysElapsed = timeElapsed / 1 days;
            lock.lastRewardCalcTime += daysElapsed * 1 days;
            
            emit RewardsAccrued(lockId, pendingRewards, block.timestamp);
        }
    }

    /**
     * @dev Unlock and withdraw tokens (only beneficiary or allowed parties)
     */
    function unlockTokens(uint256 lockId) external nonReentrant {
        Lock storage lock = locks[lockId];
        
        require(lock.id != 0, "Lock does not exist");
        require(!lock.withdrawn, "Already withdrawn");
        require(block.timestamp >= lock.unlockTime, "Still locked");
        
        // Check who can unlock
        bool canUnlock = false;
        if (lock.unlockRecipient == UnlockRecipient.Beneficiary && msg.sender == lock.beneficiary) {
            canUnlock = true;
        } else if (lock.unlockRecipient == UnlockRecipient.Creator && msg.sender == lock.creator) {
            canUnlock = true;
        } else if (lock.beneficiary == msg.sender || lock.creator == msg.sender) {
            canUnlock = true;
        }
        require(canUnlock, "Not authorized to unlock");

        // Accrue final rewards
        accrueRewards(lockId);
        
        lock.withdrawn = true;

        // Calculate total payout
        uint256 totalPayout = lock.principalAmount + lock.accruedRewards;
        
        // Return unused rewards to creator
        uint256 unusedRewards = lock.rewardAmount > lock.accruedRewards 
            ? lock.rewardAmount - lock.accruedRewards 
            : 0;

        // Determine recipient
        address recipient;
        if (lock.unlockRecipient == UnlockRecipient.Creator) {
            recipient = lock.creator;
        } else if (lock.unlockRecipient == UnlockRecipient.Admin) {
            recipient = feeRecipient;
        } else {
            recipient = lock.beneficiary;
        }

        // Transfer tokens
        IERC20(lock.token).safeTransfer(recipient, totalPayout);
        
        // Return unused rewards to creator if any
        if (unusedRewards > 0 && recipient != lock.creator) {
            IERC20(lock.token).safeTransfer(lock.creator, unusedRewards);
        }

        emit TokensUnlocked(lockId, recipient, lock.principalAmount, lock.accruedRewards);
    }

    /**
     * @dev Admin force unlock (only if adminCanUnlock is true)
     */
    function adminUnlock(uint256 lockId, UnlockRecipient recipient) external onlyOwner nonReentrant {
        Lock storage lock = locks[lockId];
        
        require(lock.id != 0, "Lock does not exist");
        require(!lock.withdrawn, "Already withdrawn");
        require(lock.adminCanUnlock, "Admin unlock not enabled");

        // Accrue final rewards
        accrueRewards(lockId);
        
        lock.withdrawn = true;

        uint256 totalAmount = lock.principalAmount + lock.accruedRewards;
        
        // Determine recipient
        address recipientAddress;
        if (recipient == UnlockRecipient.Creator) {
            recipientAddress = lock.creator;
        } else if (recipient == UnlockRecipient.Admin) {
            recipientAddress = feeRecipient;
        } else {
            recipientAddress = lock.beneficiary;
        }

        // Return unused rewards to creator
        uint256 unusedRewards = lock.rewardAmount > lock.accruedRewards 
            ? lock.rewardAmount - lock.accruedRewards 
            : 0;

        IERC20(lock.token).safeTransfer(recipientAddress, totalAmount);
        
        if (unusedRewards > 0 && recipientAddress != lock.creator) {
            IERC20(lock.token).safeTransfer(lock.creator, unusedRewards);
        }

        emit AdminUnlock(lockId, msg.sender, recipientAddress, totalAmount);
    }

    /**
     * @dev Extend lock time and optionally add more rewards (creator only)
     */
    function extendLock(uint256 lockId, uint256 newUnlockTime, uint256 additionalRewards) external nonReentrant {
        Lock storage lock = locks[lockId];
        
        require(lock.id != 0, "Lock does not exist");
        require(lock.creator == msg.sender, "Only creator can extend");
        require(!lock.withdrawn, "Already withdrawn");
        require(newUnlockTime > lock.unlockTime, "New time must be later");

        // Accrue current rewards first
        accrueRewards(lockId);

        lock.unlockTime = newUnlockTime;

        if (additionalRewards > 0) {
            IERC20(lock.token).safeTransferFrom(msg.sender, address(this), additionalRewards);
            lock.rewardAmount += additionalRewards;
        }

        emit LockExtended(lockId, newUnlockTime, additionalRewards);
    }

    /**
     * @dev Change beneficiary (creator only)
     */
    function changeBeneficiary(uint256 lockId, address newBeneficiary) external {
        Lock storage lock = locks[lockId];
        
        require(lock.id != 0, "Lock does not exist");
        require(lock.creator == msg.sender, "Only creator can change beneficiary");
        require(!lock.withdrawn, "Already withdrawn");
        require(newBeneficiary != address(0), "Invalid beneficiary");

        address oldBeneficiary = lock.beneficiary;
        lock.beneficiary = newBeneficiary;
        locksByBeneficiary[newBeneficiary].push(lockId);

        emit BeneficiaryChanged(lockId, oldBeneficiary, newBeneficiary);
    }

    /**
     * @dev Change unlock recipient (creator only)
     */
    function changeUnlockRecipient(uint256 lockId, UnlockRecipient newRecipient) external {
        Lock storage lock = locks[lockId];
        
        require(lock.id != 0, "Lock does not exist");
        require(lock.creator == msg.sender, "Only creator can change recipient");
        require(!lock.withdrawn, "Already withdrawn");

        lock.unlockRecipient = newRecipient;
        lock.creatorCanClaim = newRecipient == UnlockRecipient.Creator;

        emit UnlockRecipientChanged(lockId, newRecipient);
    }

    /**
     * @dev Add more rewards to existing lock (anyone can add)
     */
    function addRewards(uint256 lockId, uint256 amount) external nonReentrant {
        Lock storage lock = locks[lockId];
        
        require(lock.id != 0, "Lock does not exist");
        require(!lock.withdrawn, "Already withdrawn");
        require(amount > 0, "Amount must be > 0");

        IERC20(lock.token).safeTransferFrom(msg.sender, address(this), amount);
        lock.rewardAmount += amount;
    }

    // View functions
    function getLock(uint256 lockId) external view returns (Lock memory) {
        return locks[lockId];
    }

    function getLocksByCreator(address creator) external view returns (uint256[] memory) {
        return locksByCreator[creator];
    }

    function getLocksByBeneficiary(address beneficiary) external view returns (uint256[] memory) {
        return locksByBeneficiary[beneficiary];
    }

    function getLocksByToken(address token) external view returns (uint256[] memory) {
        return locksByToken[token];
    }

    function getLocksDetailsByCreator(address creator) external view returns (Lock[] memory) {
        uint256[] memory lockIds = locksByCreator[creator];
        Lock[] memory result = new Lock[](lockIds.length);
        
        for (uint256 i = 0; i < lockIds.length; i++) {
            result[i] = locks[lockIds[i]];
        }
        
        return result;
    }

    function getLocksDetailsByBeneficiary(address beneficiary) external view returns (Lock[] memory) {
        uint256[] memory lockIds = locksByBeneficiary[beneficiary];
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

    function getRemainingLockTime(uint256 lockId) external view returns (uint256) {
        Lock storage lock = locks[lockId];
        if (lock.id == 0 || lock.withdrawn || block.timestamp >= lock.unlockTime) {
            return 0;
        }
        return lock.unlockTime - block.timestamp;
    }

    function getEstimatedTotalRewards(uint256 lockId) external view returns (uint256) {
        Lock storage lock = locks[lockId];
        if (lock.id == 0 || lock.dailyRewardRate == 0) {
            return 0;
        }

        uint256 totalDays = (lock.unlockTime - lock.lockTime) / 1 days;
        uint256 estimatedTotal = (lock.principalAmount * lock.dailyRewardRate * totalDays) / BASIS_POINTS;
        
        return estimatedTotal > lock.rewardAmount ? lock.rewardAmount : estimatedTotal;
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
