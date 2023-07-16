import { Affix, Button } from "antd";
import { MessageFilled } from "@ant-design/icons";
import React from "react";
import RebalancerWidget from "./Rebalancer";
import OneInch from "./dexAggregator/1inch";
export default function ExampleUI({
  chainId,
  purpose,
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  return (
    <div style={{ padding: 30 }}>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      {/* <OneInch
        chainId={chainId}
        // fromTokenAddress="0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
        // fromTokenAddress="0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        fromTokenAddress="0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55"
        toTokenAddress="0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
        amount="10000000000000"
        // TODO(david): somehow cannot get the correct address
        // fromAddress={address}
        fromAddress="0x7EE54ab0f204bb3A83DF90fDd824D8b4abE93222"
        slippage="1"
        tx={tx}
        writeContracts={writeContracts}
      /> */}

      <RebalancerWidget address={address} />
      <Affix style={{ position: "fixed", bottom: "20px", right: "20px" }}>
        <Button
          shape="circle"
          size="large"
          icon={<MessageFilled style={{ color: "white" }} />}
          style={{ backgroundColor: "#5C7724", borderColor: "#5C7724" }}
        />
      </Affix>
    </div>
  );
}
