// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../../equilibria/IEqbZap.sol";
import "../../pendle/IPendleRouter.sol";
import "../../pendle/IPendleBooster.sol";
import "./BaseEquilibriaVault.sol";

contract EquilibriaGlpVault is BaseEquilibriaVault {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  IERC20 public immutable fsGLP;

  constructor(
    IERC20Metadata asset_,
    string memory name_,
    string memory symbol
  ) BaseEquilibriaVault(asset_, name_, symbol) {
    pid = 1;
    fsGLP = IERC20(0x1aDDD80E6039594eE970E5872D247bf0414C8903);
  }

  function totalUnstakedAssets() public view override returns (uint256) {
    // ideally, the asset() of this vault should be fsGLP
    // return fsGLP.balanceOf(address(this));
    return IERC20(asset()).balanceOf(address(this));
  }
}
