// SPDX-License-Identifier: MIT
// 1. LP token has shares of radiant vault
// 2. shoudl have lp token
// 3. all weather vault is erc4626

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "hardhat/console.sol";
import "./RadiantArbitrumVault.sol";


contract AllWeatherPortfolioLPToken is ERC20 {
    IERC20 public immutable underlying;
    mapping(address => uint256) public balances;
    address public radiantVaultAddr;
    constructor(string memory name_, string memory symbol_, address radiantVaultAddr_,  IERC20Metadata underlying_)
        ERC20(name_, symbol_) 
    {
        radiantVaultAddr = radiantVaultAddr_;
        underlying = underlying_;
    }

    function deposit(uint256 amount) public {
        require(amount > 0, "Token amount must be greater than 0");
        // Transfer tokens from the user to the contract
        require(
            underlying.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        underlying.approve(radiantVaultAddr, amount);
        require(
            RadiantArbitrumVault(radiantVaultAddr).deposit(amount, address(this)) > 0,
            "Token transfer failed"
        );

        // Mint tokens to the user making the deposit
        _mint(msg.sender, amount);
        emit Transfer(address(0), msg.sender, amount);
    }
}
