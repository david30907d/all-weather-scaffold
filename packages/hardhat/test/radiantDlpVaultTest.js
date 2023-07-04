const { expect } = require("chai");
const { fetch1InchSwapData,
  myImpersonatedWalletAddress,
  sushiSwapDpxLpTokenAddress,
  sushiMiniChefV2Address,
  dpxTokenAddress,
  wethAddress,
  radiantDlpAddress,
  radiantLockZapAddress,
  sushiPid,
  gasLimit,
  radiantLendingPoolAddress,
  multiFeeDistributionAddress,
  radiantAmount,
  glpMarketPoolAddress,
  getPendleZapInData,
  fakePendleZapOut
} = require("./utils");


let wallet;
let weth;
let radiantVault;
let portfolioContract;
let currentTimestamp = Math.floor(Date.now() / 1000);;

describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    radiantLockZap = await ethers.getContractAt("ILendingPool", radiantLendingPoolAddress);
    multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
    pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);

    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLockZapAddress);
    await radiantVault.deployed();

    const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
    dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
    await dpxVault.deployed();

    const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
    // equilibriaGlpVault = await EquilibriaGlpVault.deploy(fsGLP.address);
    equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address);
    await equilibriaGlpVault.deployed();
    
    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address);
    await portfolioContract.connect(wallet).deployed();
    await portfolioContract.setVaultAllocations([{protocol: "radiant-arbitrum", percentage: 100}]).then((tx) => tx.wait());


    await (await weth.connect(wallet).approve(portfolioContract.address, radiantAmount, { gasLimit: 2057560 })).wait();
    await weth.connect(wallet).withdraw(ethers.utils.parseEther("0.02"), { gasLimit: 2057560 });
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to zapin with WETH into Radiant dLP", async function () {
      const originalVaultShare = await radiantVault.balanceOf(portfolioContract.address)
      expect(originalVaultShare).to.equal(0);

      const originalRadiantLockedDlpBalance = await radiantVault.totalAssets();
      expect(originalRadiantLockedDlpBalance).to.equal(0);
      const oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
      const pendleZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, radiantAmount, 0.99);
      await (await portfolioContract.connect(wallet).deposit(radiantAmount, oneInchSwapDataForDpx, pendleZapInData[2], pendleZapInData[3], pendleZapInData[4], { gasLimit: 3057560 })).wait();

      const vaultShareAfterDeposit = await radiantVault.balanceOf(portfolioContract.address)
      expect(vaultShareAfterDeposit).to.gt(0);
      const radiantLockedDlpBalanceAfterDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceAfterDeposit).to.gt(radiantAmount);
    });
    it("Should be able to withdraw Radiant dLP", async function () {
      const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
      const oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
      const pendleZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, radiantAmount, 0.99);
      await (await portfolioContract.connect(wallet).deposit(radiantAmount, oneInchSwapDataForDpx, pendleZapInData[2], pendleZapInData[3], pendleZapInData[4], { gasLimit: 3057560 })).wait();
      const radiantLockedDlpBalanceAfterDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceAfterDeposit).to.gt(0);

      currentTimestamp += 12 * 31 * 24 * 60 * 60; // Increment timestamp
      await simulateAYearLater();

      // withdraw
      await (await portfolioContract.connect(wallet).redeemAll(radiantAmount, wallet.address, fakePendleZapOut, { gasLimit: gasLimit })).wait();
      const radiantLockedDlpAfterRedeem = await radiantVault.totalAssets();
      expect(radiantLockedDlpAfterRedeem).to.equal(0);
      expect(await dlpToken.balanceOf(wallet.address)).to.equal(radiantLockedDlpBalanceAfterDeposit);
    });

    it("Should not be able to withdraw Radiant dLP", async function () {
      const oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
      const pendleZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, radiantAmount, 0.99);
      await (await portfolioContract.connect(wallet).deposit(radiantAmount, oneInchSwapDataForDpx, pendleZapInData[2], pendleZapInData[3], pendleZapInData[4], { gasLimit: 3057560 })).wait();
      const totalAssets = await radiantVault.totalAssets();
      const totalLockedAssets = await radiantVault.totalLockedAssets();
      const totalUnlockedAssets = await radiantVault.totalUnstakedAssets();
      await (await portfolioContract.connect(wallet).redeemAll(radiantAmount, wallet.address, fakePendleZapOut, { gasLimit: gasLimit })).wait();
      expect(await radiantVault.totalAssets()).to.equal(totalAssets);
      expect(await radiantVault.totalLockedAssets()).to.equal(totalLockedAssets);
      expect(await radiantVault.totalStakedButWithoutLockedAssets()).to.equal(totalUnlockedAssets);
    });
  });
});

async function simulateAYearLater() {
  // Simulate a year later
  await ethers.provider.send('evm_setNextBlockTimestamp', [currentTimestamp]);
  await ethers.provider.send('evm_mine');
}