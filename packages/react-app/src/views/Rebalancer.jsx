import suggestions from "./suggestions.json";
import tokens from "./tokens.json";

const tokenAddressInvertedIndex = Object.entries(tokens.props.pageProps.tokensSymbolsMap["42161"]).reduce(
  (newObject, [address, token]) => {
    newObject[token.toLowerCase()] = address;
    return newObject;
  },
  {},
);
const RebalancerWidget = () => {
  return (
    <div className="ui label">
      {suggestions.map(suggestion_of_single_category => (
        <h2 className="ui header" key={suggestion_of_single_category.category}>
          <i class="money bill alternate icon"></i>
          <div className="content">
            {suggestion_of_single_category.category}:{" "}
            {suggestion_of_single_category.investment_shift_of_this_category.toFixed(2) * 100}%
          </div>
          {suggestion_of_single_category.suggestions_for_positions.map(suggestion => (
            <div class="item" key={suggestion.symbol}>
              <a class="ui tiny image">
                <img src="/images/avatar/large/jenny.jpg"></img>
              </a>
              <div class="content">
                <a class="header">{suggestion.symbol}</a>
                <div class="description">
                  <p>Do this change: ${suggestion.diffrence.toFixed(2)}</p>
                  {suggestion.symbol
                    .split(":")[1]
                    .split("-")
                    .map(token => (
                      // TODO(david): optimize the swap path down the road
                      // in v1 we just simply swap into ETH and then swap into the target token
                      <a
                        class="ui tiny image"
                        href={`https://swap.defillama.com/?chain=arbitrum&from=${
                          tokenAddressInvertedIndex[token.toLowerCase()]
                        }&to=0x0000000000000000000000000000000000000000`}
                      >
                        {token}
                      </a>
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
// console.log(suggestions);
// return (<div class="ui label">
//     {{
//         for (suggestion_of_single_category of suggestions) {
//             <h2 class="ui header" key={suggestion_of_single_category['category']}>
//                 <img class="ui image" src="/images/icons/school.png">
//                 <div class="content">
//                 Learn More
//                 </div>
//             </h2>
//         }
//     }}
// </div>)

export default RebalancerWidget;
