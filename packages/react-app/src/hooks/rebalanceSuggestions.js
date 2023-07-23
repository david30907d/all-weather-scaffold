import axios from "axios";
import { usePoller } from "eth-hooks";
import { useState } from "react";
const API_URL = process.env.REACT_APP_API_URL;
export default function useRebalanceSuggestions(address, pollTime = 300000) {
  const [netWorth, setNetWorth] = useState(0);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState([]);
  const [totalInterest, setTotalInterest] = useState(0);
  const [portfolioApr, setPortfolioApr] = useState(0);
  const [sharpeRatio, setSharpeRatio] = useState(0);
  const [topNLowestAprPools, setTopNLowestAprPools] = useState([]);
  const [topNPoolConsistOfSameLpToken, setTopNPoolConsistOfSameLpToken] =
    useState([]);
  const [topNStableCoins, setTopNStableCoins] = useState([]);
  const loadSuggestions = async () => {
    await axios
      .get(`${API_URL}/addresses?addresses=${address}`)
      .then((response) => {
        const newNetWorth = response.data.net_worth;
        setNetWorth(newNetWorth);
        const newRebalanceSuggestions = response.data.suggestions;
        setRebalanceSuggestions(newRebalanceSuggestions);
        const totalInterest = response.data.total_interest;
        setTotalInterest(totalInterest);
        const portfolioApr = response.data.portfolio_apr;
        setPortfolioApr(portfolioApr);
        const sharpeRatio = response.data.sharpe_ratio;
        setSharpeRatio(sharpeRatio);
        const topNLowestAprPools = response.data.top_n_lowest_apr_pools;
        setTopNLowestAprPools(topNLowestAprPools);
        const topNPoolConsistOfSameLpToken =
          response.data.top_n_pool_consist_of_same_lp_token;
        setTopNPoolConsistOfSameLpToken(topNPoolConsistOfSameLpToken);
        const topNStableCoins = response.data.topn_stable_coins;
        setTopNStableCoins(topNStableCoins);
      })
      .catch((error) => console.log(error));
  };

  usePoller(loadSuggestions, pollTime);
  return {
    netWorth,
    rebalanceSuggestions,
    totalInterest,
    portfolioApr,
    sharpeRatio,
    topNLowestAprPools,
    topNPoolConsistOfSameLpToken,
    topNStableCoins,
  };
}
