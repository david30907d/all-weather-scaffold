const { expect } = require("chai");

const myImpersonatedWalletAddress = "0x7ee54ab0f204bb3a83df90fdd824d8b4abe93222";
const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const radiantLockedDlpAddress = "0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE";
const radiantDlpAddress = "0x32dF62dc3aEd2cD6224193052Ce665DC18165841";
const radiantLockZapAddress = "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1";
const gasLimit = 2675600;

let wallet;
let weth;
let rDaiContract;
let radiantVault;
let portfolioContract;
const amount = ethers.utils.parseUnits('0.01', 18); // 100 DAI with 18 decimals


describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    radiantLockZap = await ethers.getContractAt("ILendingPool", radiantLockZapAddress);

    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLockZapAddress, radiantLockZapAddress);
    await radiantVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy("allWeatherPortfolioLPToken", "AWP", radiantVault.address, weth.address);
    await portfolioContract.deployed();

    await (await weth.connect(wallet).approve(portfolioContract.address, ethers.utils.parseUnits("100000000", 18), { gasLimit: gasLimit })).wait();
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to deposit ERC20 to portfolio contract", async function () {
      const originalBalance = await weth.balanceOf(wallet.address);
      console.log("original balance: ", originalBalance.toString());
      console.log("Start depositing...");
      console.log(amount.toString())
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
  });
});
