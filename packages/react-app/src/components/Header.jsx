import React from "react";
import { Typography } from "antd";

const { Title, Text } = Typography;

// displays a page header

export default function Header({ link, title, subTitle, ...props }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "1.2rem" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "start" }}>
        <a href={link} target="_blank" rel="noopener noreferrer">
          <Title level={4} style={{ margin: "0 0.5rem 0 0" }}>
            {title}
          </Title>
        </a>
        <Text type="secondary" style={{ textAlign: "left" }}>
          {subTitle}
        </Text>
      </div>
      {props.children}
    </div>
  );
}

Header.defaultProps = {
  link: "https://github.com/scaffold-eth/scaffold-eth",
  title: "🏗 Scaffold-Eth",
  subTitle: `Introducing the Web3 All-Weather Index Fund - the smart choice for investors seeking long-term growth and stability in the dynamic world of Web3.\n\n

  Designed by legendary investor Ray Dalio, the All-Weather Portfolio Strategy is a proven investment approach that seeks to deliver steady returns in any market environment. By diversifying across asset classes and using risk parity, the strategy aims to reduce volatility and optimize returns over time.\n\n
  
  Our Web3 All-Weather Index Fund takes this strategy to the next level by focusing on the emerging world of Web3 technologies. By investing in a carefully selected basket of digital assets, including cryptocurrencies, decentralized finance protocols, and blockchain-based platforms, the fund provides exposure to the most exciting opportunities in the Web3 space.\n\n
  
  Whether you're an experienced crypto investor or new to the world of Web3, our fund offers a simple and hassle-free way to gain diversified exposure to this rapidly growing market. With low fees, daily liquidity, and a proven investment strategy, the Web3 All-Weather Index Fund is the perfect choice for investors seeking to capitalize on the potential of Web3 while managing risk and achieving long-term growth.\n\n
  
  Join the Web3 revolution today and invest in the All-Weather Index Fund.
1. 多元分散
2. 被動為主
3. 降低成本
4. 保持恆心
5. 不懂不做`,
};
