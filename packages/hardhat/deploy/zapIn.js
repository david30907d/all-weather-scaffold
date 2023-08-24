const hre = require("hardhat");
const { wethAddress, gDAIMarketPoolAddress, glpMarketPoolAddress, rethMarketPoolAddress, dpxTokenAddress, fetch1InchSwapData, getPendleZapInData, daiAddress, rethTokenAddress } = require("../test/utils");
const { config } = require('dotenv');
const fs = require('fs');
config();

async function main() {
  // TODO(david): use deployer!
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  amountAfterChargingFee = ethers.utils.parseEther("0.006").mul(997).div(1000);
  const portfolioContract = await ethers.getContractAt("PermanentPortfolioLPToken", "0x36bb138Eb364889317Fd324a8f4A1d4CB244A198");
  oneInchSwapDataForDpx = await fetch1InchSwapData(wethAddress, dpxTokenAddress, amountAfterChargingFee.div(8), "0x3e6506564daDD92502207E7b69AE583d7f2Fb184", 5);
  console.log("finished oneInchSwapDataForDpx")
  oneInchSwapDataForGDAI = await fetch1InchSwapData(wethAddress, daiAddress, amountAfterChargingFee.div(4), "0x38FAE405C9c78Ca8C1b4B548b5a9960b38f240F3", 5);
  console.log("finished oneInchSwapDataForGDAI")
  oneInchSwapDataForRETH = await fetch1InchSwapData(wethAddress, rethTokenAddress, amountAfterChargingFee.div(4), "0x47cF63A2C2a60efD53193504c8a9846D38254549", 5);
  console.log("finished oneInchSwapDataForRETH")
  pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toAmount).mul(50).div(100), 0.1, daiAddress)
  console.log("finished pendleGDAIZapInData")
  pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, amountAfterChargingFee.div(4), 0.1);
  console.log("finished pendleGLPZapInData")
  pendleRETHZapInData = await getPendleZapInData(42161, rethMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForRETH.toAmount).mul(95).div(100), 0.1, rethTokenAddress);
  console.log("finished pendleRETHZapInData")
  const depositData = {
    amount: ethers.utils.parseEther("0.006"),
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
  // await (await portfolioContract.connect(wallet).deposit(depositData, { gasLimit: 6230965 })).wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })