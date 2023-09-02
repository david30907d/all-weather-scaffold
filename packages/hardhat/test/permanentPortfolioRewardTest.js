const { expect } = require("chai");
const fs = require('fs');
const path = require('path');

const {
    end2endTestingAmount,
    gasLimit,
    claimableRewardsTestDataForPermanentPortfolio,
    mineBlocks,
    sushiTokenAddress,
    getBeforeEachSetUp,
    deposit
} = require("./utils");
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

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic] = await getBeforeEachSetUp([{
            protocol: "SushiSwap-DpxETH", percentage: 25,
          }, {
            protocol: "Equilibria-GLP", percentage: 25
          }, {
            protocol: "Equilibria-GDAI", percentage: 25
          }, {
            protocol: "Equilibria-RETH", percentage: 25
          }
          ]);
    });
    describe("Portfolio LP Contract Test", function () {
        it("Should be able to claim rewards", async function () {
            const randomWallet = ethers.Wallet.createRandom();
            this.timeout(240000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic);
            await mineBlocks(1000);
            const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
            fs.writeFileSync(path.join(__dirname, 'fixtures', 'claimableRewards.json'), JSON.stringify(claimableRewards, null, 2), 'utf8')
            for (const claimableReward of claimableRewards) {
                for (const reward of claimableReward.claimableRewards) {
                    if (reward.token == sushiTokenAddress) {
                        continue
                    }
                    expect(reward.amount).to.be.gt(0);
                }
            }


            await portfolioContract.connect(wallet).claim(randomWallet.address);
            // dpx
            expect(await dpxToken.balanceOf(randomWallet.address)).to.be.gt(0);

            // gdai
            expect(await pendleToken.balanceOf(randomWallet.address)).to.be.gt(0);

            // glp
            expect(await weth.balanceOf(randomWallet.address)).to.be.gt(0);

        })
        it("Should be able to check claimable rewards", async function () {
            const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
            for (const protocol of claimableRewards) {
                expect(protocol.claimableRewards).to.deep.equal([]);
            }
        })
    });
});