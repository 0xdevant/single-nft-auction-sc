// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const NFTAuction = await hre.ethers.getContractFactory("NFTAuction");
  const nftAuction = await NFTAuction.deploy();
  await nftAuction.deployed();
  console.log("NFT auction deployed to:", nftAuction.address);

  const ERC721 = await hre.ethers.getContractFactory("ERC721MockContract");
  const erc721 = await ERC721.deploy("My Precious NFT", "MPN");
  await erc721.deployed();
  console.log("Mock ERC721 deployed to:", nftAuction.address);

  const ERC20 = await hre.ethers.getContractFactory("ERC20MockContract");
  const erc20 = await ERC20.deploy("Mock ERC20", "MER");
  await erc20.deployed();
  console.log("Mock ERC20 deployed to:", nftAuction.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
