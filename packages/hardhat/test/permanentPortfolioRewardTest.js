const { expect } = require("chai");
const fs = require('fs');
const path = require('path');

const {
    end2endTestingAmount,
    gasLimit,
    claimableRewardsTestDataForPermanentPortfolio,
    sushiTokenAddress,
    getBeforeEachSetUp,
    deposit,
    radiantTokenAddress,
    simulateTimeElasped
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
let dlpToken;

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic, pendlePendleZapInData, equilibriaPendleVault, pendleMarketLPT, dlpToken] = await getBeforeEachSetUp([{
            protocol: "SushiSwap-MagicETH", percentage: 8,
        }, {
            protocol: "RadiantArbitrum-DLP", percentage: 15,
        }, {
            protocol: "Equilibria-GLP", percentage: 35
        }, {
            protocol: "Equilibria-GDAI", percentage: 12
        }, {
            protocol: "Equilibria-RETH", percentage: 6
        }, {
            protocol: "Equilibria-PENDLE", percentage: 24
        }
        ]);
    });
    describe("Portfolio LP Contract Test", function () {
        it("Should be able to claim rewards", async function () {
            const randomWallet = ethers.Wallet.createRandom();
            this.timeout(240000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);
            timeElasped = 24 * 7 * 86400; // 24 weeks later
            await simulateTimeElasped(timeElasped);
            const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
            for (const claimableReward of claimableRewards) {
                for (const reward of claimableReward.claimableRewards) {
                    if (reward.token === sushiTokenAddress || reward.token === radiantTokenAddress) {
                        continue
                    }
                    expect(reward.amount).to.be.gt(0);
                }
            }

            await portfolioContract.connect(wallet).claim(randomWallet.address);
            // magic
            expect(await magicToken.balanceOf(randomWallet.address)).to.be.gt(0);

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