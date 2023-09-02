const { config } = require('dotenv');
const { network, ethers } = require("hardhat");
const got = require('got');
const fs = require('fs');
const path = require('path');
const { Router, toAddress, MarketEntity } = require('@pendle/sdk-v2');
const { Squid } = require('@0xsquid/sdk');

config();

const getSDK = () => {
  const squid = new Squid({
    baseUrl: "https://api.0xsquid.com"
  });
  return squid;
};
async function mineBlocks(numBlocks) {
  for (let i = 0; i < numBlocks; i++) {
    await network.provider.send("evm_mine");
  }
}

async function fetch1InchSwapData(fromTokenAddress, toTOkenAddress, amount, fromAddress, slippage=50) {
  const headers = {
    'Authorization': `Bearer ${process.env['ONE_INCH_API_KEY']}`,
    'accept': 'application/json'
  };
  const res = await got(`https://api.1inch.dev/swap/v5.2/42161/swap?src=${fromTokenAddress}&dst=${toTOkenAddress}&amount=${amount.toString()}&from=${fromAddress}&slippage=${slippage}&disableEstimate=true`, {
    headers,
    retry: {
      limit: 1, // Number of retries
      methods: ['GET'], // Retry only for GET requests
      statusCodes: [429, 500, 502, 503, 504], // Retry for specific status codes
      calculateDelay: ({ attemptCount }) => attemptCount * 3000, // Delay between retries in milliseconds
    }
  })
  if (res.statusCode !== 200) {
    throw new Error(`HTTP error! status: ${res.statusCode}`);
  }
  return JSON.parse(res.body);
}

async function getUserEthBalance(address) {
  const provider = ethers.provider;
  return await provider.getBalance(address);
}

async function getPendleZapInData(chainId, poolAddress, amount, slippage, tokenInAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1") {
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = Router.getRouterWithKyberAggregator({
    chainId: chainId,
    provider,
    signer,
  });

  const GLP_POOL_ADDRESS = toAddress(poolAddress);
  const TOKEN_IN_ADDRESS = toAddress(tokenInAddress);
  return await router.addLiquiditySingleToken(
    GLP_POOL_ADDRESS,
    TOKEN_IN_ADDRESS,
    amount,
    slippage,
    { method: 'extractParams' }
  );
}
async function getPendleZapOutData(chainId, poolAddress, tokenOutAddress, amount, slippage) {
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const marketContract = new MarketEntity(toAddress(poolAddress), {
    chainId: chainId,
    provider,
    signer: signer
  });
  const router = Router.getRouterWithKyberAggregator({
    chainId: chainId,
    provider,
    signer,
  });
  // TODO(david): ask pendle team about this. Is it possible to extract Param before approving contract?
  // await marketContract.approve(router.address, amount).then((tx)=> tx.wait());
  // await marketContract.approve(router.address, ethers.BigNumber.from('115792089237316195423570985008687907853269984665640564039457')).then((tx) => tx.wait());

  return await router.removeLiquiditySingleToken(
    toAddress(poolAddress),
    amount,
    toAddress(tokenOutAddress),
    slippage,
    { method: 'extractParams' }
  );
}

const getLiFiCrossChainContractCallCallData = async (fromChain, fromToken, fromAddress, toChain, toToken, toAmount, crossChainTransaction, toContractGasLimit, contractOutputsToken) => {
  const quoteRequest = {
    fromChain,
    fromToken,
    fromAddress,
    toChain,
    toToken,
    toAmount,
    toContractAddress: crossChainTransaction.to,
    toContractCallData: crossChainTransaction.data,
    toContractGasLimit,
    contractOutputsToken,
  };

  const response = await axios.post('https://li.quest/v1/quote/contractCall', quoteRequest);
  return response.data.transactionRequest.data;
};

const getSquidCrossChainContractCallCallData = async (fromChain, toChain, fromToken, toToken, fromAmount, toAddress, slippage, customContractCalls) => {
  // instantiate the SDK
  const squid = getSDK();
  // init the SDK
  await squid.init();
  return await squid.getRoute({
    fromChain: fromChain,
    toChain: toChain,
    fromToken: fromToken,
    toToken: toToken,
    fromAmount: fromAmount,
    toAddress: toAddress,
    slippage: slippage,
    'customContractCalls[0][payload][tokenAddress]': customContractCalls[0]['payload']['tokenAddress'],
    'customContractCalls[0][payload][inputPos]': customContractCalls[0]['payload']['inputPos'],
    'customContractCalls[0][callType]': customContractCalls[0]['callType'],
    'customContractCalls[0][target]': customContractCalls[0]['target'],
    'customContractCalls[0][callData]': customContractCalls[0]['callData'],
    'customContractCalls[1][payload][tokenAddress]': customContractCalls[1]['payload']['tokenAddress'],
    'customContractCalls[1][payload][inputPos]': customContractCalls[1]['payload']['inputPos'],
    'customContractCalls[1][callType]': customContractCalls[1]['callType'],
    'customContractCalls[1][target]': customContractCalls[1]['target'],
    'customContractCalls[1][callData]': customContractCalls[1]['callData'],
  })
};

async function getBeforeEachSetUp(allocations, portfolioContractName = "PermanentPortfolioLPToken",) {
  wallet = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress);
  wallet2 = await ethers.getImpersonatedSigner(myImpersonatedWalletAddress2);
  const [dpxSLP, weth, dpxToken, fsGLP, pendleGlpMarketLPT, pendleGDAIMarketLPT, pendleRETHMarketLPT, pendleToken, daiToken, gDAIToken, sushiToken, miniChefV2, glpRewardPool, dlpToken, rethToken, pendleBooster, dGDAIRewardPool, multiFeeDistribution, xEqbToken, eqbToken, magicToken, magicSLP] = await initTokens();

  await weth.connect(wallet).deposit({ value: ethers.utils.parseEther("1"), gasLimit });
  await weth.connect(wallet2).deposit({ value: ethers.utils.parseEther("0.1"), gasLimit });

  await deployContracts(wallet, dpxSLP, sushiMiniChefV2Address, sushiPid, oneInchAddress, pendleGlpMarketLPT, pendleGDAIMarketLPT, pendleRETHMarketLPT, radiantLendingPoolAddress, eqbMinterAddress, pendleBoosterAddress, allocations, portfolioContractName);
  await (await weth.connect(wallet).approve(portfolioContract.address, ethers.constants.MaxUint256, { gasLimit })).wait();
  await (await weth.connect(wallet2).approve(portfolioContract.address, ethers.constants.MaxUint256, { gasLimit })).wait();

  try {
    console.log("read 1inch calldata and pendle calldata from json file")
    oneInchSwapDataForDpx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'oneInchSwapDataForDpx.json'), 'utf8'));
    oneInchSwapDataForGDAI = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'oneInchSwapDataForGDAI.json'), 'utf8'));
    oneInchSwapDataForRETH = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'oneInchSwapDataForRETH.json'), 'utf8'));
    oneInchSwapDataForMagic = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'oneInchSwapDataForMagic.json'), 'utf8'));
    pendleGDAIZapInData = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pendleGDAIZapInData.json'), 'utf8'));
    pendleGLPZapInData = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pendleGLPZapInData.json'), 'utf8'));
    pendleRETHZapInData = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pendleRETHZapInData.json'), 'utf8'));
  } catch (err) {
    console.error('json file not found, get new 1inch calldata and pendle calldata');
    oneInchSwapDataForDpx = await fetch1InchSwapData(weth.address, dpxTokenAddress, amountAfterChargingFee.div(8), dpxVault.address, 50);
    fs.writeFileSync(path.join(__dirname, 'fixtures', 'oneInchSwapDataForDpx.json'), JSON.stringify(oneInchSwapDataForDpx, null, 2), 'utf8')

    oneInchSwapDataForGDAI = await fetch1InchSwapData(weth.address, daiToken.address, amountAfterChargingFee.div(4), equilibriaGDAIVault.address, 50);
    fs.writeFileSync(path.join(__dirname, 'fixtures', 'oneInchSwapDataForGDAI.json'), JSON.stringify(oneInchSwapDataForGDAI, null, 2), 'utf8')

    oneInchSwapDataForRETH = await fetch1InchSwapData(weth.address, rethToken.address, amountAfterChargingFee.div(4), equilibriaRETHVault.address, 50);
    fs.writeFileSync(path.join(__dirname, 'fixtures', 'oneInchSwapDataForRETH.json'), JSON.stringify(oneInchSwapDataForRETH, null, 2), 'utf8')

    oneInchSwapDataForMagic = await fetch1InchSwapData(weth.address, magicToken.address, amountAfterChargingFee.div(2), magicVault.address, 50);
    fs.writeFileSync(path.join(__dirname, 'fixtures', 'oneInchSwapDataForMagic.json'), JSON.stringify(oneInchSwapDataForMagic, null, 2), 'utf8')

    // oneInchSwapDataForGDAI.toAmount).div(2): due to the 1inch slippage, need to multiple by 0.95 to pass pendle zap in
    pendleGDAIZapInData = await getPendleZapInData(42161, gDAIMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForGDAI.toAmount).mul(95).div(100), 0.2, daiToken.address)
    fs.writeFileSync(path.join(__dirname, 'fixtures', 'pendleGDAIZapInData.json'), JSON.stringify(pendleGDAIZapInData, null, 2), 'utf8')

    pendleGLPZapInData = await getPendleZapInData(42161, glpMarketPoolAddress, amountAfterChargingFee.div(4), 0.99);
    fs.writeFileSync(path.join(__dirname, 'fixtures', 'pendleGLPZapInData.json'), JSON.stringify(pendleGLPZapInData, null, 2), 'utf8')

    pendleRETHZapInData = await getPendleZapInData(42161, rethMarketPoolAddress, ethers.BigNumber.from(oneInchSwapDataForRETH.toAmount).mul(95).div(100), 0.2, rethToken.address);
    fs.writeFileSync(path.join(__dirname, 'fixtures', 'pendleRETHZapInData.json'), JSON.stringify(pendleRETHZapInData, null, 2), 'utf8')
  }
  portfolioShares = amountAfterChargingFee.div(await portfolioContract.UNIT_OF_SHARES());
  return [wallet, weth, oneInchSwapDataForDpx, oneInchSwapDataForGDAI, pendleGDAIZapInData, pendleGLPZapInData, portfolioShares, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, portfolioContract, sushiToken, miniChefV2, glpRewardPool, radiantVault, wallet2, rethToken, oneInchSwapDataForRETH, pendleRETHZapInData, equilibriaRETHVault, pendleRETHMarketLPT, pendleBooster, xEqbToken, eqbToken, magicVault, magicToken, oneInchSwapDataForMagic];
}

async function initTokens() {
  dpxSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapDpxLpTokenAddress);
  magicSLP = await ethers.getContractAt('IERC20Uniswap', sushiSwapMagicLpTokenAddress);
  weth = await ethers.getContractAt('IWETH', wethAddress);
  dpxToken = await ethers.getContractAt("MockDAI", dpxTokenAddress);
  fsGLP = await ethers.getContractAt("IERC20", fsGLPAddress);
  pendleGlpMarketLPT = await ethers.getContractAt("IERC20", glpMarketPoolAddress);
  pendleGDAIMarketLPT = await ethers.getContractAt("IERC20", gDAIMarketPoolAddress);
  pendleRETHMarketLPT = await ethers.getContractAt("IERC20", rethMarketPoolAddress);
  pendleToken = await ethers.getContractAt("IERC20", pendleTokenAddress);
  daiToken = await ethers.getContractAt("IERC20", daiAddress);
  gDAIToken = await ethers.getContractAt("IERC20", gDAIAddress);
  sushiToken = await ethers.getContractAt("IERC20", sushiTokenAddress);
  miniChefV2 = await ethers.getContractAt('IMiniChefV2', sushiMiniChefV2Address);
  glpRewardPool = await ethers.getContractAt("IERC20", "0x245f1d70AcAaCD219564FCcB75f108917037A960");
  dlpToken = await ethers.getContractAt("MockDAI", radiantDlpAddress);
  rethToken = await ethers.getContractAt("IERC20", rethTokenAddress);
  pendleBooster = await ethers.getContractAt("IPendleBooster", "0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF");
  xEqbToken = await ethers.getContractAt("IERC20", "0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E");
  eqbToken = await ethers.getContractAt("IERC20", "0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C");
  magicToken = await ethers.getContractAt("IERC20", magicTokenAddress);

  // we can check our balance in equilibria with this reward pool
  dGDAIRewardPool = await ethers.getContractAt("IERC20", gDAIRewardPoolAddress);
  multiFeeDistribution = await ethers.getContractAt("IMultiFeeDistribution", multiFeeDistributionAddress);
  return [dpxSLP, weth, dpxToken, fsGLP, pendleGlpMarketLPT, pendleGDAIMarketLPT, pendleRETHMarketLPT, pendleToken, daiToken, gDAIToken, sushiToken, miniChefV2, glpRewardPool, dlpToken, rethToken, pendleBooster, dGDAIRewardPool, multiFeeDistribution, xEqbToken, eqbToken, magicToken, magicSLP]
}

async function deployContracts(wallet, dpxSLP, sushiMiniChefV2Address, sushiPid, oneInchAddress, pendleGlpMarketLPT, pendleGDAIMarketLPT, pendleRETHMarketLPT, radiantLendingPoolAddress, eqbMinterAddress, pendleBoosterAddress, allocations, portfolioContractName = "PermanentPortfolioLPToken") {
  const DpxArbitrumVault = await ethers.getContractFactory("DpxArbitrumVault");
  dpxVault = await DpxArbitrumVault.connect(wallet).deploy(dpxSLP.address, sushiMiniChefV2Address, sushiPid);
  await dpxVault.deployed();
  await dpxVault.updateOneInchAggregatorAddress(oneInchAddress).then((tx) => tx.wait());

  const EquilibriaGlpVault = await ethers.getContractFactory("EquilibriaGlpVault");
  equilibriaGlpVault = await EquilibriaGlpVault.connect(wallet).deploy(pendleGlpMarketLPT.address, "Equilibria-GLP", "ALP-EQB-GLP", {gasLimit:30000000});
  await equilibriaGlpVault.deployed();
  await equilibriaGlpVault.updateEqbMinterAddr(eqbMinterAddress).then((tx) => tx.wait());
  await equilibriaGlpVault.updatePendleBoosterAddr(pendleBoosterAddress).then((tx) => tx.wait());

  const EquilibriaGDAIVault = await ethers.getContractFactory("EquilibriaGDAIVault");
  equilibriaGDAIVault = await EquilibriaGDAIVault.connect(wallet).deploy(pendleGDAIMarketLPT.address, "Equilibria-GDAI", "ALP-EQB-GDAI", {gasLimit:30000000});
  await equilibriaGDAIVault.deployed();
  await equilibriaGDAIVault.updateOneInchAggregatorAddress(oneInchAddress).then((tx) => tx.wait());
  await equilibriaGDAIVault.updateEqbMinterAddr(eqbMinterAddress).then((tx) => tx.wait());
  await equilibriaGDAIVault.updatePendleBoosterAddr(pendleBoosterAddress).then((tx) => tx.wait());

  const EquilibriaRETHVault = await ethers.getContractFactory("EquilibriaRETHVault");
  equilibriaRETHVault = await EquilibriaRETHVault.connect(wallet).deploy(pendleRETHMarketLPT.address, "Equilibria-RETH", "ALP-EQB-RETH", {gasLimit:30000000});
  await equilibriaRETHVault.deployed();
  await equilibriaRETHVault.updateOneInchAggregatorAddress(oneInchAddress).then((tx) => tx.wait());
  await equilibriaRETHVault.updateEqbMinterAddr(eqbMinterAddress).then((tx) => tx.wait());
  await equilibriaRETHVault.updatePendleBoosterAddr(pendleBoosterAddress).then((tx) => tx.wait());

  const MagicArbitrumVault = await ethers.getContractFactory("MagicArbitrumVault");
  magicVault = await MagicArbitrumVault.connect(wallet).deploy(magicSLP.address, "SushiSwap-MagicETH", "ALP-MAGIC-ETH", {gasLimit:30000000});
  await magicVault.deployed();
  await magicVault.updateOneInchAggregatorAddress(oneInchAddress).then((tx) => tx.wait());

  const RadiantArbitrumVault = await ethers.getContractFactory("RadiantArbitrumVault");
  radiantVault = await RadiantArbitrumVault.connect(wallet).deploy(dlpToken.address, radiantLendingPoolAddress, {gasLimit:30000000});
  await radiantVault.deployed();

  const PortfolioContractFactory = await ethers.getContractFactory(portfolioContractName);
  if (portfolioContractName === "PermanentPortfolioLPToken") {
    portfolioContract = await PortfolioContractFactory.connect(wallet).deploy(weth.address, "PermanentLP", "PNLP", dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address, equilibriaRETHVault.address, magicVault.address, {gasLimit:30000000});
  }
  else if (portfolioContractName === "AllWeatherPortfolioLPToken") {
    portfolioContract = await PortfolioContractFactory.connect(wallet).deploy(weth.address, radiantVault.address, dpxVault.address, equilibriaGlpVault.address, equilibriaGDAIVault.address, {gasLimit:30000000});
  }

  await portfolioContract.connect(wallet).deployed();
  await portfolioContract.setVaultAllocations(allocations).then((tx) => tx.wait());
  return [portfolioContract, dpxVault, equilibriaGDAIVault, equilibriaGlpVault, equilibriaRETHVault, radiantVault, magicVault]
}

async function deployContractsToChain(wallet, allocations, portfolioContractName) {
  const [dpxSLP, weth, dpxToken, fsGLP, pendleGlpMarketLPT, pendleGDAIMarketLPT, pendleRETHMarketLPT, pendleToken, daiToken, gDAIToken, sushiToken, miniChefV2, glpRewardPool, dlpToken, rethToken, pendleBooster, dGDAIRewardPool, multiFeeDistribution, xEqbToken, eqbToken, magicToken, magicSLP] = await initTokens();
  return await deployContracts(wallet, dpxSLP, sushiMiniChefV2Address, sushiPid, oneInchAddress, pendleGlpMarketLPT, pendleGDAIMarketLPT, pendleRETHMarketLPT, radiantLendingPoolAddress, eqbMinterAddress, pendleBoosterAddress, allocations, portfolioContractName);
}

async function deposit(end2endTestingAmount, wallet, oneInchSwapDataForDpx, pendleGLPZapInData, pendleGDAIZapInData, oneInchSwapDataForGDAI, oneInchSwapDataForRETH, pendleRETHZapInData, oneInchSwapDataForMagic) {
  const depositData = {
    amount: end2endTestingAmount,
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
    rethOneInchDataRETH: oneInchSwapDataForRETH.tx.data,
    oneInchDataMagic: oneInchSwapDataForMagic.tx.data,
    // pendleMinLpOut: pendlePendleZapInData[2],
    // pendleGuessPtReceivedFromSy: pendlePendleZapInData[3],
    // pendleInput: pendlePendleZapInData[4],
  }
  return await (await portfolioContract.connect(wallet).deposit(depositData, { gasLimit })).wait();
}

// common config
// Rich guy
const myImpersonatedWalletAddress = "0x2B9AcFd85440B7828DB8E54694Ee07b2B056B30C";
const myImpersonatedWalletAddress2 = "0x47399364835b6c58191f6350bf63a755f80b0ffb";
const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const gasLimit = 30000000;
const radiantAmount = ethers.utils.parseUnits('0.01', 18);
const dpxAmount = ethers.utils.parseUnits('0.001', 18);
const end2endTestingAmount = ethers.utils.parseUnits('0.1', 18);
const amountAfterChargingFee = end2endTestingAmount.mul(997).div(1000);
const claimableRewardsTestData = [
  ["SushiSwap-DpxETH", []],
  ["RadiantArbitrum-DLP", []],
  ["Equilibria-GLP", []],
  ["Equilibria-GDAI", []]
];
const claimableRewardsTestDataForPermanentPortfolio = [
  ["SushiSwap-DpxETH", []],
  ["Equilibria-GLP", []],
  ["Equilibria-GDAI", []]
];
const oneInchAddress = "0x1111111254EEB25477B68fb85Ed929f73A960582";

// sushi dpx
const sushiSwapDpxLpTokenAddress = "0x0C1Cf6883efA1B496B01f654E247B9b419873054";
const sushiSwapMagicLpTokenAddress = "0xB7E50106A5bd3Cf21AF210A755F9C8740890A8c9";
const sushiMiniChefV2Address = "0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3";
const dpxTokenAddress = "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55";
const sushiTokenAddress = "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A";
const sushiPid = 17;
// magic
const magicTokenAddress = "0x539bdE0d7Dbd336b79148AA742883198BBF60342";
const sushiMagicPid = 13;

// radiant-arbitrum
const radiantDlpAddress = "0x32dF62dc3aEd2cD6224193052Ce665DC18165841";
const radiantLendingPoolAddress = "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1";
const radiantLockZapPoolAddress = "0x8991C4C347420E476F1cf09C03abA224A76E2997";
const multiFeeDistributionAddress = "0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE";
const radiantRTokens = ["0xd69D402D1bDB9A2b8c3d88D98b9CEaf9e4Cd72d9", "0x48a29E756CC1C097388f3B2f3b570ED270423b3d", "0x0D914606f3424804FA1BbBE56CCC3416733acEC6", "0x0dF5dfd95966753f01cb80E76dc20EA958238C46", "0x42C248D137512907048021B30d9dA17f48B5b7B2", "0x2dADe5b7df9DA3a7e1c9748d169Cd6dFf77e3d01"]

// radiant-bsc
const wbnbAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const radiantBscLockZapPoolAddress = '0x13Ef2A9e127aE8d9e9b863c7e375Ba68E1a42Ac6';
// radiant has an one year lock, therefore need these timestamp-related variables
let currentTimestamp = Math.floor(Date.now() / 1000);;
async function simulateTimeElasped(timeElasped = 12 * 31 * 86400) {
  // Simulate a year later
  const futureTimestamp = currentTimestamp + timeElasped;
  await ethers.provider.send('evm_setNextBlockTimestamp', [futureTimestamp]);
  await ethers.provider.send('evm_mine');
}


// GLP
const fsGLPAddress = "0x1aDDD80E6039594eE970E5872D247bf0414C8903";

// Pendle
const pendleTokenAddress = "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8";
const glpMarketPoolAddress = "0x7D49E5Adc0EAAD9C027857767638613253eF125f";
const gDAIMarketPoolAddress = "0xa0192f6567f8f5DC38C53323235FD08b318D2dcA";
const rethMarketPoolAddress = "0x14FbC760eFaF36781cB0eb3Cb255aD976117B9Bd";
const gDAIRewardPoolAddress = "0x03b86b5b4f49FD2059c813B3f928c0b276C88E4E";
const fakePendleZapIn = [
  '0x78000b0605e81ea9df54b33f72ebc61b5f5c8077',
  '0xa0192f6567f8f5dc38c53323235fd08b318d2dca',
  "78925691164010869783",
  {
    guessMin: "34771702314189672095",
    guessMax: "86929255785474180238",
    guessOffchain: "43464627892737090119",
    maxIteration: 14,
    eps: '1000000000000000'
  },
  {
    tokenIn: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    netTokenIn: "182355886656552718835",
    tokenMintSy: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    bulk: '0x0000000000000000000000000000000000000000',
    pendleSwap: '0x0000000000000000000000000000000000000000',
    swapData: {
      swapType: 0,
      extRouter: '0x0000000000000000000000000000000000000000',
      extCalldata: [],
      needScale: false
    }
  }
];
const fakePendleZapOut = {
  // Token/Sy data
  tokenOut: "0x1aDDD80E6039594eE970E5872D247bf0414C8903", // address
  minTokenOut: 0, // uint256
  tokenRedeemSy: "0x1aDDD80E6039594eE970E5872D247bf0414C8903", // address
  bulk: "0x1aDDD80E6039594eE970E5872D247bf0414C8903", // address
  // aggregator data
  pendleSwap: "0x1aDDD80E6039594eE970E5872D247bf0414C8903", // address
  swapData: {
    swapType: 0, // SwapType enum
    extRouter: "0x1aDDD80E6039594eE970E5872D247bf0414C8903", // address
    extCalldata: '0x', // bytes
    needScale: false
  }
}

// equilibria gDAI
const daiAddress = '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1';
const gDAIAddress = '0xd85E038593d7A098614721EaE955EC2022B9B91B';

// equilibria rETH
const rethTokenAddress = '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8';
const eqbMinterAddress = '0x09bae4C38B1a9142726C6F08DC4d1260B0C8e94d';
const pendleBoosterAddress = '0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF';
// squid
const squidRouterProxyAddress = '0xce16F69375520ab01377ce7B88f5BA8C48F8D666';

module.exports = {
  mineBlocks,
  fetch1InchSwapData,
  getUserEthBalance,
  myImpersonatedWalletAddress,
  myImpersonatedWalletAddress2,
  sushiSwapDpxLpTokenAddress,
  sushiMiniChefV2Address,
  dpxTokenAddress,
  sushiTokenAddress,
  wethAddress,
  radiantDlpAddress,
  radiantLendingPoolAddress,
  sushiPid,
  gasLimit,
  multiFeeDistributionAddress,
  radiantAmount,
  dpxAmount,
  fsGLPAddress,
  getPendleZapInData,
  getPendleZapOutData,
  glpMarketPoolAddress,
  gDAIMarketPoolAddress,
  getLiFiCrossChainContractCallCallData,
  pendleTokenAddress,
  fakePendleZapIn,
  fakePendleZapOut,
  daiAddress,
  gDAIRewardPoolAddress,
  gDAIAddress,
  end2endTestingAmount,
  simulateTimeElasped,
  currentTimestamp,
  radiantLockZapPoolAddress,
  squidRouterProxyAddress,
  getSquidCrossChainContractCallCallData,
  wbnbAddress,
  radiantBscLockZapPoolAddress,
  radiantRTokens,
  claimableRewardsTestData,
  amountAfterChargingFee,
  claimableRewardsTestDataForPermanentPortfolio,
  getBeforeEachSetUp,
  deposit,
  rethMarketPoolAddress,
  deployContractsToChain,
  rethTokenAddress,
  sushiMagicPid
};