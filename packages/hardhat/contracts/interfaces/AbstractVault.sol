// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "../radiant/IFeeDistribution.sol";

abstract contract AbstractVault {
  function totalLockedAssets() public view virtual returns (uint256) {
    return 0;
  }

  function totalStakedButWithoutLockedAssets()
    public
    view
    virtual
    returns (uint256)
  {
    return 0;
  }

  function claimableRewards(
    address portfolioAddress,
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
  ) public virtual;
}
