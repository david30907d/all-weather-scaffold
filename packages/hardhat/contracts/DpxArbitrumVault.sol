// SPDX-License-Identifier: MIT
// This is a Smart Contract written in Solidity. It represents a vault that allows users to deposit WETH and receive DPXV in return. The contract uses the functionalities of other smart contracts such as oneInch aggregator, SushiSwap, and MiniChefV2 to perform swaps and farming of SUSHI and DPX tokens. The contract has several functions including deposit(), redeem(), claim(), totalAssets(), totalLockedAssets(), totalStakedButWithoutLockedAssets(), and getClaimableRewards().

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./dpx/IMiniChefV2.sol";
import "./dpx/ICloneRewarderTime.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./sushiSwap/IUniswapV2Router01.sol";
import "./utils/IWETH.sol";
import "./interfaces/AbstractVault.sol";
import "./radiant/IFeeDistribution.sol";

contract DpxArbitrumVault is AbstractVault {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;
  error ERC4626ExceededMaxRedeem(address owner, uint256 shares, uint256 max);

  /**
   * @dev Attempted to deposit more assets than the max amount for `receiver`.
   */
  error ERC4626ExceededMaxDeposit(
    address receiver,
    uint256 assets,
    uint256 max
  );

  IERC20 public immutable dpxToken =
    IERC20(0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55);
  IERC20 public immutable sushiToken =
    IERC20(0xd4d42F0b6DEF4CE0383636770eF773390d85c61A);
  address public immutable oneInchAggregatorAddress =
    0x1111111254fb6c44bAC0beD2854e76F90643097d;
  address public immutable sushiSwapRouterAddress =
    0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
  address public immutable sushiSwapDpxLpTokenAddress =
    0x0C1Cf6883efA1B496B01f654E247B9b419873054;

  ICloneRewarderTime public immutable dpxRewarder =
    ICloneRewarderTime(0xb873813F710093CBC17836297A6feFCfc6989faF);
  IMiniChefV2 public sushiSwapMiniChef;

  uint256 public pid; // sushiSwap pid

  constructor(
    IERC20Metadata asset_,
    address sushiSwapMiniChefV2_,
    uint256 pid_
  ) ERC4626(asset_) ERC20("AllWeatherLP-SushSwap-DpxETH", "DPXV") {
    pid = pid_;
    sushiSwapMiniChef = IMiniChefV2(sushiSwapMiniChefV2_);
  }

  function _zapIn(
    uint256 amount,
    bytes calldata oneInchData
  ) internal override returns (uint256) {
    SafeERC20.safeApprove(
      weth,
      oneInchAggregatorAddress,
      Math.mulDiv(amount, 1, 2)
    );
    // TODO(david): should return those token left after `addLiquidityETH` back to user
    // recurring error: "Error: VM Exception while processing transaction: reverted with reason string '1inch failed to swap'"
    (bool succ, bytes memory data) = address(oneInchAggregatorAddress).call(
      oneInchData
    );
    require(succ, "1inch failed to swap");
    //  (uint256 dpxReturnedAmount, uint256 gasLeft) = abi.decode(data, (uint256, uint256));
    uint256 dpxReturnedAmount = dpxToken.balanceOf(address(this));
    SafeERC20.safeApprove(dpxToken, sushiSwapRouterAddress, dpxReturnedAmount);
    weth.withdraw(Math.mulDiv(amount, 1, 2));
    // deadline means current time + 5 minutes;
    uint256 deadline = block.timestamp + 300;
    (uint amountToken, uint amountETH, uint liquidity) = IUniswapV2Router01(
      sushiSwapRouterAddress
    ).addLiquidityETH{value: address(this).balance}(
      address(dpxToken),
      dpxReturnedAmount,
      Math.mulDiv(dpxReturnedAmount, 95, 100),
      Math.mulDiv(address(this).balance, 95, 100),
      address(this),
      deadline
    );
    IERC20(sushiSwapDpxLpTokenAddress).approve(
      address(sushiSwapMiniChef),
      liquidity
    );
    sushiSwapMiniChef.deposit(pid, liquidity, address(this));
    return liquidity;
  }

  function redeem(uint256 shares) public override returns (uint256) {
    sushiSwapMiniChef.withdrawAndHarvest(pid, shares, address(this));
    super.redeem(shares, msg.sender, msg.sender);
    return shares;
  }

  function claim()
    public
    override
    returns (IFeeDistribution.RewardData[] memory)
  {
    IFeeDistribution.RewardData[]
      memory claimableRewards = getClaimableRewards();
    if (claimableRewards.length != 0) {
      sushiSwapMiniChef.harvest(pid, address(this));
      super.claimRewardsFromVaultToPortfolioVault(claimableRewards);
    }
    return claimableRewards;
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
    /// `amount` LP token amount the user has provided.
    /// `rewardDebt` The amount of SUSHI entitled to the user.
    (uint256 amount, ) = sushiSwapMiniChef.userInfo(pid, address(this));
    return amount;
  }

  function totalUnstakedAssets() public view override returns (uint256) {
    return IERC20(asset()).balanceOf(address(this));
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
    rewards[0] = IFeeDistribution.RewardData({
      token: address(sushiToken),
      amount: Math.mulDiv(
        sushiSwapMiniChef.pendingSushi(pid, address(this)),
        portfolioSharesInThisVault,
        totalVaultShares
      )
    });
    rewards[1] = IFeeDistribution.RewardData({
      token: address(dpxToken),
      amount: Math.mulDiv(
        dpxRewarder.pendingToken(pid, address(this)),
        portfolioSharesInThisVault,
        totalVaultShares
      )
    });
    return rewards;
  }

  // To receive ETH from the WETH's withdraw function (it won't work without it)
  receive() external payable {}
}
