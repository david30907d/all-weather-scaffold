import { Table } from "antd";
import { useState, useEffect } from "react";
import columnsForSuggestionsTable from "./utils";

export default function SuggestionsForBetterStableCoins(props) {
  const { wording, topNData } = props;
  const [data, setData] = useState([]);
  useEffect(() => {
    if (topNData) {
      const extractedData = topNData.map((metadata, idx) => ({
        key: idx,
        chain: metadata.chain,
        pool: metadata.project,
        coin: metadata.symbol,
        tvl: metadata.tvlUsd / 1e6,
        apr: ((metadata.apy / 100 + 1) ** (1 / 365) - 1) * 365,
      }));
      setData(extractedData);
    }
  }, [topNData]);

  return (
    <div>
      <h3>{wording}:</h3>
      <Table columns={columnsForSuggestionsTable} dataSource={data} />
    </div>
  );
}
