require('dotenv').config();
const { expect } = require("chai");
const IERC20ABI = require('../contracts/IERC20.json');
const forkedProviderUrl = "http://localhost:8545";
const usdtAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const gasLimit = 8000000; // Adjust this value according to your needs

describe("All Weather Protocol", function () {
  let radiantArbitrumVault;
  let ethersProvider;
  let wallet;

  before((done) => {
    setTimeout(done, 2000);
  });

  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner("0x038919c63AfF9c932C77a0C9c9D98eABc1a4dd08");
    ethersProvider = new ethers.providers.JsonRpcProvider(forkedProviderUrl);
  });

  describe("RadiantArbitrumVault", function () {
    it("Should deploy radiantArbitrumVault contract", async function () {
      const dai = await ethers.getContractFactory("MockDAI");
      const daiContract = await dai.connect(wallet).deploy();
      await daiContract.deployed();
      const usdtContract = new ethers.Contract(usdtAddress, IERC20ABI, ethersProvider);
      const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
      radiantUsdcVaultToken = await RadiantArbitrumVault.deploy("radiantUsdcVaultToken", "RVT", usdtContract.address);
      await radiantUsdcVaultToken.deployed();
      AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
      portfolioContract = await AllWeatherPortfolioLPToken.deploy("allWeatherPortfolioLPToken", "AWP", radiantUsdcVaultToken.address, usdtContract.address);
      await portfolioContract.deployed();
      console.log("portfolioContract's address: ", portfolioContract.address)
      await (await usdtContract.connect(wallet).approve(portfolioContract.address, ethers.utils.parseUnits("100000000", 18), { gasLimit: gasLimit })).wait();
      await (await portfolioContract.connect(wallet).deposit(1, { gasLimit: gasLimit })).wait();
      const totalAssets = await radiantUsdcVaultToken.totalAssets();
      console.log("totalAssets: ", totalAssets.toString());
      const shares = await radiantUsdcVaultToken.balanceOf(portfolioContract.address);
      console.log("shares of portfolioContract: ", shares.toString());
      console.log("wallet's USDT balance: ", (await usdtContract.balanceOf(wallet.address)).toString());
      console.log("radiantUsdcVaultToken's USDT balance: ", (await usdtContract.balanceOf(radiantUsdcVaultToken.address)).toString());

      console.log("portfolioContract's LP balance: ", (await radiantUsdcVaultToken.balanceOf(portfolioContract.address)).toString());
    });
  });
});
