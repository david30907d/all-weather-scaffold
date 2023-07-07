// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./BaseEquilibriaVault.sol";

contract EquilibriaGDAIVault is BaseEquilibriaVault {
  address public immutable oneInchAggregatorAddress =
    0x1111111254fb6c44bAC0beD2854e76F90643097d;
  IERC20 public immutable DAI;

  constructor(
    IERC20Metadata asset_,
    string memory name,
    string memory symbol
  ) BaseEquilibriaVault(asset_, name, symbol) {
    pid = 2;
    eqbZap = IEqbZap(0xc7517f481Cc0a645e63f870830A4B2e580421e32);
    pendleBooster = IPendleBooster(0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF);
    pendleRouter = IPendleRouter(0x0000000001E4ef00d069e71d6bA041b0A16F7eA0);

    // // asset
    DAI = IERC20(0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1);
    // gDAI = IERC20(0xd85E038593d7A098614721EaE955EC2022B9B91B);
  }

  function deposit(
    uint256 amount,
    bytes calldata oneInchData,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) public returns (uint256) {
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

  function _zapIn(
    uint256 amount,
    bytes calldata oneInchData,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) internal returns (uint256) {
    // swap weth to DAI with 1inch
    uint256 originalDaiBalance = DAI.balanceOf(address(this));
    SafeERC20.safeApprove(weth, oneInchAggregatorAddress, amount);
    (bool succ, bytes memory data) = address(oneInchAggregatorAddress).call(
      oneInchData
    );
    require(succ, "1inch failed to swap");
    // TODO(david): need to figure out how to decode
    // (uint256 returnAmount, uint256, uint256) = abi.decode(data, (uint256, uint256, uint256));
    uint256 swappedDaiAmount = SafeMath.sub(
      DAI.balanceOf(address(this)),
      originalDaiBalance
    );
    // zap into pendle
    return
      super._zapIn(
        DAI,
        swappedDaiAmount,
        minLpOut,
        guessPtReceivedFromSy,
        input
      );
  }

  function redeemAll(
    uint256 shares,
    address receiver,
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
    uint256 shares = super.redeem(shares, receiver, msg.sender);
    return shares;
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
