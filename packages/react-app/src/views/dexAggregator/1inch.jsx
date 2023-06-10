import React from "react";
import { utils } from "ethers";

class OneInch extends React.Component {
  handleClick = () => {
    const { chainId, fromTokenAddress, toTokenAddress, amount, fromAddress, slippage, tx, writeContracts } = this.props;
    // The URL here should be the API endpoint you're trying to reach
    const apiUrl = `https://api.1inch.io/v5.0/${chainId}/swap?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}&fromAddress=${fromAddress}&slippage=${slippage}`;

    fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(response => response.json())
      .then(data => {
        tx({
          to: writeContracts.OneInch.address,
          value: utils.parseEther(amount),
          data: data.tx.data,
          gasLimit: 2854077,
        });
      })
      .catch(error => console.error("Error:", error));
  };

  render() {
    return <button onClick={this.handleClick}>Click me!</button>;
  }
}

export default OneInch;
