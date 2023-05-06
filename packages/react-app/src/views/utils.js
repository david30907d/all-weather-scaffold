import { Tag } from "antd";
export const getColumnsForSuggestionsTable = portfolioAPR => [
  {
    title: "Chain",
    dataIndex: "chain",
    key: "chain",
  },
  {
    title: "Pool",
    dataIndex: "pool",
    key: "pool",
    render: text => <a>{text}</a>,
  },
  {
    title: "Coin",
    dataIndex: "coin",
    key: "coin",
  },
  {
    title: "TVL",
    key: "tvl",
    dataIndex: "tvl",
    render: tvl => {
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
    render: apr => {
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
