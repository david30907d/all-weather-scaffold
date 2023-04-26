import axios from "axios";
import { usePoller } from "eth-hooks";
import { useState } from "react";

export default function useRebalanceSuggestions(addresses, pollTime = 39999) {
  const [rabalanceSuggestions, setRebalanceSuggestions] = useState([]);
  const loadGasPrice = async () => {
    axios
      .get(`http://127.0.0.1:5000/?addresses=${addresses.addresses.join("+")}`)
      .then(response => {
        const newRebalanceSuggestions = response.data;
        setRebalanceSuggestions(newRebalanceSuggestions);
      })
      .catch(error => console.log(error));
  };

  usePoller(loadGasPrice, pollTime);
  return rabalanceSuggestions;
}
