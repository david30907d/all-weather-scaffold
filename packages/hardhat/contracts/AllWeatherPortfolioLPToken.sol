// SPDX-License-Identifier: MIT
// The code defines a Solidity contract called AllWeatherPortfolioLPToken that inherits from ERC20. It takes in several parameters on construction, including asset, radiantVaultAddr, and dpxVaultAddr. The contract has several functions that do the following:

// deposit: Takes in an amount and transfers tokens of asset from the user to the contract, then distributes the asset into two protocols (DPX and Radiant) based on a portfolioAllocation. The user receives an ERC20 token (AWVLP) in proportion to their deposit.
// redeemAll: Takes in a number of shares and an account, then redeems all DPX LP Tokens and sends them to the account. Only DPX LP tokens are redeemed. The proportion of redeemed tokens is distributed to the sender's ERC20 tokens (AWVLP).
// claimableRewards: Takes in an account, calculates the user's claimable rewards across both protocols and returns them.
// claim: Takes in an account and reward tokens, and claims all the available rewards across both protocols, sending them to the account.
// The code imports several open source libraries and uses various data structures like struct, bytes, and mapping. The SPDX-License-Identifier specifies the license for the code (MIT in this case).

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RadiantArbitrumVault.sol";
import "./DpxArbitrumVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

import "./radiant/IFeeDistribution.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./pendle/IPendleRouter.sol";
import "./vaults/EquilibriaGlpVault.sol";

contract AllWeatherPortfolioLPToken is ERC20, Ownable {
  using SafeERC20 for IERC20;
  struct PortfolioAllocationOfSingleCategory {
    string protocol;
    uint256 percentage;
  }
  struct ClaimableRewardOfAProtocol {
    string protocol;
    IFeeDistribution.RewardData[] claimableRewards;
  }

  IERC20 public immutable asset;
  address public radiantVaultAddr;
  address payable public dpxVaultAddr;
  address public equilibriaVaultAddr;

  PortfolioAllocationOfSingleCategory[] public portfolioAllocation;

  constructor(
    address asset_,
    address radiantVaultAddr_,
    address payable dpxVaultAddr_,
    address equilibriaVaultAddr_
  ) ERC20("AllWeatherVaultLP", "AWVLP") {
    radiantVaultAddr = radiantVaultAddr_;
    dpxVaultAddr = dpxVaultAddr_;
    equilibriaVaultAddr = equilibriaVaultAddr_;
    asset = ERC20(asset_);
  }

  function setVaultAllocations(
    PortfolioAllocationOfSingleCategory[] memory portfolioAllocation_
  ) public onlyOwner {
    uint256 length = portfolioAllocation_.length;

    // Clear existing storage array
    delete portfolioAllocation;

    // Assign each element individually
    for (uint256 i = 0; i < length; i++) {
      portfolioAllocation.push(portfolioAllocation_[i]);
    }
  }

  function deposit(
    uint256 amount,
    bytes calldata oneInchData,
    uint256 minLpOut,
    IPendleRouter.ApproxParams calldata guessPtReceivedFromSy,
    IPendleRouter.TokenInput calldata input
  ) public {
    require(amount > 0, "Token amount must be greater than 0");
    // Transfer tokens from the user to the contract
    SafeERC20.safeTransferFrom(
      IERC20(asset),
      msg.sender,
      address(this),
      amount
    );
    for (uint idx = 0; idx < portfolioAllocation.length; idx++) {
      bytes32 protocolHash = keccak256(
        bytes(portfolioAllocation[idx].protocol)
      );
      uint256 zapInAmountForThisVault = Math.mulDiv(
        amount,
        portfolioAllocation[idx].percentage,
        100
      );
      if (protocolHash == keccak256(bytes("dpx"))) {
        SafeERC20.safeApprove(IERC20(asset), dpxVaultAddr, amount);
        require(
          DpxArbitrumVault(dpxVaultAddr).deposit(
            amount,
            address(this),
            oneInchData
          ) > 0,
          "Buying Dpx LP token failed"
        );
      } else if (protocolHash == keccak256(bytes("radiant-arbitrum"))) {
        SafeERC20.safeApprove(IERC20(asset), radiantVaultAddr, amount);
        require(
          RadiantArbitrumVault(radiantVaultAddr).deposit(
            amount,
            address(this),
            oneInchData
          ) > 0,
          "Buying Radiant LP token failed"
        );
      } else if (protocolHash == keccak256(bytes("radiant-bsc"))) {
        // need li.fi SDK
        // (bool succ, bytes memory data) = address(oneInchAggregatorAddress).call(
        //   oneInchData
        // );
      } else if (protocolHash == keccak256(bytes("equilibria-glp"))) {
        SafeERC20.safeApprove(
          IERC20(asset),
          equilibriaVaultAddr,
          zapInAmountForThisVault
        );
        require(
          EquilibriaGlpVault(equilibriaVaultAddr).deposit(
            zapInAmountForThisVault,
            address(this),
            minLpOut,
            guessPtReceivedFromSy,
            input
          ) > 0,
          "Zap Into Equilibria GLP failed"
        );
      } else {
        revert("Protocol not supported");
      }
    }

    _mint(msg.sender, amount);
    emit Transfer(address(0), msg.sender, amount);
  }

  function redeemAll(
    uint256 shares,
    address receiver,
    IPendleRouter.TokenOutput calldata output
  ) public {
    uint256 dpxShares = Math.mulDiv(
      DpxArbitrumVault(dpxVaultAddr).balanceOf(address(this)),
      shares,
      totalSupply()
    );
    if (dpxShares > 0) {
      DpxArbitrumVault(dpxVaultAddr).redeemAll(dpxShares, receiver);
    }

    uint256 equilibriaGlpShares = Math.mulDiv(
      EquilibriaGlpVault(equilibriaVaultAddr).balanceOf(address(this)),
      shares,
      totalSupply()
    );
    if (equilibriaGlpShares > 0) {
      EquilibriaGlpVault(equilibriaVaultAddr).redeemAll(
        equilibriaGlpShares,
        receiver,
        output
      );
    }
    RadiantArbitrumVault(radiantVaultAddr).redeemAll(shares, receiver);
    _burn(msg.sender, shares);
  }

  function claim(
    address receiver,
    address[] memory rRewardTokens,
    uint256[] memory equilibriaPids
  ) public {
    ClaimableRewardOfAProtocol[]
      memory totalClaimableRewards = claimableRewards(msg.sender);
    for (uint idx = 0; idx < totalClaimableRewards.length; idx++) {
      if (totalClaimableRewards[idx].claimableRewards.length == 0) {
        continue;
      }
      bytes32 protocolHash = keccak256(
        bytes(totalClaimableRewards[idx].protocol)
      );
      if (protocolHash == keccak256(bytes("dpx"))) {
        DpxArbitrumVault(dpxVaultAddr).claim(
          receiver,
          totalClaimableRewards[idx].claimableRewards
        );
      } else if (protocolHash == keccak256(bytes("radiant-arbitrum"))) {
        RadiantArbitrumVault(radiantVaultAddr).claim(
          receiver,
          totalClaimableRewards[idx].claimableRewards,
          rRewardTokens
        );
      } else if (protocolHash == keccak256(bytes("equilibria-glp"))) {
        EquilibriaGlpVault(equilibriaVaultAddr).claim(
          receiver,
          totalClaimableRewards[idx].claimableRewards,
          equilibriaPids
        );
      } else {
        revert("Protocol not supported");
      }
    }
  }

  function claimableRewards(
    address receiver
  ) public view returns (ClaimableRewardOfAProtocol[] memory) {
    uint256 userShares = balanceOf(receiver);
    uint256 portfolioShares = totalSupply();
    if (userShares == 0 || portfolioShares == 0) {
      return new ClaimableRewardOfAProtocol[](0);
    }

    ClaimableRewardOfAProtocol[]
      memory totalClaimableRewards = new ClaimableRewardOfAProtocol[](3);
    totalClaimableRewards[0] = ClaimableRewardOfAProtocol({
      protocol: "dpx",
      claimableRewards: DpxArbitrumVault(dpxVaultAddr).claimableRewards(
        receiver,
        userShares,
        portfolioShares
      )
    });
    totalClaimableRewards[1] = ClaimableRewardOfAProtocol({
      protocol: "radiant-arbitrum",
      claimableRewards: RadiantArbitrumVault(radiantVaultAddr).claimableRewards(
        receiver,
        userShares,
        portfolioShares
      )
    });
    totalClaimableRewards[2] = ClaimableRewardOfAProtocol({
      protocol: "equilibria-glp",
      claimableRewards: EquilibriaGlpVault(equilibriaVaultAddr)
        .claimableRewards(receiver, userShares, portfolioShares)
    });
    return totalClaimableRewards;
  }
}
