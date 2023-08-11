import "./IAggregationExecutor.sol";
import "./SwapDescription.sol";

interface AggregationRouterV4 {
  /// @notice Performs a swap, delegating all calls encoded in `data` to `caller`. See tests for usage examples
  /// @param caller Aggregation executor that executes calls described in `data`
  /// @param desc Swap description
  /// @param data Encoded calls that `caller` should execute in between of swaps
  /// @return returnAmount Resulting token amount
  /// @return gasLeft Gas left
  function swap(
    IAggregationExecutor caller,
    SwapDescription calldata desc,
    bytes calldata data
  ) external payable returns (uint256 returnAmount, uint256 gasLeft);
}
