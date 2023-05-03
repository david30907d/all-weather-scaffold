// import suggestions from "./suggestions.json";
import tokens from "./tokens.json";
import { useRebalanceSuggestions } from "../hooks";
import RebalanceChart from "./RebalanceChart";
import { Tag } from "antd";

const tokenAddressInvertedIndex = Object.entries(tokens.props.pageProps.tokensSymbolsMap["42161"]).reduce(
  (newObject, [address, token]) => {
    newObject[token.toLowerCase()] = address;
    return newObject;
  },
  {},
);
const tokenAddressToImageInvertedIndex = Object.entries(tokens.props.pageProps.tokenList["42161"]).reduce(
  (newObject, currentObject) => {
    const { symbol, logoURI } = currentObject["1"];
    newObject[symbol.toLowerCase()] = logoURI;
    return newObject;
  },
  {},
);
const RebalancerWidget = addresses => {
  const { rebalanceSuggestions, totalInterest, portfolioApr, sharpeRatio } = useRebalanceSuggestions(addresses);
  const netWorth = rebalanceSuggestions.reduce((acc, curr) => {
    return acc + curr.sum_of_this_category_in_the_portfolio;
  }, 0);

  return (
    <div className="ui label">
      <Tag color="magenta">Net Worth: ${netWorth.toFixed(2)}</Tag>
      <Tag color="magenta">Monthly Interest: ${(totalInterest / 12).toFixed(2)}</Tag>
      <Tag color="magenta">Portfolio APR: {portfolioApr.toFixed(2)}%</Tag>
      <Tag color="magenta">Sharpe Ratio: {sharpeRatio.toFixed(2)}</Tag>
      <RebalanceChart rebalanceSuggestions={rebalanceSuggestions} netWorth={netWorth} />
      {rebalanceSuggestions
        .filter(
          suggestion_of_single_category =>
            suggestion_of_single_category.investment_shift_of_this_category > 0.03 ||
            suggestion_of_single_category.investment_shift_of_this_category < -0.03,
        )
        .map(suggestion_of_single_category => (
          <h2 className="ui header" key={suggestion_of_single_category.category}>
            <i className="money bill alternate icon"></i>
            <div className="content">
              {suggestion_of_single_category.category}:{" "}
              {suggestion_of_single_category.investment_shift_of_this_category.toFixed(2) * 100}%
            </div>
            {suggestion_of_single_category.suggestions_for_positions.map(suggestion => (
              <div className="item" key={suggestion.symbol}>
                <div className="content">
                  <a className="header">{suggestion.symbol}</a>
                  <div className="description">
                    <p>Do this change: ${suggestion.diffrence.toFixed(2)}</p>
                    {suggestion.symbol
                      .split(":")[1]
                      .split("-")
                      .map(token => (
                        // TODO(david): optimize the swap path down the road
                        // in v1 we just simply swap into ETH and then swap into the target token
                        <div key={token}>
                          <a className="ui tiny image">
                            <img src={tokenAddressToImageInvertedIndex[token.toLowerCase()]}></img>
                          </a>
                          <a
                            className="ui tiny image"
                            href={`https://swap.defillama.com/?chain=arbitrum&from=${
                              tokenAddressInvertedIndex[token.toLowerCase()]
                            }&to=0x0000000000000000000000000000000000000000`}
                          >
                            {token}
                          </a>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </h2>
        ))}
    </div>
  );
};

export default RebalancerWidget;
