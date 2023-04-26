import axios from "axios";
import { usePoller } from "eth-hooks";
import { useState } from "react";

export default function useRebalanceSuggestions(targetNetwork, speed, pollTime = 39999) {
  const [rabalanceSuggestions, setRebalanceSuggestions] = useState([]);
  const loadGasPrice = async () => {
    axios
      .get(
        "http://127.0.0.1:5000/?addresses=0xe4bAc3e44E8080e1491C11119197D33E396EA82B+0x43cd745Bd5FbFc8CfD79ebC855f949abc79a1E0C+0x43cd745Bd5FbFc8CfD79ebC855f949abc79a1E0C",
      )
      .then(response => {
        const newRebalanceSuggestions = response.data;
        setRebalanceSuggestions(newRebalanceSuggestions);
      })
      .catch(error => console.log(error));
  };

  usePoller(loadGasPrice, 39999);
  return rabalanceSuggestions;
}
