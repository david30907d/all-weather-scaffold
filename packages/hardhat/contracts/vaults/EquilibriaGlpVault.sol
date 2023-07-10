// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "hardhat/console.sol";
import "../interfaces/AbstractVault.sol";
import "../equilibria/IEqbZap.sol";
import "../equilibria/IBaseRewardPool.sol";
import "../pendle/IPendleRouter.sol";
import "../pendle/IPendleBooster.sol";

contract EquilibriaGlpVault is AbstractVault {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  IEqbZap public eqbZap;
  IPendleBooster public pendleBooster;
  IPendleRouter public pendleRouter;
  IERC20 public fsGLP;
  uint256 public pid = 1;

  constructor(
    IERC20Metadata asset_
  ) ERC4626(asset_) ERC20("AllWeatherLP-Equilibria-GLP", "ALP-EQB-GLP") {
    eqbZap = IEqbZap(0xc7517f481Cc0a645e63f870830A4B2e580421e32);
    pendleBooster = IPendleBooster(0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF);
    pendleRouter = IPendleRouter(0x0000000001E4ef00d069e71d6bA041b0A16F7eA0);
    fsGLP = IERC20(0x1aDDD80E6039594eE970E5872D247bf0414C8903);
  }

  function totalLockedAssets() public view override returns (uint256) {
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

  function totalUnstakedAssets() public view override returns (uint256) {
    // ideally, the asset() of this vault should be fsGLP
    // return fsGLP.balanceOf(address(this));
    return IERC20(asset()).balanceOf(address(this));
  }

  function deposit(
    uint256 amount,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) public override returns (uint256) {
    require(amount <= maxDeposit(msg.sender), "ERC4626: deposit more than max");

    SafeERC20.safeTransferFrom(weth, msg.sender, address(this), amount);
    SafeERC20.safeApprove(weth, address(eqbZap), amount);
    uint256 originalShares = totalStakedButWithoutLockedAssets();
    // Error: VM Exception while processing transaction: reverted with an unrecognized custom error (return data: 0xfa711db2)
    // It means the swap would exceed the max slippage

    eqbZap.zapIn(pid, minLpOut, guessPtReceivedFromSy, input, true);
    uint256 shares = totalStakedButWithoutLockedAssets().sub(originalShares);
    _mint(msg.sender, shares);

    emit Deposit(_msgSender(), msg.sender, amount, shares);
    return shares;
  }

  function redeem(
    uint256 shares,
    IPendleRouter.TokenOutput calldata output
  ) public override returns (uint256) {
    (, , address rewardPool, ) = pendleBooster.poolInfo(pid);
    SafeERC20.safeApprove(
      IBaseRewardPool(rewardPool).stakingToken(),
      address(eqbZap),
      shares
    );
    // this would only withdraw GLP-LPT, not fsGLP
    eqbZap.withdraw(pid, shares);

    // ideal solution: use eqbZap.zapOut
    // eqbZap.zapOut(pid, 1, output, false);

    // alternative: use pendleRouter.removeLiquiditySingleToken
    // _approveTokenIfNeeded(0x7D49E5Adc0EAAD9C027857767638613253eF125f, address(pendleRouter), shares);
    // pendleRouter.removeLiquiditySingleToken(
    //     address(this),
    //     0x7D49E5Adc0EAAD9C027857767638613253eF125f,
    //     shares,
    //     output
    // );
    uint256 shares = super.redeem(shares, msg.sender, msg.sender);
    return shares;
  }

  function claim(
    uint256[] calldata pids
  ) public override returns (IFeeDistribution.RewardData[] memory) {
    IFeeDistribution.RewardData[]
      memory claimableRewards = getClaimableRewards();
    if (claimableRewards.length != 0) {
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
    rewards = new IFeeDistribution.RewardData[](2);
    (, , address rewardpool, ) = pendleBooster.poolInfo(pid);
    address[] memory rewardTokens = IBaseRewardPool(rewardpool)
      .getRewardTokens();
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
