import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Interface for CHI gas token
interface IChi is IERC20 {
  function mint(uint256 value) external;

  function free(uint256 value) external returns (uint256 freed);

  function freeFromUpTo(
    address from,
    uint256 value
  ) external returns (uint256 freed);
}

/// @title Interface for calculating CHI discounts
interface IGasDiscountExtension {
  function calculateGas(
    uint256 gasUsed,
    uint256 flags,
    uint256 calldataLength
  ) external view returns (IChi, uint256);
}

/// @title Interface for making arbitrary calls during swap
interface IAggregationExecutor is IGasDiscountExtension {
  /// @notice Make calls on `msgSender` with specified data
  function callBytes(address msgSender, bytes calldata data) external payable; // 0x2636f7f8
}
