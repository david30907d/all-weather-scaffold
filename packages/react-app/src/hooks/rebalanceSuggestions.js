import axios from "axios";
import { usePoller } from "eth-hooks";
import { useState } from "react";

export default function useRebalanceSuggestions(addresses, pollTime = 39999) {
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState([]);
  const [totalInterest, setTotalInterest] = useState([]);
  const [portfolioApr, setPortfolioApr] = useState([]);
  const [sharpeRatio, setSharpeRatio] = useState([]);
  const loadSuggestions = async () => {
    axios
      .get(`http://0.0.0.0:3001/?addresses=${addresses.addresses.join("+")}`)
      .then(response => {
        const newRebalanceSuggestions = response.data.suggestions;
        setRebalanceSuggestions(newRebalanceSuggestions);
        const totalInterest = response.data.total_interest;
        setTotalInterest(totalInterest);
        const portfolioApr = response.data.portfolio_apr;
        setPortfolioApr(portfolioApr);
        const sharpeRatio = response.data.sharpe_ratio;
        setSharpeRatio(sharpeRatio);
      })
      .catch(error => console.log(error));
  };

  usePoller(loadSuggestions, pollTime);
  return {
    rebalanceSuggestions,
    totalInterest,
    portfolioApr,
    sharpeRatio,
  };
}
