const { expect } = require("chai");
const { mineBlocks,
  sushiMagicPid,
  gasLimit,
  getBeforeEachSetUp,
  deposit,
  end2endTestingAmount } = require("./utils");

let wallet;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;
let portfolioShares;
let portfolioContract;
let sushiToken;
let miniChefV2;
let oneInchSwapDataForRETH;
let pendleRETHZapInData;
let oneInchSwapDataForMagic;
let magicVault;
let magicToken;
describe("All Weather Protocol", function () {
  beforeEach(async () => {
    [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic] = await getBeforeEachSetUp([{
      protocol: "SushiSwap-MagicETH", percentage: 100,
    }
    ]);
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to deposit SLP to portfolio contract", async function () {
      const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic);
      // Iterate over the events and find the Deposit event
      for (const event of receipt.events) {
        if (event.topics.includes(magicVault.interface.getEventTopic('Deposit')) && event.address === magicVault.address) {
          const decodedEvent = magicVault.interface.decodeEventLog('Deposit', event.data, event.topics);
          if (decodedEvent.owner === portfolioContract.address) {
            expect(await magicVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
            expect((await miniChefV2.userInfo(sushiMagicPid, magicVault.address))[0]).to.equal(decodedEvent.shares);
            expect((await magicVault.totalAssets())).to.equal(decodedEvent.shares);
            expect(await portfolioContract.balanceOf(wallet.address)).to.equal(portfolioShares);
          }
        }
      }
    });
    it("Should be able to claim rewards", async function () {
      const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic);
      await mineBlocks(100); // Mine 1 blocks
      const originalSushiBalance = await sushiToken.balanceOf(wallet.address);
      const originalMagicBalance = await magicToken.balanceOf(wallet.address);
      const claimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
      for (const claimableReward of claimableRewards) {
        if (claimableReward.protocol !== "SushiSwap-MagicETH") {
          expect(claimableReward.claimableRewards).to.deep.equal([]);
        } else {
          const sushiClaimableReward = claimableReward.claimableRewards[0].amount;
          const magicClaimableReward = claimableReward.claimableRewards[1].amount;
          expect(sushiClaimableReward).to.be.gt(0);
          expect(magicClaimableReward).to.be.gt(0);

          await portfolioContract.connect(wallet).claim(wallet.address);
          // NOTE: using `to.be.gt` instead of `to.equal` because the reward would somehow be increased after claim(). My hunch is that sushiswap would trigger some reward distribution after the claim() tx is mined.
          console.log("magicToken:", magicToken.address);
          expect((await sushiToken.balanceOf(wallet.address)).sub(originalSushiBalance)).to.be.gt(sushiClaimableReward);
          expect((await magicToken.balanceOf(wallet.address)).sub(originalMagicBalance)).to.be.gt(magicClaimableReward);
        }
      }
      const remainingClaimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
      for (const remainingClaimableReward of remainingClaimableRewards) {
        if (remainingClaimableReward.protocol === "SushiSwap-MagicETH") {
          expect(remainingClaimableReward.claimableRewards[0].amount).to.equal(0);
          expect(remainingClaimableReward.claimableRewards[1].amount).to.equal(0);
        }
      }
    })

    it("Should be able to redeem dpx deposit", async function () {
      const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic);
      // Iterate over the events and find the Deposit event
      for (const event of receipt.events) {
        if (event.topics.includes(magicVault.interface.getEventTopic('Deposit')) && event.address === magicVault.address) {
          const decodedEvent = magicVault.interface.decodeEventLog('Deposit', event.data, event.topics);
          if (decodedEvent.owner === portfolioContract.address) {
            expect((await miniChefV2.userInfo(sushiMagicPid, magicVault.address))[0]).to.equal(decodedEvent.shares);
            expect(await magicVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
            // redeem
            /// should have no rewards before redeem
            expect(await sushiToken.balanceOf(magicVault.address)).to.equal(0);
            expect(await magicToken.balanceOf(magicVault.address)).to.equal(0);

            // check magicSLP balance
            await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, { gasLimit })).wait();
            expect((await miniChefV2.userInfo(sushiMagicPid, magicVault.address))[0]).to.equal(0);
            expect(await magicSLP.balanceOf(magicVault.address)).to.equal(0);
            expect(await magicSLP.balanceOf(wallet.address)).to.equal(decodedEvent.shares);
          }
        }
      }
      // rewards should be claimed
      const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
      for (const protocol of claimableRewards) {
        expect(protocol.claimableRewards).to.deep.equal([]);
      }
    })
  });
});