// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "hardhat/console.sol";
import "./radiant/ILendingPool.sol";
import "./radiant/ILockZap.sol";
import "./radiant/IFeeDistribution.sol";
import "./gmx-contracts/IRewardRouterV2.sol";


contract RadiantArbitrumVault is ERC4626 {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;

    IERC20 private immutable _asset;
    ILendingPool public radiantLending;
    ILockZap public lockZap;
    IRewardRouterV2 public gmxRouter;
    IERC20 public constant weth = IERC20(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);
    constructor(IERC20Metadata asset_, address radiantLending_, address gmx_) 
        ERC4626(asset_)
        ERC20("AllWeatherLP-Radiant", "ALP-r") 
    {
        _asset = asset_;
        radiantLending = ILendingPool(radiantLending_);
        lockZap = ILockZap(0x8991C4C347420E476F1cf09C03abA224A76E2997);
        gmxRouter = IRewardRouterV2(gmx_);
    }

    function totalAssets() public view override returns (uint256) {
        (uint256 total,,,,) = IFeeDistribution(0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE).lockedBalances(address(this));
        return total;
    }

    function deposit(uint256 amount, address receiver) public override returns (uint256) {
        require(amount <= maxDeposit(receiver), "ERC4626: deposit more than max");

        SafeERC20.safeTransferFrom(weth, msg.sender, address(this), amount);
        SafeERC20.safeApprove(weth, address(lockZap), amount);
        uint256 shares = lockZap.zap(false, amount, 0, 3);
        _mint(receiver, shares);

        emit Deposit(_msgSender(), receiver, amount, shares);
        return shares;
    }

    function redeemAll(uint256 shares, address receiver, address owner) public returns (uint256) {
        // TODO(david): to check how to only withdraw specific amount of shares from radiant lending
        // Radiant: withdraw all should input ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
        radiantLending.withdraw(address(_asset), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, address(this));
        uint256 shares = super.redeem(shares, receiver, owner);
        return shares;
    }

    // function claim(){
        // https://arbiscan.io/tx/0x13ded9cd77e5918bb7b51484c94b0676a6f05dd83506a73924a76cf43e2ce530
    // }
}
