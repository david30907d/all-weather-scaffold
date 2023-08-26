const hre = require("hardhat");
const { wethAddress, gDAIMarketPoolAddress, glpMarketPoolAddress, rethMarketPoolAddress, dpxTokenAddress, fetch1InchSwapData, getPendleZapInData, daiAddress, rethTokenAddress } = require("../test/utils");
const { config } = require('dotenv');
const fs = require('fs');
config();

const permanentPortfolioAddr = "0xedbdbd03784c8dba343a23877799d113e2f257af";
const dpxVaultAddr = "0xC6a58A8494E61fc4EF04F6075c4541C9664ADcC9";
const gdaiVaultAddr = "0x549caec2C863a04853Fb829aac4190E1B50df0Cc";
const rethVaultAddr = "0xE66c4EA218Cdb8DCbCf3f605ed1aC29461CBa4b8";

async function main() {
  // TODO(david): use deployer!
  const zapInAmount = ethers.utils.parseEther("0.01")
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const weth = await ethers.getContractAt('IWETH', wethAddress);
  if (await weth.allowance(wallet.address, permanentPortfolioAddr) < zapInAmount) {
    console.log("Approving WETH")
    await (await weth.connect(wallet).approve(permanentPortfolioAddr, zapInAmount, { gasLimit: 598538 })).wait();
  }
  amountAfterChargingFee = zapInAmount.mul(997).div(1000);
  const portfolioContract = await ethers.getContractAt("PermanentPortfolioLPToken", permanentPortfolioAddr);
  oneInchSwapDataForDpx = await fetch1InchSwapData(wethAddress, dpxTokenAddress, amountAfterChargingFee.div(8), dpxVaultAddr, 5);
  console.log("finished oneInchSwapDataForDpx")
  oneInchSwapDataForGDAI = await fetch1InchSwapData(wethAddress, daiAddress, amountAfterChargingFee.div(4), gdaiVaultAddr, 5);
  console.log("finished oneInchSwapDataForGDAI")
  oneInchSwapDataForRETH = await fetch1InchSwapData(wethAddress, rethTokenAddress, amountAfterChargingFee.div(4), rethVaultAddr, 5);
  console.log("finished oneInchSwapDataForRETH")
  pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toAmount).mul(95).div(100), 0.1, daiAddress)
  console.log("finished pendleGDAIZapInData")
  pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, amountAfterChargingFee.div(4), 0.1);
  console.log("finished pendleGLPZapInData")
  pendleRETHZapInData = await getPendleZapInData(42161, rethMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForRETH.toAmount).mul(95).div(100), 0.1, rethTokenAddress);
  console.log("finished pendleRETHZapInData")
  const depositData = {
    amount: zapInAmount,
    receiver: wallet.address,
    oneInchDataDpx: oneInchSwapDataForDpx.tx.data,
    glpMinLpOut: pendleGLPZapInData[2],
    glpGuessPtReceivedFromSy: pendleGLPZapInData[3],
    glpInput: pendleGLPZapInData[4],
    gdaiMinLpOut: pendleGDAIZapInData[2],
    gdaiGuessPtReceivedFromSy: pendleGDAIZapInData[3],
    gdaiInput: pendleGDAIZapInData[4],
    gdaiOneInchDataGDAI: oneInchSwapDataForGDAI.tx.data,
    rethMinLpOut: pendleRETHZapInData[2],
    rethGuessPtReceivedFromSy: pendleRETHZapInData[3],
    rethInput: pendleRETHZapInData[4],
    rethOneInchDataRETH: oneInchSwapDataForRETH.tx.data
  }
  fs.writeFileSync("./depositData.json", JSON.stringify(depositData, null, 2), 'utf8')
  await (await portfolioContract.connect(wallet).deposit(depositData, { gasLimit: 10000000 })).wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })