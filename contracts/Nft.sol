// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Nft is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    uint16 private constant MAX_SUPPLY = 10;
    uint16 private constant PRE_MAX_SUPPLY = 7;

    uint256 public presalePrice = 0.01 ether;
    uint256 public publicSalePrice = 0.02 ether;

    uint8 private maxNftPerAddressPre = 4;
    uint8 private maxNftPerAddressPublic = 5;

    uint8 private maxNftPerTransactionPre = 4;
    uint8 private maxNftPerTransactionPublic = 5;

    uint8 public sale;

    uint256 tokenAmount;

    bool private revealed = false;
    string private revealURI = "";

    string private baseURI = "";

    mapping(address => bool) private blackList;

    bytes32 public MERKLE_ROOT =
        0x6ac265b6c954c343b80d8c7458ae034a667e2524ae254fdf03fe99d33fee8944;

    constructor() ERC721("Nft", "N") {}

    function addToBlackList(address userAddress) public onlyOwner {
        blackList[userAddress] = true;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {}

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function mint(address to, uint256 tokenId) public {
        require(blackList[msg.sender] == false, "user cant mint");
        _mint(to, tokenId);
    }

    function _burn(
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721URIStorage) {}

    // NFT presale
    function presaleMint(
        uint8 quantity,
        bytes32[] calldata _merkleProof,
        string[] calldata tokenURIs
    ) external payable {
        require(sale == 1, "presale is not open");
        require(
            totalSupply() + quantity <= PRE_MAX_SUPPLY,
            "exceeds max supply for presale"
        );
        require(msg.value >= presalePrice, "Insufficient payment");
        require(balanceOf(msg.sender) <= 4, "exceeds max quantity per address");
        require(quantity <= 4, "exceeds max quantity per presale transaction");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(_merkleProof, MERKLE_ROOT, leaf),
            "invalid proof"
        );
        for (uint i = 0; i < quantity; i++) {
            uint mintIndex = totalSupply();
            _safeMint(msg.sender, mintIndex);
            _setTokenURI(mintIndex, tokenURIs[i]);
        }
    }

    // NFT public sale
    function publicSaleMint(
        uint256 quantity,
        string[] calldata tokenURIs
    ) external payable {
        require(
            msg.value >= publicSalePrice * quantity,
            "Insufficient payment"
        );
        require(sale == 2, "public is not open");
        require(
            totalSupply() + quantity <= PRE_MAX_SUPPLY,
            "exceeds max supply for presale"
        );
        require(balanceOf(msg.sender) <= 5, "exceeds max quantity per address");
        require(quantity <= 5, "exceeds max quantity per public transaction");

        for (uint i = 0; i < quantity; i++) {
            uint mintIndex = totalSupply();
            _safeMint(msg.sender, mintIndex);
            _setTokenURI(mintIndex, tokenURIs[i]);
        }
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
        if (revealed == true) {
            return super.tokenURI(tokenId);
        } else {
            return revealURI;
        }
    }

    function _baseURI() internal view virtual override returns (string memory) {
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
}
