// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "hardhat/console.sol";
import "./radiant/ILendingPool.sol";
import "./gmx-contracts/IRewardRouterV2.sol";


contract RadiantArbitrumVault is ERC4626 {
    using SafeERC20 for ERC20;

    IERC20 private immutable _underlying;
    ILendingPool public radiantLending;
    IRewardRouterV2 public gmxRouter;
    constructor(string memory name_, string memory symbol_, IERC20Metadata underlying_, address radiantLending_, address gmx_) 
        ERC4626(underlying_)
        ERC20(name_, symbol_) 
    {
        _underlying = underlying_;
        radiantLending = ILendingPool(radiantLending_);
        gmxRouter = IRewardRouterV2(gmx_);
    }
    function deposit(uint256 amount, address receiver) public override returns (uint256) {
        uint256 shares = super.deposit(amount, receiver);
        require(shares > 0, "erc4626 deposit failed");
        _underlying.approve(address(gmxRouter), amount);
        // gmxRouter.mintAndStakeGlp(address(_underlying), amount, 0, (amount * 90) / 100);
        // gmxRouter.mintAndStakeGlpETH(0, (msg.value * 90) / 100);
        // TODO(david): radiant doesn't work for now
        _underlying.approve(address(radiantLending), amount);
        radiantLending.deposit(address(_underlying), amount, address(this), 0);
        return shares;
    }

    function redeemAll(uint256 shares, address receiver, address owner) public returns (uint256) {
        // TODO(david): to check how to only withdraw specific amount of shares from radiant lending
        // Radiant: withdraw all should input ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
        radiantLending.withdraw(address(_underlying), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, address(this));
        uint256 shares = super.redeem(shares, receiver, owner);
        return shares;
    }

    // function claim(){
        // https://arbiscan.io/tx/0x13ded9cd77e5918bb7b51484c94b0676a6f05dd83506a73924a76cf43e2ce530
    // }
}
