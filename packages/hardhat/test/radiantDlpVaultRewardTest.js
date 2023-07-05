const { expect } = require("chai");
const { fetch1InchSwapData, getUserEthBalance, sushiSwapDpxLpTokenAddress, sushiMiniChefV2Address, sushiPid,
  myImpersonatedWalletAddress,
  wethAddress,
  radiantDlpAddress,
  radiantLockZapAddress,
  multiFeeDistributionAddress,
  radiantAmount,
  dpxTokenAddress,
  glpMarketPoolAddress,
  getPendleZapInData,
  mineBlocks
} = require("./utils");

let wallet;
let weth;
let radiantVault;
let portfolioContract;
let currentTimestamp = Math.floor(Date.now() / 1000);;


describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    radiantLockZap = await ethers.getContractAt("ILendingPool", radiantLockZapAddress);
    multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
    pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
    await weth.connect(wallet).withdraw(ethers.utils.parseEther("0.05"), { gasLimit: 1057560 });
    
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
    await portfolioContract.setVaultAllocations([{ protocol: "radiant-arbitrum", percentage: 100 }]).then((tx) => tx.wait());
    await (await weth.connect(wallet).approve(portfolioContract.address, radiantAmount, { gasLimit: 2057560 })).wait();

  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to claim reward", async function () {
      this.timeout(120000); // Set timeout to 120 seconds
      const oneInchSwapDataForDpxVault = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
      const pendleZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, radiantAmount, 0.99);
      await (await portfolioContract.connect(wallet).deposit(radiantAmount, oneInchSwapDataForDpxVault, pendleZapInData[2], pendleZapInData[3], pendleZapInData[4], { gasLimit: 3057560 })).wait();
      await mineBlocks(100); // Mine 100 blocks

      currentTimestamp += 12 * 31 * 24 * 60 * 60; // Increment timestamp
      await simulateAYearLater();

      const randomWallet = ethers.Wallet.createRandom();
      const nativeRewardTokens = await radiantVault.getRadiantRewardNativeTokenAddresses();
      let balancesBeforeClaim = [];
      for (const nativeRewardToken of nativeRewardTokens) {
        const nativeToken = await ethers.getContractAt("MockDAI", nativeRewardToken);
        const balanceBeforeClaim = await nativeToken.balanceOf(randomWallet.address);
        balancesBeforeClaim.push(balanceBeforeClaim);
        expect(balanceBeforeClaim).to.equal(0);
      }
      const ethBalanceBeforeClaim = await getUserEthBalance(randomWallet.address);
      expect(ethBalanceBeforeClaim).to.equal(0);

      const claimableRewards = await portfolioContract.connect(wallet).claimableRewards(wallet.address);

      expect(claimableRewards[1].protocol).to.equal("radiant-arbitrum");
      // Error: VM Exception while processing transaction: reverted with reason string 'SafeERC20: low-level call failed'
      // means you probably transfer a pretty weird token
      await (await portfolioContract.connect(wallet).claim(randomWallet.address, [], { gasLimit: 30000000 })).wait();
      for (const nativeRewardToken of nativeRewardTokens) {
        const nativeToken = await ethers.getContractAt("MockDAI", nativeRewardToken);
        const balanceAfterClaim = await nativeToken.balanceOf(randomWallet.address);
        expect(balanceAfterClaim).to.gt(balancesBeforeClaim.pop());
      }
      const ethBalanceAfterClaim = await getUserEthBalance(randomWallet.address);
      expect(ethBalanceAfterClaim).to.gt(ethBalanceBeforeClaim);
    });
    it("Should be able to check claimable rewards", async function () {
      const claimableRewards = await portfolioContract.claimableRewards(wallet.address);
      expect(claimableRewards).to.deep.equal([]);
    })
  });
});


async function simulateAYearLater() {
  // Simulate a year later
  const oneMonthInSeconds = 12 * 31 * 24 * 60 * 60;
  const futureTimestamp = currentTimestamp + oneMonthInSeconds;
  await ethers.provider.send('evm_setNextBlockTimestamp', [futureTimestamp]);
  await ethers.provider.send('evm_mine');
}