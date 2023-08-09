const { expect } = require("chai");
const {
    end2endTestingAmount,
    getPendleZapOutData,
    mineBlocks,
    gasLimit,
    deposit,
    getBeforeEachSetUp,
    glpMarketPoolAddress,
    simulateAYearLater,
    fakePendleZapOut,
    radiantRTokens
} = require("./utils"); let { currentTimestamp } = require("./utils");

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

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster] = await getBeforeEachSetUp([{
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
            const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData,);

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
            await deposit(end2endTestingAmount, wallet2, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData,)

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
        it("userRewardsOfInvestedProtocols should be reset to 0 after claim()", async function () {
            const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData,);

            const rewardPerShareZappedIn1 = await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]);
            expect(rewardPerShareZappedIn1).to.equal(0);
            await mineBlocks(2000); // wait for 7 hours, otherwise the reward/shares would be too small and be rounded to 0
            await deposit(end2endTestingAmount, wallet2, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData,);

            const rewardPerShareZappedIn2 = await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]);
            expect(rewardPerShareZappedIn2).to.be.gt(rewardPerShareZappedIn1);

            // claim
            expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            await (await portfolioContract.connect(wallet).claim(wallet.address, { gasLimit: 30000000 })).wait();
            expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]));
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);

            // 2nd deposit for wallet2
            await weth.connect(wallet2).deposit({ value: ethers.utils.parseEther("0.1"), gasLimit });
            await mineBlocks(2000); // wait for 7 hours, otherwise the reward/shares would be too small and be rounded to 0
            await deposit(end2endTestingAmount, wallet2, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData,);

            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.be.gt(0);
            await (await portfolioContract.connect(wallet2).claim(wallet2.address, { gasLimit: 30000000 })).wait();
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardPerTokenPaid(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.equal(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]));
            const rewardPerShareZappedIn3 = await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]);
            expect(rewardPerShareZappedIn3).to.be.gt(rewardPerShareZappedIn2);

        })
        // it("userRewardsOfInvestedProtocols should be reset to 0 after redeem()", async function () {
        //     await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

        //     currentTimestamp += 24 * 31 * 24 * 60 * 60; // Increment timestamp
        //     await simulateAYearLater();

        //     await (await portfolioContract.connect(wallet).redeem(portfolioContract.balanceOf(wallet.address), wallet.address, fakePendleZapOut, { gasLimit: 30000000 })).wait();
        //     expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
        //     expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]));
        //     expect(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0])).to.be.gt(0);
        // })
    });
});