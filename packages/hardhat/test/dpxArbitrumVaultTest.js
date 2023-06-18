const { expect } = require("chai");
const { network } = require("hardhat");

const myImpersonatedWalletAddress = "0x7ee54ab0f204bb3a83df90fdd824d8b4abe93222";
const sushiSwapDpxLpTokenAddress = "0x0C1Cf6883efA1B496B01f654E247B9b419873054";
const sushiMiniChefV2Address = "0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3";
const dpxTokenAddress = "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55";
const sushiTokenAddress = "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A";
const sushiPid = 17;
const gasLimit = 2675600;

let wallet;
let dpxVault;
let portfolioContract;
const amount = ethers.utils.parseUnits('0.004', 18);



describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    miniChefV2 = await ethers.getContractAt('IMiniChefV2', sushiMiniChefV2Address);
    dpxToken = await ethers.getContractAt('MockDAI', dpxTokenAddress);
    sushiToken = await ethers.getContractAt('MockDAI', sushiTokenAddress);

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
      console.log("originalBalance dpx: ", originalBalance.toString());
      console.log("Amount: ", amount.toString());
      console.log("newBalance dpx: ", newBalance.toString());
      expect(newBalance).to.equal(originalBalance.sub(amount));
      expect(await dpxVault.balanceOf(portfolioContract.address)).to.equal(amount);
      expect(await portfolioContract.balanceOf(wallet.address)).to.equal(amount);
      expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(miniChefV2OriginalBalance.add(amount));
    });
    it("Should be able to claim rewards", async function () {
      // deposit
      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit})).wait();
      await mineBlocks(1); // Mine 1 blocks
      expect(await sushiToken.balanceOf(dpxVault.address)).to.equal(0);
      expect(await dpxToken.balanceOf(dpxVault.address)).to.equal(0);
      const [sushiReward, dpxReward] = await dpxVault.claimableRewards(dpxVault.address);
      await dpxVault.claim(dpxVault.address);
      expect(sushiReward).to.be.gt(0);
      expect(dpxReward).to.be.gt(0);
      expect(await sushiToken.balanceOf(dpxVault.address)).to.be.gt(sushiReward);
      expect(await dpxToken.balanceOf(dpxVault.address)).to.be.gt(dpxReward);
      console.log("claimed sushi: ", sushiReward.toString(), "claimed dpx: ", dpxReward.toString());
    })

    it("Should be able to redeemAll dpx deposit", async function () {
      // deposit
      const originalBalance = await dpxSLP.balanceOf(wallet.address);
      // miniChefV2OriginalBalance means the staked amount in miniChefV2
      const miniChefV2OriginalBalance = (await miniChefV2.userInfo(sushiPid, dpxVault.address))[0];
      await (await portfolioContract.connect(wallet).deposit(amount, { gasLimit: gasLimit})).wait();
      expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(miniChefV2OriginalBalance.add(amount));

      // redeemAll
      /// should have no rewards before redeemAll
      expect(await sushiToken.balanceOf(dpxVault.address)).to.equal(0);
      expect(await dpxToken.balanceOf(dpxVault.address)).to.equal(0);

      await (await portfolioContract.connect(wallet).redeemAll(amount, wallet.address, { gasLimit: gasLimit})).wait();
      expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(miniChefV2OriginalBalance);
      expect(await dpxSLP.balanceOf(wallet.address)).to.equal(originalBalance);

      /// should have claimed rewards
      expect(await sushiToken.balanceOf(dpxVault.address)).to.be.gt(0);
      expect(await dpxToken.balanceOf(dpxVault.address)).to.be.gt(0);
    })
  });
});

async function mineBlocks(numBlocks) {
  for (let i = 0; i < numBlocks; i++) {
    await network.provider.send("evm_mine");
  }
}
