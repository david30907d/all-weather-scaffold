const hre = require("hardhat");
const { deployContractsToChain, sushiSwapDpxLpTokenAddress, wethAddress, sushiMiniChefV2Address, sushiPid, gDAIMarketPoolAddress, glpMarketPoolAddress, rethMarketPoolAddress, radiantLendingPoolAddress, radiantDlpAddress } = require("../test/utils");
const { config } = require('dotenv');
config();

async function main() {
  // TODO(david): use deployer!
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const [portfolioContract, equilibriaGDAIVault, equilibriaGlpVault, equilibriaRETHVault, radiantVault] = await deployContractsToChain(wallet, [{
    protocol: "SushiSwap-DpxETH", percentage: 25,
  }, {
    protocol: "Equilibria-GLP", percentage: 25
  }, {
    protocol: "Equilibria-GDAI", percentage: 25
  }, {
    protocol: "Equilibria-RETH", percentage: 25
  }
  ], portfolioContractName = "PermanentPortfolioLPToken");
  // Verify the contract on Etherscan
  console.log("Verifying contract...");
  try {
    await hre.run("verify:verify", {
      address: portfolioContract.address,
      constructorArguments: [wethAddress, "PermanentLP", "PNLP", dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address, equilibriaRETHVault.address], // Include constructor arguments here if any
    });
  } catch (error) {
    console.log(error);
  }

  try {
    await hre.run("verify:verify", {
      address: dpxVault.address,
      constructorArguments: [sushiSwapDpxLpTokenAddress, sushiMiniChefV2Address, sushiPid]
    });
  } catch (error) {
    console.log(error)
  }
  try {
    await hre.run("verify:verify", {
      address: equilibriaGDAIVault.address,
      constructorArguments: [gDAIMarketPoolAddress, "Equilibria-GDAI", "ALP-EQB-GDAI"]
    });
  } catch (error) {
    console.log(error)
  }
  try {
    await hre.run("verify:verify", {
      address: equilibriaGlpVault.address,
      constructorArguments: [glpMarketPoolAddress, "Equilibria-GLP", "ALP-EQB-GLP"]
    });
  } catch (error) {
    console.log(error)
  }

  try {
    await hre.run("verify:verify", {
      address: equilibriaRETHVault.address,
      constructorArguments: [rethMarketPoolAddress, "Equilibria-RETH", "ALP-EQB-RETH"]
    });
  } catch (error) {
    console.log(error)
  }

  try {
    await hre.run("verify:verify", {
      address: radiantVault.address,
      constructorArguments: [radiantDlpAddress, radiantLendingPoolAddress]
    });
  } catch (error) {
    console.log(error)
  }

  console.log('Deployed and Verified equilibriaGDAIVault, Address:', equilibriaGDAIVault.address);
  console.log('Deployed and Verified equilibriaGlpVault, Address:', equilibriaGlpVault.address);
  console.log('Deployed and Verified equilibriaRETHVault, Address:', equilibriaRETHVault.address);
  console.log('Deployed and Verified radiantVault, Address:', radiantVault.address);
  console.log('Deployed and Verified portfolioContract, Address:', portfolioContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })