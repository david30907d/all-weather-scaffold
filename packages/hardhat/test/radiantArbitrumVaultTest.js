require('dotenv').config();
const { expect } = require("chai");

const myImpersonatedWalletAddress = "0x038919c63AfF9c932C77a0C9c9D98eABc1a4dd08";
const daiAddress = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
const radiantInterestBearingDaiAddress = "0x0d914606f3424804fa1bbbe56ccc3416733acec6";
const radiantLendingPoolAddress = "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1";
const gmxRouterAddress = "0xB95DB5B167D75e6d04227CfFFA61069348d271F5";
const gasLimit = 2675600;

let wallet;
let daiContract;
let rDaiContract;
let allWeatherRadiantVault;
let portfolioContract;
const amount = ethers.utils.parseUnits('100', 18); // 100 DAI with 18 decimals


describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    daiContract = await ethers.getContractAt('MockDAI', daiAddress);
    rDaiContract = await ethers.getContractAt('MockDAI', radiantInterestBearingDaiAddress);
    // radiantLendingPool = await ethers.getContractAt("ILendingPool", radiantLendingPoolAddress);

    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    allWeatherRadiantVault = await RadiantArbitrumVault.deploy("allWeatherRadiantVault", "RVT", daiContract.address, radiantLendingPoolAddress, gmxRouterAddress);
    await allWeatherRadiantVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy("allWeatherPortfolioLPToken", "AWP", allWeatherRadiantVault.address, daiContract.address);
    await portfolioContract.deployed();

    await (await daiContract.connect(wallet).approve(portfolioContract.address, ethers.utils.parseUnits("100000000", 18), { gasLimit: gasLimit })).wait();
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to deposit ERC20 to portfolio contract", async function () {
      const originalBalance = await daiContract.balanceOf(wallet.address);

      console.log("originalBalance:", originalBalance.toString());
      console.log("Start depositing...");

      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit})).wait();

      const newBalance = await daiContract.balanceOf(wallet.address);

      console.log("newBalance:", newBalance.toString());

      expect(newBalance).to.equal(originalBalance.sub(amount));
      expect(await allWeatherRadiantVault.balanceOf(portfolioContract.address)).to.equal(amount);
      expect(await rDaiContract.balanceOf(allWeatherRadiantVault.address)).to.equal(amount);
      expect(await portfolioContract.balanceOf(wallet.address)).to.equal(amount);

    });
    describe("RadiantArbitrumVault Test", function () {
      it("Should get radiant's interest bearing token in return after deposit", async function () {
        daiContract.connect(wallet).approve(allWeatherRadiantVault.address, amount, { gasLimit: gasLimit });
        daiContract.connect(wallet).transfer(allWeatherRadiantVault.address, amount, { gasLimit: gasLimit });
        expect(await daiContract.balanceOf(allWeatherRadiantVault.address, { gasLimit: gasLimit })).to.equal(amount);
        await allWeatherRadiantVault.connect(wallet).deposit(amount, wallet.address, { gasLimit: gasLimit });
        expect(await allWeatherRadiantVault.balanceOf(wallet.address)).to.equal(amount);
        expect(await rDaiContract.balanceOf(allWeatherRadiantVault.address)).to.equal(amount);
      })
      it("Should be able to withdraw radiant deposit", async function () {
        const originalBalance = await daiContract.balanceOf(wallet.address);
        const originalrDaiBalance = await rDaiContract.balanceOf(wallet.address);
        await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit})).wait();
        expect(await rDaiContract.balanceOf(allWeatherRadiantVault.address)).to.equal(amount);
        expect(await rDaiContract.balanceOf(wallet.address)).to.equal(originalrDaiBalance);
        expect(await daiContract.balanceOf(wallet.address)).to.equal(originalBalance.sub(amount));

        await (await portfolioContract.connect(wallet).redeemAll(amount, { gasLimit: gasLimit})).wait();
        // to reason why the balance is greater than originalBalance is because of the interest
        expect(await daiContract.balanceOf(wallet.address)).to.greaterThan(originalBalance);
        expect(await rDaiContract.balanceOf(allWeatherRadiantVault.address)).to.equal(0);
        expect(await daiContract.balanceOf(allWeatherRadiantVault.address)).to.equal(0);
      })
    })
  });
});
