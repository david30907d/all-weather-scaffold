// import suggestions from "./suggestions.json";
import tokens from "./tokens.json";
import { useRebalanceSuggestions } from "../hooks";
import RebalanceChart from "./RebalanceChart";
import SuggestionsForBetterStableCoins from "./SuggestionsForBetterStableCoins";
import SuggestionsForLPTokens from "./SuggestionsForLPTokens";
import TopNLowestAprPools from "./TopNLowestAprPools";
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
  const {
    netWorth,
    rebalanceSuggestions,
    totalInterest,
    portfolioApr,
    topNLowestAprPools,
    topNPoolConsistOfSameLpToken,
    topNStableCoins,
  } = useRebalanceSuggestions(addresses);

  return (
    <div className="ui label">
      <Tag color="magenta">Net Worth: ${netWorth.toFixed(2)}</Tag>
      <Tag color="magenta">Monthly Interest: ${(totalInterest / 12).toFixed(2)}</Tag>
      <Tag color="magenta">Portfolio APR: {portfolioApr.toFixed(2)}%</Tag>
      <RebalanceChart rebalanceSuggestions={rebalanceSuggestions} netWorth={netWorth} />
      <TopNLowestAprPools wording="TopN Lowest APR Pools" topNData={topNLowestAprPools} portfolioApr={portfolioApr} />
      <SuggestionsForLPTokens
        wording="Better Pool for LP Tokens"
        topNData={topNPoolConsistOfSameLpToken}
        portfolioApr={portfolioApr}
      />
      <SuggestionsForBetterStableCoins
        wording="Better Stable Coin Pools"
        topNData={topNStableCoins}
        portfolioApr={portfolioApr}
      />
      {rebalanceSuggestions.map(suggestion_of_single_category => (
        <h2 className="ui header" key={suggestion_of_single_category.category}>
          {suggestion_of_single_category.suggestions_for_positions.filter(
            suggestion => suggestion.difference > 0 || suggestion.difference < 0,
          ).length > 0 && (
            <div className="content">
              <i className="money bill alternate icon"></i>
              {suggestion_of_single_category.category}:{" "}
              {suggestion_of_single_category.investment_shift_of_this_category.toFixed(2) * 100}%
            </div>
          )}
          {suggestion_of_single_category.suggestions_for_positions
            .filter(suggestion => suggestion.difference > 0 || suggestion.difference < 0)
            .map(suggestion => (
              <div className="item" key={suggestion.symbol}>
                <div className="content">
                  <div className="header">
                    {suggestion.symbol}: ${suggestion.balanceUSD.toFixed(2)}
                  </div>
                  <div className="description">
                    <p>Do this change: ${suggestion.difference.toFixed(2)}</p>
                    {suggestion.symbol
                      .split(":")[1]
                      .split("-")
                      .map(token => (
                        // TODO(david): optimize the swap path down the road
                        // in v1 we just simply swap into ETH and then swap into the target token
                        <div key={token}>
                          <a className="ui tiny image" href={tokenAddressToImageInvertedIndex[token.toLowerCase()]}>
                            <img src={tokenAddressToImageInvertedIndex[token.toLowerCase()]} alt={token}></img>
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
