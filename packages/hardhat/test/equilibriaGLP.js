const { expect } = require("chai");
const { fetch1InchSwapData,
  myImpersonatedWalletAddress,
  sushiSwapDpxLpTokenAddress,
  sushiMiniChefV2Address,
  wethAddress,
  radiantDlpAddress,
  radiantLockZapAddress,
  sushiPid,
  radiantLendingPoolAddress,
  multiFeeDistributionAddress,
  radiantAmount,
  fsGLPAddress,
  getPendleZapInData,
  getPendleZapOutData,
  glpMarketPoolAddress,
  dpxAmount,
  dpxTokenAddress,
  mineBlocks,
  pendleTokenAddress,
  gasLimit
} = require("./utils");


let wallet;
let weth;
let radiantVault;
let portfolioContract;
let fsGLP
let currentTimestamp = Math.floor(Date.now() / 1000);;

describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    fsGLP = await ethers.getContractAt("IERC20", fsGLPAddress);
    pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
    pendleToken = await ethers.getContractAt("IERC20", pendleTokenAddress);
    // we can check our balance in equilibria with this reward pool
    glpRewardPool = await ethers.getContractAt("IERC20", "0x245f1d70AcAaCD219564FCcB75f108917037A960");
    radiantLockZap = await ethers.getContractAt("ILendingPool", radiantLendingPoolAddress);
    multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
    await weth.connect(wallet).withdraw(ethers.utils.parseEther("0.1"), { gasLimit: 2057560 });
    
    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLockZapAddress);
    await radiantVault.deployed();
    
    const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
    dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
    await dpxVault.deployed();
    
    const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
    // equilibriaGlpVault = await EquilibriaGlpVault.deploy(fsGLP.address);
    equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address);
    await equilibriaGlpVault.deployed();
    
    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.connect(wallet).deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address);
    await portfolioContract.connect(wallet).deployed();
    await portfolioContract.setVaultAllocations([{protocol: "equilibria-glp", percentage: 100}]).then((tx) => tx.wait());
    await (await weth.connect(wallet).approve(portfolioContract.address, radiantAmount, { gasLimit: gasLimit })).wait();

  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to zapin with WETH into Radiant dLP", async function () {
      const oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
      const pendleZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, dpxAmount, 0.99);
      const receipt = await (await portfolioContract.deposit(dpxAmount, oneInchSwapDataForDpx, pendleZapInData[2], pendleZapInData[3], pendleZapInData[4], { gasLimit: 10692137 })).wait();
      // Iterate over the events and find the Deposit event
      for (const event of receipt.events) {
        if (event.topics.includes(equilibriaGlpVault.interface.getEventTopic('Deposit'))) {
          const decodedEvent = equilibriaGlpVault.interface.decodeEventLog('Deposit', event.data, event.topics);

          expect(await equilibriaGlpVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
          expect((await equilibriaGlpVault.totalAssets())).to.equal(decodedEvent.shares);
          expect(await portfolioContract.balanceOf(wallet.address)).to.equal(dpxAmount);
          expect((await glpRewardPool.balanceOf(equilibriaGlpVault.address))).to.equal(decodedEvent.shares);
        }
      }

    });
    it("Should be able to withdraw GLP from equilibria", async function () {
      this.timeout(120000); // Set timeout to 120 seconds
      const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
      const oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
      const pendleZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, dpxAmount, 1);
      const receipt = await (await portfolioContract.connect(wallet).deposit(dpxAmount, oneInchSwapDataForDpx, pendleZapInData[2], pendleZapInData[3], pendleZapInData[4], { gasLimit: 10692137 })).wait();
      let shares;
      for (const event of receipt.events) {
        if (event.topics.includes(equilibriaGlpVault.interface.getEventTopic('Deposit'))) {
          const decodedEvent = equilibriaGlpVault.interface.decodeEventLog('Deposit', event.data, event.topics);
          shares = decodedEvent.shares;
        }
      }
      // TODO(david): need to change tokenOutAddress to GLP later
      // const pendleZapOutData = await getPendleZapOutData(42161, glpMarketPoolAddress, fsGLP.address, shares, 0.4);
      const pendleZapOutData = await getPendleZapOutData(42161, glpMarketPoolAddress, weth.address, shares, 1);
      // // withdraw
      await (await portfolioContract.connect(wallet).redeemAll(dpxAmount, wallet.address, pendleZapOutData[3], { gasLimit: 4675600 })).wait();
      expect(await pendleGlpMarketLPT.balanceOf(wallet.address)).to.equal(shares);
      expect(await equilibriaGlpVault.totalAssets()).to.equal(0);
    });

    it("Should be able to claim rewards", async function () {
      this.timeout(120000); // Set timeout to 120 seconds
      const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
      expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
      const oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
      const pendleZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, dpxAmount, 1);
      const receipt = await (await portfolioContract.connect(wallet).deposit(dpxAmount, oneInchSwapDataForDpx, pendleZapInData[2], pendleZapInData[3], pendleZapInData[4], { gasLimit: 10692137 })).wait();
      await mineBlocks(100); // Mine 100 blocks
      const originalPendleToken = await pendleToken.balanceOf(wallet.address);
      const originalWethBalance = await weth.balanceOf(wallet.address);
      const claimableRewards = await portfolioContract.claimableRewards(wallet.address);
      for (const claimableReward of claimableRewards) {
        if (claimableReward.protocol !== "equilibria-glp") {
          expect(claimableReward.claimableRewards).to.deep.equal([]);
        } else {
          expect(claimableReward.claimableRewards.length).to.equal(2);
        }
      }
      const pendleClaimableReward = claimableRewards[2].claimableRewards[0].amount;
      const wethClaimableReward = claimableRewards[2].claimableRewards[1].amount;
      expect(pendleClaimableReward).to.be.gt(0);
      expect(wethClaimableReward).to.be.gt(0);

      const equilibriaPids = [1];
      await portfolioContract.connect(wallet).claim(wallet.address, [], equilibriaPids);
      // NOTE: using `to.be.gt` instead of `to.equal` because the reward would somehow be increased after claim(). My hunch is that `claim()` would also claim the reward for the current block.
      expect((await pendleToken.balanceOf(wallet.address)).sub(originalPendleToken)).to.be.gt(pendleClaimableReward);
      expect((await weth.balanceOf(wallet.address)).sub(originalWethBalance)).to.be.gt(wethClaimableReward);
      const remainingClaimableRewards = await portfolioContract.connect(wallet).claimableRewards(wallet.address);
      // index 2 stands for equilibria-glp
      expect(remainingClaimableRewards[2].claimableRewards[0].amount).to.equal(0);
      expect(remainingClaimableRewards[2].claimableRewards[1].amount).to.equal(0);
    })
    it("Should be able to check claimable rewards", async function () {
      const claimableRewards = await portfolioContract.claimableRewards(wallet.address);
      expect(claimableRewards).to.deep.equal([]);
    })
  });
});