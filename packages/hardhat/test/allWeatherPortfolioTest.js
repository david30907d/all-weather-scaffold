const { expect } = require("chai");
const { 
    end2endTestingAmount,
    getPendleZapOutData,
    gDAIMarketPoolAddress,
    gasLimit,
    simulateTimeElasped,
    getBeforeEachSetUp,
    deposit
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
        it("Should be able to zapin with WETH into All Weather Portfolio", async function () {
            this.timeout(240000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

            // Iterate over the events and find the Deposit event
            for (const event of receipt.events) {
                if (event.topics.includes(portfolioContract.interface.getEventTopic('Transfer'))) {
                    const decodedEvent = portfolioContract.interface.decodeEventLog('Transfer', event.data, event.topics);
                    expect(await portfolioContract.balanceOf(wallet.address)).to.equal(portfolioShares);
                    if (decodedEvent.to === wallet.address && decodedEvent.from === '0x0000000000000000000000000000000000000000') {
                        expect(decodedEvent.value).to.equal(end2endTestingAmount);
                    }
                }
            }
            const totalAssets = await portfolioContract.totalAssets();
            for (const asset of totalAssets) {
                if (asset.vaultName === 'SushiSwap-DpxETH') {
                    // expect(asset.assets).to.equal(await dpxVault.balanceOf(portfolioContract.address));
                } else if (asset.vaultName === 'RadiantArbitrum-DLP') {
                    expect(asset.assets).to.equal(await radiantVault.balanceOf(portfolioContract.address));
                } else if (asset.vaultName === 'Equilibria-GLP') {
                    expect(asset.assets).to.equal(await equilibriaGlpVault.balanceOf(portfolioContract.address));
                } else if (asset.vaultName === 'Equilibria-GDAI') {
                    expect(asset.assets).to.equal(await equilibriaGDAIVault.balanceOf(portfolioContract.address));
                } else {
                    throw new Error(`Unknown vault name ${asset.vaultName}`);
                }
            }
        });
        it("Should be able to withdraw everything from All Weather Portfolio", async function () {
          this.timeout(240000); // Set timeout to 120 seconds
          const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
          expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
          const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

          let shares;
          for (const event of receipt.events) {
            if (event.topics.includes(equilibriaGDAIVault.interface.getEventTopic('Deposit'))) {
              const decodedEvent = equilibriaGDAIVault.interface.decodeEventLog('Deposit', event.data, event.topics);
              if (decodedEvent.owner === portfolioContract.address) {
                  shares = decodedEvent.shares;
              }
            }
          }
          const pendleZapOutData = await getPendleZapOutData(42161, gDAIMarketPoolAddress, gDAIToken.address, shares, 1);

          currentTimestamp += 12 * 31 * 24 * 60 * 60; // Increment timestamp
          await simulateTimeElasped();
    
          const totalAssetsWhichShouldBeWithdrew = await portfolioContract.totalAssets();
          // withdraw
          await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, pendleZapOutData[3], { gasLimit })).wait();
          for (const asset of totalAssetsWhichShouldBeWithdrew) {
            if (asset.vaultName === 'SushiSwap-DpxETH') {
                // expect(asset.assets).to.equal(await dpxSLP.balanceOf(wallet.address));
            } else if (asset.vaultName === 'RadiantArbitrum-DLP') {
                expect(asset.assets).to.equal(await dlpToken.balanceOf(wallet.address));
            } else if  (asset.vaultName === 'Equilibria-GLP') {
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
        });
    });
});