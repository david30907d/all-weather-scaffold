// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "../radiant/IFeeDistribution.sol";
import "../utils/IWETH.sol";

import "../pendle/IPendleRouter.sol";

abstract contract AbstractVault is ERC4626, Ownable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

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

  /* solhint-disable no-unused-vars */
  function deposit(
    uint256 amount,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) public virtual returns (uint256) {
    revert("deposit() not implemented");
  }

  /* solhint-enable no-unused-vars */

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

  /* solhint-disable no-unused-vars */
  function _zapIn(uint256 amount) internal virtual returns (uint256) {
    revert("_zapIn not implemented");
  }

  /* solhint-enable no-unused-vars */

  /* solhint-disable no-unused-vars */
  function _zapIn(
    uint256 amount,
    bytes calldata oneInchData
  ) internal virtual returns (uint256) {
    revert("_zapIn not implemented");
  }

  /* solhint-enable no-unused-vars */

  /* solhint-disable no-unused-vars */
  function _zapIn(
    uint256 amount,
    bytes calldata oneInchData,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) internal virtual returns (uint256) {
    revert("_zapIn not implemented");
  }

  /* solhint-enable no-unused-vars */

  function _mintShares(
    uint256 shares,
    uint256 amount
  ) public virtual returns (uint256) {
    _mint(msg.sender, shares);
    emit Deposit(_msgSender(), msg.sender, amount, shares);
    return shares;
  }

  /* solhint-disable no-unused-vars */
  function redeem(uint256 shares) public virtual returns (uint256) {
    revert("Not implemented");
  }

  /* solhint-enable no-unused-vars */

  /* solhint-disable no-unused-vars */
  function redeem(
    uint256 shares,
    IPendleRouter.TokenOutput calldata output
  ) public virtual returns (uint256) {
    revert("Not implemented");
  }

  /* solhint-enable no-unused-vars */

  /* solhint-disable no-unused-vars */
  function claim()
    public
    virtual
    returns (IFeeDistribution.RewardData[] memory)
  {
    revert("Not implemented");
  }

  /* solhint-enable no-unused-vars */

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

  function rescueFunds(
    address tokenAddress,
    uint256 amount
  ) external onlyOwner {
    require(tokenAddress != address(0), "Invalid token address");
    IERC20(tokenAddress).safeTransfer(owner(), amount);
  }

  function rescueETH(uint256 amount) external onlyOwner {
    payable(owner()).transfer(amount);
  }
}
