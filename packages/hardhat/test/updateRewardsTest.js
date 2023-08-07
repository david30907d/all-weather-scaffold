const { expect } = require("chai");
const { fetch1InchSwapData,
    myImpersonatedWalletAddress,
    myImpersonatedWalletAddress2,
    sushiSwapDpxLpTokenAddress,
    sushiMiniChefV2Address,
    wethAddress,
    radiantDlpAddress,
    radiantLendingPoolAddress,
    sushiPid,
    multiFeeDistributionAddress,
    end2endTestingAmount,
    fsGLPAddress,
    getPendleZapInData,
    gDAIMarketPoolAddress,
    dpxTokenAddress,
    gDAIAddress,
    pendleTokenAddress,
    gasLimit,
    daiAddress,
    gDAIRewardPoolAddress,
    glpMarketPoolAddress,
    simulateAYearLater,
    mineBlocks,
    radiantRTokens,
    fakePendleZapOut,
    amountAfterChargingFee
} = require("./utils");
let {currentTimestamp} = require("./utils");

let wallet;
let wallet2;
let weth;
let radiantVault;
let portfolioContract;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;
let portfolioShares;

async function deposit(passingInWallet=wallet) {
    await (await weth.connect(passingInWallet).approve(portfolioContract.address, end2endTestingAmount, { gasLimit: gasLimit })).wait();
    const depositData = {
      amount: end2endTestingAmount,
      receiver: passingInWallet.address,
      oneInchDataDpx: oneInchSwapDataForDpx.tx.data,
      glpMinLpOut: pendleGLPZapInData[2],
      glpGuessPtReceivedFromSy: pendleGLPZapInData[3],
      glpInput: pendleGLPZapInData[4],
      gdaiMinLpOut: pendleGDAIZapInData[2],
      gdaiGuessPtReceivedFromSy: pendleGDAIZapInData[3],
      gdaiInput: pendleGDAIZapInData[4],
      gdaiOneInchDataGDAI: oneInchSwapDataForGDAI.tx.data
    }
    return await (await portfolioContract.connect(passingInWallet).deposit(depositData, { gasLimit: 30000000 })).wait();
  }
  

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
        wallet2 = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress2);
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
        await weth.connect(wallet).deposit({ value: ethers.utils.parseEther("1"), gasLimit });
        await weth.connect(wallet2).deposit({ value: ethers.utils.parseEther("0.1"), gasLimit });

        const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
        radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLendingPoolAddress);
        await radiantVault.deployed();

        const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
        dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
        await dpxVault.deployed();

        const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
        equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address, "Equilibria-GLP", "ALP-EQB-GLP");
        await equilibriaGlpVault.deployed();

        const EquilibriaGDAIVault = await ethers.getContractFactory("EquilibriaGDAIVault");
        equilibriaGDAIVault = await EquilibriaGDAIVault.deploy(pendleGDAIMarketLPT.address, "Equilibria-GDAI", "ALP-EQB-GDAI");
        await equilibriaGDAIVault.deployed();

        const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
        portfolioContract = await AllWeatherPortfolioLPToken.connect(wallet).deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address);
        await portfolioContract.connect(wallet).deployed();
        await portfolioContract.setVaultAllocations([
        {
            protocol: "RadiantArbitrum-DLP", percentage: 25
        }, 
        ]).then((tx) => tx.wait());

        oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxToken.address, amountAfterChargingFee.div(8), dpxVault.address, 50);
        oneInchSwapDataForGDAI = await fetch1InchSwapData(weth.address, daiToken.address, amountAfterChargingFee.div(4), equilibriaGDAIVault.address, 50);
        // oneInchSwapDataForGDAI.toAmount).div(2): due to the 1inch slippage, need to multiple by 0.95 to pass pendle zap in
        pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toAmount).mul(50).div(100), 0.2, daiToken.address);
        pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, amountAfterChargingFee.div(4), 0.99);
        portfolioShares = amountAfterChargingFee.div(await portfolioContract.unitOfShares());
    });
    describe("Portfolio LP Contract Test", function () {
        it("Reward Should be different, if they zap in different timeing", async function () {
            this.timeout(2400000); // Set timeout to 120 seconds
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0])).to.equal(0);
            await deposit(wallet);
            await mineBlocks(1700); // wait for 7 hours, otherwise the reward/shares would be too small and be rounded to 0
            const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
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
                    }
                }
            }
            await deposit(wallet2);
            for (const rToken of radiantRTokens) {
                expect(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), rToken)).to.be.gt(0);
                expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), rToken)).to.equal(0);
            }
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            const rewardsOfWallet2 = await portfolioContract.getClaimableRewards(wallet2.address);
            for (const [vaultIdx, claimableReward] of (await portfolioContract.getClaimableRewards(wallet.address)).entries()) {
                if (claimableReward.protocol !== await radiantVault.name()) {
                    expect(claimableReward.claimableRewards).to.deep.equal([]);
                } else {
                    expect(claimableReward.claimableRewards.length).to.equal(8);
                    for (const [index, reward] of claimableReward.claimableRewards.entries()) {
                        if (index===0 || index ===1){
                            expect(reward.amount).to.equal(0);
                            continue
                        }
                        const vaultRewardOfWallet2 = rewardsOfWallet2[vaultIdx].claimableRewards[index].amount;
                        expect(reward.amount).to.be.gt(vaultRewardOfWallet2);
                    }
                }
            }
        });
        it("userRewardsOfInvestedProtocols should be reset to 0 after claim()", async function () {
            await deposit(wallet);
            const rewardPerShareZappedIn1 = await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]);
            expect(rewardPerShareZappedIn1).to.equal(0);
            await mineBlocks(2000); // wait for 7 hours, otherwise the reward/shares would be too small and be rounded to 0
            await deposit(wallet2);
            const rewardPerShareZappedIn2 = await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]);
            expect(rewardPerShareZappedIn2).to.be.gt(rewardPerShareZappedIn1);

            // claim
            expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            await (await portfolioContract.connect(wallet).claim(wallet.address, { gasLimit: 30000000 })).wait();
            expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]));
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);

            // 2nd deposit for wallet2
            await weth.connect(wallet2).deposit({ value: ethers.utils.parseEther("0.1"), gasLimit });
            await mineBlocks(2000); // wait for 7 hours, otherwise the reward/shares would be too small and be rounded to 0
            await deposit(wallet2);
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.be.gt(0);
            await (await portfolioContract.connect(wallet2).claim(wallet2.address, { gasLimit: 30000000 })).wait();
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardPerTokenPaid(wallet2.address, radiantVault.name(), radiantRTokens[0])).to.equal(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]));
            const rewardPerShareZappedIn3 = await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]);
            expect(rewardPerShareZappedIn3).to.be.gt(rewardPerShareZappedIn2);

        })
        it("userRewardsOfInvestedProtocols should be reset to 0 after redeem()", async function () {
            await deposit(wallet);
            currentTimestamp += 24 * 31 * 24 * 60 * 60; // Increment timestamp
            await simulateAYearLater();
      
            await (await portfolioContract.connect(wallet).redeem(portfolioContract.balanceOf(wallet.address), wallet.address, fakePendleZapOut, { gasLimit: 30000000 })).wait();
            expect(await portfolioContract.userRewardsOfInvestedProtocols(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(0);
            expect(await portfolioContract.userRewardPerTokenPaid(wallet.address, radiantVault.name(), radiantRTokens[0])).to.equal(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0]));
            expect(await portfolioContract.rewardPerShareZappedIn(radiantVault.name(), radiantRTokens[0])).to.be.gt(0);
        })
    });
});