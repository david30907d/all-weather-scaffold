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
const KYBER_SWAP_ROUTER_ADDR = "0x6131B5fae19EA4f9D964eAc0408E4408b66337b5";

describe("All Weather Protocol", function () {
  let radiantArbitrumVault;
  let daiContract;
  before(async() => {
    const DaiContract = await ethers.getContractFactory('MockDAI');
    daiContract = await DaiContract.attach(daiAddress);
  });

  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner("0x038919c63AfF9c932C77a0C9c9D98eABc1a4dd08");
  });

  describe("RadiantArbitrumVault", function () {
    it("Should deploy radiantArbitrumVault contract", async function () {

      // const usdcContract = new ethers.Contract(usdtAddress, IERC20ABI, provider);
      console.log("wallet's DAI balance: ", (await daiContract.balanceOf(wallet.address)).toString());
      const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
      radiantUsdcVaultToken = await RadiantArbitrumVault.deploy("radiantUsdcVaultToken", "RVT", daiContract.address);
      await radiantUsdcVaultToken.deployed();
      AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
      portfolioContract = await AllWeatherPortfolioLPToken.deploy("allWeatherPortfolioLPToken", "AWP", radiantUsdcVaultToken.address, daiContract.address);
      await portfolioContract.deployed();
      console.log("portfolioContract's address: ", portfolioContract.address)
      await (await daiContract.connect(wallet).approve(portfolioContract.address, ethers.utils.parseUnits("100000000", 18), { gasLimit: gasLimit })).wait();
      const amount = ethers.utils.parseUnits('100', 18); // 100 USDT with 6 decimals

      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit })).wait();
      const totalAssets = await radiantUsdcVaultToken.totalAssets();
      console.log("totalAssets: ", totalAssets.toString());
      const shares = await radiantUsdcVaultToken.balanceOf(portfolioContract.address);
      console.log("shares of portfolioContract: ", shares.toString());
      console.log("wallet's DAI balance: ", (await daiContract.balanceOf(wallet.address)).toString());
      // tx = await daiContract.connect(wallet).transfer(radiantUsdcVaultToken.address, 1)
      // await tx.wait();
      console.log("radiantUsdcVaultToken's DAI balance: ", (await daiContract.balanceOf(radiantUsdcVaultToken.address)).toString());
      // console.log("wallet's DAI balance: ", (await daiContract.balanceOf(wallet.address)).toString());

      // console.log("portfolioContract's LP balance: ", (await radiantUsdcVaultToken.balanceOf(portfolioContract.address)).toString());
    });
  });
});

// async function fetchSwapData(slippage) {
//   const apiUrl = 'https://api.1inch.io/v5.0/42161/swap';
//   // const fromTokenAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
//   const fromTokenAddress = daiAddress;
//   const toTokenAddress = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
//   const amount = '10000000000000000';
//   // const fromAddress = '0x038919c63AfF9c932C77a0C9c9D98eABc1a4dd08';
//   const fromAddress = wallet.address;

//   try {
//     const response = await axios.get(apiUrl, {
//       params: {
//         fromTokenAddress,
//         toTokenAddress,
//         amount,
//         fromAddress,
//         slippage
//       },
//       headers: {
//         accept: 'application/json'
//       }
//     });

//     const swapData = response.data;
//     return swapData;
//   } catch (error) {
//     console.error('Error fetching swap data:', error.message);
//   }
// }