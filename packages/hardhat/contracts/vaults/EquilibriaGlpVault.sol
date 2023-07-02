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
    return fsGLP.balanceOf(address(this));
  }

  function deposit(
    uint256 amount,
    address receiver,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) public returns (uint256) {
    require(amount <= maxDeposit(receiver), "ERC4626: deposit more than max");

    SafeERC20.safeTransferFrom(weth, msg.sender, address(this), amount);
    SafeERC20.safeApprove(weth, address(eqbZap), amount);
    uint256 originalShares = totalStakedButWithoutLockedAssets();
    // Error: VM Exception while processing transaction: reverted with an unrecognized custom error (return data: 0xfa711db2)
    // It means the swap would exceed the max slippage
    // pendle
    // SafeERC20.safeApprove(weth, address(pendleRouter), amount);
    // (uint256 netLpOut, ) = pendleRouter.addLiquiditySingleToken(
    // receiver,
    // 0x7D49E5Adc0EAAD9C027857767638613253eF125f,
    // minLpOut,
    // guessPtReceivedFromSy,
    // input);

    eqbZap.zapIn(pid, minLpOut, guessPtReceivedFromSy, input, true);
    uint256 shares = totalStakedButWithoutLockedAssets().sub(originalShares);
    _mint(receiver, shares);

    emit Deposit(_msgSender(), receiver, amount, shares);
    return shares;
    // pendle
    // emit Deposit(_msgSender(), receiver, amount, netLpOut);
    // netLpOut only exists in Pendle contract
    // return netLpOut;
  }

  function deposit(
    uint256 amount,
    address receiver,
    bytes calldata oneInchData
  ) public virtual override returns (uint256) {
    revert("Not implemented");
  }

  function redeemAll(
    uint256 shares,
    address receiver,
    IPendleRouter.TokenOutput calldata output
  ) public returns (uint256) {
    (, , address rewardPool, ) = pendleBooster.poolInfo(pid);
    SafeERC20.safeApprove(
      IBaseRewardPool(rewardPool).stakingToken(),
      address(eqbZap),
      shares
    );
    // pendle
    // pendleRouter.removeLiquiditySingleToken(
    // receiver,
    // 0x7D49E5Adc0EAAD9C027857767638613253eF125f,
    // shares,
    // output);

    // TODO(david): use pendle's removeLiquiditySingleToken instead of eqbZap
    // removeLiquiditySingleToken
    eqbZap.zapOut(pid, 1, output, false);
    uint256 shares = super.redeem(shares, receiver, msg.sender);
    return shares;
    // return 1;
  }

  function redeemAll(
    uint256 shares,
    address receiver
  ) public override returns (uint256) {
    revert("Not implemented");
  }

  function claim(address receiver, uint256[] memory pids_) public {
    eqbZap.claimRewards(pids_);
    // TODO(david): transfer to user;
    // _transferRewardsToUser(receiver);
    // _claimERC20Rewards(receiver, rRewardTokens);
    // _claimETHReward(receiver);
  }

  function claim(
    address receiver,
    IFeeDistribution.RewardData[] memory claimableRewards
  ) public pure override {
    revert("Not implemented");
  }

  function claimableRewards(
    address portfolioAddress,
    uint256 userShares,
    uint256 portfolioShares
  )
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
    uint256 ratioWithoutDivideByPortfolioShares = Math.mulDiv(
      userShares,
      portfolioSharesInThisVault,
      totalVaultShares
    );
    (, , address rewardpool, ) = pendleBooster.poolInfo(pid);
    address[] memory rewardTokens = IBaseRewardPool(rewardpool)
      .getRewardTokens();
    // TODO(david): need to get reward of EQB and xEQB
    rewards = new IFeeDistribution.RewardData[](4);
    for (uint256 i = 0; i < rewardTokens.length; i++) {
      rewards[i] = IFeeDistribution.RewardData({
        token: rewardTokens[i],
        amount: Math.mulDiv(
          IBaseRewardPool(rewardpool).earned(address(this), rewardTokens[i]),
          ratioWithoutDivideByPortfolioShares,
          portfolioShares
        )
      });
    }
    return rewards;
  }

  function _transferRewardsToUser(
    address receiver,
    address[] memory rRewardTokens
  ) internal {
    // for (uint256 i = 0; i < rRewardTokens.length; i++) {
    //   radiantLending.withdraw(
    //     rRewardTokens[i],
    //     _calculateClaimableERC20RewardForUser(receiver, rRewardTokens[i]),
    //     receiver
    //   );
    // }
    // console.log("claimERC20Rewards");
  }
}
