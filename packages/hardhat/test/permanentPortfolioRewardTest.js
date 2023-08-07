const { expect } = require("chai");
const fs = require('fs');
const { fetch1InchSwapData,
    myImpersonatedWalletAddress,
    sushiSwapDpxLpTokenAddress,
    sushiMiniChefV2Address,
    wethAddress,
    sushiPid,
    multiFeeDistributionAddress,
    end2endTestingAmount,
    fsGLPAddress,
    getPendleZapInData,
    getPendleZapOutData,
    gDAIMarketPoolAddress,
    dpxTokenAddress,
    gDAIAddress,
    pendleTokenAddress,
    gasLimit,
    daiAddress,
    gDAIRewardPoolAddress,
    glpMarketPoolAddress,
    simulateAYearLater,
    amountAfterChargingFee,
    claimableRewardsTestDataForPermanentPortfolio,
    mineBlocks,
    sushiTokenAddress
} = require("./utils");
let { currentTimestamp } = require("./utils");

let wallet;
let weth;
let portfolioContract;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;
let portfolioShares;

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
    return await (await portfolioContract.connect(wallet).deposit(depositData, { gasLimit })).wait();
}


describe("All Weather Protocol", function () {
    beforeEach(async () => {
        wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
        dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
        weth = await ethers.getContractAt('IWETH', wethAddress);
        dpxToken = await ethers.getContractAt("MockDAI", dpxTokenAddress);
        fsGLP = await ethers.getContractAt("IERC20", fsGLPAddress);
        pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
        pendleGDAIMarketLPT = await ethers.getContractAt("IERC20", gDAIMarketPoolAddress);
        pendleToken = await ethers.getContractAt("IERC20", pendleTokenAddress);
        daiToken = await ethers.getContractAt("IERC20", daiAddress);
        gDAIToken = await ethers.getContractAt("IERC20", gDAIAddress);
        // we can check our balance in equilibria with this reward pool
        dGDAIRewardPool = await ethers.getContractAt("IERC20", gDAIRewardPoolAddress);
        multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
        await weth.connect(wallet).deposit({ value: ethers.utils.parseEther("1"), gasLimit });


        const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
        dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
        await dpxVault.deployed();

        const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
        equilibriaGlpVault = await EquilibriaGlpVault.deploy(pendleGlpMarketLPT.address, "Equilibria-GLP", "ALP-EQB-GLP");
        await equilibriaGlpVault.deployed();

        const EquilibriaGDAIVault = await ethers.getContractFactory("EquilibriaGDAIVault");
        equilibriaGDAIVault = await EquilibriaGDAIVault.deploy(pendleGDAIMarketLPT.address, "Equilibria-GDAI", "ALP-EQB-GDAI");
        await equilibriaGDAIVault.deployed();

        const PermanentPortfolioLPToken = await ethers.getContractFactory("PermanentPortfolioLPToken");
        portfolioContract = await PermanentPortfolioLPToken.connect(wallet).deploy(weth.address, dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address);
        await portfolioContract.connect(wallet).deployed();
        await portfolioContract.setVaultAllocations([{
            protocol: "SushSwap-DpxETH", percentage: 25,
        }, {
            protocol: "Equilibria-GLP", percentage: 25
        }, {
            protocol: "Equilibria-GDAI", percentage: 25
        }
        ]).then((tx) => tx.wait());
        await (await weth.connect(wallet).approve(portfolioContract.address, end2endTestingAmount, { gasLimit })).wait();

        try {
            console.log("read 1inch calldata and pendle calldata from json file")
            oneInchSwapDataForDpx = JSON.parse(fs.readFileSync('oneInchSwapDataForDpx.json', 'utf8'));
            oneInchSwapDataForGDAI = JSON.parse(fs.readFileSync('oneInchSwapDataForGDAI.json', 'utf8'));
            pendleGDAIZapInData = JSON.parse(fs.readFileSync('pendleGDAIZapInData.json', 'utf8'));
            pendleGLPZapInData = JSON.parse(fs.readFileSync('pendleGLPZapInData.json', 'utf8'));
        } catch (err) {
            console.error('json file not found, get new 1inch calldata and pendle calldata');
            oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, amountAfterChargingFee.div(8), dpxVault.address, 50);
            fs.writeFileSync('oneInchSwapDataForDpx.json', JSON.stringify(oneInchSwapDataForDpx, null, 2), 'utf8')

            oneInchSwapDataForGDAI = await fetch1InchSwapData(weth.address, daiToken.address, amountAfterChargingFee.div(4), equilibriaGDAIVault.address, 50);
            fs.writeFileSync('oneInchSwapDataForGDAI.json', JSON.stringify(oneInchSwapDataForGDAI, null, 2), 'utf8')

            // oneInchSwapDataForGDAI.toAmount).div(2): due to the 1inch slippage, need to multiple by 0.95 to pass pendle zap in
            pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toAmount).mul(50).div(100), 0.2, daiToken.address);
            fs.writeFileSync('pendleGDAIZapInData.json', JSON.stringify(pendleGDAIZapInData, null, 2), 'utf8')

            pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, amountAfterChargingFee.div(4), 0.99);
            fs.writeFileSync('pendleGLPZapInData.json', JSON.stringify(pendleGLPZapInData, null, 2), 'utf8')
        }
        portfolioShares = amountAfterChargingFee.div(await portfolioContract.unitOfShares());
    });
    describe("Portfolio LP Contract Test", function () {
        it("Should be able to claim rewards", async function () {
            const randomWallet = ethers.Wallet.createRandom();
            this.timeout(240000); // Set timeout to 120 seconds
            await deposit();
            await mineBlocks(1000);
            const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
            for (const claimableReward of claimableRewards) {
                for (const reward of claimableReward.claimableRewards) {
                    if (reward.token == sushiTokenAddress) {
                        continue
                    }
                    expect(reward.amount).to.be.gt(0);
                }
            }


            await portfolioContract.connect(wallet).claim(randomWallet.address);
            // dpx
            expect(await dpxToken.balanceOf(randomWallet.address)).to.be.gt(0);

            // gdai
            expect(await pendleToken.balanceOf(randomWallet.address)).to.be.gt(0);

            // glp
            expect(await weth.balanceOf(randomWallet.address)).to.be.gt(0);

        })
        it("Should be able to check claimable rewards", async function () {
            const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
            expect(claimableRewards).to.deep.equal(claimableRewardsTestDataForPermanentPortfolio);
        })
    });
});