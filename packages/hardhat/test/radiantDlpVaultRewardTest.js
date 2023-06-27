const { expect } = require("chai");
const {fetch1InchSwapData, getUserEthBalance, sushiSwapDpxLpTokenAddress, sushiMiniChefV2Address, sushiPid,
  myImpersonatedWalletAddress,
wethAddress,
radiantDlpAddress,
radiantLockZapAddress,
multiFeeDistributionAddress,
radiantAmount,
dpxTokenAddress
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

    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLockZapAddress);
    await radiantVault.deployed();

    const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
    dpxVault = await DpxArbitrumVault.deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
    await dpxVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy(weth.address, radiantVault.address, dpxVault.address);
    await portfolioContract.deployed();

    await (await weth.connect(wallet).approve(portfolioContract.address, radiantAmount, { gasLimit: 2057560 })).wait();
    await weth.connect(wallet).withdraw(ethers.utils.parseEther("0.1"), { gasLimit: 2057560 });
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to claim reward", async function () {
      this.timeout(120000); // Set timeout to 120 seconds
      const oneInchSwapDataForDpxVault = await fetch1InchSwapData(weth.address, dpxTokenAddress, radiantAmount.div(2), wallet.address);
      await (await portfolioContract.connect(wallet).deposit(radiantAmount, [{protocol: "radiant", percentage: 100}], oneInchSwapDataForDpxVault, { gasLimit: 20575600})).wait();

      currentTimestamp += 12 * 31 * 24 * 60 * 60; // Increment timestamp
      await simulateAYearLater();

      const randomWallet = ethers.Wallet.createRandom();
      const rRewardTokens = ["0x912ce59144191c1204e64559fe8253a0e49e6548","0x5979d7b546e38e414f7e9822514be443a4800529","0xda10009cbd5d07dd0cecc66161fc93d7c9000da1","0xff970a61a04b1ca14834a43f5de4533ebddb5cc8","0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9","0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f"];
      const nativeRewardTokens = ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f","0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9","0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8","0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1","0x5979D7b546E38E414F7E9822514be443A4800529","0x912CE59144191C1204E64559FE8253a0e49E6548"];
      let balancesBeforeClaim = [];
      for (const nativeRewardToken of nativeRewardTokens) {
        const nativeToken = await ethers.getContractAt("MockDAI", nativeRewardToken);
        const balanceBeforeClaim = await nativeToken.balanceOf(randomWallet.address);
        balancesBeforeClaim.push(balanceBeforeClaim);
        expect(balanceBeforeClaim).to.equal(0);
      }
      const ethBalanceBeforeClaim = await getUserEthBalance(randomWallet.address);
      expect(ethBalanceBeforeClaim).to.equal(0);
      await (await portfolioContract.connect(wallet).claim(randomWallet.address, rRewardTokens, { gasLimit: 20575600})).wait();
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