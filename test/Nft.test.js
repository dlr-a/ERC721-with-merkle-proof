const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const getProof = (signer) => {
  const leaf = keccak256(signer.address);

  const hexProof = merkleTree.getHexProof(leaf);

  return hexProof;
};

describe("Nft", () => {
  let nft;
  let nftAddress;
  let owner;
  let account;
  const addressZero = ethers.ZeroAddress;
  const amount = 100;

  before(async () => {
    this.Contract = await ethers.getContractFactory("Nft");
    [owner, wl1, wl2, wl3, hacker] = await ethers.getSigners();

    // only wl1 and wl2 are whitelisted
    whitelistAddresses = [owner.address, wl1.address, wl2.address, wl3.address];
    leafNodes = whitelistAddresses.map((addr) => keccak256(addr));
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    rootHash = merkleTree.getRoot();
    console.log("test merkle tree: ", merkleTree.toString("hex"));
  });

  beforeEach(async () => {
    const Nft = await ethers.getContractFactory("Nft");
    nft = await Nft.deploy();
    nftAddress = await nft.getAddress();
  });

  describe("constructor", () => {
    it("owner should correct", async () => {
      expect(await nft.owner()).to.be.equal(owner.address);
    });

    it("contract name should true", async () => {
      expect(await nft.name()).to.be.equal("Nft");
    });

    it("contract symbol should true", async () => {
      expect(await nft.symbol()).to.be.equal("N");
    });
  });

  describe("supportsInterface", () => {
    it("supportsInterface works", async () => {
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.equal(true);
    });
  });

  describe("addToBlackList", () => {
    it("addToBlackList works", async () => {
      await nft.addToBlackList(wl3.address);
      expect(await nft.isAtBlackList(wl3.address)).to.be.equal(true);
    });

    it("cant mint", async () => {
      await nft.addToBlackList(wl3.address);
      await nft.setSale(2);
      await expect(
        nft.connect(wl3).publicSaleMint(3, { value: ethers.parseEther("5.0") })
      )
        .to.be.revertedWithCustomError(nft, "AccountAtBlackList")
        .withArgs(wl3.address);
    });

    it("should revert because address already added", async () => {
      await nft.addToBlackList(wl3.address);
      await expect(nft.addToBlackList(wl3.address))
        .to.be.revertedWithCustomError(nft, "AddressAlreadyAdded")
        .withArgs(wl3.address);
    });
  });

  describe("preSaleMint", () => {
    it("preSaleMint works", async () => {
      await nft.setSale(1);
      await nft.connect(wl1).preSaleMint(3, getProof(wl1), {
        value: ethers.parseEther("5.0"),
      });
      expect(await nft.balanceOf(wl1.address)).to.be.equal(3);
    });

    it("should revert because account at the blacklist", async () => {
      await nft.addToBlackList(wl1.address);
      await nft.setSale(1);
      await expect(
        nft.connect(wl1).preSaleMint(3, getProof(wl1), {
          value: ethers.parseEther("5.0"),
        })
      )
        .to.be.revertedWithCustomError(nft, "AccountAtBlackList")
        .withArgs(wl1.address);
    });

    it("should revert because preSale is not open", async () => {
      await expect(
        nft.connect(wl1).preSaleMint(3, getProof(wl1), {
          value: ethers.parseEther("5.0"),
        })
      ).to.be.revertedWithCustomError(nft, "PreSaleIsNotOpen");
    });

    it("should revert because max presale supply exceeds", async () => {
      await nft.setSale(1);
      await nft.connect(wl1).preSaleMint(4, getProof(wl1), {
        value: ethers.parseEther("5.0"),
      });
      await expect(
        nft.connect(wl2).preSaleMint(3, getProof(wl2), {
          value: ethers.parseEther("5.0"),
        })
      )
        .to.be.revertedWithCustomError(nft, "ExceedsMaxSupplyPresale")
        .withArgs(await nft.presaleSupply());
    });

    it("should revert because insufficient payment", async () => {
      await nft.setSale(1);
      await expect(
        nft.connect(wl1).preSaleMint(3, getProof(wl1), {
          value: ethers.parseEther("0.001"),
        })
      )
        .to.be.revertedWithCustomError(nft, "InsufficentPayment")
        .withArgs(wl1.address, ethers.parseEther("0.001"));
    });

    it("should revert because exceeds max quantity per address for presale", async () => {
      await nft.setSale(1);
      await nft.connect(wl1).preSaleMint(3, getProof(wl1), {
        value: ethers.parseEther("5.0"),
      });
      await expect(
        nft.connect(wl1).preSaleMint(3, getProof(wl1), {
          value: ethers.parseEther("5.0"),
        })
      )
        .to.be.revertedWithCustomError(
          nft,
          "ExceedsMaxQuantityPerAddressPresale"
        )
        .withArgs(wl1.address);
    });

    it("should revert because exceeds max quantity per transaction for presale", async () => {
      await nft.setSale(1);
      await expect(
        nft.connect(wl1).preSaleMint(5, getProof(wl1), {
          value: ethers.parseEther("5.0"),
        })
      )
        .to.be.revertedWithCustomError(
          nft,
          "ExceedsMaxQuantityPerPresaleTransaction"
        )
        .withArgs(wl1.address);
    });

    it("should revert because account isnt in the whitelist", async () => {
      await nft.setSale(1);
      await expect(
        nft.connect(hacker).preSaleMint(3, getProof(hacker), {
          value: ethers.parseEther("5.0"),
        })
      )
        .to.be.revertedWithCustomError(nft, "InvalidProof")
        .withArgs(hacker.address);
    });
  });

  describe("publicSaleMint", () => {
    it("publicSaleMint works", async () => {
      await nft.setSale(2);
      await nft.connect(hacker).publicSaleMint(3, {
        value: ethers.parseEther("5.0"),
      });
      expect(await nft.balanceOf(hacker.address)).to.be.equal(3);
    });

    it("should revert because account at the blacklist", async () => {
      await nft.addToBlackList(hacker.address);
      await nft.setSale(2);
      await expect(
        nft.connect(hacker).publicSaleMint(3, {
          value: ethers.parseEther("5.0"),
        })
      )
        .to.be.revertedWithCustomError(nft, "AccountAtBlackList")
        .withArgs(hacker.address);
    });

    it("should revert because publicSale is not open", async () => {
      await expect(
        nft.connect(hacker).publicSaleMint(3, {
          value: ethers.parseEther("5.0"),
        })
      ).to.be.revertedWithCustomError(nft, "PublicSaleIsNotOpen");
    });

    it("should revert because max publicsale supply exceeds", async () => {
      await nft.setSale(2);
      await nft.connect(wl1).publicSaleMint(4, {
        value: ethers.parseEther("5.0"),
      });
      await nft.connect(hacker).publicSaleMint(4, {
        value: ethers.parseEther("5.0"),
      });
      await expect(
        nft.connect(hacker).publicSaleMint(3, {
          value: ethers.parseEther("5.0"),
        })
      )
        .to.be.revertedWithCustomError(nft, "ExceedsMaxSupplyPublicSale")
        .withArgs(await nft.publicSaleSupply());
    });

    it("should revert because insufficient payment", async () => {
      await nft.setSale(2);
      await expect(
        nft.connect(hacker).publicSaleMint(3, {
          value: ethers.parseEther("0.001"),
        })
      )
        .to.be.revertedWithCustomError(nft, "InsufficentPayment")
        .withArgs(hacker.address, ethers.parseEther("0.001"));
    });

    it("should revert because exceeds max quantity per address for publicsale", async () => {
      await nft.setSale(2);
      await nft.connect(hacker).publicSaleMint(4, {
        value: ethers.parseEther("5.0"),
      });
      await expect(
        nft.connect(hacker).publicSaleMint(3, {
          value: ethers.parseEther("5.0"),
        })
      )
        .to.be.revertedWithCustomError(
          nft,
          "ExceedsMaxQuantityPerAddressPublic"
        )
        .withArgs(hacker.address);
    });

    it("should revert because exceeds max quantity per transaction for publicsale", async () => {
      await nft.setSale(2);
      await expect(
        nft.connect(hacker).publicSaleMint(6, {
          value: ethers.parseEther("5.0"),
        })
      )
        .to.be.revertedWithCustomError(
          nft,
          "ExceedsMaxQuantityPerPublicTransaction"
        )
        .withArgs(hacker.address);
    });
  });

  describe("tokenURI", () => {
    it("tokenURI should correct -reveal true", async () => {
      await nft.setSale(2);
      await nft.publicSaleMint(3, { value: ethers.parseEther("5.0") });
      await nft.revealCollection();
      expect(await nft.tokenURI(1)).to.equal(
        "ipfs://bafybeihmfwdkcj7rqakydgtetiop3fh7hyoo5ilgifyeb7b5ftt5ah6oea/1.json"
      );
    });

    it("tokenURI should correct -reveal false", async () => {
      await nft.setSale(2);
      await nft.publicSaleMint(3, { value: ethers.parseEther("5.0") });
      expect(await nft.tokenURI(1)).to.equal(
        "ipfs://bafkreihnzikl37jgzddm5q32crap32433xzarxjynhzr2avd3so7nnw2oa"
      );
    });
  });

  describe("revealCollection", () => {
    it("revealCollection works -owner", async () => {
      await nft.revealCollection();
      expect(await nft.revealed()).to.be.equal(true);
    });

    it("should revert because account not owner", async () => {
      await expect(nft.connect(hacker).revealCollection())
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(hacker.address);
    });
  });

  describe("setSale", () => {
    it("setSale works -owner", async () => {
      await nft.setSale(2);
      expect(await nft.sale()).to.be.equal(2);
    });

    it("should revert because account not owner", async () => {
      await expect(nft.connect(hacker).setSale(2))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(hacker.address);
    });
  });

  describe("setMerkleRoot", () => {
    it("setMerkleRoot works - owner", async () => {
      const root =
        "0xa4453790033a2bd762f526409b7f358023773723d9e9bc42487e4996869162b6";
      await nft.setMerkleRoot(
        "0xa4453790033a2bd762f526409b7f358023773723d9e9bc42487e4996869162b6"
      );
      expect(await nft.MERKLE_ROOT()).to.be.equal(root);
    });

    it("should revert because account is not owner", async () => {
      await expect(
        nft
          .connect(hacker)
          .setMerkleRoot(
            "0xa4453790033a2bd762f526409b7f358023773723d9e9bc42487e4996869162b6"
          )
      )
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(hacker.address);
    });
  });

  describe("isAtBlackList", () => {
    it("isAtBlackList works", async () => {
      await nft.addToBlackList(hacker.address);
      expect(await nft.isAtBlackList(hacker.address)).to.be.equal(true);
    });

    it("isAtBlackList works", async () => {
      expect(await nft.isAtBlackList(hacker.address)).to.be.equal(false);
    });
  });

  describe("increaseBalance", () => {
    it("increaseBalance works", async () => {
      const beforeBalance = await nft.balanceOf(hacker.address);
      await nft.setSale(2);
      await nft.connect(hacker).publicSaleMint(3, {
        value: ethers.parseEther("5.0"),
      });
      const afterBalance = await nft.balanceOf(hacker.address);
      expect(beforeBalance).to.not.equal(afterBalance);
    });
  });
});
