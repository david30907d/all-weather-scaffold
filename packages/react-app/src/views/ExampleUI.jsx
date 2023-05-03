import { Button, Card, DatePicker, Divider, Input, Progress, Slider, Switch } from "antd";
import React, { useState, useEffect } from "react";
import { utils, BigNumber } from "ethers";
import { SyncOutlined } from "@ant-design/icons";
import DropdownExampleSearchSelectionTwo from "./TokensSearchDropdown";
import RebalancerWidget from "./Rebalancer";
import { Address, Balance, Events } from "../components";

const getContractEstimatedGas = async (writeContracts, contract, yourLocalBalance, price, address) => {
  const yourLocalBalanceInWei = utils.parseEther(String(utils.formatEther(yourLocalBalance)));
  if (contract === "RadiantDlpLockZap") {
    return await writeContracts.RadiantDlpLockZap.estimateGas.zap(false, 0, 0, 3, {
      value: yourLocalBalanceInWei,
    });
  }
  // else if (contract === "SushiSwapRouter") {
  //   console.log("newDpx", newDpx, "newEth", newEth)
  //   console.log("newDpx", newDpx, "newEth", newEth)
  //   const result = await writeContracts.SushiSwapRouter.estimateGas.addLiquidityETH("0x6c2c06790b3e3e3c38e12ee22f8183b37a13ee55",
  //     utils.parseEther(newDpx),
  //     utils.parseEther(newDpx).mul(995).div(1000),
  //     yourLocalBalanceInWei.mul(995).div(1000),
  //     address,
  //     // +300 means 5 minutes
  //     Math.floor(Date.now() / 1000 + 300), {
  //     value: yourLocalBalanceInWei,
  //   });
  //   console.log("Dpx Gat", result)
  //   return result
  // }
  // else if (contract === "GammaUniproxy") {
  //   return await writeContracts.GammaUniproxy.estimateGas.deposit(
  //     "deposit(uint256,uint256,address,address,uint256[4])",
  //     [
  //       utils.parseEther("1.610492020841471073"),
  //       utils.parseEther("0.000147128809490218"),
  //       address,
  //       // this is Gamma's MAGIC token wallet address
  //       "0x21178dd2ba9caee9df37f2d5f89a097d69fb0a7d",
  //       [0, 0, 0, 0],
  //     ],
  //     {
  //       value: utils.parseEther("0.000147128809490218"),
  //     });
  // }
  else if (contract === "GmxRewardRouterV2") {
    return await writeContracts.GmxRewardRouterV2.estimateGas.mintAndStakeGlpETH(
      0,
      yourLocalBalanceInWei.mul(99).div(100).mul(Math.floor(price)),
      // 1
      {
        value: utils.parseEther(String(utils.formatEther(yourLocalBalance))),
      },
    );
  } else if (contract === "PendleRouter") {
    return await writeContracts.PendleRouter.estimateGas.addLiquiditySingleToken(
      0,
      yourLocalBalanceInWei.mul(99).div(100).mul(Math.floor(price)),
      // 1
      {
        value: yourLocalBalanceInWei,
      },
    );
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
  const [newMagic, setNewMagic] = useState("loading magic...");
  const [radiantGas, setRadiantGas] = useState();
  const [gmxGas, setGmxGas] = useState();
  const [dpxGas, setDpxGas] = useState();
  const [magicGas, setMagicGas] = useState();

  useEffect(() => {
    async function fetchData() {
      const radiantGas = await getContractEstimatedGas(
        writeContracts,
        "RadiantDlpLockZap",
        yourLocalBalance,
        price,
        address,
      );
      setRadiantGas(radiantGas);
      console.log("radiantGas.toNumber()", radiantGas.toNumber());
      const gmxGas = await getContractEstimatedGas(
        writeContracts,
        "GmxRewardRouterV2",
        yourLocalBalance,
        price,
        address,
      );
      setGmxGas(gmxGas);
      const dpxGas = await getContractEstimatedGas(writeContracts, "SushiSwapRouter", yourLocalBalance, price, address);
      setDpxGas(dpxGas);
      const magicGas = await getContractEstimatedGas(writeContracts, "GammaUniproxy", yourLocalBalance, price, address);
      setMagicGas(magicGas);
    }
    if (Object.keys(writeContracts).length !== 0) {
      fetchData();
    }
  }, [yourLocalBalance, writeContracts.RadiantDlpLockZap, writeContracts.GmxRewardRouterV2]);
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
          placeholder="Dpx..."
          onChange={e => {
            setNewDpx(e.target.value);
          }}
        />
        <Button
          onClick={() => {
            tx({
              to: writeContracts.SushiSwapRouter.address,
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
              gasLimit: 1697997,
            });
          }}
        >
          Zap into Sushi Dopex Farm
        </Button>
        <Input
          placeholder="Magic..."
          onChange={e => {
            setNewMagic(e.target.value);
          }}
        />
        <Button
          onClick={() => {
            tx({
              to: writeContracts.GammaUniproxy.address,
              data: writeContracts.GammaUniproxy.interface.encodeFunctionData(
                "deposit(uint256,uint256,address,address,uint256[4])",
                [
                  utils.parseEther(newMagic),
                  utils.parseEther(newEth),
                  address,
                  // this is Gamma's MAGIC token wallet address
                  "0x21178dd2ba9caee9df37f2d5f89a097d69fb0a7d",
                  [0, 0, 0, 0],
                ],
              ),
              gasLimit: gmxGas.toNumber(),
              // gasLimit: magicGas.toNumber(),
            });
          }}
        >
          Zap into Gamma Uniswap Pool
        </Button>
        <Button
          onClick={() => {
            tx({
              to: writeContracts.GmxRewardRouterV2.address,
              value: utils.parseEther(newEth),
              data: writeContracts.GmxRewardRouterV2.interface.encodeFunctionData(
                "mintAndStakeGlpETH(uint256,uint256)",
                [0, utils.parseEther(newEth).mul(99).div(100).mul(Math.floor(price))],
              ),
              gasLimit: gmxGas.toNumber(),
            });
          }}
        >
          Zap into GLP (need to manually zap into Pendle PT GLP Pool)
        </Button>
        <Button
          onClick={() => {
            tx({
              to: writeContracts.PendleRouter.address,
              data:
                // TODO(david): ask people how to pass the correct param for getting hex data
                writeContracts.PendleRouter.interface.encodeFunctionData(
                  "redeemDueInterestAndRewards(address,address[],address[],address[])",
                  [
                    address,
                    [],
                    [],
                    ["0x7d49e5adc0eaad9c027857767638613253ef125f", "0xa0192f6567f8f5dc38c53323235fd08b318d2dca"],
                  ],
                ),
              gasLimit: gmxGas.toNumber(),
            });
          }}
        >
          Claim Pendle Rewards
        </Button>
        <Button
          onClick={() => {
            tx({
              to: writeContracts.SushiSwapMiniChefV2.address,
              data:
                // TODO(david): ask people how to pass the correct param for getting hex data
                writeContracts.SushiSwapMiniChefV2.interface.encodeFunctionData("harvest(uint256,address)", [
                  17,
                  address,
                ]),
              gasLimit: gmxGas.toNumber(),
            });
          }}
        >
          Claim Sushi Dpx Rewards
        </Button>
        <Button
          onClick={() => {
            tx({
              to: writeContracts.Multicall2.address,
              data: writeContracts.Multicall2.interface.encodeFunctionData("aggregate", [
                [
                  {
                    // withdraw Radiant USDT
                    target: writeContracts.RadiantDlpLockZap.address,
                    callData: writeContracts.RadiantDlpLockZap.interface.encodeFunctionData(
                      "zap(bool,uint256,uint256,uint256)",
                      [false, 0, 0, 3],
                    ),
                  },
                ],
              ]),
              gasLimit: 30000000,
            });
          }}
        >
          Claim All Multicall2
        </Button>
        <Button
          onClick={() => {
            tx({
              to: writeContracts.RadiantLendingPool.address,
              data: writeContracts.RadiantLendingPool.interface.encodeFunctionData("withdraw", [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
                address,
              ]),
              gasLimit: 30000000,
            });
          }}
        >
          Claim Radiant USDT
        </Button>
        <Button
          onClick={() => {
            tx({
              to: writeContracts.ArbitrumClaimableReward.address,
              data: writeContracts.ArbitrumClaimableReward.interface.encodeFunctionData("withdrawRadiantLending", [
                "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1",
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
                address,
              ]),
              gasLimit: 30000000,
            });
          }}
        >
          Claim withdrawRadiantLending
        </Button>
        <Button
          onClick={() => {
            const calls = [
              // writeContracts.ArbitrumClaimableReward.interface.encodeFunctionData('getAllRewards', []),
              writeContracts.ArbitrumClaimableReward.interface.encodeFunctionData("claimPendleReward", [
                "0x0000000001E4ef00d069e71d6bA041b0A16F7eA0",
                "0x7D49E5Adc0EAAD9C027857767638613253eF125f",
                "0xa0192f6567f8f5dc38c53323235fd08b318d2dca",
              ]),
              writeContracts.ArbitrumClaimableReward.interface.encodeFunctionData("withdrawRadiantLending", [
                "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1",
                "0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1",
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"],
                BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
                address,
              ]),
            ];
            console.log("calls: ", calls);
            console.log("calls: ", calls);
            console.log("calls: ", calls);
            tx({
              to: writeContracts.ArbitrumClaimableReward.address,
              data:
                // TODO(david): ask people how to pass the correct param for getting hex data
                writeContracts.ArbitrumClaimableReward.interface.encodeFunctionData("multicall", [calls]),
              gasLimit: 30000000,
            });
          }}
        >
          Claim All Multicall (Wrong)
        </Button>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              tx({
                to: writeContracts.RadiantV2Lock.address,
                data:
                  // TODO(david): ask people how to pass the correct param for getting hex data
                  writeContracts.RadiantV2Lock.interface.encodeFunctionData("getAllRewards()", []),
                gasLimit: 30000000,
              });
            }}
          >
            Claim Radiant Rewards
          </Button>
        </div>
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
        </Card>
      </div>
    </div>
  );
}
