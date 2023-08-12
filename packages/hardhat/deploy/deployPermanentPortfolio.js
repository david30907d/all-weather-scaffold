const hre = require("hardhat");
const { deployContractsToChain } = require("../test/utils");
const { config } = require('dotenv');
config();

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.TESTNET_API_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const [portfolioContract, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, equilibriaRETHVault, radiantVault] = await deployContractsToChain(wallet, [{
    protocol: "SushSwap-DpxETH", percentage: 25,
  }, {
    protocol: "Equilibria-GLP", percentage: 25
  }, {
    protocol: "Equilibria-GDAI", percentage: 25
  }, {
    protocol: "Equilibria-RETH", percentage: 25
  }
  ], portfolioContractName = "PermanentPortfolioLPToken");
  console.log('Deployed portfolioContract Address:', portfolioContract.address);
  console.log('Deployed dpxVault Address:', dpxVault.address);
  console.log('Deployed equilibriaGDAIVault Address:', equilibriaGDAIVault.address);
  console.log('Deployed equilibriaGlpVault Address:', equilibriaGlpVault.address);
  console.log('Deployed equilibriaRETHVault Address:', equilibriaRETHVault.address);
  console.log('Deployed radiantVault Address:', radiantVault.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })