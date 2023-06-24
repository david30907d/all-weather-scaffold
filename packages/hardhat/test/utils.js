const { network } = require("hardhat");
const fetch = require('node-fetch');

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


module.exports = {
  mineBlocks,
  fetch1InchSwapData,
  getUserEthBalance
};