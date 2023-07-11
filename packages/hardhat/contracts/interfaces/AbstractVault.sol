// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "../radiant/IFeeDistribution.sol";
import "../utils/IWETH.sol";
import "hardhat/console.sol";
import "../pendle/IPendleRouter.sol";

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

  function getClaimableRewards()
    public
    view
    virtual
    returns (IFeeDistribution.RewardData[] memory claimableRewards);

  function deposit(uint256 amount) public virtual returns (uint256) {
    _prepareForDeposit(amount);
    uint256 shares = _zapIn(amount);
    return _mintShares(shares, amount);
  }

  function deposit(
    uint256 amount,
    bytes calldata oneInchData
  ) public virtual returns (uint256) {
    _prepareForDeposit(amount);
    uint256 shares = _zapIn(amount, oneInchData);
    return _mintShares(shares, amount);
  }

  function deposit(
    uint256 amount,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) public virtual returns (uint256) {
    revert("AbstractVault: deposit for equilibria has not implemented yet");
  }

  function deposit(
    uint256 amount,
    bytes calldata oneInchData,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) public virtual returns (uint256) {
    _prepareForDeposit(amount);
    uint256 shares = _zapIn(
      amount,
      oneInchData,
      minLpOut,
      guessPtReceivedFromSy,
      input
    );
    return _mintShares(shares, shares);
  }

  function _prepareForDeposit(uint256 amount) public virtual {
    require(amount <= maxDeposit(msg.sender), "ERC4626: deposit more than max");
    SafeERC20.safeTransferFrom(weth, msg.sender, address(this), amount);
  }

  function _zapIn(uint256 amount) internal virtual returns (uint256) {
    revert("AbstractVault: _zapIn not implemented");
  }

  function _zapIn(
    uint256 amount,
    bytes calldata oneInchData
  ) internal virtual returns (uint256) {
    revert("AbstractVault: _zapIn not implemented");
  }

  function _zapIn(
    uint256 amount,
    bytes calldata oneInchData,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) internal virtual returns (uint256) {
    revert("AbstractVault: _zapIn not implemented");
  }

  function _mintShares(
    uint256 shares,
    uint256 amount
  ) public virtual returns (uint256) {
    _mint(msg.sender, shares);
    emit Deposit(_msgSender(), msg.sender, amount, shares);
    return shares;
  }

  function redeem(uint256 shares) public virtual returns (uint256) {
    revert("Not implemented");
  }

  function redeem(
    uint256 shares,
    IPendleRouter.TokenOutput calldata output
  ) public virtual returns (uint256) {
    revert("Not implemented");
  }

  function claim()
    public
    virtual
    returns (IFeeDistribution.RewardData[] memory)
  {
    revert("Not implemented");
  }

  function claimRewardsFromVaultToPortfolioVault(
    IFeeDistribution.RewardData[] memory claimableRewards
  ) public virtual {
    for (uint256 i = 0; i < claimableRewards.length; i++) {
      SafeERC20.safeTransfer(
        IERC20(claimableRewards[i].token),
        msg.sender,
        claimableRewards[i].amount
      );
    }
  }
}
