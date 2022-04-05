# Single NFT Auction Smart Contract

NFT auction development task  
1. Admin can list an NFT for auction, and need to define the starting price, the price that increases each time, and the auction time window 
2. User can check the basic information of the auction, as well as the current price. 
3. You can query the bids of all users participating in the auction 
4. The user with the highest price at the end of the auction can claim NFT (need to pay the corresponding amount of ERC20)

## Deployment on Ropsten testnet
NFT auction deployed to: **0x273FA59A873181ad2Cb03878B3758DF76C240CD4**   
Mock ERC721 deployed to: **0x273FA59A873181ad2Cb03878B3758DF76C240CD4**   
Mock ERC20 deployed to: **0x273FA59A873181ad2Cb03878B3758DF76C240CD4**

For the parameters on ```createNFTAuction```, please use the above Mock contract addresses respecively for ```_nftContractAddress``` and ```_erc20Token```, and ```tokenId``` with 1.

P.S.: ```createDefaultNFTAuction``` is used to qucikly create an auction that uses the default bid increase percentage & auction bid period.

