const { expect } = require("chai");
const {
  end2endTestingAmount,
  getPendleZapOutData,
  mineBlocks,
  gasLimit,
  deposit,
  getBeforeEachSetUp,
  glpMarketPoolAddress,
  rethMarketPoolAddress,
  simulateTimeElasped,
  fakePendleZapOut
} = require("./utils");
let {currentTimestamp} = require("./utils");

let wallet;
let weth;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;
let portfolioShares;
let dpxVault;
let equilibriaGDAIVault;
let equilibriaGlpVault;
let portfolioContract;
let sushiToken;
let miniChefV2;
let glpRewardPool;
let radiantVault;
let wallet2;
let rethToken;
let oneInchSwapDataForRETH;
let pendleRETHZapInData;
let equilibriaRETHVault;
let pendleRETHMarketLPT;
let pendleBooster;
let oneInchSwapDataForMagic;
let dlpToken;

describe("All Weather Protocol", function () {
  beforeEach(async () => {
      [wallet, weth, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic, pendlePendleZapInData, equilibriaPendleVault, pendleMarketLPT, dlpToken] = await getBeforeEachSetUp([{
        protocol: "SushiSwap-MagicETH", percentage: 0,
    }, {
        protocol: "RadiantArbitrum-DLP", percentage: 15,
    }, {
        protocol: "Equilibria-GLP", percentage: 0
    }, {
        protocol: "Equilibria-GDAI", percentage: 0
    }, {
        protocol: "Equilibria-RETH", percentage: 0
    }, {
        protocol: "Equilibria-PENDLE", percentage: 0
    }
    ]);
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to zapin with WETH into Radiant dLP", async function () {
      const originalVaultShare = await radiantVault.balanceOf(portfolioContract.address)
      expect(originalVaultShare).to.equal(0);

      const originalRadiantLockedDlpBalance = await radiantVault.totalAssets();
      expect(originalRadiantLockedDlpBalance).to.equal(0);
      const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

      const vaultShareAfterDeposit = await radiantVault.balanceOf(portfolioContract.address)
      expect(vaultShareAfterDeposit).to.gt(0);
      const radiantLockedDlpBalanceAfterDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceAfterDeposit).to.gt(end2endTestingAmount);
    });
    it("Should be able to withdraw Radiant dLP", async function () {
      const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
      const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

      const radiantLockedDlpBalanceAfterDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceAfterDeposit).to.gt(0);
      await simulateTimeElasped();
      // withdraw
      // Error: VM Exception while processing transaction: reverted with reason string 'SafeERC20: low-level call failed'
      // it means out of gas
      await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, { gasLimit: 30000000 })).wait();
      const radiantLockedDlpAfterRedeem = await radiantVault.totalAssets();
      expect(radiantLockedDlpAfterRedeem).to.equal(0);
      expect(await dlpToken.balanceOf(wallet.address)).to.equal(radiantLockedDlpBalanceAfterDeposit);
    });

    it("Should not be able to withdraw Radiant dLP", async function () {
      const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

      const totalAssets = await radiantVault.totalAssets();
      const totalLockedAssets = await radiantVault.totalLockedAssets();
      const totalUnlockedAssets = await radiantVault.totalUnstakedAssets();
      try {
        // Call the contract function that may throw an error
        await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, { gasLimit: gasLimit })).wait();
      } catch (error) {
        if (error.message.includes("dLP lock has not expired yet")) {
          expect(await radiantVault.totalAssets()).to.equal(totalAssets);
          expect(await radiantVault.totalLockedAssets()).to.equal(totalLockedAssets);
          expect(await radiantVault.totalStakedButWithoutLockedAssets()).to.equal(totalUnlockedAssets);
        } else {
          throw new Error(error.message);
        }
      }
    });
  });
});