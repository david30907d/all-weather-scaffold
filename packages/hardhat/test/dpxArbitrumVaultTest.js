const { expect } = require("chai");
const {fetch1InchSwapData, mineBlocks} = require("./utils");

const myImpersonatedWalletAddress = "0xe4bac3e44e8080e1491c11119197d33e396ea82b";
const sushiSwapDpxLpTokenAddress = "0x0C1Cf6883efA1B496B01f654E247B9b419873054";
const sushiMiniChefV2Address = "0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3";
const dpxTokenAddress = "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55";
const sushiTokenAddress = "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A";
const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const radiantDlpAddress = "0x32dF62dc3aEd2cD6224193052Ce665DC18165841";
const radiantLockZapAddress = "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1";
const sushiPid = 17;
const gasLimit = 2675600;
const rRewardTokens = ["0x912ce59144191c1204e64559fe8253a0e49e6548","0x5979d7b546e38e414f7e9822514be443a4800529","0xda10009cbd5d07dd0cecc66161fc93d7c9000da1","0xff970a61a04b1ca14834a43f5de4533ebddb5cc8","0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9","0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f"];

let wallet;
let dpxVault;
let portfolioContract;
const amount = ethers.utils.parseUnits('0.001', 18);


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
      const oneInchSwapData = await fetch1InchSwapData(weth.address, dpxTokenAddress, amount.div(2), dpxVault.address);
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