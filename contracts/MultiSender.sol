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

    event RAMASent(address indexed sender, uint256 totalAmount, uint256 recipientCount);
    event TokensSent(address indexed token, address indexed sender, uint256 totalAmount, uint256 recipientCount);
    event NFTsSent(address indexed nft, address indexed sender, uint256 tokenCount);

    uint256 public serviceFee = 0.0001 ether; // 0.0001 RAMA per recipient
    address public feeRecipient;

    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
    }

    /**
     * @dev Send RAMA to multiple addresses
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

        // Send to all recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            payable(recipients[i]).transfer(amounts[i]);
        }

        // Transfer fee
        if (totalFee > 0) {
            payable(feeRecipient).transfer(totalFee);
        }

        // Refund excess
        uint256 excess = msg.value - totalAmount - totalFee;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }

        emit RAMASent(msg.sender, totalAmount, recipients.length);
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

        // Transfer tokens to all recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            tokenContract.safeTransferFrom(msg.sender, recipients[i], amounts[i]);
        }

        // Transfer fee
        if (totalFee > 0) {
            payable(feeRecipient).transfer(totalFee);
        }

        // Refund excess
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }

        emit TokensSent(token, msg.sender, totalAmount, recipients.length);
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

        // Transfer NFTs to all recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            nftContract.safeTransferFrom(msg.sender, recipients[i], tokenIds[i]);
        }

        // Transfer fee
        if (totalFee > 0) {
            payable(feeRecipient).transfer(totalFee);
        }

        // Refund excess
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }

        emit NFTsSent(nft, msg.sender, recipients.length);
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

        // Transfer tokens to all recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            tokenContract.safeTransferFrom(msg.sender, recipients[i], amount);
        }

        // Transfer fee
        if (totalFee > 0) {
            payable(feeRecipient).transfer(totalFee);
        }

        // Refund excess
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }

        emit TokensSent(token, msg.sender, totalAmount, recipients.length);
    }

    // Admin functions
    function setServiceFee(uint256 fee_) external onlyOwner {
        serviceFee = fee_;
    }

    function setFeeRecipient(address recipient_) external onlyOwner {
        require(recipient_ != address(0), "Invalid recipient");
        feeRecipient = recipient_;
    }

    function withdrawFees() external onlyOwner {
        payable(feeRecipient).transfer(address(this).balance);
    }

    // Allow contract to receive RAMA
    receive() external payable {}
}
