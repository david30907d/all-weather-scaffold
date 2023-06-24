const { expect } = require("chai");
const {fetch1InchSwapData, getUserEthBalance} = require("./utils");
const myImpersonatedWalletAddress = "0xe4bac3e44e8080e1491c11119197d33e396ea82b";
const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const radiantDlpAddress = "0x32dF62dc3aEd2cD6224193052Ce665DC18165841";
const radiantLockZapAddress = "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1";
const multiFeeDistributionAddress = "0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE";

const dpxTokenAddress = "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55";
const gasLimit = 20575600;

let wallet;
let weth;
let radiantVault;
let portfolioContract;
let currentTimestamp = Math.floor(Date.now() / 1000);;
const amount = ethers.utils.parseUnits('0.01', 18); // 100 DAI with 18 decimals


describe("All Weather Protocol", function () {
  beforeEach(async () => {
    wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
    weth = await ethers.getContractAt('IWETH', wethAddress);
    dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
    radiantLockZap = await ethers.getContractAt("ILendingPool", radiantLockZapAddress);
    multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);

    const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
    radiantVault = await RadiantArbitrumVault.deploy(dlpToken.address, radiantLockZapAddress, radiantLockZapAddress);
    await radiantVault.deployed();

    const AllWeatherPortfolioLPToken = await ethers.getContractFactory("AllWeatherPortfolioLPToken");
    portfolioContract = await AllWeatherPortfolioLPToken.deploy(weth.address, radiantVault.address, radiantVault.address);
    await portfolioContract.deployed();

    await (await weth.connect(wallet).approve(portfolioContract.address, amount, { gasLimit: 2057560 })).wait();
    await weth.connect(wallet).withdraw(ethers.utils.parseEther("0.1"), { gasLimit: 2057560 });
  });

  describe("Portfolio LP Contract Test", function () {
    it("Should be able to claim reward", async function () {
      this.timeout(120000); // Set timeout to 120 seconds
      const oneInchSwapDataForDpxVault = await fetch1InchSwapData(weth.address, dpxTokenAddress, amount.div(2), wallet.address);
      await (await portfolioContract.connect(wallet).deposit(amount, oneInchSwapDataForDpxVault, { gasLimit: gasLimit})).wait();

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
      await (await portfolioContract.connect(wallet).claim(randomWallet.address, rRewardTokens, { gasLimit: gasLimit})).wait();
      for (const nativeRewardToken of nativeRewardTokens) {
        const nativeToken = await ethers.getContractAt("MockDAI", nativeRewardToken);
        const balanceAfterClaim = await nativeToken.balanceOf(randomWallet.address);
        expect(balanceAfterClaim).to.gt(balancesBeforeClaim.pop());
      }
      const ethBalanceAfterClaim = await getUserEthBalance(randomWallet.address);
      expect(ethBalanceAfterClaim).to.gt(ethBalanceBeforeClaim);
    });
    it("Should be able to check claimable rewards", async function () {
      const claimableRewards = await portfolioContract.claimableRewards();
      for (const claimableReward of claimableRewards) {
        expect(claimableReward).to.have.property("token");
        expect(claimableReward).to.have.property("amount");
      }
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