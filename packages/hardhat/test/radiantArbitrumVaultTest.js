require('dotenv').config();
const { expect } = require("chai");
const IERC20ABI = require('../contracts/IERC20.json');
const forkedProviderUrl = "http://localhost:8545";

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
      radiantArbitrumVault = await RadiantArbitrumVault.deploy("radiantVaultToken", "RVT", "0x038919c63AfF9c932C77a0C9c9D98eABc1a4dd08");
    //   const wallet = new ethers.Wallet(PRIVATE_KEY);
      console.log("owner.address", wallet.address);
      const usdcAddress = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
      const usdcContract = new ethers.Contract(usdcAddress, IERC20ABI, ethersProvider);
      console.log((await usdcContract.balanceOf(wallet.address)).toString());
    });
  });
});
