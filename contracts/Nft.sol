// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

error AddressAlreadyAdded(address account);
error AddressAtBlacklist(address account);
error PreSaleIsNotOpen();
error ExceedsMaxSupplyPresale(uint16 supply);
error InsufficentPayment(address account, uint256 amount);
error ExceedsMaxQuantityPerAddressPresale(address account);
error ExceedsMaxQuantityPerPresaleTransaction(address account);
error InvalidProof(address account);
error PublicSaleIsNotOpen();
error ExceedsMaxSupplyPublicSale(uint16 supply);
error ExceedsMaxQuantityPerAddressPublic(address account);
error ExceedsMaxQuantityPerPublicTransaction(address account);
error AccountAtBlackList(address account);

contract Nft is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    uint16 private constant MAX_SUPPLY = 10;
    uint16 private constant PRE_MAX_SUPPLY = 6;

    uint256 public presalePrice = 0.01 ether;
    uint256 public publicSalePrice = 0.02 ether;

    uint8 private maxNftPerAddressPre = 5;
    uint8 private maxNftPerAddressPublic = 6;

    uint8 private maxNftPerTransactionPre = 4;
    uint8 private maxNftPerTransactionPublic = 5;

    uint16 public presaleSupply;
    uint16 public publicSaleSupply;

    uint8 public sale;
    uint256 tokenAmount;

    bool public revealed = false;
    string private revealURI =
        "ipfs://bafkreihnzikl37jgzddm5q32crap32433xzarxjynhzr2avd3so7nnw2oa";

    string public baseURI =
        "ipfs://bafybeihmfwdkcj7rqakydgtetiop3fh7hyoo5ilgifyeb7b5ftt5ah6oea/";

    mapping(address => bool) public blackList;

    bytes32 public MERKLE_ROOT =
        0xd4453790033a2bd762f526409b7f358023773723d9e9bc42487e4996869162b6;

    constructor() ERC721("Nft", "N") Ownable(msg.sender) {}

    function addToBlackList(address userAddress) public onlyOwner {
        if (blackList[userAddress]) {
            revert AddressAlreadyAdded(userAddress);
        }
        blackList[userAddress] = true;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    // NFT presale
    function preSaleMint(
        uint8 quantity,
        bytes32[] calldata _merkleProof
    ) external payable {
        if (blackList[msg.sender] == true) {
            revert AccountAtBlackList(msg.sender);
        }

        if (sale != 1) {
            revert PreSaleIsNotOpen();
        }

        if (presaleSupply + quantity > PRE_MAX_SUPPLY) {
            revert ExceedsMaxSupplyPresale(presaleSupply);
        }

        if (msg.value < presalePrice * quantity) {
            revert InsufficentPayment(msg.sender, msg.value);
        }

        if (balanceOf(msg.sender) + quantity > maxNftPerAddressPre) {
            revert ExceedsMaxQuantityPerAddressPresale(msg.sender);
        }

        if (quantity > maxNftPerTransactionPre) {
            revert ExceedsMaxQuantityPerPresaleTransaction(msg.sender);
        }

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));

        if (!MerkleProof.verify(_merkleProof, MERKLE_ROOT, leaf)) {
            revert InvalidProof(msg.sender);
        }

        for (uint i = 0; i < quantity; i++) {
            uint mintIndex = totalSupply();
            _safeMint(msg.sender, mintIndex);
        }
        presaleSupply = presaleSupply + quantity;
    }

    // NFT public sale
    function publicSaleMint(uint8 quantity) external payable {
        if (blackList[msg.sender] == true) {
            revert AccountAtBlackList(msg.sender);
        }

        if (msg.value < publicSalePrice * quantity) {
            revert InsufficentPayment(msg.sender, msg.value);
        }

        if (sale != 2) {
            revert PublicSaleIsNotOpen();
        }

        if (publicSaleSupply + quantity > MAX_SUPPLY) {
            revert ExceedsMaxSupplyPublicSale(publicSaleSupply);
        }

        if (balanceOf(msg.sender) + quantity > maxNftPerAddressPublic) {
            revert ExceedsMaxQuantityPerAddressPublic(msg.sender);
        }

        if (quantity > maxNftPerTransactionPublic) {
            revert ExceedsMaxQuantityPerPublicTransaction(msg.sender);
        }

        for (uint i = 0; i < quantity; i++) {
            uint mintIndex = totalSupply();
            _safeMint(msg.sender, mintIndex);
        }
        publicSaleSupply = publicSaleSupply + quantity;
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        string memory uri;
        string memory nftUri = super.tokenURI(tokenId);

        if (revealed == true) {
            uri = string.concat(nftUri, ".json");
        } else {
            uri = revealURI;
        }
        return uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function revealCollection() public onlyOwner {
        revealed = true;
    }

    function setSale(uint8 _newSaleStatus) external onlyOwner {
        sale = _newSaleStatus;
    }

    function setMerkleRoot(bytes32 _newMerkleRoot) external onlyOwner {
        MERKLE_ROOT = _newMerkleRoot;
    }

    function isAtBlackList(address user) public view returns (bool value) {
        if (blackList[user]) {
            return true;
        } else {
            return false;
        }
    }
}
