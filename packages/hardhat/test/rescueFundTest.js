// will deprecate `rescueFunds` once the contract is well tested
const { 
  end2endTestingAmount,
  deposit,
  getBeforeEachSetUp,
} = require("./utils");

let wallet;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;
let oneInchSwapDataForRETH;
let pendleRETHZapInData;
let oneInchSwapDataForMagic;
let dlpToken;

describe("All Weather Protocol", function () {
    beforeEach(async () => {
      [wallet, weth, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic, pendlePendleZapInData, equilibriaPendleVault, pendleMarketLPT, dlpToken] = await getBeforeEachSetUp([{
        protocol: "SushiSwap-MagicETH", percentage: 0,
    }, {
        protocol: "RadiantArbitrum-DLP", percentage: 15,
    }, {
        protocol: "Equilibria-GLP", percentage: 0
    }, {
        protocol: "Equilibria-GDAI", percentage: 0
    }, {
        protocol: "Equilibria-RETH", percentage: 0
    }, {
        protocol: "Equilibria-PENDLE", percentage: 0
    }
    ]);
      });
    
    describe("Rescue Fund", function () {
        it("Should be able to execute arbitrary function", async function () {
            this.timeout(2400000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);
            // const redeemFunctionSelector = magicVault.interface.getSighash("redeem(uint256)");
            // const redeemHexData = ethers.utils.concat([redeemFunctionSelector, ethers.utils.defaultAbiCoder.encode(["uint256"], [shares])]);
            const claimHexData = magicVault.interface.encodeFunctionData("claim", []);
            await magicVault.rescueFundsWithHexData(magicVault.address, 0, claimHexData);
        });
    });
});