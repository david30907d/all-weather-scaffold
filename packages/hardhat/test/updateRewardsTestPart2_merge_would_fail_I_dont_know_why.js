const { expect } = require("chai");
const {
    end2endTestingAmount,
    mineBlocks,
    deposit,
    getBeforeEachSetUp,
    radiantRTokens
} = require("./utils"); let { currentTimestamp } = require("./utils");

let wallet;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;
let portfolioContract;
let radiantVault;
let wallet2;
let oneInchSwapDataForRETH;
let pendleRETHZapInData;
let oneInchSwapDataForMagic;
let pendlePendleZapInData;

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic, pendlePendleZapInData, equilibriaPendleVault, pendleMarketLPT] = await getBeforeEachSetUp([{
            protocol: "RadiantArbitrum-DLP", percentage: 100
        }
        ], portfolioContractName = "AllWeatherPortfolioLPToken");
    });

    describe("Portfolio LP Contract Test", function () {
        it("Reward Should be different, if they zap in different timeing", async function () {
            this.timeout(2400000); // Set timeout to 120 seconds
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0])).to.equal(0);
            const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

            await mineBlocks(1700); // wait for 7 hours, otherwise the reward/shares would be too small and be rounded to 0
            const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
            for (claimableReward of claimableRewards) {
                if (claimableReward.protocol !== await radiantVault.name()) {
                    expect(claimableReward.claimableRewards).to.deep.equal([]);
                } else {
                    expect(claimableReward.claimableRewards.length).to.equal(8);
                    for (const [index, reward] of claimableReward.claimableRewards.entries()) {
                        if (index === 0 || index === 1) {
                            expect(reward.amount).to.equal(0);
                            continue
                        }
                        expect(reward.amount).to.be.gt(0);
                    }
                }
            }
            await deposit(end2endTestingAmount, wallet2, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

            for (const rToken of radiantRTokens) {
                expect(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), rToken)).to.be.gt(0);
                expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), rToken)).to.equal(0);
            }
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            const rewardsOfWallet2 = await portfolioContract.getClaimableRewards(wallet2.address);
            for (const [vaultIdx, claimableReward] of (await portfolioContract.getClaimableRewards(wallet.address)).entries()) {
                if (claimableReward.protocol !== await radiantVault.name()) {
                    expect(claimableReward.claimableRewards).to.deep.equal([]);
                } else {
                    expect(claimableReward.claimableRewards.length).to.equal(8);
                    for (const [index, reward] of claimableReward.claimableRewards.entries()) {
                        if (index === 0 || index === 1) {
                            expect(reward.amount).to.equal(0);
                            continue
                        }
                        const vaultRewardOfWallet2 = rewardsOfWallet2[vaultIdx].claimableRewards[index].amount;
                        expect(reward.amount).to.be.gt(vaultRewardOfWallet2);
                    }
                }
            }
        });
    });
});