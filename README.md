# All Weather Portfolio

## Deploy & Verify

`npx hardhat run --network arbitrumGoerli deploy/deployPermanentPortfolio.js`

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

