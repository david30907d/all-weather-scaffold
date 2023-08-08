const { expect } = require("chai");
const { 
  end2endTestingAmount,
  getPendleZapOutData,
  mineBlocks,
  gasLimit,
  deposit,
  getBeforeEachSetUp,
  glpMarketPoolAddress,
  amountAfterChargingFee
} = require("./utils");

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

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool] = await getBeforeEachSetUp([{
          protocol: "Equilibria-GLP", percentage: 100
        }
        ]);
      });
    
    describe("Portfolio LP Contract Test", function () {
        it("Reward Should be different, if they zap in different timeing", async function () {
            this.timeout(2400000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI);

            const originalWeth = await weth.balanceOf(wallet.address);
            expect(await portfolioContract.balanceOf(wallet.address)).to.be.equal(portfolioShares);
            await portfolioContract.connect(wallet).claimProtocolFee();
            const currentWeth = await weth.balanceOf(wallet.address);
            expect(currentWeth.sub(originalWeth)).to.equal(end2endTestingAmount.sub(amountAfterChargingFee));
        });
    });
});