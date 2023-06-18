// SPDX-License-Identifier: MIT
// 1. LP token has shares of radiant vault
// 2. shoudl have lp token
// 3. all weather vault is erc4626

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "./RadiantArbitrumVault.sol";
import "./radiant/IFeeDistribution.sol";

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
    using SafeERC20 for ERC20;

    IERC20 public immutable asset;
    mapping(address => uint256) public balances;
    address public radiantVaultAddr;
    constructor(string memory name_, string memory symbol_, address radiantVaultAddr_,  address asset_)
        ERC20(name_, symbol_) 
    {
        radiantVaultAddr = radiantVaultAddr_;
        asset = ERC20(asset_);
    }

    function deposit(uint256 amount) public {
        require(amount > 0, "Token amount must be greater than 0");
        // Transfer tokens from the user to the contract
        require(
            asset.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        asset.approve(radiantVaultAddr, amount);
        require(
            RadiantArbitrumVault(radiantVaultAddr).deposit(amount, address(this)) > 0,
            "Buying LP token failed"
        );

        // Mint tokens to the user making the deposit
        _mint(msg.sender, amount);
        emit Transfer(address(0), msg.sender, amount);
    }
    function redeemAll(uint256 _shares, address _receiver) public {
        _burn(msg.sender, _shares);
        RadiantArbitrumVault(radiantVaultAddr).redeemAll(_shares, _receiver);
    }

    function claim(address _receiver, address[] memory _rRewardTokens) public {
        RadiantArbitrumVault(radiantVaultAddr).claim(_receiver, _rRewardTokens);
    }

    function claimableRewards() public view returns (IFeeDistribution.RewardData[] memory rewards) {
        return RadiantArbitrumVault(radiantVaultAddr).claimableRewards(address(this));
    }
}
