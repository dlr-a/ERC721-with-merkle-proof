const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const nftFactory = await ethers.getContractFactory("Nft");
  const nft = await nftFactory.deploy();
  await nft.waitForDeployment();

  console.log(`Contract deployed at ` + (await nft.getAddress()));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
