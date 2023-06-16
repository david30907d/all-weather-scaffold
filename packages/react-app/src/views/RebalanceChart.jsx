// Copyright (c) 2016 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
import { Spin } from "antd";
import React, { useState, useEffect } from "react";

import "../../../../node_modules/react-vis/dist/style.css";
import { Sunburst, LabelSeries } from "react-vis";
import { EXTENDED_DISCRETE_COLOR_RANGE } from "react-vis/dist/theme";

const DefaultValue = {
  children: [
    {
      name: "Loading...",
      hex: "#12939A",
      children: [{ name: "Loading...", hex: "#12939A", value: 100 }],
    },
  ],
};
const LABEL_STYLE = {
  fontSize: "8px",
  textAnchor: "middle",
};

/**
 * Recursively work backwards from highlighted node to find path of valud nodes
 * @param {Object} node - the current node being considered
 * @returns {Array} an array of strings describing the key route to the current node
 */
function getKeyPath(node) {
  if (!node.parent) {
    return ["root"];
  }

  return [(node.data && node.data.name) || node.name].concat(getKeyPath(node.parent));
}

/**
 * Recursively modify data depending on whether or not each cell has been selected by the hover/highlight
 * @param {Object} data - the current node being considered
 * @param {Object|Boolean} keyPath - a map of keys that are in the highlight path
 * if this is false then all nodes are marked as selected
 * @returns {Object} Updated tree structure
 */
function updateData(data, keyPath) {
  if (data.children) {
    data.children.map(child => updateData(child, keyPath));
  }
  // add a fill to all the uncolored cells
  if (!data.hex) {
    data.style = {
      fill: EXTENDED_DISCRETE_COLOR_RANGE[5],
    };
  }
  data.style = {
    ...data.style,
    fillOpacity: keyPath && !keyPath[data.name] ? 0.2 : 1,
  };

  return data;
}

const defaultData = updateData(DefaultValue, false);

function createChartData(rebalanceSuggestions, netWorth) {
  const colorList = ["#12939A", "#125C77", "#4DC19C", "#DDB27C", "#88572C", "#F15C17", "#223F9A", "#DA70BF"];
  const children = rebalanceSuggestions.map((categoryObj, idx) => {
    return {
      name: `${categoryObj["category"]}: ${Math.round(
        (categoryObj.sum_of_this_category_in_the_portfolio / netWorth) * 100,
      )}%`,
      hex: colorList[idx],
      children: categoryObj.suggestions_for_positions.map(subCategoryObj => {
        return {
          name: `${subCategoryObj.symbol}: ${Math.round((subCategoryObj.balanceUSD / netWorth) * 100)}%`,
          value: subCategoryObj.balanceUSD,
          hex: colorList[idx],
        };
      }),
    };
  });
  return {
    children,
  };
}

export default function BasicSunburst(props) {
  const { rebalanceSuggestions, netWorth } = props;
  const [pathValue, setPathValue] = useState(false);
  const [data, setData] = useState(defaultData);
  const [finalValue, setFinalValue] = useState("Your Portfolio Chart");
  const [clicked, setClicked] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const chartData = createChartData(rebalanceSuggestions, netWorth);
    const updatedData = updateData(chartData, false);
    setData(updatedData);
  }, [rebalanceSuggestions, netWorth]);

  useEffect(() => {
    if (data !== defaultData) {
      setTimeout(() => {
        setIsChartReady(true);
      }, 16000); // Adjust the delay as needed
    }
  }, [data]);

  return !isChartReady ? (
    <div style={{ marginTop: 32 }}>
      <Spin />
    </div>
  ) : (
    <div className="basic-sunburst-example-wrapper">
      <div>{clicked ? "click to unlock selection" : "click to lock selection"}</div>
      <Sunburst
        animation
        className="basic-sunburst-example"
        hideRootNode
        onValueMouseOver={node => {
          if (clicked) {
            return;
          }
          const path = getKeyPath(node).reverse();
          const pathAsMap = path.reduce((res, row) => {
            res[row] = true;
            return res;
          }, {});
          setFinalValue(path[path.length - 1]);
          setPathValue(path.join(" > "));
          setData(updateData(data, pathAsMap));
        }}
        onValueMouseOut={() => {
          if (!clicked) {
            setPathValue(false);
            setFinalValue(false);
            setData(updateData(data, false));
          }
        }}
        onValueClick={() => setClicked(!clicked)}
        style={{
          stroke: "#ddd",
          strokeOpacity: 0.3,
          strokeWidth: "0.5",
        }}
        colorType="literal"
        getSize={d => d.value}
        getColor={d => d.hex}
        data={data}
        height={300}
        width={350}
      >
        {finalValue && <LabelSeries data={[{ x: 0, y: 0, label: finalValue, style: LABEL_STYLE }]} />}
      </Sunburst>
      <div className="basic-sunburst-example-path-name">{pathValue}</div>
    </div>
  );
}
