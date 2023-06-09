const { expect } = require("chai");
const { Router, toAddress } = require('@pendle/sdk-v2');
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
  gasLimit,
  getLiFiCrossChainContractCallCallData
} = require("./utils");


let wallet;
let weth;
let radiantVault;
let portfolioContract;
let fsGLP
let currentTimestamp = Math.floor(Date.now() / 1000);;

describe("All Weather Protocol", function () {
  beforeEach(async () => {
    this.timeout(120000); // Set timeout to 120 seconds
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    fsGLP = await ethers.getContractAt("IERC20", fsGLPAddress);
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
    equilibriaGlpVault = await EquilibriaGlpVault.deploy(fsGLP.address);
    await equilibriaGlpVault.deployed();
    
    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.connect(wallet).deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address);
    await portfolioContract.connect(wallet).deployed();
    await portfolioContract.setVaultAllocations([{protocol: "AllWeatherLP-RadiantBSC-DLP", percentage: 100}]).then((tx) => tx.wait());
    await (await weth.connect(wallet).approve(portfolioContract.address, radiantAmount, { gasLimit: 2057560 })).wait();

  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to zapin with WETH into Radiant dLP", async function () {
      const oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
      const pendleZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, dpxAmount, 0.1);
      const receipt = await portfolioContract.populateTransaction.deposit(dpxAmount, oneInchSwapDataForDpx, pendleZapInData[2], pendleZapInData[3], pendleZapInData[4]);
      fromChain, fromToken, fromAddress, toChain, toToken, toAmount, crossChainTransaction, toContractGasLimit, contractOutputsToken
      getLiFiCrossChainContractCallCallData()
    //   diamond
      0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE
    });


    // it("Should not be able to withdraw Radiant dLP", async function () {
    //   const oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
    //   await (await portfolioContract.deposit(radiantAmount, [{protocol: "radiant", percentage: 100}], oneInchSwapDataForDpx, { gasLimit: gasLimit })).wait();
    //   const totalAssets = await radiantVault.totalAssets();
    //   const totalLockedAssets = await radiantVault.totalLockedAssets();
    //   const totalUnlockedAssets = await radiantVault.totalUnstakedAssets();
    //   await (await portfolioContract.redeem(radiantAmount, wallet.address, { gasLimit: gasLimit })).wait();
    //   expect(await radiantVault.totalAssets()).to.equal(totalAssets);
    //   expect(await radiantVault.totalLockedAssets()).to.equal(totalLockedAssets);
    //   expect(await radiantVault.totalStakedButWithoutLockedAssets()).to.equal(totalUnlockedAssets);
    // });
  });
});