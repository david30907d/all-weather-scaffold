require('dotenv').config();
const { expect } = require("chai");
const IERC20ABI = require('../contracts/IERC20.json');
const forkedProviderUrl = "http://localhost:8545";
const usdcAddress = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
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
      const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
      radiantUsdcVaultToken = await RadiantArbitrumVault.deploy("radiantUsdcVaultToken", "RVT", usdcAddress);
      await radiantUsdcVaultToken.deployed();
      console.log("owner.address", wallet.address);
      const usdcContract = new ethers.Contract(usdcAddress, IERC20ABI, ethersProvider);
      console.log("USDC balance: ", (await usdcContract.balanceOf(wallet.address)).toString());

      let tx = await usdcContract.connect(wallet).approve(radiantUsdcVaultToken.address, ethers.utils.parseUnits("100000000", 18))
      await tx.wait();
      tx = await radiantUsdcVaultToken.connect(wallet).deposit(100, wallet.address, { gasLimit: gasLimit });
      await tx.wait();
      const totalAssets = await radiantUsdcVaultToken.totalAssets();
      console.log("totalAssets: ", totalAssets.toString());
      const shares = await radiantUsdcVaultToken.balanceOf(wallet.address);
      console.log("shares: ", shares.toString());
      console.log("usdcContract's address: ", usdcContract.address)
      console.log("wallet's USDC balance: ", (await usdcContract.balanceOf(wallet.address)).toString());
      console.log("radiantUsdcVaultToken's USDC balance: ", (await usdcContract.balanceOf(radiantUsdcVaultToken.address)).toString());
    });
  });
});
