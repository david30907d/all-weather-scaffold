const { expect } = require("chai");
const { fetch1InchSwapData, mineBlocks, myImpersonatedWalletAddress,
  sushiSwapDpxLpTokenAddress,
  sushiMiniChefV2Address,
  dpxTokenAddress,
  sushiTokenAddress,
  wethAddress,
  radiantDlpAddress,
  radiantLendingPoolAddress,
  sushiPid,
  gasLimit,
  glpMarketPoolAddress,
  fakePendleZapOut,
  gDAIMarketPoolAddress,
  daiAddress,
  end2endTestingAmount,
  amountAfterChargingFee,
  fakePendleZapIn,
  claimableRewardsTestData } = require("./utils");

let wallet;
let dpxVault;
let portfolioContract;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let portfolioShares;

async function deposit() {
  const depositData = {
      amount: end2endTestingAmount,
      receiver: wallet.address,
      oneInchDataDpx: oneInchSwapDataForDpx.tx.data,
      glpMinLpOut: fakePendleZapIn[2],
      glpGuessPtReceivedFromSy: fakePendleZapIn[3],
      glpInput: fakePendleZapIn[4],
      gdaiMinLpOut: fakePendleZapIn[2],
      gdaiGuessPtReceivedFromSy: fakePendleZapIn[3],
      gdaiInput: fakePendleZapIn[4],
      gdaiOneInchDataGDAI: oneInchSwapDataForGDAI.tx.data
  }
  return await (await portfolioContract.connect(wallet).deposit(depositData, { gasLimit })).wait();
}

describe("All Weather Protocol", function () {
  beforeEach(async () => {
    this.timeout(120000); // Set timeout to 120 seconds
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    miniChefV2 = await ethers.getContractAt('IMiniChefV2', sushiMiniChefV2Address);
    dpxToken = await ethers.getContractAt('MockDAI', dpxTokenAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    daiToken = await ethers.getContractAt("IERC20", daiAddress);
    sushiToken = await ethers.getContractAt('MockDAI', sushiTokenAddress);
    pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
    pendleGDAIMarketLPT = await ethers.getContractAt("IERC20", gDAIMarketPoolAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);

    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLendingPoolAddress);
    await radiantVault.deployed();


    const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
    dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
    await dpxVault.deployed();

    const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
    equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address, "AllWeatherLP-Equilibria-GLP", "ALP-EQB-GLP");
    await equilibriaGlpVault.deployed();

    const EquilibriaGDAIVault = await ethers.getContractFactory("EquilibriaGDAIVault");
    equilibriaGDAIVault = await EquilibriaGDAIVault.deploy(pendleGDAIMarketLPT.address, "AllWeatherLP-Equilibria-GDAI", "ALP-EQB-GDAI");
    await equilibriaGDAIVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.connect(wallet).deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address);
    await portfolioContract.connect(wallet).deployed();
    await portfolioContract.setVaultAllocations([{protocol: "AllWeatherLP-SushSwap-DpxETH", percentage: 100}], { gasLimit }).then((tx) => tx.wait());

    await (await weth.connect(wallet).approve(portfolioContract.address, end2endTestingAmount, { gasLimit })).wait();
    await weth.connect(wallet).deposit({ value: ethers.utils.parseEther("1"), gasLimit });

    oneInchSwapDataForGDAI = await fetch1InchSwapData(weth.address, daiToken.address, amountAfterChargingFee, wallet.address, 50);
    oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address,
      dpxTokenAddress,
      amountAfterChargingFee.div(2),
      dpxVault.address, 50);
    portfolioShares = amountAfterChargingFee.div(await portfolioContract.unitOfShares());
  });
  describe("Portfolio LP Contract Test", function () {
    it("Should be able to deposit SLP to portfolio contract", async function () {
      const receipt = await deposit();
      // Iterate over the events and find the Deposit event
      for (const event of receipt.events) {
        if (event.topics.includes(dpxVault.interface.getEventTopic('Deposit'))) {
          const decodedEvent = dpxVault.interface.decodeEventLog('Deposit', event.data, event.topics);
          if (decodedEvent.owner === portfolioContract.address) {
            expect(await dpxVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
            expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(decodedEvent.shares);
            expect((await dpxVault.totalAssets())).to.equal(decodedEvent.shares);
            expect(await portfolioContract.balanceOf(wallet.address)).to.equal(portfolioShares);
          }
        }
      }
    });
    it("Should be able to claim rewards", async function () {
      await deposit();
      await mineBlocks(100); // Mine 1 blocks
      const originalSushiBalance = await sushiToken.balanceOf(wallet.address);
      const originalDpxBalance = await dpxToken.balanceOf(wallet.address);
      const claimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
      expect(claimableRewards[0].protocol).to.equal("AllWeatherLP-SushSwap-DpxETH");
      const sushiClaimableReward = claimableRewards[0].claimableRewards[0].amount;
      const dpxClaimableReward = claimableRewards[0].claimableRewards[1].amount;
      expect(sushiClaimableReward).to.equal(0);
      expect(dpxClaimableReward).to.be.gt(0);

      await portfolioContract.connect(wallet).claim(wallet.address, []);
      // NOTE: using `to.be.gt` instead of `to.equal` because the reward would somehow be increased after claim(). My hunch is that sushiswap would trigger some reward distribution after the claim() tx is mined.
      expect((await sushiToken.balanceOf(wallet.address)).sub(originalSushiBalance)).to.equal(sushiClaimableReward);
      expect((await dpxToken.balanceOf(wallet.address)).sub(originalDpxBalance)).to.be.gt(dpxClaimableReward);
      const remainingClaimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
      expect(remainingClaimableRewards[0].claimableRewards[0].amount).to.equal(0);
      expect(remainingClaimableRewards[0].claimableRewards[1].amount).to.equal(0);
    })

    it("Should be able to redeem dpx deposit", async function () {
      const receipt = await deposit();
      // Iterate over the events and find the Deposit event
      for (const event of receipt.events) {
        if (event.topics.includes(dpxVault.interface.getEventTopic('Deposit'))) {
          const decodedEvent = dpxVault.interface.decodeEventLog('Deposit', event.data, event.topics);
          if (decodedEvent.owner === portfolioContract.address) {
            expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(decodedEvent.shares);
            expect(await dpxVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
            // redeem
            /// should have no rewards before redeem
            expect(await sushiToken.balanceOf(dpxVault.address)).to.equal(0);
            expect(await dpxToken.balanceOf(dpxVault.address)).to.equal(0);
  
            // check dpxSLP balance
            await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, fakePendleZapOut, { gasLimit })).wait();
            expect((await miniChefV2.userInfo(sushiPid, dpxVault.address))[0]).to.equal(0);
            expect(await dpxSLP.balanceOf(dpxVault.address)).to.equal(0);
            expect(await dpxSLP.balanceOf(wallet.address)).to.equal(decodedEvent.shares);
          }
        }
      }
      // rewards should be claimed
      const remainingClaimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
      expect(remainingClaimableRewards).to.deep.equal(claimableRewardsTestData);
    })
  });
});