import { Button, Card, DatePicker, Divider, Input, Progress, Slider, Spin, Switch } from "antd";
import React, { useState, useEffect } from "react";
import { utils, BigNumber } from "ethers";
import { SyncOutlined } from "@ant-design/icons";
import DropdownExampleSearchSelectionTwo from "./TokensSearchDropdown";
import RebalancerWidget from "./Rebalancer";
import { Address, Balance, Events } from "../components";

const getContractEstimatedGas = async (writeContracts, contract, yourLocalBalance) => {
  if (contract === "RadiantDlpLockZap") {
    return await writeContracts.RadiantDlpLockZap.estimateGas.zap(false, 0, 0, 3, {
      value: utils.parseEther(String(utils.formatEther(yourLocalBalance))),
    });
  }
};

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
  const [newPurpose, setNewPurpose] = useState("loading...");
  const [newEth, setNewEth] = useState("loading eth...");
  const [newBnb, setNewBnb] = useState("loading bnb...");
  const [newDpx, setNewDpx] = useState("loading dpx...");
  const [radiantGas, setRadiantGas] = useState();

  useEffect(() => {
    async function fetchData() {
      const radiantGas = await getContractEstimatedGas(writeContracts, "RadiantDlpLockZap", yourLocalBalance);
      setRadiantGas(radiantGas);
    }
    if (Object.keys(writeContracts).length !== 0) {
      fetchData();
    }
  }, [writeContracts.RadiantDlpLockZap, yourLocalBalance]);
  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        <h2>All Weather Portfolio:</h2>
        <Input
          onChange={e => {
            setNewEth(e.target.value);
          }}
        />
        <Button
          onClick={() => {
            tx({
              to: writeContracts.RadiantDlpLockZap.address,
              value: utils.parseEther(newEth),
              data: writeContracts.RadiantDlpLockZap.interface.encodeFunctionData("zap(bool,uint256,uint256,uint256)", [
                false,
                0,
                0,
                3,
              ]),
              // TODO(david): figure out how to set the correct gas limit
              gasLimit: radiantGas.toNumber(),
            });
          }}
        >
          Zap into Arb Radiant DLP
        </Button>
        <Input
          onChange={e => {
            setNewBnb(e.target.value);
          }}
        />
        <Button
          onClick={() => {
            tx({
              to: writeContracts.RadiantDlpLockZap.address,
              value: utils.parseEther(newBnb),
              data: writeContracts.RadiantDlpLockZap.interface.encodeFunctionData("zap(bool,uint256,uint256,uint256)", [
                false,
                0,
                0,
                3,
              ]),
            });
          }}
        >
          Zap into BNB Radiant DLP
        </Button>
        <Input
          onChange={e => {
            setNewDpx(e.target.value);
          }}
        />
        <Input
          onChange={e => {
            setNewBnb(e.target.value);
          }}
        />
        <Button
          onClick={() => {
            tx({
              to: writeContracts.SushiSwapRouter.address,
              value: utils.parseEther(newEth),
              data: writeContracts.SushiSwapRouter.interface.encodeFunctionData(
                "addLiquidityETH(address,uint256,uint256,uint256,address,uint256)",
                [
                  "0x6c2c06790b3e3e3c38e12ee22f8183b37a13ee55",
                  utils.parseEther(newDpx),
                  utils.parseEther(newDpx).mul(995).div(1000),
                  utils.parseEther(newEth).mul(995).div(1000),
                  address,
                  // +300 means 5 minutes
                  Math.floor(Date.now() / 1000 + 300),
                ],
              ),
            });
          }}
        >
          Zap into Sushi Dopex Farm
        </Button>
        <Button
          onClick={() => {
            tx({
              to: writeContracts.GammaUniproxy.address,
              value: utils.parseEther(newEth),
              data: writeContracts.GammaUniproxy.interface.encodeFunctionData(
                "deposit(uint256,uint256,address,address,uint256[4])",
                [
                  utils.parseEther(newDpx),
                  utils.parseEther(newEth),
                  address,
                  // this is Gamma's MAGIC token wallet address
                  "0x21178dd2ba9caee9df37f2d5f89a097d69fb0a7d",
                  [0, 0, 0, 0],
                ],
              ),
            });
          }}
        >
          Zap into Gamma Uniswap Pool
        </Button>
        <h4>purpose: {purpose}</h4>
        <RebalancerWidget addresses={Array.from(addresses)} />
        <DropdownExampleSearchSelectionTwo />
        <Divider />
        <div style={{ margin: 8 }}>
          <Input
            onChange={e => {
              setNewPurpose(e.target.value);
            }}
          />
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              /* look how you call setPurpose on your contract: */
              /* notice how you pass a call back for tx updates too */
              const result = tx(writeContracts.YourContract.setPurpose(newPurpose), update => {
                console.log("📡 Transaction Update:", update);
                if (update && (update.status === "confirmed" || update.status === 1)) {
                  console.log(" 🍾 Transaction " + update.hash + " finished!");
                  console.log(
                    " ⛽️ " +
                      update.gasUsed +
                      "/" +
                      (update.gasLimit || update.gas) +
                      " @ " +
                      parseFloat(update.gasPrice) / 1000000000 +
                      " gwei",
                  );
                }
              });
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Set Purpose!
          </Button>
        </div>
        <Divider />
        Your Address:
        <Address address={address} ensProvider={mainnetProvider} fontSize={16} />
        <Divider />
        ENS Address Example:
        <Address
          address="0x34aA3F359A9D614239015126635CE7732c18fDF3" /* this will show as austingriffith.eth */
          ensProvider={mainnetProvider}
          fontSize={16}
        />
        <Divider />
        {/* use utils.formatEther to display a BigNumber: */}
        <h2>Your Balance: {yourLocalBalance ? utils.formatEther(yourLocalBalance) : "..."}</h2>
        <div>OR</div>
        <Balance address={address} provider={localProvider} price={price} />
        <Divider />
        <div>🐳 Example Whale Balance:</div>
        <Balance balance={utils.parseEther("1000")} provider={localProvider} price={price} />
        <Divider />
        {/* use utils.formatEther to display a BigNumber: */}
        <h2>Your Balance: {yourLocalBalance ? utils.formatEther(yourLocalBalance) : "..."}</h2>
        <Divider />
        Your Contract Address:
        <Address
          address={readContracts && readContracts.YourContract ? readContracts.YourContract.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        />
        <Divider />
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /* look how you call setPurpose on your contract: */
              tx(writeContracts.RadiantChefIncentivesController.claimAll(address));
            }}
          >
            Claim Radiant Rewards
          </Button>
        </div>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /*
              you can also just craft a transaction and send it to the tx() transactor
              here we are sending value straight to the contract's address:
            */
              tx({
                to: writeContracts.YourContract.address,
                value: utils.parseEther("0.001"),
              });
              /* this should throw an error about "no fallback nor receive function" until you add it */
            }}
          >
            Send Value
          </Button>
        </div>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /* look how we call setPurpose AND send some value along */
              tx(
                writeContracts.YourContract.setPurpose("💵 Paying for this one!", {
                  value: utils.parseEther("0.001"),
                }),
              );
              /* this will fail until you make the setPurpose function payable */
            }}
          >
            Set Purpose With Value
          </Button>
        </div>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /* you can also just craft a transaction and send it to the tx() transactor */
              tx({
                to: writeContracts.YourContract.address,
                value: utils.parseEther("0.001"),
                data: writeContracts.YourContract.interface.encodeFunctionData("setPurpose(string)", [
                  "🤓 Whoa so 1337!",
                ]),
              });
              /* this should throw an error about "no fallback nor receive function" until you add it */
            }}
          >
            Another Example
          </Button>
        </div>
      </div>

      {/*
        📑 Maybe display a list of events?
          (uncomment the event and emit line in YourContract.sol! )
      */}
      <Events
        contracts={readContracts}
        contractName="YourContract"
        eventName="SetPurpose"
        localProvider={localProvider}
        mainnetProvider={mainnetProvider}
        startBlock={1}
      />

      <div style={{ width: 600, margin: "auto", marginTop: 32, paddingBottom: 256 }}>
        <Card>
          Check out all the{" "}
          <a
            href="https://github.com/austintgriffith/scaffold-eth/tree/master/packages/react-app/src/components"
            target="_blank"
            rel="noopener noreferrer"
          >
            📦 components
          </a>
        </Card>

        <Card style={{ marginTop: 32 }}>
          <div>
            There are tons of generic components included from{" "}
            <a href="https://ant.design/components/overview/" target="_blank" rel="noopener noreferrer">
              🐜 ant.design
            </a>{" "}
            too!
          </div>

          <div style={{ marginTop: 8 }}>
            <Button type="primary">Buttons</Button>
          </div>

          <div style={{ marginTop: 8 }}>
            <SyncOutlined spin /> Icons
          </div>

          <div style={{ marginTop: 8 }}>
            Date Pickers?
            <div style={{ marginTop: 2 }}>
              <DatePicker onChange={() => {}} />
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <Slider range defaultValue={[20, 50]} onChange={() => {}} />
          </div>

          <div style={{ marginTop: 32 }}>
            <Switch defaultChecked onChange={() => {}} />
          </div>

          <div style={{ marginTop: 32 }}>
            <Progress percent={50} status="active" />
          </div>

          <div style={{ marginTop: 32 }}>
            <Spin />
          </div>
        </Card>
      </div>
    </div>
  );
}
