// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "hardhat/console.sol";
import "./dpx/IMiniChefV2.sol";
import "./dpx/ICloneRewarderTime.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract DpxArbitrumVault is ERC4626 {
    using SafeMath for uint;
    using SafeERC20 for ERC20;

    uint256 percentageMultiplier = 10000;
    ERC20 public constant dpxRewardToken = ERC20(0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55);
    ERC20 public constant sushiRewardToken = ERC20(0xd4d42F0b6DEF4CE0383636770eF773390d85c61A);

    ICloneRewarderTime public constant dpxRewarder = ICloneRewarderTime(0xb873813F710093CBC17836297A6feFCfc6989faF);
    IMiniChefV2 public sushiSwapMiniChef;

    IERC20 private immutable _underlying;
    uint256 public pid; // sushiSwap pid
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

    function claim(address receiver) public {
        sushiSwapMiniChef.harvest(pid, address(this));
        (uint256 sushiRewards, uint256 dpxRewards) = claimableRewards(address(this));
        uint256 percentageWithMultiplier = balanceOf(receiver).mul(percentageMultiplier).div(totalSupply());
        SafeERC20.safeTransfer(sushiRewardToken, receiver, sushiRewards.mul(percentageWithMultiplier).div(percentageMultiplier));
        SafeERC20.safeTransfer(dpxRewardToken, receiver, dpxRewards.mul(percentageWithMultiplier).div(percentageMultiplier));
    }

    function claimableRewards(address receiver) public view returns (uint256, uint256) {
        return (sushiSwapMiniChef.pendingSushi(pid, receiver), dpxRewarder.pendingToken(pid, receiver));
    }
}
