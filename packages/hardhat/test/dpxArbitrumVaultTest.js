const { expect } = require("chai");
const { fetch1InchSwapData, mineBlocks, myImpersonatedWalletAddress,
  sushiSwapDpxLpTokenAddress,
  sushiMiniChefV2Address,
  dpxTokenAddress,
  sushiTokenAddress,
  wethAddress,
  radiantDlpAddress,
  radiantLockZapAddress,
  sushiPid,
  gasLimit,
  rRewardTokens,
  amount } = require("./utils");

let wallet;
let dpxVault;
let portfolioContract;


describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    miniChefV2 = await ethers.getContractAt('IMiniChefV2', sushiMiniChefV2Address);
    dpxToken = await ethers.getContractAt('MockDAI', dpxTokenAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    sushiToken = await ethers.getContractAt('MockDAI', sushiTokenAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);

    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLockZapAddress);
    await radiantVault.deployed();


    const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
    dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
    await dpxVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy(weth.address, radiantVault.address, dpxVault.address);
    await portfolioContract.deployed();

    await (await weth.connect(wallet).approve(portfolioContract.address, amount, { gasLimit: gasLimit })).wait();
    await weth.connect(wallet).withdraw(ethers.utils.parseEther("0.1"), { gasLimit: 2057560 });
  });
  describe("Portfolio LP Contract Test", function () {
    it("Should be able to deposit SLP to portfolio contract", async function () {
      const oneInchSwapData = await fetch1InchSwapData(weth.address, dpxTokenAddress, amount.div(2), dpxVault.address);
      const receipt = await (await portfolioContract.connect(wallet).deposit(amount, oneInchSwapData, { gasLimit: gasLimit })).wait();

      // Iterate over the events and find the Deposit event
      for (const event of receipt.events) {
        if (event.topics.includes(dpxVault.interface.getEventTopic('Deposit'))) {
          const decodedEvent = dpxVault.interface.decodeEventLog('Deposit', event.data, event.topics);

          expect(await dpxVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
          expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(decodedEvent.shares);
          expect((await dpxVault.totalAssets())).to.equal(decodedEvent.shares);
          expect(await portfolioContract.balanceOf(wallet.address)).to.equal(amount);
        }
      }
    });
    it("Should be able to claim rewards", async function () {
      // deposit
      const oneInchSwapData = await fetch1InchSwapData(weth.address,
        dpxTokenAddress,
        amount.div(2),
        dpxVault.address);
      await (await portfolioContract.connect(wallet).deposit(amount, oneInchSwapData, { gasLimit: gasLimit })).wait();
      await mineBlocks(100); // Mine 1 blocks
      const originalSushiBalance = await sushiToken.balanceOf(wallet.address);
      const originalDpxBalance = await dpxToken.balanceOf(wallet.address);
      const claimableRewards = await portfolioContract.connect(wallet).claimableRewards(wallet.address);
      const sushiClaimableReward = claimableRewards[0].claimableRewards[0].amount;
      const dpxClaimableReward = claimableRewards[0].claimableRewards[1].amount;
      expect(sushiClaimableReward).to.be.gt(0);
      expect(dpxClaimableReward).to.be.gt(0);

      await portfolioContract.connect(wallet).claim(wallet.address, rRewardTokens);
      // NOTE: using `to.be.gt` instead of `to.equal` because the reward would somehow be increased after claim(). My hunch is that sushiswap would trigger some reward distribution after the claim() tx is mined.
      expect((await sushiToken.balanceOf(wallet.address)).sub(originalSushiBalance)).to.be.gt(sushiClaimableReward);
      expect((await dpxToken.balanceOf(wallet.address)).sub(originalDpxBalance)).to.be.gt(dpxClaimableReward);
      const remainingClaimableRewards = await portfolioContract.connect(wallet).claimableRewards(wallet.address);
      expect(remainingClaimableRewards[0].claimableRewards[0].amount).to.equal(0);
      expect(remainingClaimableRewards[0].claimableRewards[1].amount).to.equal(0);
    })

    it("Should be able to redeemAll dpx deposit", async function () {
      const oneInchSwapData = await fetch1InchSwapData(weth.address, dpxTokenAddress, amount.div(2), dpxVault.address);
      const receipt = await (await portfolioContract.connect(wallet).deposit(amount, oneInchSwapData, { gasLimit: gasLimit })).wait();
      // Iterate over the events and find the Deposit event
      for (const event of receipt.events) {
        if (event.topics.includes(dpxVault.interface.getEventTopic('Deposit'))) {
          const decodedEvent = dpxVault.interface.decodeEventLog('Deposit', event.data, event.topics);
          expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(decodedEvent.shares);
          expect(await dpxVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
          // redeemAll
          /// should have no rewards before redeemAll
          expect(await sushiToken.balanceOf(dpxVault.address)).to.equal(0);
          expect(await dpxToken.balanceOf(dpxVault.address)).to.equal(0);

          // check dpxSLP balance
          const portfolioShares = await portfolioContract.balanceOf(wallet.address);
          await (await portfolioContract.connect(wallet).redeemAll(portfolioShares, wallet.address, { gasLimit: gasLimit })).wait();
          expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(0);
          expect(await dpxSLP.balanceOf(dpxVault.address)).to.equal(0);
          expect(await dpxSLP.balanceOf(wallet.address)).to.equal(decodedEvent.shares);

        }
      }
      // rewards should be claimed
      const remainingClaimableRewards = await portfolioContract.connect(wallet).claimableRewards(wallet.address);
      expect(remainingClaimableRewards).to.deep.equal([]);
    })
  });
});