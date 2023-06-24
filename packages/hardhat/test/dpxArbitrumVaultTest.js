const { expect } = require("chai");
const { network } = require("hardhat");
const fetch = require('node-fetch');

const myImpersonatedWalletAddress = "0x7ee54ab0f204bb3a83df90fdd824d8b4abe93222";
const sushiSwapDpxLpTokenAddress = "0x0C1Cf6883efA1B496B01f654E247B9b419873054";
const sushiMiniChefV2Address = "0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3";
const dpxTokenAddress = "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55";
const sushiTokenAddress = "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A";
const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const sushiPid = 17;
const gasLimit = 2675600;

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
    sushiToken = await ethers.getContractAt('MockDAI', sushiTokenAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);

    const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
    dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
    await dpxVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy(weth.address, dpxVault.address, dpxVault.address);
    await portfolioContract.deployed();

    await (await weth.connect(wallet).approve(portfolioContract.address, amount, { gasLimit: gasLimit })).wait();
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
          expect(await portfolioContract.balanceOf(wallet.address)).to.equal(amount);
        }
      }
    });
    it("Should be able to claim rewards", async function () {
      // deposit
      const oneInchSwapData = await fetch1InchSwapData(weth.address, dpxTokenAddress, amount.div(2), dpxVault.address);
      await (await portfolioContract.connect(wallet).deposit(amount, oneInchSwapData, { gasLimit: gasLimit })).wait();
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
      const originalBalance = await dpxSLP.balanceOf(dpxVault.address);
      // miniChefV2OriginalBalance means the staked amount in miniChefV2
      const miniChefV2OriginalBalance = (await miniChefV2.userInfo(sushiPid, dpxVault.address))[0];
      console.log("miniChefV2OriginalBalance", miniChefV2OriginalBalance.toString());
      const oneInchSwapData = await fetch1InchSwapData(weth.address, dpxTokenAddress, amount.div(2), dpxVault.address);
      const receipt = await (await portfolioContract.connect(wallet).deposit(amount, oneInchSwapData, { gasLimit: gasLimit })).wait();
      console.log("after deposit miniChefV2OriginalBalance", miniChefV2OriginalBalance.toString());
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
          expect(await dpxSLP.balanceOf(dpxVault.address)).to.equal(originalBalance);
          expect(await dpxSLP.balanceOf(wallet.address)).to.equal(decodedEvent.shares);

          // rewards should be claimed
          expect(await sushiToken.balanceOf(dpxVault.address)).to.be.gt(0);
          expect(await dpxToken.balanceOf(dpxVault.address)).to.be.gt(0);
        }
      }

    })
  });
});

async function mineBlocks(numBlocks) {
  for (let i = 0; i < numBlocks; i++) {
    await network.provider.send("evm_mine");
  }
}

async function fetch1InchSwapData(fromTokenAddress, toTOkenAddress, amount, fromAddress) {
  const res = await fetch(`https://api.1inch.io/v5.0/42161/swap?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTOkenAddress}&amount=${amount.toString()}&fromAddress=${fromAddress}&slippage=10&disableEstimate=true`)
  const resJson = await res.json();
  return resJson.tx.data;
}
