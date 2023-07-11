const { expect } = require("chai");
const { fetch1InchSwapData,
    myImpersonatedWalletAddress,
    sushiSwapDpxLpTokenAddress,
    sushiMiniChefV2Address,
    wethAddress,
    radiantDlpAddress,
    radiantLockZapAddress,
    sushiPid,
    radiantLendingPoolAddress,
    multiFeeDistributionAddress,
    end2endTestingAmount,
    fsGLPAddress,
    getPendleZapInData,
    getPendleZapOutData,
    gDAIMarketPoolAddress,
    dpxAmount,
    dpxTokenAddress,
    mineBlocks,
    gDAIAddress,
    pendleTokenAddress,
    gasLimit,
    daiAddress,
    gDAIRewardPoolAddress,
    glpMarketPoolAddress,
    simulateAYearLater
} = require("./utils");
let {currentTimestamp} = require("./utils");

let wallet;
let weth;
let radiantVault;
let portfolioContract;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;
async function deposit() {
    return await (await portfolioContract.deposit(end2endTestingAmount, wallet.address, oneInchSwapDataForDpx.tx.data, pendleGLPZapInData[2], pendleGLPZapInData[3], pendleGLPZapInData[4], pendleGDAIZapInData[2], pendleGDAIZapInData[3], pendleGDAIZapInData[4], oneInchSwapDataForGDAI.tx.data, { gasLimit: 10692137 })).wait();
}

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        this.timeout(120000); // Set timeout to 120 seconds
        wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
        dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
        weth = await ethers.getContractAt('IWETH', wethAddress);
        dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
        dpxToken = await ethers.getContractAt("MockDAI", dpxTokenAddress);
        fsGLP = await ethers.getContractAt("IERC20", fsGLPAddress);
        pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
        pendleGDAIMarketLPT = await ethers.getContractAt("IERC20", gDAIMarketPoolAddress);
        pendleToken = await ethers.getContractAt("IERC20", pendleTokenAddress);
        daiToken = await ethers.getContractAt("IERC20", daiAddress);
        gDAIToken = await ethers.getContractAt("IERC20", gDAIAddress);
        // we can check our balance in equilibria with this reward pool
        dGDAIRewardPool = await ethers.getContractAt("IERC20", gDAIRewardPoolAddress);
        radiantLockZap = await ethers.getContractAt("ILendingPool", radiantLendingPoolAddress);
        multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
        await weth.connect(wallet).withdraw(ethers.utils.parseEther("0.025"), { gasLimit: 2057560 });

        const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
        radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLockZapAddress);
        await radiantVault.deployed();

        const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
        dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
        await dpxVault.deployed();

        const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
        equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address);
        await equilibriaGlpVault.deployed();

        const EquilibriaGDAIVault = await ethers.getContractFactory("EquilibriaGDAIVault");
        equilibriaGDAIVault = await EquilibriaGDAIVault.deploy(pendleGDAIMarketLPT.address, "AllWeatherLP-Equilibria-GDAI", "ALP-EQB-GDAI");
        await equilibriaGDAIVault.deployed();

        const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
        portfolioContract = await AllWeatherPortfolioLPToken.connect(wallet).deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address);
        await portfolioContract.connect(wallet).deployed();
        await portfolioContract.setVaultAllocations([{
            protocol: "AllWeatherLP-SushSwap-DpxETH", percentage: 25,
        }, {
            protocol: "AllWeatherLP-RadiantArbitrum-DLP", percentage: 25
        }, {
            protocol: "AllWeatherLP-Equilibria-GLP", percentage: 25
        }, {
            protocol: "AllWeatherLP-Equilibria-GDAI", percentage: 25
        }
        ]).then((tx) => tx.wait());
        await (await weth.connect(wallet).approve(portfolioContract.address, end2endTestingAmount, { gasLimit: gasLimit })).wait();

        oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxToken.address, end2endTestingAmount.div(8), wallet.address, 50);
        oneInchSwapDataForGDAI = await fetch1InchSwapData(weth.address, daiToken.address, end2endTestingAmount.div(4), wallet.address, 50);
        pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toTokenAmount), 0.2, daiToken.address);
        pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, end2endTestingAmount.div(4), 0.99);
    });

    describe("Portfolio LP Contract Test", function () {
        it("Should be able to zapin with WETH into All Weather Portfolio", async function () {
            this.timeout(120000); // Set timeout to 120 seconds
            const receipt = await deposit();
            // Iterate over the events and find the Deposit event
            for (const event of receipt.events) {
                if (event.topics.includes(portfolioContract.interface.getEventTopic('Transfer'))) {
                    const decodedEvent = portfolioContract.interface.decodeEventLog('Transfer', event.data, event.topics);
                    expect(await portfolioContract.balanceOf(wallet.address)).to.equal(end2endTestingAmount);
                    if (decodedEvent.to === wallet.address && decodedEvent.from === portfolioContract.address) {
                        expect(decodedEvent.value).to.equal(end2endTestingAmount);
                    }
                }
            }
            const totalAssets = await portfolioContract.totalAssets();
            for (const asset of totalAssets) {
                if (asset.vaultName === 'AllWeatherLP-SushSwap-DpxETH') {
                    expect(asset.assets).to.equal(await dpxVault.balanceOf(portfolioContract.address));
                } else if (asset.vaultName === 'AllWeatherLP-RadiantArbitrum-DLP') {
                    expect(asset.assets).to.equal(await radiantVault.balanceOf(portfolioContract.address));
                } else if (asset.vaultName === 'AllWeatherLP-Equilibria-GLP') {
                    expect(asset.assets).to.equal(await equilibriaGlpVault.balanceOf(portfolioContract.address));
                } else if (asset.vaultName === 'AllWeatherLP-Equilibria-GDAI') {
                    expect(asset.assets).to.equal(await equilibriaGDAIVault.balanceOf(portfolioContract.address));
                } else {
                    throw new Error(`Unknown vault name ${asset.vaultName}`);
                }
            }
        });
        it("Should be able to withdraw everything from All Weather Portfolio", async function () {
          this.timeout(120000); // Set timeout to 120 seconds
          const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
          expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
          const receipt = await deposit();
          let shares;
          for (const event of receipt.events) {
            if (event.topics.includes(equilibriaGDAIVault.interface.getEventTopic('Deposit'))) {
              const decodedEvent = equilibriaGDAIVault.interface.decodeEventLog('Deposit', event.data, event.topics);
              shares = decodedEvent.shares;
            }
          }
          const pendleZapOutData = await getPendleZapOutData(42161, gDAIMarketPoolAddress, daiToken.address, shares, 1);

          currentTimestamp += 12 * 31 * 24 * 60 * 60; // Increment timestamp
          await simulateAYearLater();
    
          // // withdraw
          console.log([(await equilibriaGlpVault.pid()).toNumber(), (await equilibriaGDAIVault.pid()).toNumber()]);
          await (await portfolioContract.connect(wallet).redeem(dpxAmount, wallet.address, pendleZapOutData[3], { gasLimit: 4675600 })).wait();
        //   expect(await pendleGDAIMarketLPT.balanceOf(wallet.address)).to.equal(shares);
        //   expect(await equilibriaGDAIVault.totalAssets()).to.equal(0);
        });

        // it("Should be able to claim rewards", async function () {
        //   this.timeout(120000); // Set timeout to 120 seconds
        //   const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
        //   expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
        //   await deposit();
        //   await mineBlocks(100); // Mine 100 blocks
        //   const originalPendleToken = await pendleToken.balanceOf(wallet.address);
        //   const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
        //   let pendleClaimableReward;
        //   for (const claimableReward of claimableRewards) {
        //     if (claimableReward.protocol !== "AllWeatherLP-Equilibria-GDAI") {
        //       expect(claimableReward.claimableRewards).to.deep.equal([]);
        //     } else {
        //       expect(claimableReward.claimableRewards.length).to.equal(1);
        //       pendleClaimableReward = claimableReward.claimableRewards[0].amount;
        //       expect(pendleClaimableReward).to.be.gt(0);
        //     }
        //   }

        //   const equilibriaPids = [2];
        //   await portfolioContract.connect(wallet).claim(wallet.address, equilibriaPids);
        //   // NOTE: using `to.be.gt` instead of `to.equal` because the reward would somehow be increased after claim(). My hunch is that `claim()` would also claim the reward for the current block.
        //   expect((await pendleToken.balanceOf(wallet.address)).sub(originalPendleToken)).to.be.gt(pendleClaimableReward);
        //   const remainingClaimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
        //   for (const claimableReward of remainingClaimableRewards) {
        //     if (claimableReward.protocol === "AllWeatherLP-Equilibria-GDAI") {
        //       expect(claimableReward.claimableRewards[0].amount).to.equal(0);
        //     }
        //   }
        // })
        // it("Should be able to check claimable rewards", async function () {
        //   const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
        //   expect(claimableRewards).to.deep.equal([]);
        // })
    });
});