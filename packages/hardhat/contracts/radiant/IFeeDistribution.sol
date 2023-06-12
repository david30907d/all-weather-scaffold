// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
pragma abicoder v2;

struct LockedBalance {
	uint256 amount;
	uint256 unlockTime;
	uint256 multiplier;
	uint256 duration;
}

interface IFeeDistribution {
	function lockedBalances(
		address user
	) external view returns (uint256, uint256, uint256, uint256, LockedBalance[] memory);
}