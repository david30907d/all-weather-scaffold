// import { Button, Divider, Input } from "antd";
// import React, { useState, useEffect } from "react";
// import { utils } from "ethers";
// import DropdownExampleSearchSelectionTwo from "./TokensSearchDropdown";
// import { Events } from "../components";

// const getContractEstimatedGas = async (writeContracts, contract, yourLocalBalance, price, address) => {
//   const yourLocalBalanceInWei = utils.parseEther(String(utils.formatEther(yourLocalBalance)));
//   if (contract === "RadiantDlpLockZap") {
//     return await writeContracts.RadiantDlpLockZap.estimateGas.zap(false, 0, 0, 3, {
//       value: yourLocalBalanceInWei,
//     });
//   } else if (contract === "SushiSwapRouter") {
//     console.log("Dpx Gat start");
//     const result = await writeContracts.SushiSwapRouter.estimateGas.addLiquidityETH(
//       "0x6c2c06790b3e3e3c38e12ee22f8183b37a13ee55",
//       utils.parseEther("0.01257767156"),
//       utils.parseEther("0.01257767156").mul(995).div(1000),
//       utils.parseEther("0.00075238").mul(995).div(1000),
//       address,
//       // +300 means 5 minutes
//       Math.floor(Date.now() / 1000 + 300),
//       {
//         value: utils.parseEther("0.00075238"),
//       },
//     );
//     console.log("Dpx Gat", result);
//     return result;
//   }
//   // else if (contract === "GammaUniproxy") {
//   //   return await writeContracts.GammaUniproxy.estimateGas.deposit(
//   //     "deposit(uint256,uint256,address,address,uint256[4])",
//   //     [
//   //       utils.parseEther("1.610492020841471073"),
//   //       utils.parseEther("0.000147128809490218"),
//   //       address,
//   //       // this is Gamma's MAGIC token wallet address
//   //       "0x21178dd2ba9caee9df37f2d5f89a097d69fb0a7d",
//   //       [0, 0, 0, 0],
//   //     ],
//   //     {
//   //       value: utils.parseEther("0.000147128809490218"),
//   //     });
//   // }
//   else if (contract === "GmxRewardRouterV2") {
//     return await writeContracts.GmxRewardRouterV2.estimateGas.mintAndStakeGlpETH(
//       0,
//       yourLocalBalanceInWei.mul(99).div(100).mul(Math.floor(price)),
//       // 1
//       {
//         value: utils.parseEther(String(utils.formatEther(yourLocalBalance))),
//       },
//     );
//   } else if (contract === "PendleRouter") {
//     return await writeContracts.PendleRouter.estimateGas.addLiquiditySingleToken(
//       0,
//       yourLocalBalanceInWei.mul(99).div(100).mul(Math.floor(price)),
//       // 1
//       {
//         value: yourLocalBalanceInWei,
//       },
//     );
//   }
// };

// export default function WipUI({
//   purpose,
//   address,
//   addresses,
//   mainnetProvider,
//   localProvider,
//   yourLocalBalance,
//   price,
//   tx,
//   readContracts,
//   writeContracts,
// }) {
//   const [newRadiantEth, setNewRadiantEth] = useState("loading eth...");
//   const [newDpx, setNewDpx] = useState("loading dpx...");
//   const [newDpxEth, setNewDpxEth] = useState("loading dpx eth...");
//   const [newMagic, setNewMagic] = useState("loading magic...");
//   const [newMagicEth, setNewMagicEth] = useState("loading magic eth...");
//   const [newGlpEth, setNewGlpEth] = useState("loading glp eth...");

//   // Gas
//   const [radiantGas, setRadiantGas] = useState();
//   const [gmxGas, setGmxGas] = useState();
//   const [dpxGas, setDpxGas] = useState();

//   useEffect(() => {
//     async function fetchData() {
//       const radiantGas = await getContractEstimatedGas(
//         writeContracts,
//         "RadiantDlpLockZap",
//         yourLocalBalance,
//         price,
//         address,
//       );
//       setRadiantGas(radiantGas);
//       console.log("radiantGas.toNumber()", radiantGas.toNumber());
//       const gmxGas = await getContractEstimatedGas(
//         writeContracts,
//         "GmxRewardRouterV2",
//         yourLocalBalance,
//         price,
//         address,
//       );
//       setGmxGas(gmxGas);
//       const dpxGas = await getContractEstimatedGas(writeContracts, "SushiSwapRouter", yourLocalBalance, price, address);
//       setDpxGas(dpxGas);
//     }
//     if (Object.keys(writeContracts).length !== 0) {
//       fetchData();
//     }
//   }, [yourLocalBalance, writeContracts.RadiantDlpLockZap, writeContracts.GmxRewardRouterV2]);
//   return (
//     <div>
//       {/*
//         ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
//       */}
//       <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
//         <h2>All Weather Portfolio:</h2>
//         <div>
//           <img
//             src="https://icons.llamao.fi/icons/tokens/1/0x0000000000000000000000000000000000000000?h=20&w=20"
//             alt="Eth"
//             width="20"
//             height="20"
//           />
//           <Input
//             onChange={e => {
//               setNewRadiantEth(e.target.value);
//             }}
//           />
//           <Button
//             placeholder="Eth..."
//             onClick={() => {
//               tx({
//                 to: writeContracts.RadiantDlpLockZap.address,
//                 value: utils.parseEther(newRadiantEth),
//                 data: writeContracts.RadiantDlpLockZap.interface.encodeFunctionData(
//                   "zap(bool,uint256,uint256,uint256)",
//                   [false, 0, 0, 3],
//                 ),
//                 // TODO(david): figure out how to set the correct gas limit
//                 gasLimit: radiantGas.toNumber(),
//               });
//             }}
//           >
//             Zap into Arb Radiant DLP
//           </Button>
//         </div>
//         <div>
//           <img
//             src="https://icons.llamao.fi/icons/tokens/1/0xeec2be5c91ae7f8a338e1e5f3b5de49d07afdc81?h=20&w=20"
//             alt="Dpx"
//             width="20"
//             height="20"
//           />
//           <Input
//             placeholder="Dpx..."
//             onChange={e => {
//               setNewDpx(e.target.value);
//             }}
//           />
//           <img
//             src="https://icons.llamao.fi/icons/tokens/1/0x0000000000000000000000000000000000000000?h=20&w=20"
//             alt="Eth"
//             width="20"
//             height="20"
//           />
//           <Input
//             placeholder="Eth..."
//             onChange={e => {
//               setNewDpxEth(e.target.value);
//             }}
//           />
//           <Button
//             onClick={() => {
//               tx({
//                 to: writeContracts.SushiSwapRouter.address,
//                 data: writeContracts.SushiSwapRouter.interface.encodeFunctionData(
//                   "addLiquidityETH(address,uint256,uint256,uint256,address,uint256)",
//                   [
//                     "0x6c2c06790b3e3e3c38e12ee22f8183b37a13ee55",
//                     utils.parseEther(newDpx),
//                     utils.parseEther(newDpx).mul(995).div(1000),
//                     utils.parseEther(newDpxEth).mul(995).div(1000),
//                     address,
//                     // +300 means 5 minutes
//                     Math.floor(Date.now() / 1000 + 300),
//                   ],
//                 ),
//                 value: utils.parseEther(newDpxEth),
//                 // gasLimit: 1697997,
//                 gasLimit: dpxGas.toNumber(),
//               });
//             }}
//           >
//             Zap into Sushi Dopex Farm
//           </Button>
//         </div>
//         <div>
//           <img
//             src="https://icons.llamao.fi/icons/tokens/1/0xb0c7a3ba49c7a6eaba6cd4a96c55a1391070ac9a?h=20&w=20"
//             alt="Magic"
//             width="20"
//             height="20"
//           />
//           <Input
//             placeholder="Magic..."
//             onChange={e => {
//               setNewMagic(e.target.value);
//             }}
//           />
//           <img
//             src="https://icons.llamao.fi/icons/tokens/1/0x0000000000000000000000000000000000000000?h=20&w=20"
//             alt="Eth"
//             width="20"
//             height="20"
//           />
//           <Input
//             placeholder="Eth..."
//             onChange={e => {
//               setNewMagicEth(e.target.value);
//             }}
//           />
//           <Button
//             onClick={() => {
//               tx({
//                 to: writeContracts.GammaUniproxy.address,
//                 data: writeContracts.GammaUniproxy.interface.encodeFunctionData(
//                   "deposit(uint256,uint256,address,address,uint256[4])",
//                   [
//                     utils.parseEther(newMagic),
//                     utils.parseEther(newMagicEth),
//                     address,
//                     // this is Gamma's MAGIC token wallet address
//                     "0x21178dd2ba9caee9df37f2d5f89a097d69fb0a7d",
//                     [0, 0, 0, 0],
//                   ],
//                 ),
//                 gasLimit: gmxGas.toNumber(),
//               });
//             }}
//           >
//             Zap into Gamma Uniswap Pool
//           </Button>
//         </div>
//         <div>
//           <img
//             src="https://icons.llamao.fi/icons/tokens/1/0x0000000000000000000000000000000000000000?h=20&w=20"
//             alt="Eth"
//             width="20"
//             height="20"
//           />
//           <Input
//             placeholder="Eth..."
//             onChange={e => {
//               setNewGlpEth(e.target.value);
//             }}
//           />
//           <Button
//             onClick={() => {
//               tx({
//                 to: writeContracts.GmxRewardRouterV2.address,
//                 value: utils.parseEther(newGlpEth),
//                 data: writeContracts.GmxRewardRouterV2.interface.encodeFunctionData(
//                   "mintAndStakeGlpETH(uint256,uint256)",
//                   [0, utils.parseEther(newGlpEth).mul(99).div(100).mul(Math.floor(price))],
//                 ),
//                 gasLimit: gmxGas.toNumber(),
//               });
//             }}
//           >
//             Zap into GLP (need to manually zap into Pendle PT GLP Pool)
//           </Button>
//         </div>
//         <DropdownExampleSearchSelectionTwo />
//         <Divider />

//         {/*
//         📑 Maybe display a list of events?
//           (uncomment the event and emit line in YourContract.sol! )
//       */}
//         <Events
//           contracts={readContracts}
//           contractName="YourContract"
//           eventName="SetPurpose"
//           localProvider={localProvider}
//           mainnetProvider={mainnetProvider}
//           startBlock={1}
//         />
//       </div>
//     </div>
//   );
// }
