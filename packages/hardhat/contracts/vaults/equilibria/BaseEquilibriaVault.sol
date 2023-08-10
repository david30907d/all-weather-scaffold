// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../../interfaces/AbstractVault.sol";
import "../../equilibria/IEqbZap.sol";
import "../../equilibria/IBaseRewardPool.sol";
import "../../equilibria/IEqbMinterSidechain.sol";
import "../../equilibria/IPendleBoosterSidechain.sol";
import "../../pendle/IPendleRouter.sol";
import "../../pendle/IPendleBooster.sol";

abstract contract BaseEquilibriaVault is AbstractVault {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  IEqbZap public immutable eqbZap;
  IPendleBooster public immutable pendleBooster;
  uint256 public immutable pid;
  address public eqbMinterAddr;
  address public pendleBoosterAddr;
  address public immutable PENDLETOKENADDR =
    0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8;
  address public immutable EQBTOKENADDR =
    0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C;
  address public immutable XEQBTOKENADDR =
    0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E;

  constructor(
    IERC20Metadata asset_,
    string memory name_,
    string memory symbol
  ) ERC4626(asset_) ERC20(name_, symbol) {
    eqbZap = IEqbZap(0xc7517f481Cc0a645e63f870830A4B2e580421e32);
    pendleBooster = IPendleBooster(0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF);
  }

  function updateEqbMinterAddr(address eqbMinterAddr_) public onlyOwner {
    require(eqbMinterAddr_ != address(0), "Address cannot be zero");
    eqbMinterAddr = eqbMinterAddr_;
  }

  function updatePendleBoosterAddr(
    address pendleBoosterAddr_
  ) public onlyOwner {
    require(pendleBoosterAddr_ != address(0), "Address cannot be zero");
    pendleBoosterAddr = pendleBoosterAddr_;
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
    // slither-disable-next-line unused-return
    (, , address rewardPool, ) = pendleBooster.poolInfo(pid);
    return IERC20(rewardPool).balanceOf(address(this));
  }

  // function getEqbReward() public view returns (uint256) {

  //   uint256 sum = EqbMinter.getFactor/EqbMinter.DENOMINATOR * PENDLE;
  //   uint256 EQB = Sum * PendleBooster.farmEqbShare/PendleBooster.DENOMINATOR;
  //   uint256 xEQB = Sum - EQB;
  // }

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
    // slither-disable-next-line unused-return
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
    // slither-disable-next-line unused-return
    (, , address rewardPool, ) = pendleBooster.poolInfo(pid);
    address[] memory rewardTokens = IBaseRewardPool(rewardPool)
      .getRewardTokens();
    // leave 2 spaces for EQB and xEQB
    rewards = new IFeeDistribution.RewardData[](rewardTokens.length + 2);
    uint256 pendleAmount;
    for (uint256 i = 0; i < rewardTokens.length; i++) {
      rewards[i] = IFeeDistribution.RewardData({
        token: rewardTokens[i],
        amount: Math.mulDiv(
          IBaseRewardPool(rewardPool).earned(address(this), rewardTokens[i]),
          portfolioSharesInThisVault,
          totalVaultShares
        )
      });
      if (rewardTokens[i] == PENDLETOKENADDR) {
        pendleAmount = rewards[i].amount;
      }
    }
    (uint256 eqbAmount, uint256 xEqbAmount) = _getEqbClaimableRewards(
      pendleAmount
    );
    rewards[rewardTokens.length] = IFeeDistribution.RewardData({
      token: EQBTOKENADDR,
      amount: eqbAmount
    });
    rewards[rewardTokens.length + 1] = IFeeDistribution.RewardData({
      token: XEQBTOKENADDR,
      amount: xEqbAmount
    });
    return rewards;
  }

  function _getEqbClaimableRewards(
    uint256 pendleAmount
  ) internal view returns (uint256, uint256) {
    uint256 sumOfEqbAndXeqb = Math.mulDiv(
      pendleAmount,
      IEqbMinterSidechain(eqbMinterAddr).getFactor(),
      IEqbMinterSidechain(eqbMinterAddr).DENOMINATOR()
    );
    uint256 eqbAmount = Math.mulDiv(
      sumOfEqbAndXeqb,
      IPendleBoosterSidechain(pendleBoosterAddr).farmEqbShare(),
      IPendleBoosterSidechain(pendleBoosterAddr).DENOMINATOR()
    );
    uint256 xeqbAmount = sumOfEqbAndXeqb - eqbAmount;
    return (eqbAmount, xeqbAmount);
  }
}
