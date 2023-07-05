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
import "./radiant/IMultiFeeDistribution.sol";
import "./radiant/IWETHGateway.sol";
import "./radiant/IAToken.sol";
import "./radiant/IFeeDistribution.sol";
import "./interfaces/AbstractVault.sol";

contract RadiantArbitrumVault is AbstractVault {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  ILendingPool public radiantLending;
  ILockZap public lockZap;
  IMultiFeeDistribution public immutable multiFeeDistribution =
    IMultiFeeDistribution(0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE);
  IWETHGateway public immutable wethGateway =
    IWETHGateway(0xBb5cA40b2F7aF3B1ff5dbce0E9cC78F8BFa817CE);
  address[] public radiantRewardNativeTokenAddresses = [
    0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f, // wbtc
    0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9, // usdt
    0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8, // usdc.e
    0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1, // dai
    0x5979D7b546E38E414F7E9822514be443A4800529, // wsteth
    0x912CE59144191C1204E64559FE8253a0e49E6548 //  arb
  ];

  constructor(
    IERC20Metadata asset_,
    address radiantLending_
  ) ERC4626(asset_) ERC20("AllWeatherLP-Radiant", "ALP-r") {
    radiantLending = ILendingPool(radiantLending_);
    lockZap = ILockZap(0x8991C4C347420E476F1cf09C03abA224A76E2997);
  }

  function totalLockedAssets() public view override returns (uint256) {
    (uint256 lockedBalances, , , , ) = IFeeDistribution(
      0x76ba3eC5f5adBf1C58c91e86502232317EeA72dE
    ).lockedBalances(address(this));
    return lockedBalances;
  }

  function totalStakedButWithoutLockedAssets()
    public
    view
    override
    returns (uint256)
  {
    return 0;
  }

  function totalUnstakedAssets() public view override returns (uint256) {
    return IERC20(asset()).balanceOf(address(this));
  }

  function getRadiantRewardNativeTokenAddresses()
    external
    view
    returns (address[] memory)
  {
    return radiantRewardNativeTokenAddresses;
  }

  function deposit(
    uint256 amount,
    address receiver,
    bytes calldata oneInchData
  ) public override returns (uint256) {
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

  function redeemAll(
    uint256 _shares,
    address receiver
  ) public override returns (uint256) {
    // TODO(david): should only redeem _shares amount of dLP
    uint256 radiantDlpShares = multiFeeDistribution
      .withdrawExpiredLocksForWithOptions(address(this), 1, true);
    uint256 vaultShare = super.redeem(radiantDlpShares, receiver, msg.sender);
    require(radiantDlpShares == vaultShare, "radiantDlpShares != vaultShare");
    return vaultShare;
  }

  function claim() public {
    multiFeeDistribution.getAllRewards();
    _withdrawRTokenToReceiver();
    _withdrawETHRewardToReceiver();
  }

  function claimableRewards()
    public
    view
    returns (IFeeDistribution.RewardData[] memory rewards)
  {
    // pro rata: portfolio's share / total shares in this vault
    uint256 portfolioSharesInThisVault = balanceOf(msg.sender);
    uint256 totalVaultShares = totalSupply();
    if (portfolioSharesInThisVault == 0 || totalVaultShares == 0) {
      return new IFeeDistribution.RewardData[](0);
    }
    IFeeDistribution.RewardData[]
      memory radiantRewardData = multiFeeDistribution.claimableRewards(
        address(this)
      );
    return
      _calculateClaimableRewards(
        radiantRewardData,
        portfolioSharesInThisVault,
        totalVaultShares
      );
  }

  function _withdrawRTokenToReceiver() internal {
    for (uint256 i = 0; i < radiantRewardNativeTokenAddresses.length; i++) {
      radiantLending.withdraw(
        radiantRewardNativeTokenAddresses[i],
        type(uint256).max,
        msg.sender
      );
    }
  }

  function _withdrawETHRewardToReceiver() internal {
    IAToken aWETH = IAToken(
      radiantLending.getReserveData(address(weth)).aTokenAddress
    );
    SafeERC20.safeApprove(aWETH, address(wethGateway), type(uint256).max);
    wethGateway.withdrawETH(
      address(radiantLending),
      type(uint256).max,
      msg.sender
    );
  }

  function _calculateClaimableRewards(
    IFeeDistribution.RewardData[] memory radiantRewardData,
    uint256 portfolioSharesInThisVault,
    uint256 totalVaultShares
  ) internal view returns (IFeeDistribution.RewardData[] memory rewards) {
    for (uint256 i = 0; i < radiantRewardData.length; i++) {
      if (radiantRewardData[i].amount == 0) {
        continue;
      }
      radiantRewardData[i].amount = Math.mulDiv(
        radiantRewardData[i].amount,
        portfolioSharesInThisVault,
        totalVaultShares
      );
    }
    return radiantRewardData;
  }

  function claimableRewards(
    uint256 userShares,
    uint256 totalShares
  )
    public
    view
    override
    returns (IFeeDistribution.RewardData[] memory claimableRewards)
  {
    revert("not implemented");
  }
}
