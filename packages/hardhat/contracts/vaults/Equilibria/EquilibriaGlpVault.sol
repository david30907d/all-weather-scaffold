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

contract EquilibriaGlpVault is BaseEquilibriaVault {
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

  function totalUnstakedAssets() public view override returns (uint256) {
    // ideally, the asset() of this vault should be fsGLP
    // return fsGLP.balanceOf(address(this));
    return IERC20(asset()).balanceOf(address(this));
  }
}
