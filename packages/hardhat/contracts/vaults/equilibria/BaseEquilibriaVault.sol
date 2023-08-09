// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../../interfaces/AbstractVault.sol";
import "../../equilibria/IEqbZap.sol";
import "../../equilibria/IBaseRewardPool.sol";
import "../../pendle/IPendleRouter.sol";
import "../../pendle/IPendleBooster.sol";

abstract contract BaseEquilibriaVault is AbstractVault {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  IEqbZap public eqbZap;
  IPendleBooster public pendleBooster;
  uint256 public pid;

  constructor(
    IERC20Metadata asset_,
    string memory name,
    string memory symbol
  ) ERC4626(asset_) ERC20(name, symbol) {
    eqbZap = IEqbZap(0xc7517f481Cc0a645e63f870830A4B2e580421e32);
    pendleBooster = IPendleBooster(0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF);
  }

  function totalLockedAssets() public pure override returns (uint256) {
    return 0;
  }

  function totalStakedButWithoutLockedAssets()
    public
    view
    override
    returns (uint256)
  {
    (, , address rewardpool, ) = pendleBooster.poolInfo(pid);
    return IERC20(rewardpool).balanceOf(address(this));
  }

  function _zapIn(
    IERC20 zapInToken,
    uint256 amount,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) internal override returns (uint256) {
    uint256 originalShares = totalStakedButWithoutLockedAssets();
    SafeERC20.safeApprove(zapInToken, address(eqbZap), amount);

    // Error: VM Exception while processing transaction: reverted with an unrecognized custom error (return data: 0xfa711db2)
    // It means the swap would exceed the max slippage
    eqbZap.zapIn(pid, minLpOut, guessPtReceivedFromSy, input, true);
    return totalStakedButWithoutLockedAssets().sub(originalShares);
  }

  function redeem(uint256 shares) public override returns (uint256) {
    (, , address rewardPool, ) = pendleBooster.poolInfo(pid);
    SafeERC20.safeApprove(
      IBaseRewardPool(rewardPool).stakingToken(),
      address(eqbZap),
      shares
    );
    eqbZap.withdraw(pid, shares);
    claim();
    uint256 redeemShares = super.redeem(shares, msg.sender, msg.sender);
    return redeemShares;
  }

  function claim()
    public
    override
    returns (IFeeDistribution.RewardData[] memory)
  {
    IFeeDistribution.RewardData[]
      memory claimableRewards = getClaimableRewards();
    if (claimableRewards.length != 0) {
      uint256[] memory pids = new uint256[](1);
      pids[0] = pid;
      eqbZap.claimRewards(pids);
      super.claimRewardsFromVaultToPortfolioVault(claimableRewards);
    }
    return claimableRewards;
  }

  function getClaimableRewards()
    public
    view
    override
    returns (IFeeDistribution.RewardData[] memory rewards)
  {
    // pro rata: user's share divided by total shares, is the ratio of the reward
    uint256 portfolioSharesInThisVault = balanceOf(msg.sender);
    uint256 totalVaultShares = totalSupply();
    if (portfolioSharesInThisVault == 0 || totalVaultShares == 0) {
      return new IFeeDistribution.RewardData[](0);
    }
    (, , address rewardpool, ) = pendleBooster.poolInfo(pid);
    address[] memory rewardTokens = IBaseRewardPool(rewardpool)
      .getRewardTokens();
    rewards = new IFeeDistribution.RewardData[](rewardTokens.length);
    for (uint256 i = 0; i < rewardTokens.length; i++) {
      rewards[i] = IFeeDistribution.RewardData({
        token: rewardTokens[i],
        amount: Math.mulDiv(
          IBaseRewardPool(rewardpool).earned(address(this), rewardTokens[i]),
          portfolioSharesInThisVault,
          totalVaultShares
        )
      });
    }
    return rewards;
  }
}
