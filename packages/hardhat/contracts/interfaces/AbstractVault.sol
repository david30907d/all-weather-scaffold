// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "../radiant/IFeeDistribution.sol";
import "../utils/IWETH.sol";

abstract contract AbstractVault is ERC4626 {
  IWETH public immutable weth =
    IWETH(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);

  function totalLockedAssets() public view virtual returns (uint256);

  function totalStakedButWithoutLockedAssets()
    public
    view
    virtual
    returns (uint256);

  function totalUnstakedAssets() public view virtual returns (uint256);

  function totalAssets() public view override returns (uint256) {
    return
      totalLockedAssets() +
      totalStakedButWithoutLockedAssets() +
      totalUnstakedAssets();
  }

  function claimableRewards(
    uint256 userShares,
    uint256 totalShares
  )
    public
    view
    virtual
    returns (IFeeDistribution.RewardData[] memory claimableRewards);

  function deposit(
    uint256 amount,
    address receiver,
    bytes calldata oneInchData
  ) public virtual returns (uint256);

  function redeemAll(
    uint256 shares,
    address receiver
  ) public virtual returns (uint256);

  function claim(
    address receiver,
    IFeeDistribution.RewardData[] memory claimableRewards
  ) public virtual {
    for (uint256 i = 0; i < claimableRewards.length; i++) {
      SafeERC20.safeTransfer(
        IERC20(claimableRewards[i].token),
        receiver,
        claimableRewards[i].amount
      );
    }
  }
}
