const { expect } = require("chai");
const {
    end2endTestingAmount,
    getPendleZapOutData,
    gDAIMarketPoolAddress,
    gasLimit,
    simulateAYearLater,
    getBeforeEachSetUp,
    deposit
} = require("./utils");
let { currentTimestamp } = require("./utils");

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

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract] = await getBeforeEachSetUp();
    });
    describe("Portfolio LP Contract Test", function () {
        it("Should be able to zapin with WETH and redeem", async function () {
            this.timeout(240000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);
            {
                // Iterate over the events and find the Deposit event
                for (const event of receipt.events) {
                    if (event.topics.includes(portfolioContract.interface.getEventTopic('Transfer'))) {
                        const decodedEvent = portfolioContract.interface.decodeEventLog('Transfer', event.data, event.topics);
                        if (decodedEvent.to === wallet.address && decodedEvent.from === '0x0000000000000000000000000000000000000000') {
                            expect(await portfolioContract.balanceOf(wallet.address)).to.equal(portfolioShares);
                            expect(decodedEvent.value).to.equal(portfolioShares);
                        }
                    }
                }
                const totalAssets = await portfolioContract.totalAssets();
                for (const asset of totalAssets) {
                    if (asset.vaultName === 'SushSwap-DpxETH') {
                        expect(asset.assets).to.equal(await dpxVault.balanceOf(portfolioContract.address));
                    } else if (asset.vaultName === 'Equilibria-GLP') {
                        expect(asset.assets).to.equal(await equilibriaGlpVault.balanceOf(portfolioContract.address));
                    } else if (asset.vaultName === 'Equilibria-GDAI') {
                        expect(asset.assets).to.equal(await equilibriaGDAIVault.balanceOf(portfolioContract.address));
                    } else {
                        throw new Error(`Unknown vault name ${asset.vaultName}`);
                    }
                }
            }

            // redeem
            {
                let equilibriaShares;
                for (const event of receipt.events) {
                    if (event.topics.includes(equilibriaGDAIVault.interface.getEventTopic('Deposit')) && event.address === equilibriaGDAIVault.address) {
                        const decodedEvent = equilibriaGDAIVault.interface.decodeEventLog('Deposit', event.data, event.topics);
                        if (decodedEvent.owner === portfolioContract.address) {
                            equilibriaShares = decodedEvent.shares;
                        }
                    }
                }

                currentTimestamp += 12 * 31 * 24 * 60 * 60; // Increment timestamp
                await simulateAYearLater();

                const totalAssetsWhichShouldBeWithdrew = await portfolioContract.totalAssets();
                const pendleZapOutData = await getPendleZapOutData(42161, gDAIMarketPoolAddress, gDAIToken.address, equilibriaShares, 1);
                // withdraw
                await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, pendleZapOutData[3], { gasLimit })).wait();
                for (const asset of totalAssetsWhichShouldBeWithdrew) {
                    if (asset.vaultName === 'SushSwap-DpxETH') {
                        expect(asset.assets).to.equal(await dpxSLP.balanceOf(wallet.address));
                    } else if (asset.vaultName === 'Equilibria-GLP') {
                        expect(asset.assets).to.equal(await pendleGlpMarketLPT.balanceOf(wallet.address));
                    } else if (asset.vaultName === 'Equilibria-GDAI') {
                        expect(asset.assets).to.equal(await pendleGDAIMarketLPT.balanceOf(wallet.address));
                    } else {
                        throw new Error(`Unknown vault name ${asset.vaultName}`);
                    }
                }
                const currentUnclaimedAssets = await portfolioContract.totalAssets();
                for (const asset of currentUnclaimedAssets) {
                    expect(asset.assets).to.equal(0);
                }

            }
        });
    });
});