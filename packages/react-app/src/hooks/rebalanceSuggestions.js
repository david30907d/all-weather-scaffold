import axios from "axios";
import { usePoller } from "eth-hooks";
import { useState } from "react";

export default function useRebalanceSuggestions(addresses, pollTime = 39999) {
  const [rabalanceSuggestions, setRebalanceSuggestions] = useState([]);
  const loadSuggestions = async () => {
    axios
      .get(`http://0.0.0.0:3001/?addresses=${addresses.addresses.join("+")}`)
      .then(response => {
        const newRebalanceSuggestions = response.data;
        setRebalanceSuggestions(newRebalanceSuggestions);
      })
      .catch(error => console.log(error));
  };

  usePoller(loadSuggestions, pollTime);
  return rabalanceSuggestions;
}
