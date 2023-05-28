require('dotenv').config();
const UNISWAP = require("@uniswap/sdk")
const fs = require('fs');
const axios = require('axios');
const { getAddress } = require("ethers/lib/utils");
const { expect } = require("chai");
const IERC20ABI = require('../contracts/IERC20.json');
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const usdtAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const daiAddress = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
const gasLimit = 800000; // Adjust this value according to your needs
let wallet;
const KYBER_SWAP_ROUTER_ABI = require('../contracts/KYBER_SWAP_ROUTER_ABI.json');
const exp = require('constants');
const KYBER_SWAP_ROUTER_ADDR = "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5";

describe("All Weather Protocol", function () {
  let radiantArbitrumVault;
  let daiContract;
  beforeEach(async() => {
    wallet = await ethers.getImpersonatedSigner("0x038919c63AfF9c932C77a0C9c9D98eABc1a4dd08");
    daiContract = await ethers.getContractAt('MockDAI', daiAddress);
    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantUsdcVaultToken = await RadiantArbitrumVault.deploy("radiantUsdcVaultToken", "RVT", daiContract.address);
    await radiantUsdcVaultToken.deployed();
    AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy("allWeatherPortfolioLPToken", "AWP", radiantUsdcVaultToken.address, daiContract.address);
    await portfolioContract.deployed();
    await (await daiContract.connect(wallet).approve(portfolioContract.address, ethers.utils.parseUnits("100000000", 18), { gasLimit: gasLimit })).wait();
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to deposit ERC20 to portfolio contract", async function () {
      const amount = ethers.utils.parseUnits('100', 18); // 100 USDT with 6 decimals
      const originalBalance = await daiContract.balanceOf(wallet.address);
      console.log("originalBalance: ", originalBalance.toString());
      console.log("Start depositing...")
      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit })).wait();
      const newBalance = await daiContract.balanceOf(wallet.address);
      console.log("newBalance", newBalance.toString());
      expect(newBalance).to.equal(originalBalance.sub(amount));
      expect(await radiantUsdcVaultToken.balanceOf(portfolioContract.address)).to.equal(amount);
      expect(await daiContract.balanceOf(radiantUsdcVaultToken.address)).to.equal(amount);
      expect(await portfolioContract.balanceOf(wallet.address)).to.equal(amount);
    });
  });
});