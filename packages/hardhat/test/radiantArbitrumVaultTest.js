require('dotenv').config();
const { expect } = require("chai");

const myImpersonatedWalletAddress = "0x038919c63AfF9c932C77a0C9c9D98eABc1a4dd08";
const daiAddress = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
const gasLimit = 800000; // Adjust this value according to your needs

let wallet;
let daiContract;
let radiantUsdcVaultToken;
let portfolioContract;

describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    daiContract = await ethers.getContractAt('MockDAI', daiAddress);
    
    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantUsdcVaultToken = await RadiantArbitrumVault.deploy("radiantUsdcVaultToken", "RVT", daiContract.address);
    await radiantUsdcVaultToken.deployed();
    
    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy("allWeatherPortfolioLPToken", "AWP", radiantUsdcVaultToken.address, daiContract.address);
    await portfolioContract.deployed();
    
    await (await daiContract.connect(wallet).approve(portfolioContract.address, ethers.utils.parseUnits("100000000", 18), { gasLimit: gasLimit })).wait();
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to deposit ERC20 to portfolio contract", async function () {
      const amount = ethers.utils.parseUnits('100', 18); // 100 DAI with 18 decimals
      const originalBalance = await daiContract.balanceOf(wallet.address);
      
      console.log("originalBalance:", originalBalance.toString());
      console.log("Start depositing...");
      
      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit })).wait();
      
      const newBalance = await daiContract.balanceOf(wallet.address);
      
      console.log("newBalance:", newBalance.toString());
      
      expect(newBalance).to.equal(originalBalance.sub(amount));
      expect(await radiantUsdcVaultToken.balanceOf(portfolioContract.address)).to.equal(amount);
      expect(await daiContract.balanceOf(radiantUsdcVaultToken.address)).to.equal(amount);
      expect(await portfolioContract.balanceOf(wallet.address)).to.equal(amount);
    });
  });
});
