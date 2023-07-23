const { expect } = require("chai");
const { fetch1InchSwapData, getUserEthBalance, sushiSwapDpxLpTokenAddress, sushiMiniChefV2Address, sushiPid,
  myImpersonatedWalletAddress,
  wethAddress,
  radiantDlpAddress,
  radiantLendingPoolAddress,
  multiFeeDistributionAddress,
  radiantAmount,
  dpxTokenAddress,
  glpMarketPoolAddress,
  getPendleZapInData,
  gDAIMarketPoolAddress,
  mineBlocks,
  daiAddress,
  dpxAmount,
  simulateAYearLater,
} = require("./utils");
let {currentTimestamp} = require("./utils");

let wallet;
let weth;
let radiantVault;
let portfolioContract;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGLPZapInData;
let pendleGDAIZapInData;

async function deposit() {
  const depositData = {
    amount: radiantAmount,
    receiver: wallet.address,
    oneInchDataDpx: oneInchSwapDataForDpx.tx.data,
    glpMinLpOut: pendleGLPZapInData[2],
    glpGuessPtReceivedFromSy: pendleGLPZapInData[3],
    glpInput: pendleGLPZapInData[4],
    gdaiMinLpOut: pendleGDAIZapInData[2],
    gdaiGuessPtReceivedFromSy: pendleGDAIZapInData[3],
    gdaiInput: pendleGDAIZapInData[4],
    gdaiOneInchDataGDAI: oneInchSwapDataForGDAI.tx.data
  }
  return await (await portfolioContract.connect(wallet).deposit(depositData)).wait();
}

describe("All Weather Protocol", function () {
  beforeEach(async () => {
    this.timeout(120000); // Set timeout to 120 seconds
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    daiToken = await ethers.getContractAt("IERC20", daiAddress);
    radiantLendingPool = await ethers.getContractAt("ILendingPool", radiantLendingPoolAddress);
    multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
    pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
    pendleGDAIMarketLPT = await ethers.getContractAt("IERC20", gDAIMarketPoolAddress);
    await weth.connect(wallet).deposit({ value: ethers.utils.parseEther("1"), gasLimit: 2057560 });
    
    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLendingPoolAddress);
    await radiantVault.deployed();
    
    const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
    dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
    await dpxVault.deployed();
    
    const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
    // equilibriaGlpVault = await EquilibriaGlpVault.deploy(fsGLP.address);
    equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address);
    await equilibriaGlpVault.deployed();
    
    const EquilibriaGDAIVault = await ethers.getContractFactory("EquilibriaGDAIVault");
    equilibriaGDAIVault = await EquilibriaGDAIVault.deploy(pendleGDAIMarketLPT.address, "AllWeatherLP-Equilibria-GDAI", "ALP-EQB-GDAI");
    await equilibriaGDAIVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.connect(wallet).deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address);
    await portfolioContract.connect(wallet).deployed();
    await portfolioContract.setVaultAllocations([{ protocol: "AllWeatherLP-RadiantArbitrum-DLP", percentage: 100 }]).then((tx) => tx.wait());
    await (await weth.connect(wallet).approve(portfolioContract.address, radiantAmount, { gasLimit: 2057560 })).wait();

    oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address, 50);
    oneInchSwapDataForGDAI = await fetch1InchSwapData(weth.address, daiToken.address, dpxAmount, wallet.address, 50);
    pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, radiantAmount, 0.99);
    pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toTokenAmount), 0.2, daiToken.address);
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to claim reward", async function () {
      this.timeout(120000); // Set timeout to 120 seconds
      await deposit();
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

      const claimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
      expect(claimableRewards[1].protocol).to.equal("AllWeatherLP-RadiantArbitrum-DLP");
      // Error: VM Exception while processing transaction: reverted with reason string 'SafeERC20: low-level call failed'
      // means you probably transfer a pretty weird token
      await (await portfolioContract.connect(wallet).claim(randomWallet.address, { gasLimit: 30000000 })).wait();
      for (const nativeRewardToken of nativeRewardTokens) {
        const nativeToken = await ethers.getContractAt("MockDAI", nativeRewardToken);
        const balanceAfterClaim = await nativeToken.balanceOf(randomWallet.address);
        expect(balanceAfterClaim).to.gt(balancesBeforeClaim.pop());
      }
      const ethBalanceAfterClaim = await getUserEthBalance(randomWallet.address);
      expect(ethBalanceAfterClaim).to.gt(ethBalanceBeforeClaim);
    });
    it("Should be able to check claimable rewards", async function () {
      const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
      expect(claimableRewards).to.deep.equal([]);
    })
  });
});