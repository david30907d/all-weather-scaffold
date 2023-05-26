// 每個投資標的都用 etc 4626 vault 去存，例如 convex ohm frax LP,然後他的上層再用一個 portfolio etc 4626 contract 來記錄使用者佔這個投資組合的幾趴。不同投資組合但是有同樣標的物的話，他們在那個 child erc4626, aka vault 都會佔有股份
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "hardhat/console.sol";


contract RadiantArbitrumVault is ERC4626 {
    IERC20 private immutable _underlying;
    // LendingPool public radiantLending;
    constructor(string memory name_, string memory symbol_, IERC20Metadata underlying_) 
        ERC4626(underlying_)
        ERC20(name_, symbol_) 
    {
        _underlying = underlying_;
        // radiantLending = radiantLending_;
    }
}
