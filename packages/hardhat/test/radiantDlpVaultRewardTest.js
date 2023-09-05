const { expect } = require("chai");
const {
  mineBlocks,
  simulateTimeElasped,
  radiantRTokens,
  end2endTestingAmount,
  getBeforeEachSetUp,
  deposit
} = require("./utils");
let {currentTimestamp} = require("./utils");

let wallet;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;
let portfolioContract;
let oneInchSwapDataForRETH;
let pendleRETHZapInData;
let oneInchSwapDataForMagic;
let pendlePendleZapInData;

  
describe("All Weather Protocol", function () {
  beforeEach(async () => {
    [wallet, weth, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic, pendlePendleZapInData, equilibriaPendleVault, pendleMarketLPT] = await getBeforeEachSetUp([{
      protocol: "RadiantArbitrum-DLP", percentage: 100
  }
  ]);
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to claim reward", async function () {
      this.timeout(240000); // Set timeout to 120 seconds
      const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

      await mineBlocks(20000); // Mine 100 blocks

      currentTimestamp += 12 * 31 * 24 * 60 * 60; // Increment timestamp
      await simulateTimeElasped();

      const randomWallet = ethers.Wallet.createRandom();
      let balancesBeforeClaim = [];
      for (const rToken of radiantRTokens) {
        const rTokenContract = await ethers.getContractAt("MockDAI", rToken);
        const balanceBeforeClaim = await rTokenContract.balanceOf(randomWallet.address);
        balancesBeforeClaim.push(balanceBeforeClaim);
        expect(balanceBeforeClaim).to.equal(0);
      }

      const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
      for (const claimableReward of claimableRewards) {
        if (claimableReward.protocol !== "RadiantArbitrum-DLP") {
          expect(claimableReward.claimableRewards).to.deep.equal([]);
        } else {
          expect(claimableReward.claimableRewards.length).to.equal(8);
        }
      }
      // Error: VM Exception while processing transaction: reverted with reason string 'SafeERC20: low-level call failed'
      // means you probably transfer a pretty weird token
      await (await portfolioContract.connect(wallet).claim(randomWallet.address, { gasLimit: 30000000 })).wait();
      for (const rToken of radiantRTokens) {
        const rTokenContract = await ethers.getContractAt("MockDAI", rToken);
        const balanceAfterClaim = await rTokenContract.balanceOf(randomWallet.address);
        expect(balanceAfterClaim).to.gt(balancesBeforeClaim.pop());
      }
    });
    it("Should be able to check claimable rewards", async function () {
      const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
      for (const protocol of claimableRewards) {
        expect(protocol.claimableRewards).to.deep.equal([]);
      }
    })
  });
});