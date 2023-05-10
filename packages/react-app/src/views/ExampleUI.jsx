import React from "react";
import RebalancerWidget from "./Rebalancer";

export default function ExampleUI({
  purpose,
  address,
  addresses,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        <h2>All Weather Portfolio:</h2>
        <RebalancerWidget addresses={Array.from(addresses)} />
      </div>
    </div>
  );
}
