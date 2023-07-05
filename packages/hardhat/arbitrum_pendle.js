const { config } = require('dotenv');
const { Router, toAddress, createERC20, MarketEntity } = require('@pendle/sdk-v2');
const { ethers, BigNumber: BN } = require('ethers');

config();


async function exampleOnArbitrum() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.API_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const signerAddress = await signer.getAddress().then(toAddress);
  console.log(signerAddress);
  const router = Router.getRouterWithKyberAggregator({
    chainId: 42161,
    provider,
    signer,
  });

  const PT_GLP_POOL_ADDRESS = toAddress('0x7d49e5adc0eaad9c027857767638613253ef125f');
  const GLP_SY_ADDRESS = toAddress('0x2066a650AF4b6895f72E618587Aad5e8120B7790');
  // const SGLP_ADDRESS = toAddress('0x2F546AD4eDD93B956C8999Be404cdCAFde3E89AE');
  const SGLP_ADDRESS = toAddress('0x5402B5F40310bDED796c7D0F3FF6683f5C0cFfdf');
  const WETH_ADDRESS = toAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1');
  const WETH_DECIMALS = 16n;
  const AMOUNT_IN = BigInt(1) * 10n ** WETH_DECIMALS;
  const slippage = 0.5 / 100;

  const WETH = createERC20(WETH_ADDRESS, {
    chainId: 42161,
    provider,
    signer,
  });
  console.log("allowance: ", (await WETH.allowance(signerAddress, router.address)).toString());
  console.log(AMOUNT_IN.toString())
//   const approveTx = await WETH.approve(router.address, BN.from(AMOUNT_IN));

//   await approveTx.wait();

  const contractTransaction = await router.addLiquiditySingleToken(
    PT_GLP_POOL_ADDRESS,
    WETH_ADDRESS,
    AMOUNT_IN,
    slippage,
    { method: 'extractParams' }
  );
  console.log(contractTransaction);
    
  // remove liquidity
  // we remove all LP to stEth.
  const marketContract = new MarketEntity(PT_GLP_POOL_ADDRESS, {
    chainId: 42161,
    provider,
    signer: signer,
  });
  const lpToRemove = await marketContract.balanceOf(signerAddress);
  console.log('LP to remove', lpToRemove.toString());
  console.log('Approved amount:', await marketContract.allowance(signerAddress, router.address));

  const zapOutTx = await router.removeLiquiditySingleToken(
    PT_GLP_POOL_ADDRESS,
    BigInt(100000000) * 10n ** WETH_DECIMALS,
    // WETH_ADDRESS, // works
    toAddress("0x5402B5F40310bDED796c7D0F3FF6683f5C0cFfdf"), // sGLP
    // GLP_SY_ADDRESS, // doesn't work
    // SGLP_ADDRESS, // doesn't work
    0.4,
    { method: 'extractParams' }
  );
  console.log("zapOutTx==================")
  console.log(zapOutTx)
}

exampleOnArbitrum()
.then(() => process.exit(0))
.catch((e) => {
console.error(e);
process.exit(1);
});