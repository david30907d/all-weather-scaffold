import { Table, Tag } from "antd";
import { useState, useEffect } from "react";

export default function TopNLowestAprPools(props) {
  const { wording, topNData, portfolioAPR } = props;
  const [data, setData] = useState([]);
  const columns = [
    {
      title: "Pool",
      dataIndex: "pool",
      key: "pool",
      width: 60,
      // render: text => <button>{text}</button>,
    },
    {
      title: "APR",
      key: "apr",
      dataIndex: "apr",
      width: 40,
      render: (apr) => {
        let color = apr < portfolioAPR / 100 ? "volcano" : "green";
        return (
          <>
            <Tag key={apr}>{(apr * 100).toFixed(2)}%</Tag>
          </>
        );
      },
    },
  ];

  useEffect(() => {
    if (topNData) {
      const extractedData = topNData.map((metadata, idx) => ({
        key: idx,
        pool: metadata.pool,
        apr: metadata.apr,
      }));
      setData(extractedData);
    }
  }, [topNData]);

  return (
    <>
      <h2 className="ant-table-title">{wording}:</h2>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={{
          y: props.windowHeight,
        }}
      />
    </>
  );
}
