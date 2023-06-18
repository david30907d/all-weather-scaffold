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
import "./radiant/IMultiFeeDistribution.sol";
import "./radiant/IWETHGateway.sol";
import "./radiant/IAToken.sol";
import "./radiant/IFeeDistribution.sol";
import "./gmx-contracts/IRewardRouterV2.sol";


contract RadiantArbitrumVault is ERC4626 {
	using SafeERC20 for IERC20;
	using SafeMath for uint256;

    IERC20 private immutable _asset;
    ILendingPool public radiantLending;
    ILockZap public lockZap;
    IRewardRouterV2 public gmxRouter;
    IMultiFeeDistribution public immutable multiFeeDistribution = IMultiFeeDistribution(0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE);
    IERC20 public immutable weth = IERC20(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);
    IWETHGateway public immutable wethGateway = IWETHGateway(0xBb5cA40b2F7aF3B1ff5dbce0E9cC78F8BFa817CE);
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
        (uint256 lockedBalances,,,,) = IFeeDistribution(0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE).lockedBalances(address(this));
        return lockedBalances + _asset.balanceOf(address(this));
    }

    function totalLockedAssets() public view returns (uint256) {
        (uint256 lockedBalances,,,,) = IFeeDistribution(0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE).lockedBalances(address(this));
        return lockedBalances;
    }

    function totalUnlockedAssets() public view returns (uint256) {
        return _asset.balanceOf(address(this));
    }

    function deposit(uint256 amount, address receiver) public override returns (uint256 shares) {
        // the reason why I cannot just call `super.deposit` is that user don't have dLP at the time they deposit.
        // need to take advantage of the zap to get dLP, so need to modity `super.deposit()`
        require(amount <= maxDeposit(receiver), "ERC4626: deposit more than max");

        SafeERC20.safeTransferFrom(weth, msg.sender, address(this), amount);
        SafeERC20.safeApprove(weth, address(lockZap), amount);
        uint256 shares = lockZap.zap(false, amount, 0, 3);
        _mint(receiver, shares);

        emit Deposit(_msgSender(), receiver, amount, shares);
        return shares;
    }

    function redeemAll(uint256 _shares, address receiver) public returns (uint256) {
        // TODO(david): should only redeem _shares amount of dLP
        uint256 radiantDlpShares = multiFeeDistribution.withdrawExpiredLocksForWithOptions(address(this), 1, true);
        uint256 vaultShare = super.redeem(radiantDlpShares, receiver, msg.sender);
        require(radiantDlpShares == vaultShare, "radiantDlpShares != vaultShare");
        return vaultShare;
    }

    function claim(address receiver, address[] memory rRewardTokens) public {
        multiFeeDistribution.getAllRewards();
        _claimERC20Rewards(receiver, rRewardTokens);
        _claimETHReward(receiver);
    }

    function claimableRewards(address portfolioAddress) public view returns (IFeeDistribution.RewardData[] memory rewards) {
        IFeeDistribution.RewardData[] memory radiantRewardData = multiFeeDistribution.claimableRewards(address(this));
        return _calculateClaimableRewards(portfolioAddress, radiantRewardData);
    }

    function _claimERC20Rewards(address receiver, address[] memory rRewardTokens) internal {
        for (uint256 i = 0; i < rRewardTokens.length; i++) {
            radiantLending.withdraw(
                rRewardTokens[i],
                _calculateClaimableERC20RewardForUser(receiver, rRewardTokens[i]),
                receiver);
        }
    }

    function _claimETHReward(address receiver) internal {
		IAToken aWETH = IAToken(radiantLending.getReserveData(address(weth)).aTokenAddress);
        SafeERC20.safeApprove(aWETH, address(wethGateway), type(uint256).max);
        uint256 userBalance = aWETH.balanceOf(address(this));
        wethGateway.withdrawETH(address(radiantLending), _calculateClaimableETHForUser(receiver, userBalance), receiver);
    }

    function _calculateClaimableERC20RewardForUser(address receiver, address rRewardTokens) internal returns (uint256) {
        // TODO(david): need to calculate the reward for user
        return type(uint256).max;
    }

    function _calculateClaimableETHForUser(address receiver, uint256 userBalance) internal returns (uint256) {
        // TODO(david): need to calculate the reward for user by using userBalance
        return type(uint256).max;
    }

    function _calculateClaimableRewards(address portfolioAddress, IFeeDistribution.RewardData[] memory radiantRewardData) internal view returns (IFeeDistribution.RewardData[] memory rewards) {
        // TODO(david): should use portfolioAddress to calculate the reward, per the shares of this portfolio in this radiant vault
        return radiantRewardData;
    }
}
