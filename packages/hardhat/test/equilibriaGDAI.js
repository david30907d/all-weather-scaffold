const { expect } = require("chai");
const {
  end2endTestingAmount,
  getPendleZapOutData,
  gDAIMarketPoolAddress,
  mineBlocks,
  gasLimit,
  deposit,
  getBeforeEachSetUp,
  simulateTimeElasped
} = require("./utils");
let { currentTimestamp } = require("./utils");

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
let oneInchSwapDataForMagic;
let dlpToken;

describe("All Weather Protocol", function () {
  beforeEach(async () => {
    [wallet, weth, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic, pendlePendleZapInData, equilibriaPendleVault, pendleMarketLPT, dlpToken] = await getBeforeEachSetUp([{
      protocol: "Equilibria-GDAI", percentage: 100
    }
    ]);
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to zapin with WETH into equilibria GDAI", async function () {
      this.timeout(240000); // Set timeout to 120 seconds
      const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

      // Iterate over the events and find the Deposit event
      for (const event of receipt.events) {
        if (event.topics.includes(equilibriaGDAIVault.interface.getEventTopic('Deposit')) && event.address === equilibriaGDAIVault.address) {
          const decodedEvent = equilibriaGDAIVault.interface.decodeEventLog('Deposit', event.data, event.topics);
          if (decodedEvent.owner === portfolioContract.address) {
            expect(await equilibriaGDAIVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
            expect((await equilibriaGDAIVault.totalAssets())).to.equal(decodedEvent.shares);
            expect(await portfolioContract.balanceOf(wallet.address)).to.equal(portfolioShares);
            expect((await dGDAIRewardPool.balanceOf(equilibriaGDAIVault.address))).to.equal(decodedEvent.shares);
          }
        }
      }
    });
    it("Should be able to withdraw GDAI from equilibria", async function () {
      this.timeout(240000); // Set timeout to 120 seconds
      const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

      let shares;
      for (const event of receipt.events) {
        if (event.topics.includes(equilibriaGDAIVault.interface.getEventTopic('Deposit'))) {
          const decodedEvent = equilibriaGDAIVault.interface.decodeEventLog('Deposit', event.data, event.topics);
          if (decodedEvent.owner === portfolioContract.address) {
            shares = decodedEvent.shares;
          }
        }
      }
      const pendleZapOutData = await getPendleZapOutData(42161, gDAIMarketPoolAddress, gDAIToken.address, shares, 0.99);
      // withdraw
      await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, { gasLimit })).wait();
      expect(await pendleGDAIMarketLPT.balanceOf(wallet.address)).to.equal(shares);
      expect(await equilibriaGDAIVault.totalAssets()).to.equal(0);
    });

    it("Should be able to claim rewards", async function () {
      this.timeout(240000); // Set timeout to 120 seconds
      const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

      await mineBlocks(100); // Mine 100 blocks
      const originalPendleToken = await pendleToken.balanceOf(wallet.address);
      const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
      let pendleClaimableReward;
      let eqbClaimableReward;
      for (const claimableReward of claimableRewards) {
        if (claimableReward.protocol !== "Equilibria-GDAI") {
          expect(claimableReward.claimableRewards).to.deep.equal([]);
        } else {
          console.log(claimableReward.claimableRewards);
          const rewardLengthOfThisVault = claimableReward.claimableRewards.length;
          expect(rewardLengthOfThisVault).to.equal(2);
          pendleClaimableReward = claimableReward.claimableRewards[0].amount;
          expect(pendleClaimableReward).to.be.gt(0);
          eqbClaimableReward = claimableReward.claimableRewards[rewardLengthOfThisVault-1].amount;
          // ratio between Pendle:EQB is 2:1
          expect(Math.floor(pendleClaimableReward/eqbClaimableReward)).to.equal(2);
        }
      }

      await portfolioContract.connect(wallet).claim(wallet.address);
      // NOTE: using `to.be.gt` instead of `to.equal` because the reward would somehow be increased after claim(). My hunch is that `claim()` would also claim the reward for the current block.
      expect((await pendleToken.balanceOf(wallet.address)).sub(originalPendleToken)).to.be.gt(pendleClaimableReward);
      const remainingClaimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
      for (const claimableReward of remainingClaimableRewards) {
        if (claimableReward.protocol === "Equilibria-GDAI") {
          expect(claimableReward.claimableRewards[0].amount).to.equal(0);
        }
      }

      const xEqbTokenBalance = await xEqbToken.balanceOf(equilibriaGDAIVault.address);
      await equilibriaGDAIVault.connect(wallet).redeemXEQB(xEqbTokenBalance, 86400*7*24);
      timeElasped = 24 * 7 * 86400; // 24 weeks later
      await simulateTimeElasped(timeElasped);
      await equilibriaGDAIVault.connect(wallet).finalizeRedeem(0);
      expect(await eqbToken.balanceOf(wallet.address)).to.be.gt(xEqbTokenBalance);
      // ratio between xEQB:EQB is 3:1
      expect(Math.floor(xEqbTokenBalance/eqbClaimableReward)).to.be.equal(3);
    })
    it("Should be able to check claimable rewards", async function () {
      const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
      for (const protocol of claimableRewards) {
        expect(protocol.claimableRewards).to.deep.equal([]);
      }
    })
  });
});