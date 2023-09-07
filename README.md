# All Weather Portfolio

## Deploy & Verify

1. For Main net: If you got some error, remember to first `rm -rf artifacts` and then `npx hardhat clean`
2. For TestNet: `npx hardhat run --network arbitrumGoerli deploy/deployPermanentPortfolio.js`
3. For fronend development: `export TESTNET_API_URL=http://127.0.0.1:8545/; npx hardhat run --network localhost deploy/deployPermanentPortfolio.js`
4. Chain: `export BLOCK_NUMBER=123270171; yarn chain`
5. Update the contract addresses resides in `rebalance` server and `frontend`
6. (optional): Might need to manually verify if your deploy script fails: `npx hardhat verify --network arbitrum 0x47cF63A2C2a60efD53193504c8a9846D38254549 "0x14FbC760eFaF36781cB0eb3Cb255aD976117B9Bd"  "Equilibria-RETH" "ALP-EQB-RETH"`

## Test

* dpx: `BLOCK_NUMBER=97022421 yarn test test/dpxArbitrumVaultTest.js`
* radiant:
    * USDT: `BLOCK_NUMBER=86630670 yarn test test/radiantArbitrumVaultTest.js`
    * wETH: `BLOCK_NUMBER=101043121  yarn test test/radiantArbitrumVaultTest.js`
* arbitrum rich impersonate address: `0x2B9AcFd85440B7828DB8E54694Ee07b2B056B30C`

### How to Integrate New Protocols?

add the new vault into:
1. `deposit()` for loop
2. `redeem()` for loop
3. add new vault address in the portfolio's contructor, add its `require` accordingly and add this new vault into the `vault[]`
4. need to add lots of variable in `utils.js`
5. update need to manually add some tokens into `/debank` route in rebalance backend (for instance, 0xeeeeee for each blockchain can be different token)
6. need to find the API of that protocol you integrated first, and then calculate its `apr_composition` in `/apr_composition` endpoint in rebalance backend
7. check the result of `apr composition` on frontend side


## Develop

1. clean up cache:
    1. `rm -rf hardhat/cache`
    2. `yarn cache clean`
    3. `rm -rf artifacts`