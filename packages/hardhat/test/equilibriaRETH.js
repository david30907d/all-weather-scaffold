const { expect } = require("chai");
const {
    end2endTestingAmount,
    getPendleZapOutData,
    mineBlocks,
    gasLimit,
    deposit,
    getBeforeEachSetUp,
    glpMarketPoolAddress,
    rethMarketPoolAddress
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
        [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster] = await getBeforeEachSetUp([{
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
        // it("Should be able to withdraw RETH from equilibria", async function () {
        //     this.timeout(240000); // Set timeout to 120 seconds
        //     const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData);

        //     let shares;
        //     for (const event of receipt.events) {
        //         if (event.topics.includes(equilibriaRETHVault.interface.getEventTopic('Deposit'))) {
        //             const decodedEvent = equilibriaRETHVault.interface.decodeEventLog('Deposit', event.data, event.topics);
        //             if (decodedEvent.owner === portfolioContract.address) {
        //                 shares = decodedEvent.shares;
        //             }
        //         }
        //     }
        //     const pendleZapOutData = await getPendleZapOutData(42161, rethMarketPoolAddress, rethToken.address, shares, 1);
        //     // // withdraw
        //     await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, pendleZapOutData[3], { gasLimit })).wait();
        //     // expect(await reth.balanceOf(wallet.address)).to.equal(shares);
        //     expect(await equilibriaRETHVault.totalAssets()).to.equal(0);
        // });

        // it("Should be able to claim rewards", async function () {
        //     this.timeout(240000); // Set timeout to 120 seconds
        //     const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData);


        //     await mineBlocks(100); // Mine 100 blocks
        //     const originalPendleToken = await pendleToken.balanceOf(wallet.address);
        //     const originalWethBalance = await weth.balanceOf(wallet.address);
        //     const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
        //     for (const claimableReward of claimableRewards) {
        //         if (claimableReward.protocol !== "Equilibria-RETH") {
        //             expect(claimableReward.claimableRewards).to.deep.equal([]);
        //         } else {
        //             expect(claimableReward.claimableRewards.length).to.equal(2);
        //             console.log(claimableReward)
        //             const pendleClaimableReward = claimableReward.claimableRewards[0].amount;
        //             const wethClaimableReward = claimableReward.claimableRewards[1].amount;
        //             expect(pendleClaimableReward).to.be.gt(0);
        //             expect(wethClaimableReward).to.be.gt(0);
        //             await portfolioContract.connect(wallet).claim(wallet.address);
        //             // NOTE: using `to.be.gt` instead of `to.equal` because the reward would somehow be increased after claim(). My hunch is that `claim()` would also claim the reward for the current block.
        //             expect((await pendleToken.balanceOf(wallet.address)).sub(originalPendleToken)).to.be.gt(pendleClaimableReward);
        //             expect((await weth.balanceOf(wallet.address)).sub(originalWethBalance)).to.be.gt(wethClaimableReward);
        //         }
        //     }

        //     const remainingClaimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
        //     for (const remainingClaimableReward of remainingClaimableRewards) {
        //         if (remainingClaimableReward.protocol === "Equilibria-RETH") {
        //             expect(remainingClaimableReward.claimableRewards[0].amount).to.equal(0);
        //             expect(remainingClaimableReward.claimableRewards[1].amount).to.equal(0);
        //         }
        //     }
        // })
        // it("Should be able to check claimable rewards", async function () {
        //     const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
        //     for (const protocol of claimableRewards) {
        //         expect(protocol.claimableRewards).to.deep.equal([]);
        //     }
        // })
    });
});