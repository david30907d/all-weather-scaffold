const { expect } = require("chai");
const {
    end2endTestingAmount,
    gasLimit,
    claimableRewardsTestDataForPermanentPortfolio,
    mineBlocks,
    sushiTokenAddress,
    getBeforeEachSetUp
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
async function deposit() {
    const depositData = {
        amount: end2endTestingAmount,
        receiver: wallet.address,
        oneInchDataDpx: oneInchSwapDataForDpx.tx.data,
        glpMinLpOut: pendleGLPZapInData[2],
        glpGuessPtReceivedFromSy: pendleGLPZapInData[3],
        glpInput: pendleGLPZapInData[4],
        gdaiMinLpOut: pendleGDAIZapInData[2],
        gdaiGuessPtReceivedFromSy: pendleGDAIZapInData[3],
        gdaiInput: pendleGDAIZapInData[4],
        gdaiOneInchDataGDAI: oneInchSwapDataForGDAI.tx.data
    }
    return await (await portfolioContract.connect(wallet).deposit(depositData, { gasLimit })).wait();
}


describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract] = await getBeforeEachSetUp();
    });
    describe("Portfolio LP Contract Test", function () {
        it("Should be able to claim rewards", async function () {
            const randomWallet = ethers.Wallet.createRandom();
            this.timeout(240000); // Set timeout to 120 seconds
            await deposit();
            await mineBlocks(1000);
            const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
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
            expect(claimableRewards).to.deep.equal(claimableRewardsTestDataForPermanentPortfolio);
        })
    });
});