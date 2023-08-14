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
describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken] = await getBeforeEachSetUp([{
            protocol: "Equilibria-RETH", percentage: 100
        }
        ]);
    });

    describe("Portfolio LP Contract Test", function () {
        it("Should be able to zapin with WETH into equilibria RETH", async function () {
            this.timeout(240000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData,);
            // Iterate over the events and find the Deposit event
            for (const event of receipt.events) {
                if (event.topics.includes(equilibriaRETHVault.interface.getEventTopic('Deposit')) && event.address === equilibriaRETHVault.address) {
                    const decodedEvent = equilibriaRETHVault.interface.decodeEventLog('Deposit', event.data, event.topics);
                    if (decodedEvent.owner === portfolioContract.address) {
                        expect(await equilibriaRETHVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
                        expect((await equilibriaRETHVault.totalAssets())).to.equal(decodedEvent.shares);
                        expect(await portfolioContract.balanceOf(wallet.address)).to.equal(portfolioShares);
                        const [a, b, rewardpool, c] = await pendleBooster.poolInfo(8);
                        expect(await ethers.getContractAt("IERC20", rewardpool).then(async (contract) => await contract.balanceOf(equilibriaRETHVault.address))).to.equal(decodedEvent.shares);
                    }
                }
            }
        });
        it("Should be able to withdraw RETH from equilibria", async function () {
            this.timeout(240000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData,);

            let shares;
            for (const event of receipt.events) {
                if (event.topics.includes(equilibriaRETHVault.interface.getEventTopic('Deposit')) && event.address === equilibriaRETHVault.address) {
                    const decodedEvent = equilibriaRETHVault.interface.decodeEventLog('Deposit', event.data, event.topics);
                    if (decodedEvent.owner === portfolioContract.address) {
                        shares = decodedEvent.shares;
                    }
                }
            }
            // withdraw
            await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, { gasLimit })).wait();
            expect(await pendleRETHMarketLPT.balanceOf(wallet.address)).to.equal(shares);
            expect(await equilibriaRETHVault.totalAssets()).to.equal(0);
        });

        it("Should be able to claim rewards", async function () {
            this.timeout(240000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData);


            await mineBlocks(100); // Mine 100 blocks
            const originalPendleToken = await pendleToken.balanceOf(wallet.address);
            const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
            let eqbClaimableReward;
            for (const claimableReward of claimableRewards) {
                if (claimableReward.protocol !== "Equilibria-RETH") {
                    expect(claimableReward.claimableRewards).to.deep.equal([]);
                } else {
                    const rewardLengthOfThisVault = claimableReward.claimableRewards.length;
                    expect(rewardLengthOfThisVault).to.equal(2);
                    const pendleClaimableReward = claimableReward.claimableRewards[0].amount;
                    expect(pendleClaimableReward).to.be.gt(0);

                    // ratio between Pendle:EQB is 2:1
                    eqbClaimableReward = claimableReward.claimableRewards[rewardLengthOfThisVault-1].amount;
                    expect(Math.floor(pendleClaimableReward/eqbClaimableReward)).to.equal(2);
          
                    await portfolioContract.connect(wallet).claim(wallet.address);
                    expect((await pendleToken.balanceOf(wallet.address)).sub(originalPendleToken)).to.be.gt(pendleClaimableReward);

                }
            }

            const remainingClaimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
            for (const remainingClaimableReward of remainingClaimableRewards) {
                if (remainingClaimableReward.protocol === "Equilibria-RETH") {
                    expect(remainingClaimableReward.claimableRewards[0].amount).to.equal(0);
                }
            }
            const xEqbTokenBalance = await xEqbToken.balanceOf(equilibriaRETHVault.address);
            await equilibriaRETHVault.connect(wallet).redeemXEQB(xEqbTokenBalance, 86400*7*24);
            timeElasped = 24 * 7 * 86400; // 24 weeks later
            await simulateTimeElasped(timeElasped);
            await equilibriaRETHVault.connect(wallet).finalizeRedeem(0);
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