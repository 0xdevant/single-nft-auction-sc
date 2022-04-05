const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const tokenId = 1;
const startPrice = 10000;
const auctionBidPeriod = 86400; // 1 day
const bidIncreasePercentage = 1000; // 10%
const tokenAmount = 50000;
const zeroERC20Tokens = 0;

describe("NFTAuction", function () {
  let ERC721;
  let erc721;
  let ERC20;
  let erc20;
  let NFTAuction;
  let nftAuction;
  let contractOwner;
  let user1;
  let user2;
  let user3;

  beforeEach(async () => {
    ERC721 = await ethers.getContractFactory("ERC721MockContract");
    ERC20 = await ethers.getContractFactory("ERC20MockContract");
    NFTAuction = await ethers.getContractFactory("NFTAuction");
    [contractOwner, user1, user2, user3] = await ethers.getSigners();

    erc721 = await ERC721.deploy("My Precious NFT", "MPN");
    await erc721.deployed();
    await erc721.mint(contractOwner.address, tokenId);

    erc20 = await ERC20.deploy("Mock ERC20", "MER");
    await erc20.deployed();
    await erc20.mint(user1.address, tokenAmount);
    await erc20.mint(user2.address, tokenAmount);
    await erc20.mint(user3.address, tokenAmount);

    otherErc20 = await ERC20.deploy("Another Token", "ANT");
    await otherErc20.deployed();
    await otherErc20.mint(user2.address, tokenAmount);

    nftAuction = await NFTAuction.deploy();
    await nftAuction.deployed();
    //approve our smart contract to transfer this NFT
    await erc721.approve(nftAuction.address, tokenId);
    await erc20.connect(user1).approve(nftAuction.address, tokenAmount);
    await erc20.connect(user2).approve(nftAuction.address, tokenAmount);
    await erc20.connect(user3).approve(nftAuction.address, tokenAmount);
  });

  it("should have correct balance of ERC20 token after minting", async function () {
    expect(await erc20.balanceOf(user2.address)).to.equal(
      BigNumber.from(tokenAmount).toString()
    );
  });

  it("should allow user to approve NFTAuction smart contract and have correct allowance", async function () {
    await erc20.connect(user2).approve(nftAuction.address, startPrice);
    expect(await erc20.allowance(user2.address, nftAuction.address)).to.equal(
      BigNumber.from(startPrice).toString()
    );
  });

  it("should not transfer owner's NFT to auction contract after createNFTAuction if no bid is made yet", async function () {
    await nftAuction.createNFTAuction(
      erc721.address,
      tokenId,
      erc20.address,
      startPrice,
      auctionBidPeriod,
      bidIncreasePercentage
    );

    expect(await erc721.ownerOf(tokenId)).to.equal(contractOwner.address);
  });

  it("should not allow minimum bid increase percentage below minimum bid increase percentage", async function () {
    await expect(
      nftAuction.createNFTAuction(
        erc721.address,
        tokenId,
        erc20.address,
        startPrice,
        auctionBidPeriod,
        300
      )
    ).to.be.revertedWith("Bid increase percentage too low");
  });

  it("should revert new auction with startPrice of 0", async function () {
    await expect(
      nftAuction.createNFTAuction(
        erc721.address,
        tokenId,
        erc20.address,
        0,
        auctionBidPeriod,
        bidIncreasePercentage
      )
    ).to.be.revertedWith("Starting price cannot be 0");
  });

  it("should allow owner to create default auction", async function () {
    await nftAuction.createDefaultNFTAuction(
      erc721.address,
      tokenId,
      erc20.address,
      startPrice
    );

    expect(await nftAuction._getNFTSeller()).to.equal(contractOwner.address);
  });

  it("should not allow users other than contract owner to create auction", async function () {
    await expect(
      nftAuction
        .connect(user1)
        .createDefaultNFTAuction(
          erc721.address,
          tokenId,
          erc20.address,
          startPrice
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  describe("Scenario A: when no bids made yet on auction", function () {
    beforeEach(async function () {
      await nftAuction.createDefaultNFTAuction(
        erc721.address,
        tokenId,
        erc20.address,
        startPrice
      );
    });

    it("should not transfer NFT to the contract and not update auction end", async function () {
      expect(await erc721.ownerOf(tokenId)).to.equal(contractOwner.address);
      expect(await nftAuction._getAuctionEnd()).to.equal(0);
    });
  });

  describe("Scenario B: when a new bid is made on auction", function () {
    beforeEach(async function () {
      await nftAuction
        .connect(contractOwner)
        .createDefaultNFTAuction(
          erc721.address,
          tokenId,
          erc20.address,
          startPrice
        );
    });

    it("First user to bid on auction with ERC20, NFT is then escrowed", async function () {
      await nftAuction.connect(user2).makeBid(erc20.address, startPrice);

      const highestBid = await nftAuction._getHighestBid();
      expect(await nftAuction._getHighestBidder()).to.equal(user2.address);
      expect(highestBid.toString()).to.be.equal(BigNumber.from(startPrice));

      // The NFT is now escrowed by the address of smart contract
      expect(await erc721.ownerOf(tokenId)).to.equal(nftAuction.address);
      // AuctionEnd would not be 0
      expect(await nftAuction._getAuctionEnd()).to.be.not.equal(
        await nftAuction._getAuctionBidPeriod()
      );
      expect(await nftAuction._getAuctionEnd()).to.be.not.equal(
        BigNumber.from(0)
      );
    });

    it("Second user to bid on auction, should reverse previous bid if this bid is higher", async function () {
      await nftAuction.connect(user2).makeBid(erc20.address, startPrice);
      // highest bidder is user2 at the moment
      expect(await nftAuction._getHighestBidder()).to.be.equal(user2.address);
      await nftAuction.connect(user3).makeBid(erc20.address, startPrice + 1000);

      // highest bid is now 11000
      const highestBid = await nftAuction._getHighestBid();
      expect(highestBid.toString()).to.be.equal(
        BigNumber.from(startPrice + 1000)
      );

      // user2 get back own $10000 bid amount of ERC20 tokens
      expect(await erc20.balanceOf(user2.address)).to.equal(
        BigNumber.from(tokenAmount).toString()
      );

      // user3 paid $1100 bid amount of ERC20 tokens
      expect(await erc20.balanceOf(user3.address)).to.equal(
        BigNumber.from(tokenAmount - 11000).toString()
      );

      // highest bidder is now user3
      expect(await nftAuction._getHighestBidder()).to.equal(user3.address);
    });

    it("should not let seller bid on his/her own NFT", async function () {
      await expect(
        nftAuction.makeBid(erc20.address, startPrice)
      ).to.be.revertedWith("Seller cannot bid on own NFT");
    });

    it("should not let bidder bid with another ERC20 token", async function () {
      await expect(
        nftAuction.connect(user3).makeBid(otherErc20.address, startPrice)
      ).to.be.revertedWith("Bid has to be made in specified ERC20 token");
    });

    it("should not let user send 0 tokenAmount", async function () {
      await expect(
        nftAuction.connect(user2).makeBid(erc20.address, zeroERC20Tokens)
      ).to.be.revertedWith("Bid has to be made in specified ERC20 token");
    });

    it("should not allow bid lower than minimum bid percentage", async function () {
      nftAuction.connect(user2).makeBid(erc20.address, startPrice);
      await expect(
        nftAuction
          .connect(user3)
          .makeBid(erc20.address, (startPrice * 10100) / 10000) // only bid 2.5% higher instead of the minimum bid percentage 5%
      ).to.be.revertedWith("The bid amount is less than previous bid");
    });

    it("should allow new bid higher than minimum percentage", async function () {
      await nftAuction.connect(user2).makeBid(erc20.address, startPrice);
      const bidIncreaseByMinPercentage =
        (startPrice * (10000 + bidIncreasePercentage)) / 10000;
      await nftAuction
        .connect(user3)
        .makeBid(erc20.address, bidIncreaseByMinPercentage);

      const highestBid = await nftAuction._getHighestBid();
      expect(await nftAuction._getHighestBidder()).to.equal(user3.address);
      expect(highestBid.toString()).to.be.equal(
        BigNumber.from(bidIncreaseByMinPercentage).toString()
      );
    });
  });

  describe("Final Scenario: settle auction after several bids are made", async function () {
    beforeEach(async function () {
      await nftAuction.createDefaultNFTAuction(
        erc721.address,
        tokenId,
        erc20.address,
        startPrice
      );
    });
    it("should allow multiple bids and conclude auction after end period", async function () {
      await nftAuction.connect(user1).makeBid(erc20.address, startPrice);
      const bidIncreaseByMinPercentage =
        (startPrice * (10000 + bidIncreasePercentage)) / 10000;
      await network.provider.send("evm_increaseTime", [auctionBidPeriod / 2]);

      await nftAuction
        .connect(user2)
        .makeBid(erc20.address, bidIncreaseByMinPercentage);
      await network.provider.send("evm_increaseTime", [86000]);

      const bidIncreaseByMinPercentage2 =
        (bidIncreaseByMinPercentage * (10000 + bidIncreasePercentage)) / 10000;
      await nftAuction
        .connect(user3)
        .makeBid(erc20.address, bidIncreaseByMinPercentage2);
      await network.provider.send("evm_increaseTime", [86001]);

      const bidIncreaseByMinPercentage3 =
        (bidIncreaseByMinPercentage2 * (10000 + bidIncreasePercentage)) / 10000;
      await nftAuction
        .connect(user2)
        .makeBid(erc20.address, bidIncreaseByMinPercentage3);

      // highest bidder should not be able to settle auction yet if the auction is still on going
      await expect(
        nftAuction.connect(user2).claimAuctionResult(erc721.address, tokenId)
      ).to.be.revertedWith("Auction is not ended yet");
      // auction has ended
      await network.provider.send("evm_increaseTime", [auctionBidPeriod + 1]);

      // auction can only be settled by the highest bidder
      await expect(
        nftAuction.connect(user1).claimAuctionResult(erc721.address, tokenId)
      ).to.be.revertedWith("Caller is not the highest bidder");
      await nftAuction
        .connect(user2)
        .claimAuctionResult(erc721.address, tokenId);

      // User 2 is able to claim the NFT
      expect(await erc721.ownerOf(tokenId)).to.equal(user2.address);
      // contract owner should receive the amount of highest bid in ERC20 token
      expect(await erc20.balanceOf(contractOwner.address)).to.equal(
        BigNumber.from(bidIncreaseByMinPercentage3).toString()
      );

      // _resetBids & _resetAuction are called after the auction is settled
      expect(await nftAuction._getHighestBidder()).to.equal(ZERO_ADDRESS);
      expect(await nftAuction._getStartPrice()).to.equal(0);
    });
  });
});
