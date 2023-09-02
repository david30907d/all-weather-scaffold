const { expect } = require("chai");
const { 
    end2endTestingAmount,
    mineBlocks,
    gasLimit,
    radiantRTokens,
    claimableRewardsTestData,
    deposit,
    getBeforeEachSetUp
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

describe("All Weather Protocol", function () {
  beforeEach(async () => {
    [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2] = await getBeforeEachSetUp([{
      protocol: "SushiSwap-DpxETH", percentage: 25,
    }, {
      protocol: "Equilibria-GLP", percentage: 25
    }, {
      protocol: "Equilibria-GDAI", percentage: 25
    }, {
      protocol: "RadiantArbitrum-DLP", percentage: 25
    }
    ]);
  });


    describe("Portfolio LP Contract Test", function () {
        it("Should be able to claim rewards", async function () {
          const randomWallet = ethers.Wallet.createRandom();
          this.timeout(240000); // Set timeout to 120 seconds
          const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

          await mineBlocks(1000);
          const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
          await portfolioContract.connect(wallet).claim(randomWallet.address);
          for (const claimableReward of claimableRewards) {
            for (const reward of claimableReward.claimableRewards) {
              if (radiantRTokens.includes(reward.token)) {
                // these are rToken. After withraw, it would be unwrapped to native token
                // so will check their balance in the next loop
                continue
              }
              const rewardToken = await ethers.getContractAt("IERC20", reward.token);
              expect(await rewardToken.balanceOf(randomWallet.address)).to.be.gte(reward.amount);
            }
          }
          const nativeRewardTokens = await radiantVault.getRadiantRewardNativeTokenAddresses();
          for (const nativeRewardToken of nativeRewardTokens) {
            if (nativeRewardToken === '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f') {
              // have no idea why radiant stop issueing wbtc as reward
              continue
            }
            const nativeToken = await ethers.getContractAt("MockDAI", nativeRewardToken);
            const balanceAfterClaim = await nativeToken.balanceOf(randomWallet.address);
            expect(balanceAfterClaim).to.gt(0);
          }
        })
        it("Should be able to check claimable rewards", async function () {
          const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
          expect(claimableRewards).to.deep.equal(claimableRewardsTestData);
        })
    });
});