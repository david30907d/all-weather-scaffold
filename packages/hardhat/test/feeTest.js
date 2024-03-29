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
let weth;
let oneInchSwapDataForDpx;
let oneInchSwapDataForGDAI;
let pendleGDAIZapInData;
let pendleGLPZapInData;
let portfolioShares;
let dpxVault;
let equilibriaGDAIVault;
let equilibriaGlpVault;
let portfolioContract;
let sushiToken;
let miniChefV2;
let glpRewardPool;
let radiantVault;
let wallet2;
let rethToken;
let oneInchSwapDataForRETH;
let pendleRETHZapInData;
let equilibriaRETHVault;
let pendleRETHMarketLPT;
let pendleBooster;
let oneInchSwapDataForMagic;
let dlpToken;

describe("All Weather Protocol", function () {
    beforeEach(async () => {
        [wallet, weth, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic, pendlePendleZapInData, equilibriaPendleVault, pendleMarketLPT, dlpToken, dlpToken] = await getBeforeEachSetUp([{
            protocol: "SushiSwap-MagicETH", percentage: 8,
        }, {
            protocol: "RadiantArbitrum-DLP", percentage: 15,
        }, {
            protocol: "Equilibria-GLP", percentage: 35
        }, {
            protocol: "Equilibria-GDAI", percentage: 12
        }, {
            protocol: "Equilibria-RETH", percentage: 6
        }, {
            protocol: "Equilibria-PENDLE", percentage: 24
        }
        ]);
    });

    describe("Portfolio LP Contract Test", function () {
        it("Reward Should be different, if they zap in different timeing", async function () {
            this.timeout(2400000); // Set timeout to 120 seconds
            const receipt = await deposit(end2endTestingAmount, wallet, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic, pendlePendleZapInData);

            const originalWeth = await weth.balanceOf(wallet.address);
            expect(await portfolioContract.balanceOf(wallet.address)).to.be.equal(portfolioShares);
            await portfolioContract.connect(wallet).claimProtocolFee();
            const currentWeth = await weth.balanceOf(wallet.address);
            expect(currentWeth.sub(originalWeth)).to.equal(end2endTestingAmount.sub(amountAfterChargingFee));
        });
    });
});