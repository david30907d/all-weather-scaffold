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
  radiantRTokens
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
    equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address, "AllWeatherLP-Equilibria-GLP", "ALP-EQB-GLP");
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
    it("Should be able to withdraw native tokens from radiant tokens", async function () {
      this.timeout(120000); // Set timeout to 120 seconds
      await deposit();
      await mineBlocks(2000); // Mine 100 blocks
      const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
      let claimableRtokens = {};
      for (claimableReward of claimableRewards) {
          if (claimableReward.protocol !== await radiantVault.name()) {
              expect(claimableReward.claimableRewards).to.deep.equal([]);
          } else {
              expect(claimableReward.claimableRewards.length).to.equal(8);
              for (const [index, reward] of claimableReward.claimableRewards.entries()) {
                  if (index===0 || index ===1){
                      expect(reward.amount).to.equal(0);
                      continue
                  }
                  expect(reward.amount).to.be.gt(0);
                  claimableRtokens[reward.token] = reward.amount;
              }
          }
      }

      const randomWallet = ethers.Wallet.createRandom();
      await (await portfolioContract.connect(wallet).claim(randomWallet.address, { gasLimit: 30000000 })).wait();
      for (const rToken of radiantRTokens) {
        expect(await ethers.getContractAt("IERC20", rToken).balanceOf(randomWallet.address)).to.be.gte(claimableRtokens[rToken]);
      }

       //   original balance of native tokens
       let originalBalanceOfNativeTokens = {};
       for (const nativeToken of await radiantVault.radiantRewardNativeTokenAddresses()) {
          originalBalanceOfNativeTokens[nativeToken] = await ethers.getContractAt("IERC20", nativeToken).balanceOf(randomWallet.address);
       }
       const ethBalanceBeforeClaim = await getUserEthBalance(randomWallet.address);
       await (await portfolioContract.connect(wallet).withdrawAllWrappedRewards(randomWallet.address, { gasLimit: 30000000 })).wait();
       //   new balance of native tokens, after withdrawAllWrappedRewards()
       for (const nativeToken of await radiantVault.radiantRewardNativeTokenAddresses()) {
           expect(await ethers.getContractAt("IERC20", nativeToken).balanceOf(randomWallet.address)).to.be.gt(originalBalanceOfNativeTokens[nativeToken]);
        }
        const ethBalanceAfterClaim = await getUserEthBalance(randomWallet.address);
        expect(ethBalanceAfterClaim).to.be.gt(ethBalanceBeforeClaim);

    });
  });
});