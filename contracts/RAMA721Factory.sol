// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title RAMA721Collection
 * @dev RAMA-721 NFT Collection with customizable features
 */
contract RAMA721Collection is ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Burnable, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;
    string public baseURI;
    string public contractURI;
    uint256 public maxSupply;
    uint256 public mintPrice;
    bool public publicMintEnabled;
    bool public revealed;
    string public hiddenMetadataURI;

    event Minted(address indexed to, uint256 indexed tokenId);
    event BatchMinted(address indexed to, uint256 startId, uint256 count);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory contractURI_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        address owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        baseURI = baseURI_;
        contractURI = contractURI_;
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        publicMintEnabled = false;
        revealed = true;
    }

    function mint(address to) public payable returns (uint256) {
        require(publicMintEnabled || msg.sender == owner(), "Public mint not enabled");
        require(maxSupply == 0 || _nextTokenId < maxSupply, "Max supply reached");
        
        if (msg.sender != owner()) {
            require(msg.value >= mintPrice, "Insufficient payment");
        }

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        emit Minted(to, tokenId);
        return tokenId;
    }

    function mintBatch(address to, uint256 count) public payable returns (uint256[] memory) {
        require(publicMintEnabled || msg.sender == owner(), "Public mint not enabled");
        require(count > 0 && count <= 100, "Invalid count");
        require(maxSupply == 0 || _nextTokenId + count <= maxSupply, "Exceeds max supply");

        if (msg.sender != owner()) {
            require(msg.value >= mintPrice * count, "Insufficient payment");
        }

        uint256[] memory tokenIds = new uint256[](count);
        uint256 startId = _nextTokenId;

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            tokenIds[i] = tokenId;
        }

        emit BatchMinted(to, startId, count);
        return tokenIds;
    }

    function mintWithURI(address to, string memory uri_) public onlyOwner returns (uint256) {
        require(maxSupply == 0 || _nextTokenId < maxSupply, "Max supply reached");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri_);

        emit Minted(to, tokenId);
        return tokenId;
    }

    // View functions
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        require(tokenId < _nextTokenId, "Token does not exist");

        if (!revealed) {
            return hiddenMetadataURI;
        }

        string memory _tokenURI = super.tokenURI(tokenId);
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }

        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

    function totalMinted() public view returns (uint256) {
        return _nextTokenId;
    }

    // Admin functions
    function setBaseURI(string memory uri_) external onlyOwner {
        baseURI = uri_;
    }

    function setContractURI(string memory uri_) external onlyOwner {
        contractURI = uri_;
    }

    function setHiddenMetadataURI(string memory uri_) external onlyOwner {
        hiddenMetadataURI = uri_;
    }

    function setRevealed(bool revealed_) external onlyOwner {
        revealed = revealed_;
    }

    function setPublicMintEnabled(bool enabled_) external onlyOwner {
        publicMintEnabled = enabled_;
    }

    function setMintPrice(uint256 price_) external onlyOwner {
        mintPrice = price_;
    }

    function setMaxSupply(uint256 maxSupply_) external onlyOwner {
        require(maxSupply_ >= _nextTokenId, "Cannot reduce below minted");
        maxSupply = maxSupply_;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Required overrides
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

/**
 * @title RAMA721Factory
 * @dev Factory for deploying RAMA-721 NFT collections
 */
contract RAMA721Factory {
    event CollectionCreated(
        address indexed collectionAddress,
        address indexed owner,
        string name,
        string symbol
    );

    struct CollectionInfo {
        address collectionAddress;
        string name;
        string symbol;
        address owner;
        uint256 createdAt;
    }

    CollectionInfo[] public collections;
    mapping(address => CollectionInfo[]) public collectionsByOwner;
    
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

    function createCollection(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory contractURI_,
        uint256 maxSupply_,
        uint256 mintPrice_
    ) external payable returns (address) {
        require(msg.value >= creationFee, "Insufficient fee");

        RAMA721Collection collection = new RAMA721Collection(
            name_,
            symbol_,
            baseURI_,
            contractURI_,
            maxSupply_,
            mintPrice_,
            msg.sender
        );

        address collectionAddress = address(collection);

        CollectionInfo memory info = CollectionInfo({
            collectionAddress: collectionAddress,
            name: name_,
            symbol: symbol_,
            owner: msg.sender,
            createdAt: block.timestamp
        });

        collections.push(info);
        collectionsByOwner[msg.sender].push(info);

        // Transfer fee
        if (creationFee > 0) {
            payable(feeRecipient).transfer(creationFee);
        }

        // Refund excess
        if (msg.value > creationFee) {
            payable(msg.sender).transfer(msg.value - creationFee);
        }

        emit CollectionCreated(collectionAddress, msg.sender, name_, symbol_);

        return collectionAddress;
    }

    function getCollectionsCount() external view returns (uint256) {
        return collections.length;
    }

    function getCollectionsByOwner(address owner_) external view returns (CollectionInfo[] memory) {
        return collectionsByOwner[owner_];
    }

    function getAllCollections() external view returns (CollectionInfo[] memory) {
        return collections;
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
