// SPDX-License-Identifier: MIT

interface ICloneRewarderTime {
    function pendingToken(uint256 pid, address user) external view returns (uint256);
}
