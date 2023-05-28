const { expect } = require('chai');
const { ethers, waffle } = require('hardhat');

describe('USDT Transfer Test', () => {
  let daiContract;
  let accounts;

  const amount = ethers.utils.parseUnits('100', 18); // 100 USDT with 6 decimals
  const DAI_ADDRESS = '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'; // Replace with the actual USDT token address on Arbitrum

  before(async () => {
    const DaiContract = await ethers.getContractFactory('MockDAI');
    daiContract = await DaiContract.attach(DAI_ADDRESS);
    wallet = await ethers.getImpersonatedSigner("0x038919c63AfF9c932C77a0C9c9D98eABc1a4dd08");
    accounts = await ethers.getSigners();
  });

  it('should transfer USDT from one account to another', async () => {
    // Get the balances before the transfer
    const balanceBeforeSender = await daiContract.balanceOf(wallet.address);
    console.log("balanceBeforeSender", balanceBeforeSender.toString());
    const balanceBeforeReceiver = await daiContract.balanceOf(accounts[1].address);
    
    // Perform the transfer
    await daiContract.connect(wallet).transfer(accounts[1].address, amount, { gasLimit: 1000000 });
    
    // Get the balances after the transfer
    const balanceAfterSender = await daiContract.balanceOf(wallet.address);
    console.log("balanceBeforeSender", balanceAfterSender.toString());
    const balanceAfterReceiver = await daiContract.balanceOf(accounts[1].address);
    console.log("balanceAfterReceiver", balanceAfterReceiver.toString());

    // Check the balances
    expect(balanceAfterSender).to.equal(balanceBeforeSender.sub(amount));
    expect(balanceAfterReceiver).to.equal(balanceBeforeReceiver.add(amount));
  });
});
