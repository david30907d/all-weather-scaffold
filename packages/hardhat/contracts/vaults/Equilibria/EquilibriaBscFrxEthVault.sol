// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./BaseEquilibriaVault.sol";

contract EquilibriaBscFrxEthVault is BaseEquilibriaVault {
  address public immutable oneInchAggregatorAddress =
    0x1111111254fb6c44bAC0beD2854e76F90643097d;

  constructor(
    IERC20Metadata asset_,
    string memory name,
    string memory symbol
  ) BaseEquilibriaVault(asset_, name, symbol) {
    pid = 2;
    eqbZap = IEqbZap(0x22Fc5A29bd3d6CCe19a06f844019fd506fCe4455);
    pendleBooster = IPendleBooster(0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF);
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
    return 1;
    // // zap into pendle
    // uint256 shares = super._zapIn(
    //   DAI,
    //   swappedDaiAmount,
    //   minLpOut,
    //   guessPtReceivedFromSy,
    //   input
    // );
    // // return the remaining DAI back to user
    // // it's meant to have some dust left, since zapIn Data is pre-computed before 1inch swap
    // // so cannot be 100% accurate
    // SafeERC20.safeTransfer(DAI, msg.sender, DAI.balanceOf(address(this)));
    // return shares;
  }
}
