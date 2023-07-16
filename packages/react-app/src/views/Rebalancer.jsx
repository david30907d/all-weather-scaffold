// import suggestions from "./suggestions.json";
import { Spin, Row, Col, Button } from "antd";
import { DollarOutlined, FireOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import tokens from "./tokens.json";
import { useRebalanceSuggestions } from "../hooks";
import RebalanceChart from "./RebalanceChart";
import SuggestionsForBetterStableCoins from "./SuggestionsForBetterStableCoins";
import SuggestionsForLPTokens from "./SuggestionsForLPTokens";
import TopNLowestAprPools from "./TopNLowestAprPools";

const tokenAddressInvertedIndex = Object.entries(
  tokens.props.pageProps.tokensSymbolsMap["42161"]
).reduce((newObject, [address, token]) => {
  newObject[token.toLowerCase()] = address;
  return newObject;
}, {});
const tokenAddressToImageInvertedIndex = Object.entries(
  tokens.props.pageProps.tokenList["42161"]
).reduce((newObject, currentObject) => {
  const { symbol, logoURI } = currentObject["1"];
  newObject[symbol.toLowerCase()] = logoURI;
  return newObject;
}, {});

const useWindowHeight = () => {
  const [windowHeight, setWindowHeight] = useState(0); // 視窗高度狀態

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight((window.innerHeight - 75) / 4); // 調整視窗高度並減去 Header 的高度（64）
    };

    window.addEventListener("resize", handleResize); // 監聽視窗大小改變事件

    handleResize(); // 初始化視窗高度

    return () => {
      window.removeEventListener("resize", handleResize); // 移除事件監聽器
    };
  }, []);

  return windowHeight;
};

const RebalancerWidget = (address) => {
  const {
    netWorth,
    rebalanceSuggestions,
    totalInterest,
    portfolioApr,
    topNLowestAprPools,
    topNPoolConsistOfSameLpToken,
    topNStableCoins,
  } = useRebalanceSuggestions(address);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (rebalanceSuggestions && rebalanceSuggestions.length > 0) {
      setIsLoading(false);
    }
  }, [rebalanceSuggestions]);

  const windowHeight = useWindowHeight();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: windowHeight,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Row gutter={[30, 20]} align="center">
        <Col xl={10} md={24} xs={24} align="center">
          <Row gutter={[30, 20]} align="center">
            <Col span={24} align="center">
              <RebalanceChart
                rebalanceSuggestions={rebalanceSuggestions}
                netWorth={netWorth}
              />
            </Col>
            <div
              style={{
                display: "flex",
                width: 375,
                justifyContent: "left",
                padding: 10,
                alignItems: "center",
                height: "100%",
              }}
            >
              <div style={{ position: "relative" }}>
                <div style={{ textAlign: "left", marginBottom: 10 }}>
                  <text style={{ color: "#BEED54", fontSize: 12 }}>
                    All Weather Portfolio
                  </text>
                </div>
                <div style={{ textAlign: "left", marginBottom: 10 }}>
                  <strong style={{ color: "white", fontSize: 26 }}>
                    Net Worth: ${netWorth.toFixed(2)}
                  </strong>
                </div>
                <div style={{ textAlign: "left", marginBottom: 20 }}>
                  <text
                    style={{ color: "white", fontSize: 12, marginRight: 15 }}
                  >
                    Monthly Interest: ${(totalInterest / 12).toFixed(2)}
                  </text>
                  <text style={{ color: "white", fontSize: 12 }}>
                    Portfolio APR: {portfolioApr.toFixed(2)}%
                  </text>
                </div>
                <div style={{ textAlign: "left" }}>
                  <Button
                    style={{
                      color: "white",
                      borderColor: "white",
                      paddingInline: 10,
                      lineHeight: 1,
                      marginRight: 15,
                    }}
                    shape="round"
                    icon={<DollarOutlined />}
                    size="small"
                  >
                    Buy eth
                  </Button>
                  <Button
                    style={{
                      color: "white",
                      borderColor: "white",
                      paddingInline: 10,
                      lineHeight: 1,
                    }}
                    shape="round"
                    icon={<FireOutlined />}
                    size="small"
                  >
                    Gas：12g
                  </Button>
                </div>
              </div>
            </div>
          </Row>
        </Col>
        <Col xl={14} md={24} xs={24} align="center">
          <Row gutter={[30, 20]} align="center">
            <Col xl={12} md={24} xs={24} align="left">
              <TopNLowestAprPools
                wording="TopN Lowest APR Pools"
                topNData={topNLowestAprPools}
                portfolioApr={portfolioApr}
                windowHeight={windowHeight}
              />
            </Col>
            <Col xl={12} md={24} xs={24} align="left">
              <SuggestionsForLPTokens
                wording="Better Pool for LP Tokens"
                topNData={topNPoolConsistOfSameLpToken}
                portfolioApr={portfolioApr}
                windowHeight={windowHeight}
              />
            </Col>
            <Col span={24} align="left">
              <SuggestionsForBetterStableCoins
                wording="Better Stable Coin Pools"
                topNData={topNStableCoins}
                portfolioApr={portfolioApr}
                windowHeight={windowHeight}
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </>
    // {/* <Col span={24} align="center">
    //                 <text style={{ color: "#BEED54", fontSize: 12 }}>All Weather Portfolio</text>
    //             </Col>
    //             <Col span={24} align="center">
    //                 <strong style={{ color: "white", fontSize: 20 }}>Net Worth: ${netWorth.toFixed(2)}</strong>
    //             </Col>
    //             <Col span={12} align="center">
    //                 <text style={{ color: "white", fontSize: 15 }}>Monthly Interest: ${(totalInterest / 12).toFixed(2)}</text>
    //             </Col>
    //             <Col span={12} align="center">
    //                 <text style={{ color: "white", fontSize: 15 }}>Portfolio APR: {portfolioApr.toFixed(2)}%</text>
    //             </Col> */}
    // {/* <Tag color="magenta">Net Worth: ${netWorth.toFixed(2)}</Tag>
    // <Tag color="magenta">Monthly Interest: ${(totalInterest / 12).toFixed(2)}</Tag>
    // <Tag color="magenta">Portfolio APR: {portfolioApr.toFixed(2)}%</Tag> */}

    // <div className="ui label">

    //   {rebalanceSuggestions.map(suggestion_of_single_category => (
    //     <h2 className="ui header" key={suggestion_of_single_category.category}>
    //       {suggestion_of_single_category.suggestions_for_positions.filter(
    //         suggestion => suggestion.difference > 0 || suggestion.difference < 0,
    //       ).length > 0 && (
    //         <div className="content">
    //           <i className="money bill alternate icon"></i>
    //           {suggestion_of_single_category.category}:{" "}
    //           {suggestion_of_single_category.investment_shift_of_this_category.toFixed(2) * 100}%
    //         </div>
    //       )}
    //       {suggestion_of_single_category.suggestions_for_positions
    //         .filter(suggestion => suggestion.difference > 0 || suggestion.difference < 0)
    //         .map(suggestion => (
    //           <div className="item" key={suggestion.symbol}>
    //             <div className="content">
    //               <div className="header">
    //                 {suggestion.symbol}: ${suggestion.balanceUSD.toFixed(2)}
    //               </div>
    //               <div className="description">
    //                 <p>Do this change: ${suggestion.difference.toFixed(2)}</p>
    //                 {suggestion.symbol
    //                   .split(":")[1]
    //                   .split("-")
    //                   .map(token => (
    //                     // TODO(david): optimize the swap path down the road
    //                     // in v1 we just simply swap into ETH and then swap into the target token
    //                     <div key={token}>
    //                       <a className="ui tiny image" href={tokenAddressToImageInvertedIndex[token.toLowerCase()]}>
    //                         <img src={tokenAddressToImageInvertedIndex[token.toLowerCase()]} alt={token}></img>
    //                       </a>
    //                       <a
    //                         className="ui tiny image"
    //                         href={`https://swap.defillama.com/?chain=arbitrum&from=${
    //                           tokenAddressInvertedIndex[token.toLowerCase()]
    //                         }&to=0x0000000000000000000000000000000000000000`}
    //                       >
    //                         {token}
    //                       </a>
    //                     </div>
    //                   ))}
    //               </div>
    //             </div>
    //           </div>
    //         ))}
    //     </h2>
    //   ))}
    // </div>
  );
};

export default RebalancerWidget;
