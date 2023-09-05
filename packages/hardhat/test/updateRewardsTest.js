const { expect } = require("chai");
const {
    end2endTestingAmount,
    getPendleZapOutData,
    mineBlocks,
    gasLimit,
    deposit,
    getBeforeEachSetUp,
    glpMarketPoolAddress,
    simulateTimeElasped,
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
let oneInchSwapDataForMagic;
let pendlePendleZapInData;

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic, pendlePendleZapInData, equilibriaPendleVault, pendleMarketLPT] = await getBeforeEachSetUp([{
            protocol: "RadiantArbitrum-DLP", percentage: 100
        }
        ], portfolioContractName = "PermanentPortfolioLPToken");
    });

    describe("Portfolio LP Contract Test", function () {
        it("userRewardsOfInvestedProtocols should be reset to 0 after claim()", async function () {
            const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

            const rewardPerShareZappedIn1 = await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]);
            expect(rewardPerShareZappedIn1).to.equal(0);
            await mineBlocks(2000); // wait for 7 hours, otherwise the reward/shares would be too small and be rounded to 0
            await deposit(end2endTestingAmount, wallet2, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);
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
            await deposit(end2endTestingAmount, wallet2, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.be.gt(0);
            await (await portfolioContract.connect(wallet2).claim(wallet2.address, { gasLimit: 30000000 })).wait();
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardPerTokenPaid(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.equal(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]));
            const rewardPerShareZappedIn3 = await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]);
            expect(rewardPerShareZappedIn3).to.be.gt(rewardPerShareZappedIn2);
        })
        // it("userRewardsOfInvestedProtocols should be reset to 0 after redeem()", async function () {
        //     await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

        //     currentTimestamp += 24 * 31 * 24 * 60 * 60; // Increment timestamp
        //     await simulateTimeElasped();

        //     await (await portfolioContract.connect(wallet).redeem(portfolioContract.balanceOf(wallet.address), wallet.address, fakePendleZapOut, { gasLimit: 30000000 })).wait();
        //     expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
        //     expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]));
        //     expect(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0])).to.be.gt(0);
        // })
    });
});