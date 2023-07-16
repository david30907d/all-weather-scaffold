import { Tag } from "antd";
export const getColumnsForSuggestionsTable = (portfolioAPR) => [
  {
    title: "Chain",
    dataIndex: "chain",
    key: "chain",
    width: 24,
  },
  {
    title: "Pool",
    dataIndex: "pool",
    key: "pool",
    width: 24,
    // render: text => <button>{text}</button>,
  },
  {
    title: "Coin",
    dataIndex: "coin",
    key: "coin",
    width: 24,
  },
  {
    title: "TVL",
    key: "tvl",
    dataIndex: "tvl",
    width: 14,
    render: (tvl) => {
      let color = tvl < 500000 ? "volcano" : "green";
      return (
        <Tag color={color} key={tvl}>
          {tvl.toFixed(2)}M
        </Tag>
      );
    },
  },
  {
    title: "APR",
    key: "apr",
    dataIndex: "apr",
    width: 14,
    render: (apr) => {
      let color = apr < portfolioAPR / 100 ? "volcano" : "green";
      return (
        <>
          <Tag color={color} key={apr}>
            {(apr * 100).toFixed(2)}%
          </Tag>
        </>
      );
    },
  },
];
