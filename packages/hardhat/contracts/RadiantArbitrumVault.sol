// 每個投資標的都用 etc 4626 vault 去存，例如 convex ohm frax LP,然後他的上層再用一個 portfolio etc 4626 contract 來記錄使用者佔這個投資組合的幾趴。不同投資組合但是有同樣標的物的話，他們在那個 child erc4626, aka vault 都會佔有股份
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "hardhat/console.sol";


contract RadiantArbitrumVault is ERC4626 {
    IERC20 private immutable _underlying;
    constructor(string memory name_, string memory symbol_, IERC20Metadata underlying_) 
        ERC4626(underlying_)
        ERC20(name_, symbol_) 
    {
        _underlying = underlying_;
    }

    /** @dev See {IERC4626-maxDeposit}. */
    function maxDeposit(address) public view virtual override returns (uint256) {
        return type(uint256).max;
    }

    /** @dev See {IERC4626-previewDeposit}. */
    function previewDeposit(uint256 assets) public view virtual override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Down);
    }

    /** @dev See {IERC4626-deposit}. */
    function deposit(uint256 amount, address receiver) public virtual override returns (uint256) {
        console.log("deposit!!");
        require(amount <= maxDeposit(receiver), "ERC4626: deposit more than max");

        uint256 shares = previewDeposit(amount);
        _deposit(_msgSender(), receiver, amount, shares);

        return shares;
    }
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)  internal virtual override {
        // If _asset is ERC777, `transferFrom` can trigger a reentrancy BEFORE the transfer happens through the
        // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, that is triggered after the transfer,
        // calls the vault, which is assumed not malicious.
        //
        // Conclusion: we need to do the transfer before we mint so that any reentrancy would happen before the
        // assets are transferred and before the shares are minted, which is a valid state.
        // slither-disable-next-line reentrancy-no-eth
        console.log(address(_underlying));
        console.log("assets: ", assets);
        console.log("caller()", caller);
        _underlying.transferFrom(caller, address(this), assets);
        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);
    }
}
