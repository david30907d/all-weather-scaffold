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
      render: text => <button>{text}</button>,
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
    <div>
      <h3>{wording}:</h3>
      <Table columns={columns} dataSource={data} />
    </div>
  );
}
