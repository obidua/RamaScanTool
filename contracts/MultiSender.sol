// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MultiSender
 * @dev Batch transfer RAMA, RAMA-20 tokens, and RAMA-721 NFTs
 */
contract MultiSender is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Batch operation events
    event RAMASent(address indexed sender, uint256 totalAmount, uint256 recipientCount, uint256 fee, uint256 timestamp);
    event TokensSent(address indexed token, address indexed sender, uint256 totalAmount, uint256 recipientCount, uint256 fee, uint256 timestamp);
    event NFTsSent(address indexed nft, address indexed sender, uint256 tokenCount, uint256 fee, uint256 timestamp);
    
    // Individual transfer events for detailed logging
    event RAMATransfer(address indexed sender, address indexed recipient, uint256 amount, uint256 batchIndex);
    event TokenTransfer(address indexed token, address indexed sender, address indexed recipient, uint256 amount, uint256 batchIndex);
    event NFTTransfer(address indexed nft, address indexed sender, address indexed recipient, uint256 tokenId, uint256 batchIndex);
    
    // Fee events
    event FeeCollected(address indexed from, uint256 amount, uint256 recipientCount);
    event ServiceFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    uint256 public serviceFee = 0.0001 ether; // 0.0001 RAMA per recipient
    address public feeRecipient;
    
    // Statistics
    uint256 public totalBatchesSent;
    uint256 public totalRAMASent;
    uint256 public totalTokensSent;
    uint256 public totalNFTsSent;
    uint256 public totalFeesCollected;

    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
    }

    /**
     * @dev Send RAMA to multiple addresses
     * Uses call instead of transfer for better compatibility
     */
    function sendRAMA(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty recipients");

        uint256 totalFee = serviceFee * recipients.length;
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        require(msg.value >= totalAmount + totalFee, "Insufficient RAMA");

        // Send to all recipients using call (safer than transfer)
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            (bool success, ) = payable(recipients[i]).call{value: amounts[i]}("");
            require(success, "RAMA transfer failed");
            emit RAMATransfer(msg.sender, recipients[i], amounts[i], i);
        }

        // Transfer fee using call
        if (totalFee > 0) {
            (bool feeSuccess, ) = payable(feeRecipient).call{value: totalFee}("");
            require(feeSuccess, "Fee transfer failed");
            totalFeesCollected += totalFee;
            emit FeeCollected(msg.sender, totalFee, recipients.length);
        }

        // Refund excess using call
        uint256 excess = msg.value - totalAmount - totalFee;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "Refund failed");
        }

        // Update statistics
        totalBatchesSent++;
        totalRAMASent += totalAmount;

        emit RAMASent(msg.sender, totalAmount, recipients.length, totalFee, block.timestamp);
    }

    /**
     * @dev Send RAMA-20 tokens to multiple addresses
     * @notice Requires approval first
     */
    function sendTokens(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty recipients");
        require(token != address(0), "Invalid token");

        uint256 totalFee = serviceFee * recipients.length;
        require(msg.value >= totalFee, "Insufficient fee");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        IERC20 tokenContract = IERC20(token);
        require(tokenContract.allowance(msg.sender, address(this)) >= totalAmount, "Insufficient allowance");

        // Transfer tokens to all recipients and emit individual transfer events
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            tokenContract.safeTransferFrom(msg.sender, recipients[i], amounts[i]);
            emit TokenTransfer(token, msg.sender, recipients[i], amounts[i], i);
        }

        // Transfer fee
        if (totalFee > 0) {
            payable(feeRecipient).transfer(totalFee);
            totalFeesCollected += totalFee;
            emit FeeCollected(msg.sender, totalFee, recipients.length);
        }

        // Refund excess
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }

        // Update statistics
        totalBatchesSent++;
        totalTokensSent += totalAmount;

        emit TokensSent(token, msg.sender, totalAmount, recipients.length, totalFee, block.timestamp);
    }

    /**
     * @dev Send RAMA-721 NFTs to multiple addresses
     * @notice Requires approval first (setApprovalForAll)
     */
    function sendNFTs(
        address nft,
        address[] calldata recipients,
        uint256[] calldata tokenIds
    ) external payable nonReentrant {
        require(recipients.length == tokenIds.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty recipients");
        require(nft != address(0), "Invalid NFT");

        uint256 totalFee = serviceFee * recipients.length;
        require(msg.value >= totalFee, "Insufficient fee");

        IERC721 nftContract = IERC721(nft);
        require(nftContract.isApprovedForAll(msg.sender, address(this)), "Not approved");

        // Transfer NFTs to all recipients and emit individual transfer events
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            nftContract.safeTransferFrom(msg.sender, recipients[i], tokenIds[i]);
            emit NFTTransfer(nft, msg.sender, recipients[i], tokenIds[i], i);
        }

        // Transfer fee
        if (totalFee > 0) {
            payable(feeRecipient).transfer(totalFee);
            totalFeesCollected += totalFee;
            emit FeeCollected(msg.sender, totalFee, recipients.length);
        }

        // Refund excess
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }

        // Update statistics
        totalBatchesSent++;
        totalNFTsSent += recipients.length;

        emit NFTsSent(nft, msg.sender, recipients.length, totalFee, block.timestamp);
    }

    /**
     * @dev Send same amount to all recipients
     */
    function sendTokensSameAmount(
        address token,
        address[] calldata recipients,
        uint256 amount
    ) external payable nonReentrant {
        require(recipients.length > 0, "Empty recipients");
        require(token != address(0), "Invalid token");

        uint256 totalFee = serviceFee * recipients.length;
        require(msg.value >= totalFee, "Insufficient fee");

        uint256 totalAmount = amount * recipients.length;
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.allowance(msg.sender, address(this)) >= totalAmount, "Insufficient allowance");

        // Transfer tokens to all recipients and emit individual transfer events
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            tokenContract.safeTransferFrom(msg.sender, recipients[i], amount);
            emit TokenTransfer(token, msg.sender, recipients[i], amount, i);
        }

        // Transfer fee
        if (totalFee > 0) {
            payable(feeRecipient).transfer(totalFee);
            totalFeesCollected += totalFee;
            emit FeeCollected(msg.sender, totalFee, recipients.length);
        }

        // Refund excess
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }

        // Update statistics
        totalBatchesSent++;
        totalTokensSent += totalAmount;

        emit TokensSent(token, msg.sender, totalAmount, recipients.length, totalFee, block.timestamp);
    }

    // Admin functions
    function setServiceFee(uint256 fee_) external onlyOwner {
        uint256 oldFee = serviceFee;
        serviceFee = fee_;
        emit ServiceFeeUpdated(oldFee, fee_);
    }

    function setFeeRecipient(address recipient_) external onlyOwner {
        require(recipient_ != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = recipient_;
        emit FeeRecipientUpdated(oldRecipient, recipient_);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(feeRecipient).transfer(balance);
    }
    
    // View functions for statistics
    function getStats() external view returns (
        uint256 batches,
        uint256 ramaSent,
        uint256 tokensSent,
        uint256 nftsSent,
        uint256 feesCollected
    ) {
        return (totalBatchesSent, totalRAMASent, totalTokensSent, totalNFTsSent, totalFeesCollected);
    }

    // Allow contract to receive RAMA
    receive() external payable {}
}
