const { config } = require('dotenv');
const { network, ethers } = require("hardhat");
const fetch = require('node-fetch');
const { Router, toAddress, MarketEntity } = require('@pendle/sdk-v2');

config();

async function mineBlocks(numBlocks) {
  for (let i = 0; i < numBlocks; i++) {
    await network.provider.send("evm_mine");
  }
}

async function fetch1InchSwapData(fromTokenAddress, toTOkenAddress, amount, fromAddress) {
  const res = await fetch(`https://api.1inch.io/v5.0/42161/swap?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTOkenAddress}&amount=${amount.toString()}&fromAddress=${fromAddress}&slippage=10&disableEstimate=true`)
  const resJson = await res.json();
  return resJson.tx.data;
}

async function getUserEthBalance(address) {
  const provider = ethers.provider;
  return await provider.getBalance(address);
}

async function getPendleZapInData(chainId, poolAddress, amount, slippage){
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const router = Router.getRouterWithKyberAggregator({
    chainId: chainId,
    provider,
    signer,
  });
  
  const GLP_POOL_ADDRESS = toAddress(poolAddress);
  const WETH_ADDRESS = toAddress("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1");
  return await router.addLiquiditySingleToken(
      GLP_POOL_ADDRESS,
      WETH_ADDRESS,
      amount,
      slippage,
      { method: 'extractParams' }
  );
}
async function getPendleZapOutData(chainId, poolAddress, tokenOutAddress, amount, slippage){
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const marketContract = new MarketEntity(poolAddress, {
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
  // await marketContract.approve(router.address, amount).then((tx) => tx.wait());
  
  const WETH_DECIMALS = 16n;
  return await router.removeLiquiditySingleToken(
    poolAddress,
    amount,
    tokenOutAddress,
    slippage,
    { method: 'extractParams' }
  );
}

// common config
const myImpersonatedWalletAddress = "0xe4bac3e44e8080e1491c11119197d33e396ea82b";
const wethAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const gasLimit = 2675600;
const radiantAmount = ethers.utils.parseUnits('0.01', 18);
const dpxAmount = ethers.utils.parseUnits('0.001', 18);

// sushi dpx
const sushiSwapDpxLpTokenAddress = "0x0C1Cf6883efA1B496B01f654E247B9b419873054";
const sushiMiniChefV2Address = "0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3";
const dpxTokenAddress = "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55";
const sushiTokenAddress = "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A";
const sushiPid = 17;

// radiant
const rRewardTokens = ["0x912ce59144191c1204e64559fe8253a0e49e6548","0x5979d7b546e38e414f7e9822514be443a4800529","0xda10009cbd5d07dd0cecc66161fc93d7c9000da1","0xff970a61a04b1ca14834a43f5de4533ebddb5cc8","0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9","0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f"];
const radiantDlpAddress = "0x32dF62dc3aEd2cD6224193052Ce665DC18165841";
const radiantLendingPoolAddress = "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1";
const radiantLockZapAddress = "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1";
const multiFeeDistributionAddress = "0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE";

// GLP
const fsGLPAddress = "0x1aDDD80E6039594eE970E5872D247bf0414C8903";

// Pendle
const glpMarketPoolAddress = "0x7D49E5Adc0EAAD9C027857767638613253eF125f";


module.exports = {
  mineBlocks,
  fetch1InchSwapData,
  getUserEthBalance,
  myImpersonatedWalletAddress,
  sushiSwapDpxLpTokenAddress,
  sushiMiniChefV2Address,
  dpxTokenAddress,
  sushiTokenAddress,
  wethAddress,
  radiantDlpAddress,
  radiantLockZapAddress,
  sushiPid,
  gasLimit,
  rRewardTokens,
  radiantLendingPoolAddress,
  multiFeeDistributionAddress,
  radiantAmount,
  dpxAmount,
  fsGLPAddress,
  getPendleZapInData,
  getPendleZapOutData,
  glpMarketPoolAddress
};