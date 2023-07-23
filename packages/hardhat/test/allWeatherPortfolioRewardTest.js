const { expect } = require("chai");
const { fetch1InchSwapData,
    myImpersonatedWalletAddress,
    sushiSwapDpxLpTokenAddress,
    sushiMiniChefV2Address,
    wethAddress,
    radiantDlpAddress,
    radiantLendingPoolAddress,
    sushiPid,
    radiantLendingPoolAddress,
    multiFeeDistributionAddress,
    end2endTestingAmount,
    fsGLPAddress,
    getPendleZapInData,
    gDAIMarketPoolAddress,
    dpxTokenAddress,
    mineBlocks,
    gDAIAddress,
    pendleTokenAddress,
    gasLimit,
    daiAddress,
    gDAIRewardPoolAddress,
    glpMarketPoolAddress,
    getUserEthBalance
} = require("./utils");
let {currentTimestamp} = require("./utils");

let wallet;
let weth;
let radiantVault;
let portfolioContract;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;

async function deposit() {
  const depositData = {
    amount: end2endTestingAmount,
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
  return await (await portfolioContract.connect(wallet).deposit(depositData, { gasLimit: 30000000 })).wait();
}

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
        dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
        weth = await ethers.getContractAt('IWETH', wethAddress);
        dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
        dpxToken = await ethers.getContractAt("MockDAI", dpxTokenAddress);
        fsGLP = await ethers.getContractAt("IERC20", fsGLPAddress);
        pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
        pendleGDAIMarketLPT = await ethers.getContractAt("IERC20", gDAIMarketPoolAddress);
        pendleToken = await ethers.getContractAt("IERC20", pendleTokenAddress);
        daiToken = await ethers.getContractAt("IERC20", daiAddress);
        gDAIToken = await ethers.getContractAt("IERC20", gDAIAddress);
        // we can check our balance in equilibria with this reward pool
        dGDAIRewardPool = await ethers.getContractAt("IERC20", gDAIRewardPoolAddress);
        radiantLendingPool = await ethers.getContractAt("ILendingPool", radiantLendingPoolAddress);
        multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
        await weth.connect(wallet).deposit({ value: ethers.utils.parseEther("1"), gasLimit: 2057560 });

        const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
        radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLendingPoolAddress);
        await radiantVault.deployed();

        const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
        dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
        await dpxVault.deployed();

        const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
        equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address);
        await equilibriaGlpVault.deployed();

        const EquilibriaGDAIVault = await ethers.getContractFactory("EquilibriaGDAIVault");
        equilibriaGDAIVault = await EquilibriaGDAIVault.deploy(pendleGDAIMarketLPT.address, "AllWeatherLP-Equilibria-GDAI", "ALP-EQB-GDAI");
        await equilibriaGDAIVault.deployed();

        const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
        portfolioContract = await AllWeatherPortfolioLPToken.connect(wallet).deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address);
        await portfolioContract.connect(wallet).deployed();
        await portfolioContract.setVaultAllocations([{
            protocol: "AllWeatherLP-SushSwap-DpxETH", percentage: 25,
        }, {
            protocol: "AllWeatherLP-RadiantArbitrum-DLP", percentage: 25
        }, {
            protocol: "AllWeatherLP-Equilibria-GLP", percentage: 25
        }, {
            protocol: "AllWeatherLP-Equilibria-GDAI", percentage: 25
        }
        ]).then((tx) => tx.wait());
        await (await weth.connect(wallet).approve(portfolioContract.address, end2endTestingAmount, { gasLimit: gasLimit })).wait();

        oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxToken.address, end2endTestingAmount.div(8), wallet.address, 50);
        oneInchSwapDataForGDAI = await fetch1InchSwapData(weth.address, daiToken.address, end2endTestingAmount.div(4), wallet.address, 50);
        // oneInchSwapDataForGDAI.toTokenAmount).div(2): due to the 1inch slippage, need to multiple by 0.95 to pass pendle zap in
        pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toTokenAmount).mul(50).div(100), 0.2, daiToken.address);
        pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, end2endTestingAmount.div(4), 0.99);
    });

    describe("Portfolio LP Contract Test", function () {
        it("Should be able to claim rewards", async function () {
          const randomWallet = ethers.Wallet.createRandom();
          this.timeout(120000); // Set timeout to 120 seconds
          await deposit();
          await mineBlocks(1000);
          const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
          await portfolioContract.connect(wallet).claim(randomWallet.address);
          const radiantRTokens = ["0xd69D402D1bDB9A2b8c3d88D98b9CEaf9e4Cd72d9",          "0x48a29E756CC1C097388f3B2f3b570ED270423b3d",          "0x0D914606f3424804FA1BbBE56CCC3416733acEC6",          "0x0dF5dfd95966753f01cb80E76dc20EA958238C46",          "0x42C248D137512907048021B30d9dA17f48B5b7B2",          "0x2dADe5b7df9DA3a7e1c9748d169Cd6dFf77e3d01"]
          for (const claimableReward of claimableRewards) {
            for (const reward of claimableReward.claimableRewards) {
              if (radiantRTokens.includes(reward.token)) {
                // these are rToken. After withraw, it would be unwrapped to native token
                // so will check their balance in the next loop
                continue
              }
              const ethBalanceAfterClaim = await getUserEthBalance(wallet.address);
              const rewardToken = await ethers.getContractAt("IERC20", reward.token);
              expect(await rewardToken.balanceOf(randomWallet.address)).to.be.gte(reward.amount);
            }
          }
          const nativeRewardTokens = await radiantVault.getRadiantRewardNativeTokenAddresses();
          for (const nativeRewardToken of nativeRewardTokens) {
            if (nativeRewardToken === '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f') {
              // have no idea why radiant stop issueing wbtc as reward
              continue
            }
            const nativeToken = await ethers.getContractAt("MockDAI", nativeRewardToken);
            const balanceAfterClaim = await nativeToken.balanceOf(randomWallet.address);
            expect(balanceAfterClaim).to.gt(0);
          }
        })
        it("Should be able to check claimable rewards", async function () {
          const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
          expect(claimableRewards).to.deep.equal([]);
        })
    });
});