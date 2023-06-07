const { expect } = require("chai");

const myImpersonatedWalletAddress = "0x7ee54ab0f204bb3a83df90fdd824d8b4abe93222";
const sushiSwapDpxLpTokenAddress = "0x0C1Cf6883efA1B496B01f654E247B9b419873054";
const sushiMiniChefV2Address = "0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3";
const sushiPid = 17;
const radiantLendingPoolAddress = "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1";
const gmxRouterAddress = "0xB95DB5B167D75e6d04227CfFFA61069348d271F5";
const gasLimit = 2675600;

let wallet;
let daiContract;
let rDaiContract;
let dpxVault;
let portfolioContract;
const amount = ethers.utils.parseUnits('4', 17); // 100 DAI with 18 decimals


describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    miniChefV2 = await ethers.getContractAt('IMiniChefV2', sushiMiniChefV2Address);

    const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
    dpxVault = await DpxArbitrumVault.deploy("dpxVault", "DVT", dpxSLP.address, sushiMiniChefV2Address, sushiPid);
    await dpxVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy("allWeatherPortfolioLPToken", "AWP", dpxVault.address, dpxSLP.address);
    await portfolioContract.deployed();

    await (await dpxSLP.connect(wallet).approve(portfolioContract.address, ethers.utils.parseUnits("100000000", 18), { gasLimit: gasLimit })).wait();
  });
  describe("Portfolio LP Contract Test", function () {
    it("Should be able to deposit SLP to portfolio contract", async function () {
      const originalBalance = await dpxSLP.balanceOf(wallet.address);
      const miniChefV2OriginalBalance = (await miniChefV2.userInfo(sushiPid, dpxVault.address))[0];
      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit})).wait();
      const newBalance = await dpxSLP.balanceOf(wallet.address);
      expect(newBalance).to.equal(originalBalance.sub(amount));
      expect(await dpxVault.balanceOf(portfolioContract.address)).to.equal(amount);
      expect(await portfolioContract.balanceOf(wallet.address)).to.equal(amount);
     expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(miniChefV2OriginalBalance.add(amount));
    });
    // describe("DpxArbitrumVault Test", function () {
    //   it("Should get radiant's interest bearing token in return after deposit", async function () {
    //     daiContract.connect(wallet).approve(dpxVault.address, amount, { gasLimit: gasLimit });
    //     daiContract.connect(wallet).transfer(dpxVault.address, amount, { gasLimit: gasLimit });
    //     expect(await daiContract.balanceOf(dpxVault.address, { gasLimit: gasLimit })).to.equal(amount);
    //     await dpxVault.connect(wallet).deposit(amount, wallet.address, { gasLimit: gasLimit });
    //     expect(await dpxVault.balanceOf(wallet.address)).to.equal(amount);
    //     expect(await rDaiContract.balanceOf(dpxVault.address)).to.equal(amount);
    //   })
    //   it("Should be able to withdraw radiant deposit", async function () {
    //     const originalBalance = await daiContract.balanceOf(wallet.address);
    //     const originalrDaiBalance = await rDaiContract.balanceOf(wallet.address);
    //     await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit})).wait();
    //     expect(await rDaiContract.balanceOf(dpxVault.address)).to.equal(amount);
    //     expect(await rDaiContract.balanceOf(wallet.address)).to.equal(originalrDaiBalance);
    //     expect(await daiContract.balanceOf(wallet.address)).to.equal(originalBalance.sub(amount));

    //     await (await portfolioContract.connect(wallet).redeemAll(amount, { gasLimit: gasLimit})).wait();
    //     // to reason why the balance is greater than originalBalance is because of the interest
    //     expect(await daiContract.balanceOf(wallet.address)).to.greaterThan(originalBalance);
    //     expect(await rDaiContract.balanceOf(dpxVault.address)).to.equal(0);
    //     expect(await daiContract.balanceOf(dpxVault.address)).to.equal(0);
    //   })
    // })
  });
});
