// import { Table, Tag } from 'antd';
import { Space, Table } from "antd";
import { useState, useEffect } from "react";
import { getColumnsForSuggestionsTable } from "./utils";

const SuggestionsForLPTokens = props => {
  const { wording, topNData, portfolioApr } = props;
  const columnsForParentRows = [
    {
      title: "Pool",
      dataIndex: "pool",
      key: "pool",
    },
    {
      title: "APR",
      key: "apr",
      dataIndex: "apr",
    },
  ];
  const [data, setData] = useState([]);
  useEffect(() => {
    if (topNData) {
      const extractedData = topNData
        .filter(metadata => metadata[1].length > 0)
        .map((metadata, idx) => {
          return {
            key: idx,
            pool: metadata[0],
            apr: (metadata[2] * 100).toFixed(2) + "%",
          };
        });
      setData(extractedData);
    }
  }, [topNData]);
  const expandedRowRender = record => {
    const filteredArray = topNData.filter(metadata => metadata[0] === record["pool"]);
    if (filteredArray.length > 0 && Array.isArray(filteredArray[0][1])) {
      const nestedArray = filteredArray[0][1];
      const data = nestedArray.map((metadata, idx) => {
        return {
          key: idx.toString(),
          chain: metadata.pool_metadata.chain,
          pool: metadata.pool_metadata.project,
          coin: metadata.pool_metadata.symbol,
          tvl: metadata.pool_metadata.tvlUsd / 1e6,
          apr: ((metadata.pool_metadata.apy / 100 + 1) ** (1 / 365) - 1) * 365,
        };
      });
      const commonColumns = getColumnsForSuggestionsTable(portfolioApr);
      return (
        <Table
          columns={[
            ...commonColumns,
            {
              title: "Action",
              dataIndex: "operation",
              key: "operation",
              render: () => (
                <Space size="middle">
                  <button>Accept</button>
                  <button>Decline</button>
                </Space>
              ),
            },
          ]}
          dataSource={data}
          pagination={false}
        />
      );
    }
  };
  return (
    <>
      <h3>{wording}</h3>
      <Table
        columns={columnsForParentRows}
        expandable={{
          expandedRowRender: record => expandedRowRender(record),
          defaultExpandedRowKeys: ["0"],
        }}
        dataSource={data}
        size="small"
      />
    </>
  );
};
export default SuggestionsForLPTokens;
