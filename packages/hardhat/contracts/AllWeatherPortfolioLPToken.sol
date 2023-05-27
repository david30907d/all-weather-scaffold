// SPDX-License-Identifier: MIT
// 1. LP token has shares of radiant vault
// 2. shoudl have lp token
// 3. all weather vault is erc4626

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "hardhat/console.sol";
import "./RadiantArbitrumVault.sol";

interface IArbitrumUniswap {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

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
            "Buying LP token failed"
        );

        // Mint tokens to the user making the deposit
        _mint(msg.sender, amount);
        emit Transfer(address(0), msg.sender, amount);
    }

    // function swapTokens(
    //     address tokenIn,
    //     address tokenOut,
    //     uint256 amountIn,
    //     uint256 amountOutMin,
    //     uint256 deadline
    // ) external {
    //     address[] memory path = new address[](2);
    //     path[0] = tokenIn;
    //     path[1] = tokenOut;

    //     IArbitrumUniswap arbitrumUniswap = IArbitrumUniswap(arbitrumUniswapAddress);

    //     // Approve the router to spend the input token
    //     // Make sure you have already approved the contract to spend the tokens
    //     // using tokenIn.approve(contractAddress, amountIn) before calling this function
    //     // or include the approval functionality in this contract.
    //     // For simplicity, we assume the approval has been done separately.

    //     // Call the swap function
    //     arbitrumUniswap.swapExactTokensForTokens(
    //         amountIn,
    //         amountOutMin,
    //         path,
    //         address(this),
    //         deadline
    //     );
    // }
}
