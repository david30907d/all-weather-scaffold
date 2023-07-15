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
    // // asset
    DAI = IERC20(0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1);
  }

  function totalUnstakedAssets() public view override returns (uint256) {
    // dai or gdai, depends on wether pendle can zap out dai or not
    return IERC20(asset()).balanceOf(address(this));
  }

  function _zapIn(
    uint256 amount,
    bytes calldata oneInchData,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) internal override returns (uint256) {
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
    uint256 shares = super._zapIn(
      DAI,
      swappedDaiAmount,
      minLpOut,
      guessPtReceivedFromSy,
      input
    );
    // return the remaining DAI back to user
    // it's meant to have some dust left, since zapIn Data is pre-computed before 1inch swap
    // so cannot be 100% accurate
    SafeERC20.safeTransfer(DAI, msg.sender, DAI.balanceOf(address(this)));
    return shares;
  }
}
