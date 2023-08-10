const { expect } = require("chai");
const { fetch1InchSwapData,
  myImpersonatedWalletAddress,
  sushiSwapDpxLpTokenAddress,
  sushiMiniChefV2Address,
  dpxTokenAddress,
  wethAddress,
  radiantDlpAddress,
  sushiPid,
  gasLimit,
  radiantLendingPoolAddress,
  multiFeeDistributionAddress,
  end2endTestingAmount,
  glpMarketPoolAddress,
  getPendleZapInData,
  gDAIMarketPoolAddress,
  fakePendleZapOut,
  daiAddress,
  amountAfterChargingFee,
  simulateAYearLater,
} = require("./utils");
let {currentTimestamp} = require("./utils");


let wallet;
let weth;
let radiantVault;
let portfolioContract;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGLPZapInData;
let pendleGDAIZapInData;
let portfolioShares;

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
  return await (await portfolioContract.connect(wallet).deposit(depositData)).wait();
}

describe("All Weather Protocol", function () {
  beforeEach(async () => {
    this.timeout(240000); // Set timeout to 120 seconds
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    daiToken = await ethers.getContractAt("IERC20", daiAddress);
    radiantLendingPool = await ethers.getContractAt("ILendingPool", radiantLendingPoolAddress);
    multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
    pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
    pendleGDAIMarketLPT = await ethers.getContractAt("IERC20", gDAIMarketPoolAddress);

    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLendingPoolAddress);
    await radiantVault.deployed();

    const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
    dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
    await dpxVault.deployed();

    const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
    // equilibriaGlpVault = await EquilibriaGlpVault.deploy(fsGLP.address);
    equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address, "Equilibria-GLP", "ALP-EQB-GLP");
    await equilibriaGlpVault.deployed();
    
    const EquilibriaGDAIVault = await ethers.getContractFactory("EquilibriaGDAIVault");
    equilibriaGDAIVault = await EquilibriaGDAIVault.deploy(pendleGDAIMarketLPT.address, "Equilibria-GDAI", "ALP-EQB-GDAI");
    await equilibriaGDAIVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address);
    await portfolioContract.connect(wallet).deployed();
    await portfolioContract.setVaultAllocations([{protocol: "RadiantArbitrum-DLP", percentage: 100}]).then((tx) => tx.wait());


    await (await weth.connect(wallet).approve(portfolioContract.address, end2endTestingAmount, { gasLimit })).wait();
    await weth.connect(wallet).deposit({ value: ethers.utils.parseEther("1"), gasLimit }).then((tx) => tx.wait());

    oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, amountAfterChargingFee.div(2), dpxVault.address, 50);
    oneInchSwapDataForGDAI = await fetch1InchSwapData(weth.address, daiToken.address, amountAfterChargingFee, equilibriaGDAIVault.address, 50);
    pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, amountAfterChargingFee, 0.99);
    pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toAmount), 0.2, daiToken.address);
    portfolioShares = amountAfterChargingFee.div(await portfolioContract.UNIT_OF_SHARES());
  });

  describe("Portfolio LP Contract Test", function () {
    // it("Should be able to zapin with WETH into Radiant dLP", async function () {
    //   const originalVaultShare = await radiantVault.balanceOf(portfolioContract.address)
    //   expect(originalVaultShare).to.equal(0);

    //   const originalRadiantLockedDlpBalance = await radiantVault.totalAssets();
    //   expect(originalRadiantLockedDlpBalance).to.equal(0);
    //   const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);


    //   const vaultShareAfterDeposit = await radiantVault.balanceOf(portfolioContract.address)
    //   expect(vaultShareAfterDeposit).to.gt(0);
    //   const radiantLockedDlpBalanceAfterDeposit = await radiantVault.totalAssets();
    //   expect(radiantLockedDlpBalanceAfterDeposit).to.gt(end2endTestingAmount);
    // });
    it("Should be able to withdraw Radiant dLP", async function () {
      const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
      const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

      const radiantLockedDlpBalanceAfterDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceAfterDeposit).to.gt(0);

      currentTimestamp += 24 * 31 * 24 * 60 * 60; // Increment timestamp
      await simulateAYearLater();

      // withdraw
      // Error: VM Exception while processing transaction: reverted with reason string 'SafeERC20: low-level call failed'
      // it means out of gas
      await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, fakePendleZapOut, { gasLimit: 30000000 })).wait();
      const radiantLockedDlpAfterRedeem = await radiantVault.totalAssets();
      expect(radiantLockedDlpAfterRedeem).to.equal(0);
      expect(await dlpToken.balanceOf(wallet.address)).to.equal(radiantLockedDlpBalanceAfterDeposit);
    });

    // it("Should not be able to withdraw Radiant dLP", async function () {
    //   const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

    //   const totalAssets = await radiantVault.totalAssets();
    //   const totalLockedAssets = await radiantVault.totalLockedAssets();
    //   const totalUnlockedAssets = await radiantVault.totalUnstakedAssets();
    //   try {
    //     // Call the contract function that may throw an error
    //     await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, fakePendleZapOut, { gasLimit: gasLimit })).wait();
    //   } catch (error) {
    //     if (error.message.includes("dLP lock has not expired yet")) {
    //       expect(await radiantVault.totalAssets()).to.equal(totalAssets);
    //       expect(await radiantVault.totalLockedAssets()).to.equal(totalLockedAssets);
    //       expect(await radiantVault.totalStakedButWithoutLockedAssets()).to.equal(totalUnlockedAssets);
    //     } else {
    //       throw new Error("Unexpected error occurred");
    //     }
    //   }
    // });
  });
});