// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "hardhat/console.sol";
import "./dpx/IMiniChefV2.sol";


contract DpxArbitrumVault is ERC4626 {
    IERC20 private immutable _underlying;
    uint256 public pid; // sushiSwap pid
    IMiniChefV2 public sushiSwapMiniChef;
    constructor(string memory name_, string memory symbol_, IERC20Metadata underlying_, address sushiSwapMiniChefV2_, uint256 pid_) 
        ERC4626(underlying_)
        ERC20(name_, symbol_) 
    {
        _underlying = underlying_;
        pid = pid_;
        sushiSwapMiniChef = IMiniChefV2(sushiSwapMiniChefV2_);
    }
    function deposit(uint256 amount, address receiver) public override returns (uint256) {
        uint256 shares = super.deposit(amount, receiver);
        require(shares > 0, "erc4626 deposit failed");
        _underlying.approve(address(sushiSwapMiniChef), amount);
        sushiSwapMiniChef.deposit(pid, amount, address(this));
        return shares;
    }

    function redeemAll(uint256 shares, address receiver, address owner) public returns (uint256) {
        // shares#1 stands for sushiSwap shares
        // shares#2 stands for erc4626 shares
        sushiSwapMiniChef.withdrawAndHarvest(pid, shares, address(this));
        uint256 shares = super.redeem(shares, receiver, owner);
        return shares;
    }

    // function claim(){
        // https://arbiscan.io/tx/0x13ded9cd77e5918bb7b51484c94b0676a6f05dd83506a73924a76cf43e2ce530
    // }
}
