const { expect } = require("chai");
const { fetch1InchSwapData,
  myImpersonatedWalletAddress,
  sushiSwapDpxLpTokenAddress,
  sushiMiniChefV2Address,
  wethAddress,
  radiantDlpAddress,
  radiantLendingPoolAddress,
  radiantLockZapPoolAddress,
  sushiPid,
  multiFeeDistributionAddress,
  radiantAmount,
  fsGLPAddress,
  getPendleZapInData,
  getPendleZapOutData,
  gDAIMarketPoolAddress,
  dpxAmount,
  dpxTokenAddress,
  mineBlocks,
  gDAIAddress,
  pendleTokenAddress,
  gasLimit,
  daiAddress,
  gDAIRewardPoolAddress,
  glpMarketPoolAddress,
  getLiFiCrossChainContractCallCallData,
  squidRouterProxyAddress,
  getSquidCrossChainContractCallCallData,
  wbnbAddress,
  radiantBscLockZapPoolAddress
} = require("./utils");


let wallet;
let weth;
let radiantVault;
let portfolioContract;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGLPZapInData;
let pendleGDAIZapInData;
let portfolioShares;
let dlpToken;



describe("All Weather Protocol", function () {
  beforeEach(async () => {
    this.timeout(240000); // Set timeout to 120 seconds
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    wbnb = await ethers.getContractAt('IERC20', wbnbAddress)
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    fsGLP = await ethers.getContractAt("IERC20", fsGLPAddress);
    pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
    pendleGDAIMarketLPT = await ethers.getContractAt("IERC20", gDAIMarketPoolAddress);
    pendleToken = await ethers.getContractAt("IERC20", pendleTokenAddress);
    daiToken = await ethers.getContractAt("IERC20", daiAddress);
    gDAIToken = await ethers.getContractAt("IERC20", gDAIAddress);
    // we can check our balance in equilibria with this reward pool
    dGDAIRewardPool = await ethers.getContractAt("IERC20", gDAIRewardPoolAddress);
    radiantLendingPool = await ethers.getContractAt("ILendingPool", radiantLendingPoolAddress);
    radiantLockZap = await ethers.getContractAt("ILockZap", radiantLockZapPoolAddress);
    multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
    await weth.connect(wallet).deposit({ value: ethers.utils.parseEther("5"), gasLimit });

    const approveRadiantTx  = await wbnb.populateTransaction.approve(radiantBscLockZapPoolAddress, radiantAmount);
    const radiantTx  = await radiantLockZap.populateTransaction.zap(false, radiantAmount, 0, 3);
    const squidCallData = await getSquidCrossChainContractCallCallData('42161', '56', wethAddress, wbnbAddress, radiantAmount.toString(), wallet.address, '99', [
      {
        payload: {tokenAddress: wbnbAddress,
        inputPos: '1'}, callType: '1', target: radiantBscLockZapPoolAddress, callData: approveRadiantTx.data
      },
      {
        payload: {tokenAddress: wbnbAddress,
        inputPos: '1'}, callType: '1', target: radiantBscLockZapPoolAddress, callData: radiantTx.data
      }
    ])
    // const result = await wallet.call({
    //   to: squidRouterProxyAddress,
    //   data: squidCallData.route.transactionRequest.data,
    // });
  
    // console.log("Result:", result);
    // // getLiFiCrossChainContractCallCallData(fromChain, fromToken, fromAddress, toChain, toToken, toAmount, crossChainTransaction, toContractGasLimit, contractOutputsToken)

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
    await portfolioContract.setVaultAllocations([{protocol: "Equilibria-GDAI", percentage: 100}]).then((tx) => tx.wait());
    await (await weth.connect(wallet).approve(portfolioContract.address, radiantAmount, { gasLimit })).wait();
    console.log(squidCallData.route.transactionRequest.data)
    await portfolioContract.connect(wallet).test(radiantAmount, squidCallData.route.transactionRequest.data).then((tx) => tx.wait());
    // oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, daiToken.address, dpxAmount.div(2), dpxVault.address, 50);
    // oneInchSwapDataForGDAI = await fetch1InchSwapData(weth.address, daiToken.address, dpxAmount, equilibriaGDAIVault.address, 50);
    // pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, dpxAmount, 0.99);
    // pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toAmount).mul(95).div(100), 0.99, daiToken.address);
    // portfolioShares = dpxAmount.div(await portfolioContract.UNIT_OF_SHARES());
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to zapin with WETH into equilibria GDAI", async function () {
      // this.timeout(240000); // Set timeout to 120 seconds
      // const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

      // // Iterate over the events and find the Deposit event
      // for (const event of receipt.events) {
      //   if (event.topics.includes(equilibriaGDAIVault.interface.getEventTopic('Deposit'))) {
      //     const decodedEvent = equilibriaGDAIVault.interface.decodeEventLog('Deposit', event.data, event.topics);

      //     expect(await equilibriaGDAIVault.balanceOf(portfolioContract.address)).to.equal(decodedEvent.shares);
      //     expect((await equilibriaGDAIVault.totalAssets())).to.equal(decodedEvent.shares);
      //     expect(await portfolioContract.balanceOf(wallet.address)).to.equal(portfolioShares);
      //     expect((await dGDAIRewardPool.balanceOf(equilibriaGDAIVault.address))).to.equal(decodedEvent.shares);
      //   }
      // }
    });
    // it("Should be able to withdraw GDAI from equilibria", async function () {
    //   this.timeout(240000); // Set timeout to 120 seconds
    //   const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
    //   expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
    //   const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

    //   let shares;
    //   for (const event of receipt.events) {
    //     if (event.topics.includes(equilibriaGDAIVault.interface.getEventTopic('Deposit'))) {
    //       const decodedEvent = equilibriaGDAIVault.interface.decodeEventLog('Deposit', event.data, event.topics);
    //       shares = decodedEvent.shares;
    //     }
    //   }
    //   const pendleZapOutData = await getPendleZapOutData(42161, gDAIMarketPoolAddress, gDAIToken.address, shares, 1);
    //   // // withdraw
    //   await (await portfolioContract.connect(wallet).redeem(portfolioShares, wallet.address, pendleZapOutData[3], { gasLimit: 4675600 })).wait();
    //   expect(await pendleGDAIMarketLPT.balanceOf(wallet.address)).to.equal(shares);
    //   expect(await equilibriaGDAIVault.totalAssets()).to.equal(0);
    // });

    // it("Should be able to claim rewards", async function () {
    //   this.timeout(240000); // Set timeout to 120 seconds
    //   const radiantLockedDlpBalanceBeforeDeposit = await radiantVault.totalAssets();
    //   expect(radiantLockedDlpBalanceBeforeDeposit).to.equal(0);
    //   const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

    //   await mineBlocks(100); // Mine 100 blocks
    //   const originalPendleToken = await pendleToken.balanceOf(wallet.address);
    //   const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
    //   let pendleClaimableReward;
    //   for (const claimableReward of claimableRewards) {
    //     if (claimableReward.protocol !== "Equilibria-GDAI") {
    //       expect(claimableReward.claimableRewards).to.deep.equal([]);
    //     } else {
    //       expect(claimableReward.claimableRewards.length).to.equal(1);
    //       pendleClaimableReward = claimableReward.claimableRewards[0].amount;
    //       expect(pendleClaimableReward).to.be.gt(0);
    //     }
    //   }

    //   const equilibriaPids = [2];
    //   await portfolioContract.connect(wallet).claim(wallet.address);
    //   // NOTE: using `to.be.gt` instead of `to.equal` because the reward would somehow be increased after claim(). My hunch is that `claim()` would also claim the reward for the current block.
    //   expect((await pendleToken.balanceOf(wallet.address)).sub(originalPendleToken)).to.be.gt(pendleClaimableReward);
    //   const remainingClaimableRewards = await portfolioContract.connect(wallet).getClaimableRewards(wallet.address);
    //   for (const claimableReward of remainingClaimableRewards) {
    //     if (claimableReward.protocol === "Equilibria-GDAI") {
    //       expect(claimableReward.claimableRewards[0].amount).to.equal(0);
    //     }
    //   }
    // })
    // it("Should be able to check claimable rewards", async function () {
    //   const claimableRewards = await portfolioContract.getClaimableRewards(wallet.address);
    //   expect(claimableRewards).to.deep.equal([]);
    // })
  });
});