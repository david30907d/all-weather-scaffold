const { expect } = require("chai");

const myImpersonatedWalletAddress = "0xe4bac3e44e8080e1491c11119197d33e396ea82b";
const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const radiantDlpAddress = "0x32dF62dc3aEd2cD6224193052Ce665DC18165841";
const radiantLendingPoolAddress = "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1";
const multiFeeDistributionAddress = "0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE";
const gasLimit = 14575600;

let wallet;
let weth;
let radiantVault;
let portfolioContract;
let currentTimestamp = Math.floor(Date.now() / 1000);;
const amount = ethers.utils.parseUnits('0.01', 18); // 100 DAI with 18 decimals


describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    radiantLockZap = await ethers.getContractAt("ILendingPool", radiantLendingPoolAddress);
    multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);

    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLendingPoolAddress, radiantLendingPoolAddress);
    await radiantVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy("allWeatherPortfolioLPToken", "AWP", radiantVault.address, weth.address);
    await portfolioContract.deployed();

    await (await weth.connect(wallet).approve(portfolioContract.address, amount, { gasLimit: 2057560 })).wait();
    await weth.connect(wallet).withdraw(ethers.utils.parseEther("0.1"), { gasLimit: 2057560 });
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to zapin with WETH into Radiant dLP", async function () {
      const originalVaultShare = await radiantVault.balanceOf(portfolioContract.address)
      expect(originalVaultShare).to.equal(0);

      const originalRadiantLockedDlpBalance = await radiantVault.totalAssets();
      expect(originalRadiantLockedDlpBalance).to.equal(0);
      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit})).wait();
      
      const vaultShareAfterDeposit = await radiantVault.balanceOf(portfolioContract.address)
      expect(vaultShareAfterDeposit).to.gt(0);
      const radiantLockedDlpBalanceAfterDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceAfterDeposit).to.gt(amount);
    });
    it("Should be able to withdraw Radiant dLP", async function () {
      const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit})).wait();
      const radiantLockedDlpBalanceAfterDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceAfterDeposit).to.gt(0);

      currentTimestamp += 12 * 31 * 24 * 60 * 60; // Increment timestamp
      await simulateAYearLater();

      // withdraw
      await (await portfolioContract.connect(wallet).redeemAll(amount, wallet.address, { gasLimit: gasLimit})).wait();
      const radiantLockedDlpAfterRedeem = await radiantVault.totalAssets();
      expect(radiantLockedDlpAfterRedeem).to.equal(0);
      expect(await dlpToken.balanceOf(wallet.address)).to.equal(radiantLockedDlpBalanceAfterDeposit);
    });
    
    it("Should not be able to withdraw Radiant dLP", async function () {
      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit})).wait();
      const totalAssets = await radiantVault.totalAssets();
      const totalLockedAssets = await radiantVault.totalLockedAssets();
      const totalUnlockedAssets = await radiantVault.totalUnlockedAssets();
      await (await portfolioContract.connect(wallet).redeemAll(amount, wallet.address, { gasLimit: gasLimit})).wait();
      expect(await radiantVault.totalAssets()).to.equal(totalAssets);
      expect(await radiantVault.totalLockedAssets()).to.equal(totalLockedAssets);
      expect(await radiantVault.totalUnlockedAssets()).to.equal(totalUnlockedAssets);
    });
  });
});


async function simulateAYearLater() {
      // Simulate a year later
      await ethers.provider.send('evm_setNextBlockTimestamp', [currentTimestamp]);
      await ethers.provider.send('evm_mine');
}